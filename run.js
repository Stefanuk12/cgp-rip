// Dependencies
import { execSync as ExecuteShell, exec as ExecuteShellA } from "child_process"
import { open as OpenWindow } from "open"

// Install all dependencies
ExecuteShell("npm i")

// Compile the RIP
ExecuteShell("npx webpack-cli")

// Compile the API
ExecuteShell("cd ./api")
ExecuteShell("npm i")
ExecuteShell("npx tsc")

// Execute the API, async
ExecuteShellA("node lib/index.js")

// Open the main thing in browser
OpenWindow("../public/index.html").then(_ => {
    console.log("Done, opened browser.")
})