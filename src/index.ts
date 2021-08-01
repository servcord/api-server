import Config from "@servcord/shared/api/config/Config";
import express from "express";
import { AppModifier } from "old/appModifier";

console.log(`Starting api with NodeJS ${process.version}`);
console.log(`Current platform: ${process.platform}, arch: ${process.arch}`);
import { createProxyMiddleware } from "http-proxy-middleware";
import LoginHandler from "components/auth/LoginHandler";
import GatewayServer from "components/gateway/GatewayServer";
import AuthGatewayServer from "components/gateway/AuthGatewayServer";
const loginHandler = new LoginHandler();
const gatewayServer = new GatewayServer();
const authGatewayServer = new AuthGatewayServer();

if (process.features.ipv6) {
	console.log("IPv6 is supported.");
}

if (process.features.tls) {
	console.log("TLS is supported.");
}

try {
	require("crypto");
} catch (_) {
	console.log("Crypto module is NOT supported.");
	process.exit(1);
}
const test = new Config<{test: string}>("test", "user", "servcord/api-server");
console.log(test.data);
test.data.test = "h";
test.save().then(()=>{
	console.log("saved");
});
const app = express();
app.use(express.json({limit: "50mb"}));
app.use((req,res,next) => {
	if (req.originalUrl.includes("/science")) {
		next();
		return;
	}
	console.log(`DEBUG: ${req.method} ${req.headers.host}${req.originalUrl}`);
	console.log("DEBUG:" +JSON.stringify(req.body));
	next();
});
const appModifier = new AppModifier();
appModifier.init();
const devAppModifier = new AppModifier();
devAppModifier.init("/developers");
const routerMiddleware = createProxyMiddleware(
	{ target: "https://162.159.137.232", changeOrigin: false,
		headers: {
			"Host": "discord.com" //cloudflare will let us go if we have a Host header
		}, 
		secure: false
	});
app.get("/app", (req,res,next)=>{
	appModifier.requestHandler(req,res,next);
});

app.get("/guild-discovery", (req,res,next)=>{
	appModifier.requestHandler(req,res,next);
});

app.get("/store", (req,res,next)=>{
	appModifier.requestHandler(req,res,next);
});

app.get("/register", (req,res,next)=>{
	appModifier.requestHandler(req,res,next);
});

app.get("/login", (req,res,next)=>{
	appModifier.requestHandler(req,res,next);
});

app.get("/invite/*", (req,res,next)=>{
	appModifier.requestHandler(req,res,next);
});

app.get("/developers/*", (req,res,next)=>{
	devAppModifier.requestHandler(req,res,next);
});

app.get("/developers", (req,res,next)=>{
	devAppModifier.requestHandler(req,res,next);
});

app.use("/api/v9/auth/login", function (req,res) {
	const { code, payload } = loginHandler.handleLogin(req.body.login, req.body.password, req.body.captcha_key);
	res.statusCode = code;
	res.send(payload);
});

app.get("/", (req,res,next)=>{
	res.redirect("/app");
});
app.get("/assets/*", (req,res,next)=>{
	try {
		routerMiddleware(req,res,next);
	} catch (e) {
		console.error("Error while proxying request");
		console.error(e);
	}
});
app.use("/api/updates", function (req, res) {
	res.json({});
});
app.use("/api/modules", routerMiddleware);
app.use("/api/v9/gateway",function (req, res) {
	res.json({
		"url": "wss://localhost:8877"
	});
});
const httpServer = app.listen(80);
gatewayServer.init();
authGatewayServer.init();
httpServer.on("upgrade", (request, socket, head) => {
	console.log("requested upgrade event with url "+request.url);
	const { pathname } = new URL(request.url, "https://requiredforthenodejsgods.com");
	console.log(pathname);
	if (pathname === "/gateway/") {
		console.log("request for gateway");

		gatewayServer.wsServer.handleUpgrade(request, socket, head, function done(ws) {
			gatewayServer.wsServer.emit("connection", ws, request);
		});
		
	} else if (pathname === "/authgateway/") {
		console.log("request for authgateway");
		
		authGatewayServer.wsServer.handleUpgrade(request, socket, head, function done(ws) {
			authGatewayServer.wsServer.emit("connection", ws, request);
		});

	} else {
		socket.destroy();
	}
});
  
(global as any).app = app;