import { TypedEmitter } from "tiny-typed-emitter";

interface HeartbeaterEvents {
	"beat": () => void;
	"timeout": () => void;
}  
/**
 * A basic heartbeater. You need to start it after constructing it.
 * @argument interval How often to beat in ms
 * @argument timeout How long to wait before sending the timeout event
 */
export class Heartbeater extends TypedEmitter<HeartbeaterEvents> {
	public interval: number;
	public timeout: number;
	private intervalHandle?: NodeJS.Timeout;
	private timeoutHandle?: NodeJS.Timeout;
	constructor (interval: number, timeout: number) {
		super();
		this.interval = interval;
		this.timeout = timeout;
	}
	public start(): void {
		if (this.intervalHandle) {
			this._stop();
		}
		this._start();
	}
	public beat(): void {
		this._stop();
		this._start();
	}
	private _start() {
		this.intervalHandle = setInterval(() => {
			this.timeoutHandle = setTimeout(() => {
				this.timeoutHandle == null;
				this.emit("timeout");
			}, this.timeout);
		}, this.interval);
	}
	private _stop() {
		if (this.intervalHandle) {
			clearInterval(this.intervalHandle);
		}
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
		}
		this.intervalHandle == null;
		this.timeoutHandle == null;
	}
}