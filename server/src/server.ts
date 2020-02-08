
console.log("Starting");

import ws from "ws";
import rl from "readline";

const r = rl.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> "
})

const wss = new ws.Server({
    port: 8080
})

wss.on("connection", (ws)=>{
    // console.log("Something connected");
})

r.prompt();

r.on('line', line => {
    line = line.trim();
    wss.clients.forEach(cl =>{
        if(cl.readyState === ws.OPEN)
            cl.send(line)
    })
    r.prompt();
})