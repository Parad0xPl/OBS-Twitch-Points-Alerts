import Twitch from "./TwitchPubSug";
import electron, { ipcRenderer } from "electron";
import path from "path";
import generateID from "./utils/generateid";

let template = (id: string, instance: AlertFront) => {
    let template = `
    <div class="form-row">
        <div class="col-4">
            <div class="input-group">
                <div class="input-group-prepend">
                    <div class="input-group-text">Title</div>
                </div>
                <input type="text" class="form-control" id="rewardtitle">
            </div>
        </div>
        <div class="col-8">
            <div class="custom-file">
                <input type="button" class="custom-file-input" id="fileinput">
                <label class="custom-file-label" for="fileinput" id="filepath"></label>
            </div>
            <div class="form-btns">
                <button class="btn btn-primary btn-test" id="testButton">Test</button>
                <button class="btn btn-danger btn-remove" id="removeButton">Remove</button>
            </div>
        </div>
    </div>
`
    let el = document.createElement("form");
    el.id = id;
    el.className = "col-12";
    el.innerHTML = template;

    let rewardTitleInput = el.querySelector("#rewardtitle") as HTMLInputElement;
    rewardTitleInput.addEventListener("change", e => {
        console.log(id);
        instance.setReward(id, (e.target as HTMLInputElement).value);
        e.preventDefault();
    })

    let fileinputButton = el.querySelector("#fileinput") as HTMLInputElement;
    fileinputButton.addEventListener("click", e => {
        ipcRenderer.send("chooseFile", id);
        e.preventDefault();
    })

    let testButton =  el.querySelector("#testButton");
    testButton.addEventListener("click", e => {
        instance.test(id);
        e.preventDefault();
    })
    let removeButton =  el.querySelector("#removeButton");
    removeButton.addEventListener("click", e => {
        instance.remove(id);
        e.preventDefault();
    })

    return el;
}

class AlertFront {
    el: HTMLElement;
    
    binds: {
        [key: string]: HTMLFormElement;
    }

    constructor(private twitch: Twitch){
        this.el = document.getElementById("alerts");
        this.binds = {};
        this.updateBinds();

        electron.ipcRenderer.on("filepath", (event, id, value)=>{
            console.log("Got file from main process");
            this.setFilepath(id, value);
        })
    }

    updateBinds(){
        this.el.childNodes.forEach((val, key, par)=>{
            if(val.nodeName == "FORM"){
                let form = val as HTMLFormElement;
                if(form.id){
                    this.binds[form.id] = form;
                }
            }
        })
    }

    updateView(){
        this.updateBinds();
        let obj = window.settings.options.alerts;
        for(let key in obj){
            let el: HTMLFormElement;
            if(!this.binds[key]){
                let newEl = template(key, this);
                this.el.appendChild(newEl);
                this.binds[key] = newEl;
                el = newEl;
            }else{
                el = this.binds[key];
            }
            let reward = el.querySelector("#rewardtitle") as HTMLInputElement;
            reward.value = obj[key].rewardtitle;
            let filepath = el.querySelector("#filepath") as HTMLInputElement;
            if(obj[key].filepath){
                filepath.innerText = path.basename(obj[key].filepath);
            }else{
                filepath.innerText = "Choose File";
            }
        }
    }
    
    add(){
        this.updateBinds();
        let counter = 0;
        while(true){
            let newID = generateID(6);
            if(!(newID in this.binds)){
                window.settings.options.alerts[newID] = {
                    rewardtitle: "",
                    filepath: ""
                }
                window.settings.save();
                break;
            }
            if(counter > 5){
                throw new Error("Is this even possible?");
            }
            counter++;
        }
        this.updateView();
    }

    setReward(id: string, value: string){
        if(window.settings.options.alerts[id]){
            window.settings.options.alerts[id].rewardtitle = value;
            window.settings.save();
            this.updateView();
        }
    }

    setFilepath(id: string, value: string){
        if(window.settings.options.alerts[id]){
            window.settings.options.alerts[id].filepath = value;
            window.settings.save();
            this.updateView();
        }
    }

    test(id: string){
        this.twitch.emit("reward", {
            timestamp: "now",
            redemption: {
                id: "testid",
                channel_id: "test",
                redeemed_at: "now",
                reward: {
                    channel_id: "tester",
                    cost: 1000,
                    id: "tester",
                    is_sub_only: true,
                    is_user_input_required: true,
                    prompt: "",
                    title: window.settings.options.alerts[id].rewardtitle
                },
                status: "",
                user: {
                    display_name: "Tester",
                    id: "tester",
                    login: "tester"
                },
                user_input: "" 
            }
        })
    }

    remove(id: string){
        if(this.binds[id]){
            this.binds[id].remove();
            delete this.binds[id];
        }
        delete window.settings.options.alerts[id];
        window.settings.save();
        this.updateView();
    }
}
export default AlertFront