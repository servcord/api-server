/* eslint-disable semi */

import { TypedEmitter } from "tiny-typed-emitter";
import ComponentError from "components/ComponentError";

/**
 * A component is something that allows us to split Campfire into multiple pieces, so the entire server or client doesn't crash, instead disabling a piece of functionality until it starts working again.
 * Components can be easily initialized and put back into working order in a matter of seconds.
 * TLDR: Components are an easy way to "turn it off and on again" without restarting.
 * For example a component could allow logins or manage message formatting. 
 */
export default interface IComponent extends TypedEmitter {
    /**
     * Adds an error handler, so when things go wrong, you get to know how without try/catches.
     * Also, ComponentError tells you component-specific things.
     */
    addErrorHandler(cb: (e: ComponentError) => never): void;
}