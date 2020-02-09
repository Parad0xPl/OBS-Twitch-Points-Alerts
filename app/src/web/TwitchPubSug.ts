import WS from "ws"
import translateTwitchUser from "./translateTwitchUser";
import { EventEmitter } from "events"
import { runInThisContext } from "vm";

export interface PointsRedeemed {
    timestamp: string;
    redemption: {
        id: string,
        user: {
            id: string,
            login: string,
            display_name: string
        },
        channel_id: string,
        redeemed_at: string,
        reward: {
            id: string,
            channel_id: string,
            title: string,
            prompt: string,
            cost: number,
            is_user_input_required: boolean,
            is_sub_only: boolean
        
        }
        user_input: string,
        status: string
    }
}

export interface ChannelPointsEvent {
    type: "reward-redeemed",
    data: PointsRedeemed 
}

export interface ResponseEvent {
    type: "RESPONSE",
    error: string,
    nonce?: string
}
export interface MesageEvent {
    type: "MESSAGE",
    data: {
        message: string,
        topic: string
    }
}

export type TwitchEvent = MesageEvent & ResponseEvent

declare interface Twitch {
    on(event: "reward", listner: (reward: PointsRedeemed)=>void): this;
    on(event: "error", listner: (msg: string)=>void): this;
    on(event: "start", listner: ()=>void): this;

    emit(event: "reward", reward: PointsRedeemed): boolean;
    emit(event: "error", msg: string): boolean;
    emit(event: "start"): boolean;
}

class Twitch extends EventEmitter{
    stats = {
        pingCounter: 0,
        pongCounter: 0
    }

    ws?: WS;
    private pingInterval: NodeJS.Timeout;

    private interval?: NodeJS.Timeout;

    private inputs: {
        StartStopButton?: HTMLButtonElement,
        ErrStatus?: HTMLElement
    } = {};

    constructor(){
        super();
    }

    async spawn(): Promise<WS>{
        let translateID:string = "";
        try{
            translateID = await translateTwitchUser(window.settings.options.channel);
        }catch(e){
            this.emit("error", "Can't translate username to id");
        }
        if(translateID == ""){
            throw new Error(`There is no user with nickname ${window.settings.options.channel}`);
        }

        let ws = new WS("wss://pubsub-edge.twitch.tv");

        this.pingInterval = setInterval(()=>{
            ws.send(JSON.stringify({
                "type": "PING"
            }));
            this.stats.pingCounter++;
        }, 1000*60*5)

        let nonce = "ascdas89412casl";

        ws.on("open", ()=>{
            console.log("Opened websocket");
            this.updateElement();
            ws.send(JSON.stringify({
                "type": "LISTEN",
                "nonce": nonce,
                "data": {
                    "topics": ["channel-points-channel-v1."+translateID],
                    "auth_token": window.settings.options.twitch_oauth_token
                }
            }));
        })
        ws.on("message", (data)=>{
            console.log("Data:");
            let dataObj = JSON.parse(data.toString()) as TwitchEvent;
            console.log(dataObj);
            if(dataObj.type == "RESPONSE"){
                if(dataObj.error != ""){
                    this.emit("error", dataObj.error);
                    this.stop();
                }
            }else if(dataObj.type == "MESSAGE"){
                let message = JSON.parse(dataObj.data.message) as ChannelPointsEvent;
                if(message.type == "reward-redeemed"){
                    this.emit("reward", message.data);
                }

            }else if(dataObj.type == "PONG"){
                this.stats.pongCounter++;
            }else{
                console.log("Unsupported event");
            }
        })
        ws.on("close", ()=>{
            clearInterval(this.pingInterval)
            this.pingInterval = undefined;
            this.updateElement();
        })

        return ws;
    }

    start(){
        if(!this.ws){
            this.spawn().then(ws => {
                this.emit("start");
                this.ws = ws;
            }).catch(e => {
                this.emit("error", e);
            });
        }
    }

    stop(){
        if(this.ws){
            this.ws.close();
            this.ws = undefined;
        }
    }

    status(): boolean{
        if(this.ws){
            return this.ws.readyState == this.ws.OPEN
        }
        return false;
    }

    bind(
        StaStoBtn: HTMLButtonElement,
        ErrStatus: HTMLElement
    ){
        this.inputs.StartStopButton = StaStoBtn;
        this.inputs.ErrStatus = ErrStatus;

        this.on("error", (msg)=>{
          this.inputs.ErrStatus.innerText = msg;
        })
        this.on("start", ()=>{
          this.inputs.ErrStatus.innerText = "";
        })

        this.inputs.StartStopButton.addEventListener("click", e => {
            console.log("Start stop");
            if(this.status()){
              this.stop();
            }else{
              this.start();
            }
          })

        let refresher = () => this.updateElement();
        this.interval = setInterval(refresher, 1000);
        setTimeout(refresher, 0);
    }

    updateElement(){
        let status = document.getElementById("twitchStatus");
        if(this.status()){
            status.innerText = "Online";
            status.style.color = "Green";
            if(this.inputs.StartStopButton)
                this.inputs.StartStopButton.innerText = "Stop";
        }else{
            status.innerText = "Offline";
            status.style.color = "red";
            if(this.inputs.StartStopButton)
                this.inputs.StartStopButton.innerText = "Start";
        }
    }
}

export default Twitch;