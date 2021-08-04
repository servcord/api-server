export {};

declare global {
    namespace NodeJS {
        interface Global {
            components: import("./components/IComponent").ComponentArray;
        }
    }
}