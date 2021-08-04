import ComponentError, { ErrorHandler } from "components/ComponentError";
import IComponent from "components/IComponent";
import { TypedEmitter } from "tiny-typed-emitter";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { AppModifier } from "old/appModifier";
import ExpressMain from "./ExpressMain";
import { ComponentNames } from "components/Components";
import Logger from "@servcord/shared/utils/Logger";

export default class WebappEndpoints extends TypedEmitter implements IComponent {
	router: express.IRouter;
	public logger: Logger;

	private get expressMain() {
		return global.components.getComponent<ExpressMain>(ComponentNames.ExpressMain);
	}

	constructor () {
		super();
		this.router = express.Router();
		this.logger = new Logger("WebappEndpoints");
		this.init();
	}
	private init() {
		const appModifier = new AppModifier();
		appModifier.init();

		const devAppModifier = new AppModifier();
		devAppModifier.init("/developers");

		// Dirty, dirty hacks for making sure our logger is used.
		const customLogger = {
			log: this.logger.info,
			debug: this.logger.debug,
			info: this.logger.info,
			warn: this.logger.warn,
			error: this.logger.error,
		};
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		require("http-proxy-middleware/dist/logger.js").getInstance().setProvider(() => customLogger);

		const routerMiddleware = createProxyMiddleware({ 
			target: "https://162.159.137.232", changeOrigin: false,
			headers: {
				"Host": "discord.com" // cloudflare will let us go if we have a Host header
			}, 
			secure: false
		});
		
		this.router.get("/assets/*", (req,res,next)=>{
			try {
				routerMiddleware(req,res,next);
			} catch (e) {
				console.error("Error while proxying request");
				console.error(e);
			}
		});		

		this.router.get("/app", (req,res,next)=>{
			appModifier.requestHandler(req,res,next);
		});

		this.router.get("/channels/*", (req,res,next)=>{
			appModifier.requestHandler(req,res,next);
		});
		this.router.get("/channels", (req,res,next)=>{
			appModifier.requestHandler(req,res,next);
		});

		this.router.get("/guild-discovery", (req,res,next)=>{
			appModifier.requestHandler(req,res,next);
		});

		this.router.get("/store", (req,res,next)=>{
			appModifier.requestHandler(req,res,next);
		});

		this.router.get("/register", (req,res,next)=>{
			appModifier.requestHandler(req,res,next);
		});

		this.router.get("/login", (req,res,next)=>{
			appModifier.requestHandler(req,res,next);
		});

		this.router.get("/invite/*", (req,res,next)=>{
			appModifier.requestHandler(req,res,next);
		});

		this.router.get("/developers/*", (req,res,next)=>{
			devAppModifier.requestHandler(req,res,next);
		});

		this.router.get("/developers", (req,res,next)=>{
			devAppModifier.requestHandler(req,res,next);
		});
		if (!this.expressMain) {
			console.error("ExpressMain is undefined");
			return;
		}
		this.expressMain.app.use(this.router);
	}
	addErrorHandler(cb: ErrorHandler): void {
		throw new Error("Method not implemented.");
	}
	
}