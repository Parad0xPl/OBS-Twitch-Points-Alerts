import Settings from "./Settings";
import Twitch from "./TwitchPubSug"
import { ipcRenderer } from "electron"
import WebSocketServer from "./WSServer";
import AlertFront from "./AlertFront";
import Queue, { AlertElement } from "./AlertQueue";
import generateID from "./utils/generateid";

let settings = window.settings = new Settings()

const twitch = new Twitch();
const wss = new WebSocketServer();

wss.start();


const AlertQueue = new Queue<AlertElement>();

function sendPath(path: string){
  wss.sendToAll(JSON.stringify([
    {
      cmd: "src",
      src: path
    },
    {
      cmd: "start"
    }
  ]));
}

wss.on("waitingForVideo", ()=>{
  if(AlertQueue.len() > 0){
    let el = AlertQueue.remove();
    sendPath(el.filepath);
  }
})
wss.on("ended", ()=>{
  if(AlertQueue.len() > 0){
    let el = AlertQueue.remove();
    sendPath(el.filepath);
  }
})

AlertQueue.on("remove", ()=>{
  AlertQueue.updateView();
})

AlertQueue.on("add", ()=>{
  AlertQueue.updateView();
  wss.sendToAll(JSON.stringify([{
    cmd: "videoInQueue"
  }]))
})

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

  AlertQueue.bind(
    document.getElementById("queueCounter")
  )
  AlertQueue.updateView();

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
    settings.options.twitch_oauth_token = authcode;
    settings.save();
    settings.updateView();
  });

  twitch.on("reward", (reward) => {
    let al = settings.options.alerts;
    for(let key in al){
      if(al.hasOwnProperty(key)){
        if(al[key].rewardtitle === reward.redemption.reward.title){
          let newid = generateID(12);
          AlertQueue.add({
            filepath: al[key].filepath,
            id: newid,
            rewardEvent: reward
          })

          // console.log("Trigering:", al[key].rewardtitle);
          // sendPath(al[key].filepath);
        }
      }
    }
  })

  let addAlertButton = document.getElementById("addAlert");
  addAlertButton.addEventListener("click", e => {
    Alerts.add();
  })
  let abortAlertButton = document.getElementById("abortAlert");
  abortAlertButton.addEventListener("click", e => {
    AlertQueue.empty();
    AlertQueue.updateView();
    wss.sendToAll(JSON.stringify([{
      cmd: "abort"
    }]))
  })
  let skipAlertButton = document.getElementById("skipAlert");
  skipAlertButton.addEventListener("click", e => {
    wss.sendToAll(JSON.stringify([{
      cmd: "abort"
    }]))
  })
});