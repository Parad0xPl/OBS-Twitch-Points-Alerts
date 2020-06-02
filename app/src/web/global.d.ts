import fs from "fs"
import Settings from "./Settings"
import HTTPServer from "./HTTPServer"
declare global {
    interface Window {
        fs: typeof fs,
        settings: Settings,
        httpserver: HTTPServer
    }
}