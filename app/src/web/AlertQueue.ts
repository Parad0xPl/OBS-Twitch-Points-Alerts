import { PointsRedeemed } from "./TwitchPubSug";
import { EventEmitter } from "events";

export type AlertElement = {
    filepath: string,
    id: string,
    rewardEvent: PointsRedeemed,
}

interface Queue<T> {
    on(event: "add", listener: (element: T)=>void): this;
    on(event: "remove", listener: (element: T)=>void): this;

    emit(event: "add", element: T): boolean;
    emit(event: "remove", element: T): boolean;
}

class Queue<T> extends EventEmitter {
    private arr: T[] = [];

    first(): T{
        return this.arr[0];
    }

    add(el: T){
        this.arr.push(el);
        this.emit("add", el);
    }

    remove(): T{
        let el = this.arr.shift();
        this.emit("remove", el)
        return el;
    }

    len(){
        return this.arr.length;
    }
}

export default Queue;