import Config from "@servcord/shared/api/config/Config";
console.log(`Starting api with NodeJS ${process.version}`);
console.log(`Current platform: ${process.platform}, arch: ${process.arch}`);
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
