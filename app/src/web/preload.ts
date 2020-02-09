import Settings, { initForm } from "./Settings";
import Twitch from "./TwitchPubSug"
import { ipcRenderer } from "electron"
import WebSocketServer from "./WSServer";
import AlertFront from "./AlertFront";

window.settings = new Settings()

const twitch = new Twitch();
const wss = new WebSocketServer();

wss.start();

let Alerts: AlertFront | undefined;

// TODO Write validator
function isValidToken(token: string): boolean{
  return token != ""
}

window.addEventListener("DOMContentLoaded", () => {
  initForm(window.settings);
  Alerts = new AlertFront(twitch);
  Alerts.updateView();
  
  let twitchstartstopButton = document.getElementById("twitchstartstop");
  twitch.bindButton(twitchstartstopButton);
  let refresher = () => twitch.updateElement();
  setInterval(refresher, 1000);
  setTimeout(refresher, 0);

  let wssstartstopButton = document.getElementById("wssstartstop");
  wss.bindButton(wssstartstopButton);
  refresher = () => wss.updateElement();
  setInterval(refresher, 1000);
  setTimeout(refresher, 0);

  let getTokenButton = document.getElementById("settGetToken");
  getTokenButton.addEventListener("click", e => {
    if(isValidToken(window.settings.options.twitch_client_id)){
      ipcRenderer.send('twitch-oauth', window.settings.options.twitch_client_id);
    }
  })

  ipcRenderer.on("twitch-oauth", (event, authcode: string)=>{
    console.log(authcode);
    window.settings.options.twitch_oauth_token = authcode;
    window.settings.save();
    window.settings.updateView();
  });

  twitchstartstopButton.addEventListener("click", e => {
    console.log("Start stop");
    if(twitch.status()){
      twitch.stop();
    }else{
      twitch.start();
    }
  })

  twitch.on("reward", (reward) => {
    let al = window.settings.options.alerts;
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
    // if(reward.redemption.id == "testid"){
    //   wss.sendToAll("src avatar.mp4");
    // }else{
    //   wss.sendToAll("src video.mp4");
    // }
    // wss.sendToAll("start");
    // setTimeout(()=>{
    //   wss.sendToAll("stop")
    // }, 10000)
  })

  let twitchError = document.getElementById("twitchError");
  twitch.on("error", (msg)=>{
    twitchError.innerText = msg;
  })
  twitch.on("start", ()=>{
    twitchError.innerText = "";
  })

  wssstartstopButton.addEventListener("click", e => {
    console.log("Start stop");
    if(wss.status()){
      wss.stop();
    }else{
      wss.changePort(window.settings.options.port)
      wss.start();
    }
  })

  let addAlertButton = document.getElementById("addAlert");
  addAlertButton.addEventListener("click", e => {
    Alerts.add();
  })
});