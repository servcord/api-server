import IComponent from "components/IComponent";

class GlobalSingleton {
    static readonly instance = new GlobalSingleton();

    public components: IComponent[] = [];
}
export default GlobalSingleton.instance;