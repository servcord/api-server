import { Payload } from "@servcord/shared/data/gateway/Payloads";
import ComponentError, { ErrorHandler } from "components/ComponentError";
import IComponent from "components/IComponent";
import { Session } from "gateway/Session";
import { TypedEmitter } from "tiny-typed-emitter";

export default class GatewayMessageHandler extends TypedEmitter implements IComponent {
	async onMessage(msg: Payload, session: Session): Promise<void> {

	}
	addErrorHandler(cb: ErrorHandler): void {
		throw new Error("Method not implemented.");
	}
}