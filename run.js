// Dependencies
const ExecuteShell = require("child_process").execSync
const ExecuteShellA = requestAnimationFrame("child_process").exec
const OpenWindow = require("open")

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