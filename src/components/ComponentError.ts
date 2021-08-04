export default class ComponentError extends Error {
	/**
	 * When the component crashes, this is the component that should be recreated. 
	 * 
	 * PLEASE USE A CLASS OR THINGS WILL CRASH! 
	 */
	clazz: any;
	/**
	 * The name of the component that crashed. Should be the class's name. 
	 */
	componentName: string;
	/**
	 * The friendly name of the component, shown on the UI to the user.
	 */
	componentFriendlyName?: string;
	/**
	 * Attempts to create a new component, based on the crashed component's name. Not safe, may return null.
	 */
	createNew(): any {
		try {
			return this.clazz.constructor.call(this);
		} catch (_) {
			return null;
		}
	}
	/**
	 * 
	 * @param componentName Use component's class name.
	 * @param clazz Just pass the component's class.
	 * @param message Optional message to use instead of the default.
	 * @param componentFriendlyName A friendly name to use for crash info.
	 */
	constructor(componentName: string, clazz: any, message?: string, componentFriendlyName?: string) {
		super(message || componentFriendlyName || componentName);
		this.componentName = componentName;
		this.clazz = clazz;
		this.componentFriendlyName = componentFriendlyName;
	}
}
export type ErrorHandler = { (e: ComponentError): void; };