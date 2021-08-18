import { ErrorHandler } from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";
import { ComponentNames } from "components/Components";
import UserManager from "./UserManager";
import TokenHandler from "./TokenHandler";
import Captchas from "./Captchas";

class LoginHandlerEvents {
    
}
type Result = "needcaptcha" | "need2fa" | "success" | "failure";
export class LoginResult {
	code: number;
	payload: unknown;
	result: Result
	constructor(code: number, result: Result, payload: unknown) {
		this.code = code;
		this. result = result;
		this.payload = payload;
	}
}
// Captchas don't work on localhost, they only work through the interwebs, with a domain name.
const captchaEnabled = false;

export default class LoginHandler extends TypedEmitter<LoginHandlerEvents> implements IComponent {
	private errorHandlers: ErrorHandler[] = [];
	constructor() {
		super();
	}  
	private get userManager() {
		return global.components.getComponent<UserManager>(ComponentNames.UserManager);
	}
	private get tokenHandler() {
		return global.components.getComponent<TokenHandler>(ComponentNames.TokenHandler);
	}
	private get captchas() {
		return global.components.getComponent<Captchas>(ComponentNames.Captchas);
	}
	addErrorHandler(cb: ErrorHandler): void {
		this.errorHandlers.push(cb);
	}
	//TODO: cleanup
	async handleLogin(login: string, password?: string, captcha_key?: string): Promise<LoginResult> {
		return new Promise((resolve, reject) => {
			const missingFields: string[] = [];
			if (!login) {
				missingFields.push("login");
			}
			if (!password) {
				missingFields.push("password");
			}
			if (missingFields.length>0) {
				const resultpayload = {
					code: 50035, 
					message: "Missing fields",
					errors: (() => {
						// the nightmare below takes the missing fields and adds the error(s) to them
						// Object.fromentries is required so that the array turns into an object
						// the map is required to do an inline foreach
						return Object.fromEntries((missingFields.map(field => {
							// the nightmare below this is a key value pair.
							// it should look something like [field, value],
							// however it got quite long
							return [field, 
								{
									_errors: [
										{
											code: "BASE_FIELD_MISSING", 
											message: "This field is required."
										}
									]
								}
							];
						})));
					})()
				};
				resolve(new LoginResult(400, "failure", resultpayload));
				return;
			}
			if (captchaEnabled) {
				// if the captcha service is broken, it shouldn't stop people from accessing the app
				if (!this.captchas) {
					// eslint disable needed since ts can't know about our janky empty field detection
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					this.checkLoginAndPassword(login, password!).then((value)=>{
						resolve(value);
					}).catch((e)=>{
						reject(e);
					});
					return;
				}
				if (captcha_key) {
					this.captchas?.captchaService.verifyCaptcha(captcha_key).then((valid) => {
						if (valid) {
							// eslint disable needed since ts can't know about our janky empty field detection
							// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
							this.checkLoginAndPassword(login, password!).then((value)=>{
								resolve(value);
							}).catch((e)=>{
								reject(e);
							});
						} else {
							resolve(new LoginResult(400, "needcaptcha", {
								captcha_key: ["invalid-input-response"],
								captcha_sitekey: this.captchas?.captchaService.sitekey, 
								captcha_service: this.captchas?.captchaService.name
							}));
						}
					}).catch((e)=>{
						return;
					});
				} else {
					resolve(new LoginResult(400, "needcaptcha", {
						captcha_key: ["captcha-required"], 
						captcha_sitekey: this.captchas?.captchaService.sitekey, 
						captcha_service: this.captchas?.captchaService.name
					}));
					return;
				}
				return;
			} else {
				// eslint disable needed since ts can't know about our janky empty field detection
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				this.checkLoginAndPassword(login, password!).then((value)=>{
					resolve(value);
				}).catch((e)=>{
					reject(e);
				});
			}
		});
	}
	private async checkLoginAndPassword(login: string, password: string): Promise<LoginResult> {
		return new Promise((resolve, reject) => {
			this.userManager?.getUserFromLogin(login).then((user)=>{
				if (!user) {
					resolve({
						code: 400,
						result: "failure",
						payload: {
							code: 50035, 
							message: "Wrong password",
							errors: {
								password: {
									_errors: [
										{code: "INVALID_LOGIN", "message": "Wrong login or password."}
									]
								},
								login: {
									_errors: [
										{code: "INVALID_LOGIN", "message": "Wrong login or password."}
									]
								}
							}
						}
					});
					return;
				}
				this.userManager?.isPasswordCorrect(user.id, password).then((correct) => {
					if (correct) {
						this.tokenHandler?.getOrGenerateToken(user.id).then((token)=>{
							this.tokenHandler?.saveToken(token).then(() => {
								resolve({
									code: 200,
									result: "success",
									payload: {
										token: token,
										user_settings: user.user_settings
									}
								});
								return;
							}).catch((e) => {
								resolve({
									code: 400,
									result: "failure",
									payload: {
										code: 50035, 
										message: "Internal error",
										errors: {
											password: {
												_errors: [
													{code: "INVALID_LOGIN", "message": "Internal error"}
												]
											},
											login: {
												_errors: [
													{code: "INVALID_LOGIN", "message": "Internal error"}
												]
											}
										}
									}
								});
							});
						}).catch((e)=>{
							reject(e);
						});
					} else {
						resolve({
							code: 400,
							result: "failure",
							payload: {
								code: 50035, 
								message: "Wrong password",
								errors: {
									password: {
										_errors: [
											{code: "INVALID_LOGIN", "message": "Wrong login or password."}
										]
									},
									login: {
										_errors: [
											{code: "INVALID_LOGIN", "message": "Wrong login or password."}
										]
									}
								}
							}
						});
						return;
					}
				}).catch((e)=>{
					reject(e);
				});
			}).catch((e)=>{
				resolve({
					code: 400,
					result: "failure",
					payload: {
						code: 50035, 
						message: "Wrong password",
						errors: {
							password: {
								_errors: [
									{code: "INVALID_LOGIN", "message": "Wrong login or password."}
								]
							},
							login: {
								_errors: [
									{code: "INVALID_LOGIN", "message": "Wrong login or password."}
								]
							}
						}
					}
				});
				return;
			});
		});
	}
}