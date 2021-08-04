import ComponentError from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";
import util from "util";
import pem from "pem";
import Logger from "@servcord/shared/utils/Logger";
import fs from "fs";
import path from "path";

class SSLCertificateGeneratorEvents {
	"expired": (key: string, cert: string) => void;
}
const createCertificate = util.promisify((options: pem.CertificateCreationOptions, cb: pem.Callback<pem.CertificateCreationResult>) => pem.createCertificate(
	options,
	(err, result) => cb(err, result)
));
export default class SSLCertificateGenerator extends TypedEmitter<SSLCertificateGeneratorEvents> implements IComponent {
	private logger: Logger;
	constructor() {
		super();
		this.logger = new Logger("SSLCertificateGenerator");
		this.init();
	}
	private init() {
		
	}
	async generateSelfSigned(): Promise<{key: string, cert: string}> {
		return new Promise((resolve,reject) => {
			this.logger.info("Generating self-signed certificates.");
			const opts = { days: 1, selfSigned: true };
			createCertificate(opts).then((value) => {
				setTimeout(()=>{
					this.emit("expired", value.serviceKey, value.certificate);
				// one day is 86400000 ms
				}, 86400000 * opts.days);
				resolve({ key: value.serviceKey, cert: value.certificate });
			}).catch((e) => {
				reject(e);
			});
		});
	}
	/**
	 * Reads certs from process.cwd() + "/certs".
	 * key filename: privkey.pem
	 * cert filename: fullchain.pem
	 */
	async readCertsFromStorage(): Promise<{key: string, cert: string}> {
		return new Promise((resolve,reject)=>{
			this.logger.info("Reading certs from file.");
			//TODO: custom path
			const base = path.join(process.cwd(), "certs");
			const keypath = base + "/privkey.pem";
			const certpath = base + "/fullchain.pem";
			Promise.all([fs.promises.readFile(keypath, {encoding: "utf-8"}), fs.promises.readFile(certpath, {encoding: "utf-8"})]).then(([key, cert])=>{
				resolve({key: key, cert: cert});
			}).catch((e)=>{
				reject(e);
			});
		});
	}
	addErrorHandler(cb: (e: ComponentError) => never): void {
		throw new Error("Method not implemented.");
	}
}