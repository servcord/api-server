import LoginHandler from "components/auth/LoginHandler";
import GatewayServer from "components/gateway/GatewayServer";
import AuthGatewayServer from "components/gateway/AuthGatewayServer";
import { ComponentArray } from "components/IComponent";
import { ComponentNames } from "components/Components";
import TokenHandler from "components/auth/TokenHandler";
import Logger from "./shared/utils/Logger";
import WebappEndpoints from "components/rest/WebappEndpoints";
import ExpressMain from "components/rest/ExpressMain";
import SSLCertificateGenerator from "components/security/SSLCertificateGenerator";
import StorageManager from "components/backend/StorageManager";
import UserManager from "components/auth/UserManager";

const MainLogger = new Logger("Main");

// turn on debug
process.env.DEBUG = "true";

MainLogger.info(`Starting api-server with NodeJS ${process.version}`);
MainLogger.info(`Current platform: ${process.platform}, arch: ${process.arch}`);

const components = new ComponentArray();
global.components = components;
components
	.setComponent(ComponentNames.StorageManager, new StorageManager())
	.setComponent(ComponentNames.TokenHandler, new TokenHandler())
	.setComponent(ComponentNames.UserManager, new UserManager())
	.setComponent(ComponentNames.SSLCertificateGenerator, new SSLCertificateGenerator())
	.setComponent(ComponentNames.LoginHandler, new LoginHandler())
	.setComponent(ComponentNames.GatewayServer, new GatewayServer())
	.setComponent(ComponentNames.AuthGatewayServer, new AuthGatewayServer())
	.setComponent(ComponentNames.ExpressMain, new ExpressMain())
	.setComponent(ComponentNames.WebappEndpoints, new WebappEndpoints());

global.components.getComponent<UserManager>(ComponentNames.UserManager)?.createUser("testuser", "test@campfire.local", "test").then((id)=>{
	console.log("created test user: "+id);
}).catch((e)=>{
	console.log("Failed to create test user: ");
	console.error(e);
});