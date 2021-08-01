import ComponentError from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";

export default class TokenHandler extends TypedEmitter implements IComponent {
	addErrorHandler(cb: (e: ComponentError) => never): void {
		throw new Error("Method not implemented.");
	}
	
}