import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";
import ComponentError, { ErrorHandler } from "components/ComponentError";
import chalk from "chalk";
import express from "express";
import { ComponentNames } from "components/Components";
import LoginHandler from "components/auth/LoginHandler";
import Logger from "@servcord/shared/utils/Logger";
import http from "http";
import https from "https";
import GatewayServer from "components/gateway/GatewayServer";
import AuthGatewayServer from "components/gateway/AuthGatewayServer";
import SSLCertificateGenerator from "components/security/SSLCertificateGenerator";
import { Socket } from "net";

export default class ExpressMain extends TypedEmitter implements IComponent {
	public app: express.Express;
	public httpServer?: http.Server;
	public httpsServer?: https.Server;
	private logger: Logger;

	private get loginHandler() {
		return global.components.getComponent<LoginHandler>(ComponentNames.LoginHandler);
	}

	private get gatewayServer() {
		return global.components.getComponent<GatewayServer>(ComponentNames.GatewayServer);
	}

	private get authGatewayServer() {
		return global.components.getComponent<AuthGatewayServer>(ComponentNames.AuthGatewayServer);
	}

	private get sslCertificateGenerator() {
		return global.components.getComponent<SSLCertificateGenerator>(ComponentNames.SSLCertificateGenerator);
	}

	constructor() {
		super();
		this.app = express();
		this.logger = new Logger("ExpressMain");
		this.init();
	}
	private init() {
		this.app.use(express.json({limit: "50mb"}));

		this.app.use((req,res,next) => {
			if (req.originalUrl.includes("/science")) {
				next();
				return;
			}
			this.logger.debug(`${req.ip} ${req.method}S ${req.headers.host}${req.originalUrl}`);
			this.logger.debug(JSON.stringify(req.body));
			next();
		});

		//TODO: move this away from here
		this.app.use("/api/v9/auth/login", (req,res) => {
			if (!this.loginHandler) {
				res.statusCode = 500;
				res.send("LoginHandler was null");
				return;
			}
			const { code, payload } = this.loginHandler.handleLogin(req.body.login, req.body.password, req.body.captcha_key);
			res.statusCode = code;
			res.send(payload);
		});

		// use below route for acquiring a ssl certificate
		this.app.get("/.well-known/acme-challenge/acme-challenge-key", (req,res) => {
			res.send("acme-challenge-response");
		});

		this.app.get("/", (req,res) => {
			res.send("You seem to have stumbled upon the front page of a Campfire instance, however a front page doesn't exist (yet). Use the /app subdomain, or check out our progress on https://github.com/servcord/api-server");
		});

		this.httpServer = http.createServer(this.app).listen(80);
		this.sslCertificateGenerator?.readCertsFromStorage().then((value)=>{
			this.httpsServer = https.createServer({ key: value.key, cert: value.cert }, this.app).listen(443);
		}).catch(()=>{
			this.sslCertificateGenerator?.generateSelfSigned().then((value)=>{
				this.httpsServer = https.createServer({ key: value.key, cert: value.cert }, this.app).listen(443);
			});
		});
	

		this.httpServer.on("upgrade", (request, socket, head) => {
			this.upgradeHandler(request, socket, head, "http");
		});

		if (!this.initHttps()) {
			const interval = setInterval(() => {
				// if init succeeds, stop the timeout
				if (this.initHttps()) {
					this.logger.info("initHttps succeeded.");
					clearInterval(interval);
				}
			}, 200);
		}
	}
	private initHttps(): boolean {
		if (!this.httpsServer) {
			this.logger.error("No https server during initHttps.");
			return false;
		}

		this.httpsServer.on("upgrade", (request, socket, head) => {
			this.upgradeHandler(request, socket, head, "https");
		});
		return true;
	}
	private upgradeHandler(request: http.IncomingMessage, socket: Socket, head: Buffer, type: "http" | "https") {
		if (!request.url) {
			this.logger.debugerror("Url was null.");
			return;
		}
		const url = new URL(request.url, "https://requiredforthenodejsgods.com");
		if (url.pathname === "/gateway/") {
			if (!this.gatewayServer) {
				this.logger.debugerror("gatewayServer was null.");
				return;
			}

			const args = {
				encoding: url.searchParams.get("encoding"),
				v: url.searchParams.get("v"),
				compress: url.searchParams.get("compress")
			};
			
			this.logger.debug("request for gateway version "+chalk.green(args.v)+" w/encoding: "+chalk.green(args.encoding)+" and compress: "+chalk.green(args.compress));
			this.gatewayServer.wsServer.handleUpgrade(request, socket, head, (ws) => {
				if (!this.gatewayServer) {
					return;
				}
				this.gatewayServer.wsServer.emit("connection", ws, request, args);
			});
		} else if (url.pathname === "/authgateway/") {
			if (!this.authGatewayServer) {
				this.logger.debugerror("authGatewayServer was null.");
				return;
			}
			this.logger.debug("request for authgateway");
		
			this.authGatewayServer.wsServer.handleUpgrade(request, socket, head, (ws) => {
				if (!this.authGatewayServer) {
					return;
				}
				this.authGatewayServer.wsServer.emit("connection", ws, request);
			});

		} else {
			socket.destroy();
		}
	}
	addErrorHandler(cb: ErrorHandler): void {
		throw new Error("Method not implemented.");
	}
	
}