import zlib from "fast-zlib";
import lz4 from "lz4";
import erlpack from "erlpack";
import stream from "stream";

export interface IEncoder {
	encode(data: Buffer): Promise<Buffer>
	decode(data: Buffer): Promise<Buffer>
}
export interface ICompressor {
	compress(chunk: Buffer): Promise<Buffer>
	decompress(chunk: Buffer): Promise<Buffer>
}
export class Passthrough implements ICompressor, IEncoder {

	/**
	 * Returns the data you feed in as a promise.
	 */
	encode(chunk: Buffer): Promise<Buffer> {
		return Promise.resolve(chunk);
	}

	/**
	 * Returns the data you feed in as a promise.
	 */
	decode(chunk: Buffer): Promise<Buffer> {
		return Promise.resolve(chunk);
	}

	/**
	 * Returns the data you feed in as a promise.
	 */
	compress(chunk: Buffer): Promise<Buffer> {
		return Promise.resolve(chunk);
	}

	/**
	 * Returns the data you feed in as a promise.
	 */
	decompress(chunk: Buffer): Promise<Buffer> {
		return Promise.resolve(chunk);
	}

}
export class ErlangEncoder implements IEncoder {
	async encode(data: unknown): Promise<Buffer> {
		return new Promise((resolve, reject)=>{
			try  {
				const packed = erlpack.pack(data);
				resolve(Buffer.from(packed));
			} catch (e) {
				reject(e);
			}
		});
	}
	async decode(data: Buffer): Promise<Buffer> {
		return new Promise((resolve, reject)=>{
			try  {
				const unpacked = erlpack.unpack(data);
				resolve(Buffer.from(JSON.stringify(unpacked)));
			} catch (e) {
				reject(e);
			}
		});
	}
}
export class ZlibCompressor {
	private deflate: zlib.Deflate;
	private inflate: zlib.Inflate;

	/**
	 * Compress a chunk of data with the power of zlib.
	 * @returns A promise that resolves to your data.
	 */
	async compress(chunk: Buffer): Promise<Buffer> {
		return new Promise<Buffer>((resolve, reject)=>{
			resolve(this.deflate.process(chunk, zlib.constants.Z_SYNC_FLUSH));
		});
	}
	/**
	 * Decompress a chunk of data with the power of zlib.
	 * @returns A promise that resolves to your data.
	 */
	async decompress(chunk: Buffer): Promise<Buffer> {
		return new Promise<Buffer>((resolve, reject) => {
			resolve(this.inflate.process(chunk));
		});
	}
	constructor() {
		this.deflate = new zlib.Deflate();
		this.inflate = new zlib.Inflate();
	}
}
export class LZ4Compressor implements ICompressor {
	private encoder: stream.Transform;
	private decoder: stream.Transform;

	/**
	 * Encode a chunk of data really fast with lz4
	 * @returns A promise that resolves to your data.
	 */
	async compress(chunk: Buffer): Promise<Buffer> {
		return new Promise<Buffer>((resolve, reject) => {
			const data: Buffer[] = [];

			this.encoder.once("end", () => {
				resolve(Buffer.concat(data));
			});

			this.encoder.on("data", (chunk)=>{
				data.push(Buffer.from(chunk));
			});

			this.encoder.write(chunk, undefined, (e)=>{
				if (!e) {
					this.encoder.end();
					return;
				}
				reject(e);
			});
		});
	}

	/**
	 * Decode a chunk of data really fast with lz4
	 * @returns A promise that resolves to your data.
	 */
	async decompress(chunk: Buffer): Promise<Buffer> {
		return new Promise<Buffer>((resolve, reject) => {
			const data: Buffer[] = [];

			this.decoder.once("end", () => {
				resolve(Buffer.concat(data));
			});

			this.decoder.on("data", (chunk)=>{
				data.push(Buffer.from(chunk));
			});

			this.decoder.write(chunk, undefined, (e)=>{
				if (!e) {
					this.decoder.end();
					return;
				}
				reject(e);
			});
		});
	}
	constructor() {
		this.encoder = lz4.createEncoderStream();
		this.decoder = lz4.createDecoderStream();
	}
}
export function getSuitableEncoder(encoding: "etf" | "json"): IEncoder {
	switch (encoding) {
	case "etf":
		return new ErlangEncoder();
	case "json":
		return new Passthrough();
	default: 
		return new Passthrough();
	}
}
export function getSuitableCompressor(compression: "zlib-stream" | "lz4-stream"): ICompressor {
	switch (compression) {
	case "zlib-stream":
		return new ZlibCompressor();
	case "lz4-stream":
		return new LZ4Compressor();
	default: 
		return new ZlibCompressor();
	}
}