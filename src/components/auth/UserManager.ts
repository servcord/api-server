import { Snowflake } from "@servcord/shared/data/general/Snowflake";
import StorageManager from "components/backend/StorageManager";
import { ErrorHandler } from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";
import { ComponentNames } from "components/Components";
import PrivateUser from "@servcord/shared/data/user/PrivateUser";
import DefaultSettings, { ISettings } from "@servcord/shared/data/user/Settings";
import * as EmailValidator from "email-validator";
import TokenHandler from "./TokenHandler";
import bcrypt from "bcrypt";
import crypto from "crypto";

class NewUser implements PrivateUser {
	user_settings: ISettings;
	purchased_flags?: 0 | 1 | 2 | undefined;
	locale: string;
	mfa_enabled: boolean;
	email: string;
	verified: boolean;
	avatar?: string | undefined;
	bot?: boolean | undefined;
	banner?: string | undefined;
	banner_color?: string | undefined;
	bio?: string | undefined;
	id: string;
	username: string;
	discriminator: string;
	passwordHash: string;
	guilds: string[]
	constructor(id: string, username: string, login: string, discriminator: string, passwordHash: string) {
		this.username = username;
		this.email = login;
		this.id = id;
		this.discriminator = discriminator;
		this.passwordHash = passwordHash;
		this.user_settings = new DefaultSettings();
		this.guilds = [];
		this.locale =  "en-US";
		this.mfa_enabled = false;
		this.verified  = false;
	}
}
export default class UserManager extends TypedEmitter implements IComponent {

	private get storageManager() {
		return global.components.getComponent<StorageManager>(ComponentNames.StorageManager);
	}
	private get tokenHandler() {
		return global.components.getComponent<TokenHandler>(ComponentNames.TokenHandler);
	}

	async getUserFromID(id: string): Promise<PrivateUser> {
		return new Promise((resolve,reject) => {
			if (!this.storageManager) {
				reject("Storagemanager was null");
				return;
			}
			this.storageManager.get("/users/by-id/"+id+"/user").then((user) => {
				if (!user) {
					reject("No user found");
				}
				resolve((user as never));
			}).catch((e)=>{
				reject("Error from storage server: "+e);
			});
		});
	}
	async existsFromTag(username: string, discriminator: string): Promise<boolean> {
		return new Promise((resolve) => {
			this.storageManager?.getLink("/users/by-tag/"+this.tagEncode(username, discriminator), "/user").then((user) => {
				if (user) {
					resolve(true);
				} else {
					resolve(false);
				}
			}).catch(() => {
				resolve(false);
			});
		});
	}

	tagEncode(username: string, discriminator: string): string {
		return Buffer.from(username+"#"+discriminator).toString("base64");
	}

	tagDecode(encodedTag: string): string {
		return Buffer.from(encodedTag, "base64").toString();
	}
	async getUserFromLogin(login: string): Promise<PrivateUser> {
		return new Promise((resolve, reject) => {
			const cleanLogin = this.cleanLogin(login);
			this.storageManager?.getLink("/logins/"+cleanLogin, "/user").then((user) => {
				resolve(<PrivateUser>user);
			}).catch((e) => {
				reject(e);
			});
		});
	}
	/**
	 * Gets the login without any special characters.
	 * Example:
	 * 
	 * test.user@campfire.internal -> test_user_campfire_internal
	 */
	private cleanLogin(login: string) {
		// clean the login using https://stackoverflow.com/a/20856346
		// eslint-disable-next-line no-control-regex
		return login.replace(/[^\w]+/g, "_");
	}
	async validateEmail(email: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			try {
				resolve(EmailValidator.validate(email));
			} catch (e) {
				reject(e);
			}
		});
	}
	async getUserFromToken(token: string): Promise<PrivateUser> {
		return new Promise((resolve, reject)=>{
			if (!this.tokenHandler) {
				reject("No tokenhandler");
				return; 
			}
			this.tokenHandler?.getUserIDFromToken(token).then((userid)=>{
				if (!userid) {
					reject("No user with token");
					return;
				}
				this.getUserFromID(userid).then((user) => {
					resolve(user);
				}).catch((e)=>{
					reject(e);
				});
			}).catch((e)=>{
				reject(e);
			});
		});
	}
	async createUser(username: string, login: string, password: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			if (!this.storageManager) {
				reject("No StorageManager.");
				return;
			}
			if (!this.tokenHandler) {
				reject("No TokenHandler.");
				return;
			}
			Promise.all([
				Snowflake.generate(),
				this.saltPassword(password),
				this.generateDiscriminator(username),
				new Promise<boolean>((resolve, reject) => {
					this.storageManager?.getLink("/logins/"+this.cleanLogin(login)).then((exists) => {
						if (exists) {
							if ((exists as never)["type"]) {
								resolve(true);
								return;
							}
						}
						resolve(false);
					}).catch(() => {
						resolve(false);
					});
				})
			]).then(([id, passwordHash, discriminator, exists]) => {
				if (exists) {
					reject("User already exists");
					return;
				}
				const user = new NewUser(id, username, login, discriminator, passwordHash);
				this.tokenHandler?.generateTokenWithID(id, false).then((token) => {

					Promise.all([
						this.storageManager?.post("/users/by-id/"+id+"/user", JSON.stringify(user)),
						this.storageManager?.post("/users/by-id/"+id+"/token", token),
						this.storageManager?.link("/users/by-id/"+id, "/logins/"+this.cleanLogin(login)),
						this.storageManager?.link("/users/by-tag/"+this.tagEncode(username, discriminator), "/users/by-id/"+id)
					]).then(() => {
						this.tokenHandler?.saveToken(token);
						resolve(id);
					}).catch((e)=>{
						reject(e);
					});
				});
			}).catch((e)=>{
				reject(e);
			});
		});
	}
	/**
	 * Generates a quarantee-edly unique discriminator.
	 * @note May fail sometimes.
	 * @param username The username to generate the discrim for.
	 * @param _retries DO NOT SET. Used internally to loop until non-conflicting discrim is found.
	 * @returns A unique discriminator.
	 */
	private async generateDiscriminator(username: string, _retries = 0): Promise<string> {
		const maxRetries = 10;
		return new Promise((resolve, reject) => {
			// generate number between 1 and 9999
			crypto.randomInt(1, 9999, (err, discriminator) => {
				if (err) {
					reject(err);
					return;
				}
				const paddedTag = discriminator.toString().padStart(4, "0");
				if (this.existsFromTag(username, paddedTag)) {
					resolve(paddedTag);
				} else {
					if (_retries>=maxRetries) {
						reject("Too many users with this name.");
						return;
					}
					// start again if tag already in use
					this.generateDiscriminator(username, _retries+1).then((discriminator) => {
						resolve(discriminator);
					}).catch((e)=>{
						reject(e);
					});
				}
			});
		});
	}
	private async saltPassword(password: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const saltRounds = 10;
			bcrypt.genSalt(saltRounds, (err, salt) => {
				if (err) {
					reject(err);
					return;
				}
				bcrypt.hash(password, salt, (err, hash) => {
					if (err) {
						reject(err);
						return;
					}
					resolve(hash);
				});
			});
		});
	}
	async isPasswordCorrect(userid: string, password: string): Promise<boolean> {
		return new Promise<boolean>((resolve, reject)=>{
			if (!userid) {
				reject("No userid");
				return;
			}
			this.getUserFromID(userid).then((user)=>{
				bcrypt.compare(password, user.passwordHash).then((valid) => {
					resolve(valid);
				}).catch((e)=>{
					reject(e);
				});
			}).catch((e)=>{
				reject(e);
			});
		});
	}
	addErrorHandler(cb: ErrorHandler): void {
		throw new Error("Method not implemented.");
	}
	
}