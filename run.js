// Dependencies
import { execSync as ExecuteShell, exec as ExecuteShellA } from "child_process"
import open from "open"

// Compile the RIP
ExecuteShell("npx webpack-cli")

// Compile the API
ExecuteShell("cd ./api")
ExecuteShell("npm i")
ExecuteShell("npx tsc")

// Execute the API, async
ExecuteShellA("node lib/index.js").then(_ => {
    console.log("Started API...")
})

// Open the main thing in browser
open.openApp("./public/index.html").then(_ => {
    console.log("Done, opened browser.")
})