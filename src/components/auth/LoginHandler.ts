import ComponentError from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";
import hcaptcha from "hcaptcha";

class LoginHandlerEvents {
    
}
type LoginResult = {
	code: number;
	payload: any;
	result: "needcaptcha" | "need2fa" | "success" | "failure"
}
const captchaEnabled = false;
const secret = "my hcaptcha secret from hcaptcha.com";
const sitekey = "1234-5678-9012-3456";

export default class LoginHandler extends TypedEmitter<LoginHandlerEvents> implements IComponent {
	private errorHandlers: { (e: ComponentError): void; } [] = [];
	constructor() {
		super();
	}  
	addErrorHandler(cb: (e: ComponentError) => void): void {
		this.errorHandlers.push(cb);
	}
	//TODO: check login and password
	handleLogin(login: string, password?: string, captcha_key?: string): LoginResult {
		if (captchaEnabled) {
			if (captcha_key) {
				this.verifyCaptcha(captcha_key).then((valid)=>{
					if (valid) {
						
						return {
							code: 200,
							result: "success",
							payload: {
								token: "thisisatoken.foranapp.calledservcord", //TODO: generate tokens using TokenHandler
								user_settings: {"locale": "en-US", "theme": "dark"} //TODO: get user settings from database
							}
						};
					} else {
						return {
							code: 400,
							result: "needcaptcha",
							payload: {
								captcha_key: ["invalid-input-response"], 
								captcha_sitekey: sitekey, 
								captcha_service: "hcaptcha"
							}
						};
					}
				});
			} else {
				return {
					code: 400,
					result: "needcaptcha",
					payload: {
						captcha_key: ["captcha-required"], 
						captcha_sitekey: sitekey, 
						captcha_service: "hcaptcha"
					}
				};
			}
		}
		if (login=="test@campfire") {
			return {
				code: 200,
				result: "success",
				payload: {
					token: "thisisatoken.foranapp.calledservcord", //TODO: generate tokens using TokenHandler
					user_settings: {"locale": "en-US", "theme": "dark"} //TODO: get user settings from database
				}
			};
		}
		return {
			code: 400, 
			result: "failure", 
			payload: {
				code: 50035, 
				message: "No user",
				errors: {
					login: {
						_errors: [
							{code: "INVALID_LOGIN", "message": "This account doesn't exist. Use test@campfire for now."}
						]
					}
				}
			}
		};
	}
	async verifyCaptcha(captcha_key: string): Promise<boolean> {
		return hcaptcha.verify(secret, captcha_key).then((data) => {
			if (data.success == true) {
				return Promise.resolve(true);
			}
			return Promise.resolve(false);
		}).catch(()=>{
			return Promise.resolve(false);
		});
	}
	private errored(msg?: string) {
		const error = new ComponentError("LoginHandler", LoginHandler, msg, "Login Handler");
		this.errorHandlers.forEach((cb)=>{
			cb(error);
		});
	}
}