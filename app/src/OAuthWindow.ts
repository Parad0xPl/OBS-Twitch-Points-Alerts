import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import url from "url";
import querystring from "querystring";
import { isString } from "util";
import { EventEmitter } from "events";

function formatUrl(
    client_id: string,
    redirect_uri: string,
    response_type: string,
    scope: string[]
): string{
    return url.format({
        protocol: "https",
        hostname: "id.twitch.tv",
        pathname: "/oauth2/authorize",
        query: {
            client_id: client_id,
            redirect_uri: redirect_uri,
            response_type: response_type,
            scope: scope.join(" ")
        }
    });
}

function parseTwitchRedirect(twitchUrl: string): string{
    let parsed = url.parse(twitchUrl);
    let query = querystring.parse(parsed.hash.slice(1));
    if(isString(query["access_token"])){
        return query["access_token"];
    }
    return "";
}

declare interface OAuthWindow {
    on(event: "authcode", listener: (authcode: string) => void): this;
    on(event: "close", listener: () => void): this;

    emit(event: "authcode", authcode: string): boolean;
    emit(event: "close"): boolean;
}

class OAuthWindow extends EventEmitter {
    url: string;
    win?: BrowserWindow;



    constructor(clientId: string){
        super();
        if(clientId == ""){
            throw new Error("You need to specifie clientId");
        }
        this.url = formatUrl(
            clientId,
            "http://localhost",
            "token",
            ["channel:read:redemptions"]
        );
    }

    openWindow(windowParams: BrowserWindowConstructorOptions){
        this.win = new BrowserWindow(windowParams);
  
        // this.win.webContents.openDevTools();
        this.win.loadURL(this.url);
        this.win.show();

        this.win.webContents.on("will-redirect", (ev, nurl)=>{
            let authcode = parseTwitchRedirect(nurl);
            if(authcode != ""){
                this.emit("authcode", authcode);
                this.win.close();
            }
        })
        this.win.on("close", ()=>{
            this.emit("close")
        })
    }
}
export default OAuthWindow