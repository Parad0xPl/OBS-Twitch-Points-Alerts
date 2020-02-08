import { app, BrowserWindow, ipcMain, dialog } from "electron";
import OAuthWindow from "./OAuthWindow";
import * as path from "path";

let mainWindow: Electron.BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    minWidth: 500,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "web/preload.js"),
      devTools: true,
      enableRemoteModule: false,
      defaultEncoding: "UTF8",
    },
    width: 800,
    
  });
  mainWindow.setMenu(null);

  mainWindow.webContents.openDevTools();
  mainWindow.loadFile(path.join(__dirname, "../web/index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

let OAuthWinInstance: OAuthWindow | undefined = undefined;

ipcMain.on('twitch-oauth', (event, arg) => {
  if(arg != ""){
    if(!OAuthWinInstance){
      OAuthWinInstance = new OAuthWindow(arg);
      OAuthWinInstance.openWindow({
        width: 400,
        height: 600,
        resizable: false
      });
      OAuthWinInstance.on("close", ()=>{
        OAuthWinInstance = undefined;
      })
      OAuthWinInstance.on("authcode", (authcode: string)=>{
        console.log("Authcode:", authcode);
        event.sender.send("twitch-oauth", authcode)
      })
    }
  }
});

let fileLock = false;

ipcMain.on("chooseFile", (ev, id: string)=>{
  if(fileLock){
    return;
  }

  fileLock = true;
  dialog.showOpenDialog(mainWindow, {
    title: "Wybierz wideo",
    filters: [
      {
        name: "Movies",
        extensions: ["mp4", "avi", "mkv"]
      },
      {
        name: "All",
        extensions: ["*"]
      }
    ],
    properties: [
      "openFile",
    ]
  })
  .then((file)=>{
    if(file.filePaths[0]){
      ev.sender.send("filepath", id, file.filePaths[0])
    }
    fileLock = false;
  })
  .catch((err)=>{
    console.log("Some error with open dialog");
    console.log(err);
    fileLock = false;
  })
})