import { Snowflake } from "@servcord/shared/data/general/Snowflake";
import { ErrorHandler } from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";
import crypto from "crypto";
import { ComponentNames } from "components/Components";
import StorageManager from "components/backend/StorageManager";

export default class TokenHandler extends TypedEmitter implements IComponent {
	private get storageManager() {
		return global.components.getComponent<StorageManager>(ComponentNames.StorageManager);
	}
	// do advanced token checks here
	async isTokenValid(token: string): Promise<boolean> {
		return new Promise((resolve, reject) => {
			this.storageManager?.get("/tokens/"+this.getTokenInParts(token)[0]).then((data) => {
				const fetchedToken = (data as string);
				if (fetchedToken == token) {
					resolve(true);
				} else {
					const tokenParts = this.getTokenInParts(token);
					const fetchedParts = this.getTokenInParts(fetchedToken);
					Promise.all([
						new Promise((resolve) => {
							resolve(fetchedParts[0] == tokenParts[0]);
						}),
						new Promise((resolve) => {
							resolve(fetchedParts[1] == tokenParts[1]);
						}),
						new Promise((resolve) => {
							resolve(fetchedParts[2] == tokenParts[2]);
						}),
					]).then(([check1, check2, check3]) => {
						if (check1 && check2 && check3) {
							resolve(true);
							return;
						} 
						resolve(false);
					});
				}
			}).catch((e) => {
				resolve(false);
			});
		});
	}
	async getUserIDFromToken(token: string): Promise<string> {
		return new Promise((resolve,reject) => {
			// store first part(userid) of token in db
			this.isTokenValid(token).then((valid) => {
				if (!valid) {
					reject("Token not valid");
					return;
				}
				const parts = this.getTokenInParts(token);
				const id = Buffer.from(parts[0], "base64");
				resolve(id.toString());
			});
		});
	}
	private getTokenInParts(token: string): string[] {
		let rawParts = token.split(".");
		if (token.includes("mfa")) {
			// token is mfa
			rawParts = token.substr(0, 4).split("_");
		}
		return rawParts;
	}
	async saveToken(token: string): Promise<void> {
		return new Promise((resolve,reject) => {
			// store first part(userid) of token in db
			const tokenParts = this.getTokenInParts(token);
			this.storageManager?.post("/tokens/"+tokenParts[0], token).then(() => {
				resolve();
			}).catch((e) => {
				reject("Failed to save token: "+e);
			});
		});
	}
	async getOrGenerateToken(id: string, mfa = false): Promise<string> {
		return this.generateTokenWithID(id, mfa);
	}
	async generateTokenWithID(id: string, mfa = false): Promise<string> {
		return new Promise((resolve, reject)=>{
			let token = "";
			const selfUserID = Buffer.from(id).toString("base64");
			const timestamp = Buffer.from(Snowflake.getEpoch().toString()).toString("base64");
			const randomData = crypto.randomBytes(20).toString("base64");

			token = `${selfUserID}.${timestamp}.${randomData}`.replaceAll(/=|\/|\+/g, "");
			if (mfa) {
				token="mfa."+token.replaceAll(".", "_");
			}
			resolve(token);
		});
	}
	async generateRandomWithLength(length: number): Promise<string> {
		const hex = crypto.randomBytes(length).toString("hex");
		return Buffer.from(hex).toString("base64").replace(/=/g, "");
	}
	addErrorHandler(cb: ErrorHandler): void {
		throw new Error("Method not implemented.");
	}
	constructor() {
		super();
	}
	
}