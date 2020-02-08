import ws from "ws";

class WebSocketServer {
    server?: ws.Server;

    button?:HTMLElement;
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
    }

    stop(){
        if(!this.status()){
            console.log("Trying to stop websocket when it's not running");
            return
        }
        this.server.close();
    }

    bindButton(btn: HTMLElement){
        this.button = btn;
    }

    updateElement(){
        let status = document.getElementById("wssStatus");
        if(this.status()){
            status.innerText = "Online"
            status.style.color = "Green";
            if(this.button)
                this.button.innerText = "Stop";
        }else{
            status.innerText = "Offline"
            status.style.color = "red";
            if(this.button)
                this.button.innerText = "Start";
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