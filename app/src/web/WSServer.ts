import ws from "ws";

interface EndEvent {
    action: "end"
}

type ClientMessage = EndEvent

class WebSocketServer {
    server?: ws.Server;

    private interval?: NodeJS.Timeout;
    private inputs: {
        StartStopButton?: HTMLButtonElement
    } = {};

    constructor(private port: number = 8045){
        if(! (!isNaN(port) && port > 0 && port < 65535)){
            throw new Error("Malicious port")
        }
    }

    status(): boolean{
        return !!this.server;
    }

    changePort(newport: number){
        if(this.status()){
            throw new Error("Can't change port while server is running");
        }
        this.port = newport;
    }

    start(){
        if(this.status()){
            console.log("Trying to start websocket when it is already running");
            return
        }
        this.changePort(window.settings.options.port);
        this.server = new ws.Server({
            port: this.port
        });

        this.server.on("close", ()=>{
            this.server = undefined;
        })
        this.server.on("connection", (cl) => {
            cl.on("message", msg => {
                this.connectionHandler(msg.toString());
            })
        })
    }

    stop(){
        if(!this.status()){
            console.log("Trying to stop websocket when it's not running");
            return
        }
        this.server.close();
    }

    connectionHandler(rawMsg: string){
        let msg: ClientMessage = JSON.parse(rawMsg);
    }

    bind(
        StaStoBtn: HTMLButtonElement
    ){
        this.inputs.StartStopButton = StaStoBtn;

        let refresher = () => this.updateElement();
        this.interval = setInterval(refresher, 1000);
        setTimeout(refresher, 0);

        this.inputs.StartStopButton.addEventListener("click", e => {
          console.log("Start stop");
          if(this.status()){
            this.stop();
          }else{
            this.changePort(window.settings.options.port)
            this.start();
          }
        })
    }

    updateElement(){
        let status = document.getElementById("wssStatus");
        if(this.status()){
            status.innerText = "Online"
            status.style.color = "Green";
            if(this.inputs.StartStopButton)
                this.inputs.StartStopButton.innerText = "Stop";
        }else{
            status.innerText = "Offline"
            status.style.color = "red";
            if(this.inputs.StartStopButton)
                this.inputs.StartStopButton.innerText = "Start";
        }
    }

    sendToAll(msg: string){
        if(this.server){
            this.server.clients.forEach((value) => {
                value.send(msg)
            })
        }
    }
}

export default WebSocketServer;