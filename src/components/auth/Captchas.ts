import { ErrorHandler } from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";
import hcaptcha from "hcaptcha";

export interface ICaptchaService {
	/**
	 * The name of the captcha service.
	 */
	name: string;
	/**
	 * The sitekey of the captcha.
	 */
	sitekey: string;
	/**
	 * The captcha secret.
	 */
	secret: string;
	verifyCaptcha(captcha_key: string): Promise<boolean>;
}
//TODO: load from configs
const secret = "0x0000000000";
const sitekey = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";

export class HCaptchaService implements ICaptchaService {
	name = "hcaptcha";
	sitekey: string;
	secret: string;
	async verifyCaptcha(captcha_key: string): Promise<boolean> {
		return hcaptcha.verify(this.secret, captcha_key).then((data) => {
			if (data.success == true) {
				return Promise.resolve(true);
			}
			return Promise.resolve(false);
		}).catch(()=>{
			return Promise.resolve(false);
		});
	}
	constructor (sitekey: string, secret: string) {
		this.sitekey = sitekey;
		this.secret = secret;
	}
}
export default class Captchas extends TypedEmitter implements IComponent {
	captchaService: ICaptchaService

	addErrorHandler(cb: ErrorHandler): void {
		throw new Error("Method not implemented.");
	}
	constructor() {
		super();
		this.captchaService = new HCaptchaService(sitekey, secret);
	}
}