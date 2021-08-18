import { ErrorHandler } from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";
import axios from "axios";
type StorageManagerEvents = {
	"ready": (manager: StorageManager) => void;
}
type Type = "directory" | "link"
export type FolderEnumeration = {
	type: string,
	files: string[],
	folders: string[]
};
export type LinkEnumeration = {
	type: Type
	target: string;
}
export default class StorageManager extends TypedEmitter<StorageManagerEvents> implements IComponent {
	hostname: string;
	port: number;

	async get(path: string): Promise<unknown> {
		return new Promise((resolve, reject) => {
			axios.get(`http://${this.hostname}:${this.port}/${path}`)
				.then(res => {
					if (res.status == 200) {
						resolve(res.data);
					} else {
						reject(res);
					}
				})
				.catch(e => {
					reject(e);
				});
		});
	}
	async post(path: string, data: unknown): Promise<unknown> {
		return new Promise((resolve, reject) => {
			axios.post(`http://${this.hostname}:${this.port}/${path}`, data)
				.then(res => {
					if (res.status == 200) {
						resolve(res.data);
					} else {
						reject(res);
					}
				})
				.catch(e => {
					reject(e);
				});
		});
	}
	async delete(path: string): Promise<unknown> {
		return new Promise((resolve, reject) => {
			axios.delete(`http://${this.hostname}:${this.port}/${path}`)
				.then(res => {
					if (res.status == 200) {
						resolve(res.data);
					} else {
						reject(res);
					}
				})
				.catch(e => {
					reject(e);
				});
		});
	}
	/**
	 * Creates a link from a source to a target.
	 * @param source The folder that the link points to.
	 * @param target The folder/file that will redirect to the source.
	 */
	async link(source: string, target: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this.post(target+".link", JSON.stringify({type: "link", target: source})).then(() => {
				resolve();
			}).catch((e) => {
				reject(e);
			});	
		});
	}
	/**
	 * Gets a resource from a link.
	 */
	async getLink(path: string, suffix = ""): Promise<unknown> {
		return new Promise((resolve, reject) => {
			this.get(path+".link").then((_resp) => {
				const resp = (_resp as LinkEnumeration);
				this.get(resp.target + suffix).then((_resp) => {
					resolve(_resp);
				}).catch((e) => {
					reject(e);
				});
			}).catch((e) => {
				reject(e);
			});
		});
	}

	addErrorHandler(cb: ErrorHandler): void {
		throw new Error("Method not implemented.");
	}

	constructor() {
		super();
		//TODO: use config system
		this.hostname = "localhost";
		this.port = 8866;
		this.emit("ready", this);
	}
}