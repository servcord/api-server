import { IdentifyPayload, Opcode, Payload } from "@servcord/shared/data/gateway/Payloads";
import { ErrorHandler } from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";
import ws from "ws";
import { Session } from "gateway/Session";
import Logger from "@servcord/shared/utils/Logger";
import UserManager from "components/auth/UserManager";
import { ComponentNames } from "components/Components";
import crypto from "crypto";
import TokenHandler from "components/auth/TokenHandler";

//TODO: move away from here
type GatewayServerEvents = {
	"identify": (ws: ws, msg: Payload & IdentifyPayload) => void,
}
//TODO: move away from here
export type GatewayQueryArgs = { 
	encoding: "etf" | "json"; 
	v: string; 
	compress: "zlib-stream" | "lz4-stream"; 
}

export default class GatewayServer extends TypedEmitter<GatewayServerEvents> implements IComponent {
	public wsServer: ws.Server;
	private logger: Logger;
	private errorPayload = new Payload({d: "Internal server error", op: Opcode.ERROR});
	private get userManager() {
		return global.components.getComponent<UserManager>(ComponentNames.UserManager);
	}
	
	private get tokenHandler() {
		return global.components.getComponent<TokenHandler>(ComponentNames.TokenHandler);
	}

	constructor () {
		super();
		this.wsServer = new ws.Server({noServer: true, perMessageDeflate: false });
		this.logger = new Logger("GatewayServerMain");
		this.init();
	}
	private init() {
		
		this.wsServer.on("connection", (ws, req) => {
			if (!req.url) {
				ws.send(JSON.stringify({error: "Missing required query (params). Need ?v=9&encoding=etf"}),()=>{
					ws.close();
				});
				return;
			}
			let logger = new Logger("GatewayConnection_"+"anonymous");
			const url = new URL(req.url, "https://requiredforthenodejsgods.com");
			const session = new Session(ws, req, ({
				encoding: url.searchParams.get("encoding") ?? "json",
				v: url.searchParams.get("v") ?? "9",
				compress: url.searchParams.get("compress") ?? "zlib-stream"
			} as never), logger);

			const msg = new Payload({
				op: Opcode.HELLO,
				d: {
					heartbeat_interval: 5000 + (this.wsServer.clients.size * 250)
				}
			});

			session.sendPayload(msg).then(()=> {
				logger.info("Sent hello payload");
			}).catch((e)=>{
				logger.error("error: "+e);
			});

			ws.on("message", (data: Buffer) => {
				try {
					GatewayServer.decodePayload(data, session).then((payload) => {
						if (payload.isIdentify()) {
							this.emit("identify", ws, payload);
							if (!this.tokenHandler) {
								session.sendPayload(this.errorPayload);
								logger.error("No Tokenhandler");
								return;
							}
							if (!this.userManager) {
								session.sendPayload(this.errorPayload);
								logger.error("No Usermanager");
								return;
							}
							this.tokenHandler.isTokenValid(payload.d.token).then((valid)=>{
								if (!valid) {
									logger.debugerror("token not valid");
									session.ws.close(4004);
									return;
								}
								Promise.all([
									this.userManager?.getUserFromToken(payload.d.token),
									new Promise<string>((resolve, reject) => {
										resolve(crypto.randomBytes(24).toString("utf8"));
									}),
									new Promise<string>((resolve, reject) => {
										resolve(crypto.randomBytes(24).toString("utf8"));
									})
								]).then(([user, sessid, analyticstoken]) => {
									if (!user) {
										session.ws.close(4004);
										logger.debugerror("no user");
										return;
									}
									logger = new Logger("GatewayConnection_"+user.id);
									session.sendPayload(new Payload({
										op: 0,
										t: "READY",
										d: {
											v: 8,
											user_settings: user?.user_settings,
											user_guild_settings: {
												entries: []
											},
											user: user,
											tutorial: null,
											users: [],
											session_id: sessid,
											required_action: "",
											relationships: [],
											read_state: {
												entries: []
											},
											private_channels: [],
											presences: [],
											notes: {},
											guilds: (() => {
												//TODO: fetch guilds here
												const guilds = [];
												guilds.push({id: "254847346573442", unavailable: true});
												return guilds;
											})(),
											guild_join_requests: [],
											guild_experiments: [],
											geo_ordered_rtc_regions: ["internal"],
											friend_suggestion_count: 0,
											experiments: [],
											country_code: "EN",
											consents: {
												personalization: {
													consented: false
												}
											},
											connected_accounts: [],
											analytics_token: analyticstoken
										}
									})).catch((e)=>{
										console.error(e);
									});
								}).catch((e)=>{
									session.sendPayload(this.errorPayload);
									logger.debugerror(e);
									return;
								});
							});
						}
						if (payload.isHeartbeat()) {
							session.sendPayload(new Payload({op: Opcode.HEARTBEAT_ACK, d: {}})).then(()=>{
								logger.debug("Sent heartbeat successfully");
							}).catch((e)=>{
								logger.debugerror("Failed to send heartbeat: "+e);
							});
						}
					}).catch((e)=>{
						logger.debugerror("Failed to decode payload: "+e);
						session.sendPayload(this.errorPayload);
					});
				} catch (e) {
					logger.debugerror("General error: "+e);
					session.sendPayload(this.errorPayload);
				}
			});
		});
	}
	private static async decodePayload(msg: Buffer, session: Session): Promise<Payload> {
		return new Promise<Payload>((resolve, reject) => {
			// Don't decompress if zlib is in use since erlpack handles it already
			// maybe...
			session.logger.debug(session.args.encoding + " "+ session.args.compress);
			session.logger.debug(session.encoder.constructor.name+ " "+session.compressor.constructor.name);
			if (session.args.encoding == "etf") {
				session.encoder.decode(msg).then((decoded) => {
					try {
						const result = JSON.parse(decoded.toString());
						resolve(new Payload(result));
					} catch (e) {
						reject(e);
					}
				}).catch((e)=>{
					reject(e);
				});
				return;
			}
			if (session.args.encoding == "json") {
				session.encoder.decode(msg).then((decoded) => {
					try {
						const result = JSON.parse(decoded.toString());
						resolve(new Payload(result));
					} catch (e) {
						reject(e);
					}
				}).catch((e)=>{
					reject(e);
				});
				return;
			}
			session.compressor.decompress(msg).then((decompressed) => {
				session.encoder.decode(decompressed).then((decoded) => {
					try {
						const result = JSON.parse(decoded.toString());
						resolve(new Payload(result));
					} catch (e) {
						reject(e);
					}
				}).catch((e)=>{
					reject(e);
				});
			}).catch((e)=>{
				reject(e);
			});
		});
	}
	addErrorHandler(cb: ErrorHandler): void {
		throw new Error("Method not implemented.");
	}
    
}