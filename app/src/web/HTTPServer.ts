import http from "http"
import {URL} from "url"
import fs from "fs"
import path from "path"

function parseAccept(head: string): string[]{
    let clientAccept = head.split(";");
    if(!(0 in clientAccept)){
        this.res.writeHead(400);
        this.res.end("Problem with accept header");
        return;
    }
    let acc = []
    for(let it of clientAccept){
        acc = acc.concat(acc, it.split(","))
    }

    return acc;
}

const playerpage: string = fs.readFileSync(
    path.join(__dirname, "../../obs/index.html"), "utf8");

export class HTTPRequest{
    private req: http.IncomingMessage;
    private res: http.ServerResponse;

    private url: URL;

    constructor(req: http.IncomingMessage,res: http.ServerResponse){
        this.req = req;
        this.res = res;

        this.url = new URL(req.url, `http://${req.headers.host}`);
    }

    notFound(){
        this.res.writeHead(404);
        this.res.end("Not Found");
    }

    internalError(){
        this.res.writeHead(500);
        this.res.end("Internal Server Error");
    }

    getPlayerIndex(){
        this.res.writeHead(200);
        this.res.end(playerpage.replace("<$wsport$>", 
          window.settings.options.wsport.toString()));
    }

    async getMP4(){
        let id = this.url.pathname.slice(5);

        console.log(this.req.headers);

        if(this.req.headers.accept){
            let formats = parseAccept(this.req.headers.accept);
            console.log(formats);
            if(!(formats.includes("video/*") 
                || formats.includes("video/mp4")
                || formats.includes("*/*"))){
                this.res.writeHead(400);
                this.res.end("mp4 not supported");
                return;
            }
        }

        if(id in window.settings.options.alerts){
            console.log(id);
            let path = window.settings.options.alerts[id].filepath;
            try {
                let stat = await fs.promises.stat(path);
                if(!stat.isFile()){
                    throw new Error("This is not a file");
                }

                if(this.req.headers.range &&
                     this.req.headers.range.startsWith("bytes=") ){
                    let pos = 
                      this.req.headers.range.slice(6).split("-");
                    let start = parseInt(pos[0], 10);
                    let total = stat.size;
                    let end = pos[1] ? parseInt(pos[1], 10) : total - 1;

                    this.res.setHeader("Accept-Ranges", "bytes");
                    this.res.setHeader("Content-Type", "video/mp4");
                    this.res.setHeader("Content-Range",
                      `bytes ${start}-${end}/${total}`);


                      let stream = fs.createReadStream(path, {
                          start,
                          end
                      });
                      this.res.writeHead(206);
                      stream.pipe(this.res);
                      return
                }else{
                    let stream = fs.createReadStream(path);
                    this.res.setHeader("Content-Type", "video/mp4");
                    this.res.writeHead(200);
                    stream.pipe(this.res);
                    return;
                }

            } catch(err){
                this.internalError();
                return
            }
            
        }else{
            this.notFound();
            return
        }
    }

    getHandler(){
        if(this.url.pathname.startsWith("/mp4/")){
            return this.getMP4();
        }else if(this.url.pathname == "/"){
            return this.getPlayerIndex();
        }else{
            return this.notFound();
        }
    }

    parse(){
        if(this.req.method == "GET"){
            return this.getHandler();
        }else{
            return this.notFound();
        }
    }

}

export class HTTPServer {
    private port: number;
    private server?: http.Server;

    private closing: boolean;

    constructor(){
        this.port = window.settings.options.httpport || 8050;
        this.closing = false;
    }

    setPort(port: number){
        if(this.server && this.server.listening){
            if(!this.closing){
                this.closing = true;
                this.server.close(()=>{
                    this.port = port;
                    this.closing = false;
                    this.listen();
                })
            }
        }else{
            this.port = port;
        }
    }

    create(){
        this.server = http.createServer((req, res) =>{
            let request = new HTTPRequest(req, res);
            request.parse();
        });
    }

    listen(){
        if(this.server){
            this.server.listen(this.port)
        }else{
            throw new Error("Listen before create")
        }
    }

}

export default HTTPServer;