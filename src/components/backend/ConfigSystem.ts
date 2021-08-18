import Config from "@servcord/shared/api/config/Config";
import { ErrorHandler } from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";

export default class ConfigManager extends TypedEmitter implements IComponent  {
	getConfig<T1>(name: string) {
		return new Config<T1>(name, "user", "campfire/server");
	}
	
	addErrorHandler(cb: ErrorHandler): void {
		throw new Error("Method not implemented.");
	}
}