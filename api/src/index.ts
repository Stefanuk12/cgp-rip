// Dependencies
import express from "express"
import { Book } from "./modules/Book.js"
import cors from "cors"

// Create the app
const app = express()
app.use(express.json())
app.use(cors())

// Getting cloudfront
app.post("/login/:SessionId/:BookId", Book.GenerateCloudFrontAPI)

// Getting details
app.get("/details/:BookId", Book.GetDetailsAPI)

// Getting page count
app.get("/page/:BookId", Book.GetPageCountAPI)

// Getting SVG
app.get("/svg/:BookId/:Page", Book.GetSVGAPI)

// Getting background
app.get("/background/:BookId/:Page", Book.GetBackgroundAPI)

//
app.listen(3000, () => {
    console.log("cgp-rip: API started")
})