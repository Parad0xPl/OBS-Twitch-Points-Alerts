import fs from "fs"
import Settings from "./Settings"
declare global {
    interface Window {
        fs: typeof fs,
        settings: Settings
    }
}