import ws from "ws";
import { IncomingMessage } from "http";
import { ICompressor, IEncoder, getSuitableCompressor, getSuitableEncoder, ZlibCompressor } from "gateway/Encoding";
import { GatewayQueryArgs } from "components/gateway/GatewayServer";
import { Payload } from "@servcord/shared/data/gateway/Payloads";
import Logger from "@servcord/shared/utils/Logger";

export class Session {
	public ws: ws;
	public req: IncomingMessage;
	public args: GatewayQueryArgs
	public encoder: IEncoder;
	public compressor: ICompressor;
	public logger: Logger;

	constructor (ws: ws, req: IncomingMessage, args: GatewayQueryArgs, logger: Logger) {
		this.ws = ws;
		this.req = req;
		this.args = args;
		this.encoder = getSuitableEncoder(args.encoding);
		this.compressor = getSuitableCompressor(args.compress);
		this.logger = logger;
	}
	async sendPayload(msg: Payload): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.encoder.encode(Buffer.from(JSON.stringify(msg))).then((encoded) => {
				this.compressor.compress(encoded).then((compressed) => {
					this.ws.send(compressed);
					resolve();
				}).catch((e)=>{
					reject(e);
				});
			}).catch((e)=>{
				reject(e);
			});
		});
	}
	async sendBinary(msg: Buffer): Promise<void> {
		return new Promise<void>((resolve) => {
			this.ws.send(msg);
			resolve();
		});
	}
}