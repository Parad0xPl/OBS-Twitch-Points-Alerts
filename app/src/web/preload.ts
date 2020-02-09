import Settings from "./Settings";
import Twitch from "./TwitchPubSug"
import { ipcRenderer } from "electron"
import WebSocketServer from "./WSServer";
import AlertFront from "./AlertFront";

let settings = window.settings = new Settings()

const twitch = new Twitch();
const wss = new WebSocketServer();

wss.start();

let Alerts: AlertFront | undefined;

// TODO Write validator
function isValidToken(token: string): boolean{
  return token != ""
}

window.addEventListener("DOMContentLoaded", () => {

  settings.bind(
    document.getElementById("settClientToken") as HTMLInputElement,
    document.getElementById("settOAuthToken") as HTMLInputElement,
    document.getElementById("settPort") as HTMLInputElement,
    document.getElementById("settChannel") as HTMLInputElement,
    document.getElementById("settSave") as HTMLButtonElement,
    document.getElementById("saveAlert") as HTMLButtonElement
  )

  Alerts = new AlertFront(twitch);
  Alerts.updateView();

  twitch.bind(
    document.getElementById("twitchstartstop") as HTMLButtonElement,
    document.getElementById("twitchError")
  );

  wss.bind(
    document.getElementById("wssstartstop") as HTMLButtonElement
  )

  let getTokenButton = document.getElementById("settGetToken");
  getTokenButton.addEventListener("click", e => {
    if(isValidToken(settings.options.twitch_client_id)){
      ipcRenderer.send('twitch-oauth', settings.options.twitch_client_id);
    }
  })

  ipcRenderer.on("twitch-oauth", (event, authcode: string)=>{
    console.log(authcode);
    settings.options.twitch_oauth_token = authcode;
    settings.save();
    settings.updateView();
  });

  twitch.on("reward", (reward) => {
    let al = settings.options.alerts;
    console.log("Reward");
    for(let key in al){
      if(al.hasOwnProperty(key)){
        if(al[key].rewardtitle === reward.redemption.reward.title){
          console.log("Trigering:", al[key].rewardtitle);
          wss.sendToAll(JSON.stringify([
            {
              cmd: "src",
              src: al[key].filepath
            },
            {
              cmd: "start"
            }
          ]));
        }
      }
    }
  })

  let addAlertButton = document.getElementById("addAlert");
  addAlertButton.addEventListener("click", e => {
    Alerts.add();
  })
});