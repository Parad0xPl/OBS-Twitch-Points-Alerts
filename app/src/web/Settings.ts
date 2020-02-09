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
    port: number,
    channel: string,
    alerts: {
        [key: string]: Alert
    }
}

const keys: Set<string> = new Set([
    "port",
    "twitch_client_id",
    "twitch_oauth_token",
    "channel",
    "alerts"
]);

class Settings {
    options: SettingsData = {
        twitch_client_id: "",
        twitch_oauth_token: "",
        port: 8045,
        channel: "",
        alerts: {}
    };
    filename: string;
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
    
    updateView(){
        inputs.ClientTID.value = this.options.twitch_client_id
        inputs.Port.value = this.options.port.toString()
        inputs.OAuthToken.value = this.options.twitch_oauth_token;
        inputs.Channel.value = this.options.channel;
    }
}

export default Settings

const inputs: {
    ClientTID?:HTMLInputElement,
    OAuthToken?:HTMLInputElement,
    Port?:HTMLInputElement,
    Channel?:HTMLInputElement
} = {}

export function initForm(settings: Settings){
    inputs.ClientTID = document.getElementById("settClientToken") as HTMLInputElement;
    inputs.OAuthToken = document.getElementById("settOAuthToken") as HTMLInputElement;
    inputs.Port = document.getElementById("settPort") as HTMLInputElement;
    inputs.Channel = document.getElementById("settChannel") as HTMLInputElement;

    settings.updateView();

    let saceForm = document.getElementById("sett");
    saceForm.addEventListener("submit", function(e){
        // Twitch Token
        settings.options.twitch_client_id = inputs.ClientTID.value;
        settings.options.channel = inputs.Channel.value;

        // Port
        let port: number = parseInt(inputs.Port.value);
        if(!isNaN(port) && port > 0 && port < 65535){
            settings.options.port = port;
            inputs.Port.value = port.toString();
        }else{
            console.log("Wrong value for port");
            inputs.Port.value = settings.options.port.toString();
            // TODO: Some error box
        }

        // All setted
        settings.save();
        settings.updateView();

        e.preventDefault();
        return false;
    });

    let saveAlert = document.getElementById("saveAlert");
    saveAlert.addEventListener("click", function(e){
        // Twitch Token
        settings.options.twitch_client_id = inputs.ClientTID.value;
        settings.options.channel = inputs.Channel.value;

        // Port
        let port: number = parseInt(inputs.Port.value);
        if(!isNaN(port) && port > 0 && port < 65535){
            settings.options.port = port;
            inputs.Port.value = port.toString();
        }else{
            console.log("Wrong value for port");
            inputs.Port.value = settings.options.port.toString();
            // TODO: Some error box
        }

        // All setted
        settings.save();
        settings.updateView();

        e.preventDefault();
        return false;
    });
}