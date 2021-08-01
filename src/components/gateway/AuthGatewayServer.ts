import ComponentError from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";
import ws from "ws";

export default class AuthGatewayServer extends TypedEmitter implements IComponent {
	public wsServer: ws.Server;
	constructor () {
		super();
		this.wsServer = new ws.Server({noServer: true});
	}
	init() {
		
		this.wsServer.on("connection", function connection(ws) {
			ws.on("message", (data)=>{
				console.log(data);
			});
		});

	}
	addErrorHandler(cb: (e: ComponentError) => never): void {
		throw new Error("Method not implemented.");
	}
    
}