import { writeFileSync, readFileSync, existsSync, fstat, copyFileSync } from "fs"
import { resolve } from "path";
import { isArray } from "util";
import electron, { ipcMain, ipcRenderer } from "electron";

function isSameKeys(o: Object, keys: Set<string>){
    let objectkeys = Object.keys(o);
    for(let i=0;i<objectkeys.length;i++){
        if(!keys.has(objectkeys[i])){
            return false;
        }
    }
    return true;
}

export type Alert = {
    rewardtitle: string,
    filepath: string
}

const AlertKeys: Set<string> = new Set([
    "rewardtitle",
    "filepath"
])

export type SettingsData = {
    twitch_client_id: string,
    twitch_oauth_token: string,
    wsport: number,
    httpport: number,
    channel: string,
    alerts: {
        [key: string]: Alert
    }
}

const keys: Set<string> = new Set([
    "wsport",
    "httpport",
    "twitch_client_id",
    "twitch_oauth_token",
    "channel",
    "alerts"
]);

class Settings {
    options: SettingsData = {
        twitch_client_id: "",
        twitch_oauth_token: "",
        wsport: 8045,
        httpport: 8050,
        channel: "",
        alerts: {}
    };
    filename: string;

    private inputs: {
        ClientID?:HTMLInputElement,
        OAuthToken?:HTMLInputElement,
        WSPort?:HTMLInputElement,
        HTTPPort?:HTMLInputElement,
        Channel?:HTMLInputElement,
        SaveButton?:HTMLButtonElement,
        AlertButton?:HTMLButtonElement
    } = {};

    constructor(filename = "settings.json"){
        this.filename = this.getPath(filename);
        this.moveOldConfig(filename);
        this.load();
    }

    moveOldConfig(filename: string){
        let localSettings = resolve(process.cwd(), filename);
        if(existsSync(localSettings) && !existsSync(this.filename)){
            copyFileSync(localSettings, this.filename);
        }
    }

    getPath(filename: string):string{
        let path:string = ipcRenderer.sendSync("getSettingsPath", filename);
        return path;
    }

    /**
     * save settings to file
     *
     * @memberof Settings
     */
    save(){
        let dataString: string = JSON.stringify(this.options, undefined, "\t");
        writeFileSync(this.filename, dataString, {
            encoding: "utf8",
            mode: 0o600,
            flag: "w"
        });
    }
    /**
     * load settings from file
     *
     * @memberof Settings
     */
    load(){
        if(!existsSync(this.filename)){
            this.save();
            return;
        }
        let rawData: string = readFileSync(this.filename, {
            encoding: "utf8"
        });
        let data = JSON.parse(rawData);
        for(let key of keys.values()){
            if(key == "alerts" && data[key] && isArray(data[key])){
                let alertArray = {};
                for(let it of Object.entries(data["alerts"])){
                    if(isSameKeys(it[1], AlertKeys)){
                        alertArray[it[0]] = it[1];
                    }
                }
                this.options["alerts"] = alertArray;
            }else if(data[key]){
                this.options[key] = data[key];
            }
        }
    }
    
    bind(
        ClientID:HTMLInputElement,
        OAuthToken:HTMLInputElement,
        WSPort:HTMLInputElement,
        HTTPPort:HTMLInputElement,
        Channel:HTMLInputElement,
        SaveButton:HTMLButtonElement,
        AlertButton:HTMLButtonElement
    ){
        this.inputs.ClientID = ClientID;
        this.inputs.OAuthToken = OAuthToken;
        this.inputs.WSPort = WSPort;
        this.inputs.HTTPPort = HTTPPort;
        this.inputs.Channel = Channel;
        this.inputs.SaveButton = SaveButton;
        this.inputs.AlertButton = AlertButton;

        this.updateView();

        this.inputs.SaveButton.addEventListener("click", (e)=>{
            // Twitch Token
            this.options.twitch_client_id = this.inputs.ClientID.value;
            this.options.channel = this.inputs.Channel.value;
    
            // WSPort
            let wsport: number = parseInt(this.inputs.WSPort.value);
            if(!isNaN(wsport) && wsport > 0 && wsport < 65535){
                this.options.wsport = wsport;
                this.inputs.WSPort.value = wsport.toString();
            }else{
                console.log("Wrong value for wsport");
                this.inputs.WSPort.value = this.options.wsport.toString();
                // TODO: Some error box
            }

            // HTTP Port
            let httpport: number = parseInt(this.inputs.HTTPPort.value);
            if(!isNaN(httpport) && httpport > 0 && httpport < 65535){
                if(this.options.httpport != httpport){
                    window.httpserver.setPort(httpport);
                }
                this.options.httpport = httpport;
                this.inputs.HTTPPort.value = httpport.toString();
            }else{
                console.log("Wrong value for httpport");
                this.inputs.HTTPPort.value = this.options.httpport.toString();
                // TODO: Some error box
            }
    
            // All setted
            this.save();
            this.updateView();
    
            e.preventDefault();
            return false;
        });

        this.inputs.AlertButton.addEventListener("click", (e)=>{
            // Twitch Token
            this.options.twitch_client_id = this.inputs.ClientID.value;
            this.options.channel = this.inputs.Channel.value;
      
            // Port
            let port: number = parseInt(this.inputs.WSPort.value);
            if(!isNaN(port) && port > 0 && port < 65535){
                this.options.wsport = port;
                this.inputs.WSPort.value = port.toString();
            }else{
                console.log("Wrong value for port");
                this.inputs.WSPort.value = this.options.wsport.toString();
                // TODO: Some error box
            }
      
            // All setted
            this.save();
            this.updateView();
      
            e.preventDefault();
            return false;
        });
    }

    updateView(){
        this.inputs.ClientID.value = this.options.twitch_client_id
        this.inputs.WSPort.value = this.options.wsport.toString()
        this.inputs.HTTPPort.value = this.options.httpport.toString()
        this.inputs.OAuthToken.value = this.options.twitch_oauth_token;
        this.inputs.Channel.value = this.options.channel;
    }
}

export default Settings