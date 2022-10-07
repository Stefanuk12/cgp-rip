// Dependencies
import { /*CreateFolder, */VerboseLog } from "./Utilities"
//import * as fs from "fs"

//
const baseURL = "https://library.cgpbooks.co.uk/digitalcontent" 

//
function CreateFormData(Data: Object) {
    const data = new URLSearchParams()
    for (const [i, v] of Object.entries(Data)) {
        data.append(i, v)
    }
    return data
}

//
async function DoRequest(input: RequestInfo | URL, init?: RequestInit, response: "json" | "arraybuffer" = "json", cookie: string = "") {
    const Response = await fetch(input, init)
    return response == "json" ? await Response.json() : await Response.arrayBuffer()
}

//
export interface ICloudFront {
    "CloudFront-Signature": string
    "CloudFront-Policy": string
    "CloudFront-Key-Pair-Id": string
}
export interface IBook {
    BookId: string
    CloudFront: ICloudFront
}
export interface Book extends IBook {}
export class Book {
    // Constructor
    constructor(Data: IBook) {
        Object.assign(this, Data)
    }

    // Generates the cloudfront stuff
    static async GenerateCloudFront(BookId: string, SessionId: string) {
        // Send the request
        document.cookie = `ASP.Net_SessionId=${SessionId}`
        const Response = await fetch(`https://library.cgpbooks.co.uk/digitalaccess/${BookId}/Online`, {
            method: "POST",
            headers: {
                Cookie: document.cookie,
                Origin: `https://library.cgpbooks.co.uk/digitalaccess/${BookId}/Online`
            },
            body: CreateFormData({
                UserGuid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa",
                Signature: Math.random().toString(36).slice(2, 42) // does not matter what this is
            }),
            mode: "same-origin",
            credentials: "include"
        })

        //
        if (Response.status != 200) {
            const Message = "Unable to get cloudfront"
            alert(Message)
            throw(Message)
        }

        // Parse the cookies
        const SetCookies = Response.headers.get("set-cookie").split(";")
        if (!SetCookies)
            throw(new Error("Did not get set-cookie"))
        const SetCookiesTrimmed = SetCookies.map(v => {
            return v.substring(0, v.indexOf(";"))
        })
        
        // Add each cookie to the cloudfront
        const CloudFrontCookies: ICloudFront = {
            "CloudFront-Signature": "",
            "CloudFront-Policy": "",
            "CloudFront-Key-Pair-Id": ""
        }
        SetCookiesTrimmed.forEach(cookie => {
            const [name, value] = cookie.split("=")
            if (name in CloudFrontCookies)
                CloudFrontCookies[name as keyof typeof CloudFrontCookies] = value
        })

        // Return
        return {CloudFrontCookies, SetCookiesTrimmed}
    }
    async GenerateCloudFront(SessionId: string) {
        return await Book.GenerateCloudFront(this.BookId, SessionId)
    }

    // Gets the cookies as a string
    static getCookieString(CloudFront: ICloudFront) {
        return `CloudFront-Signature=${CloudFront["CloudFront-Signature"]};CloudFront-Policy=${CloudFront["CloudFront-Policy"]};CloudFront-Key-Pair-Id=${CloudFront["CloudFront-Key-Pair-Id"]}`
    }
    getCookieString(currentUrl?: string) {
        return Book.getCookieString(this.CloudFront)
    }

    // Gets some book details
    static async GetDetails(BookId: string, CloudFront: ICloudFront) {
        return <Object>(await fetch(`${baseURL}/${BookId}/assets/pager.js`, {
            headers: {
                cookie: Book.getCookieString(CloudFront)
            },
            mode: "no-cors"
        })).json()
    }
    async GetDetails() {
        return await Book.GetDetails(this.BookId, this.CloudFront)
    }

    // Gets page count
    static async GetPageCount(BookId: string, CloudFront: ICloudFront) {
        const Details: any = await Book.GetDetails(BookId, CloudFront)
        return Details.pages.structure.length
    }
    async GetPageCount() {
        return await Book.GetPageCount(this.BookId, this.CloudFront)
    }

    // Grab the svg
    async GetSVG(Page: number, Verbose: boolean = true, OutputDirectory?: string) {
        // Vars
        const ZeroPadded = Page.toString().padStart(4, "0")
        const URL = `${this.BookId}/assets/common/page-vectorlayers/${ZeroPadded}.svg`

        // Grab it
        const For = `SVG for ${this.BookId}:${Page}`
        VerboseLog(Verbose, "Info", `Attempting to get ${For}`)
        const SVG = await DoRequest(URL, {
            headers: {
                cookie: this.getCookieString()
            },
            mode: "no-cors"
        })
        VerboseLog(Verbose, "Success", `Got ${For}`)

        // Output
        if (OutputDirectory) {
            // Create the folder
            // CreateFolder(`${OutputDirectory}/svgs`)
            // const OutputFolder = `${OutputDirectory}/svgs/${this.BookId}`
            // CreateFolder(OutputFolder)

            // Output
            //fs.writeFileSync(`${OutputFolder}/page-${ZeroPadded}.svg`, SVG)
        }

        // Return
        return SVG
    }

    // Grab the page background (either jpg ot png)
    async GetBackground(Page: number, Verbose: boolean = true, OutputDirectory?: string) {
        // Vars
        const ZeroPadded = Page.toString().padStart(4, "0")
        const URL = `${this.BookId}/assets/common/page-html5-substrates/page${ZeroPadded}_4.` // the _4 indicates a higher resolution. i believe this is the maximum or 5
        const cookieString = this.getCookieString()

        // Grab it
        const For = `background for ${this.BookId}:${Page}`
        let BackgroundFType: "PNG" | "JPEG" = "JPEG"
        VerboseLog(Verbose, "Info", `Attempting to get ${For}`)
        const Background = await DoRequest(URL + "jpg", {
            headers: {
                cookie: cookieString
            },
            mode: "no-cors"
        }, "arraybuffer")
        .then(response => {
            return response.data as ArrayBuffer
        })
        .catch(async e => {
            BackgroundFType = "PNG"
            return await DoRequest(URL + "png", {
                headers: {
                    cookie: cookieString
                },
                mode: "no-cors"
            }) as ArrayBuffer
        })
        VerboseLog(Verbose, "Success", `Got ${For}`)

        // Output
        if (OutputDirectory) {
            // Create the folder
            // CreateFolder(`${OutputDirectory}/bgs`)
            // const OutputFolder = `${OutputDirectory}/bgs/${this.BookId}`
            // CreateFolder(OutputFolder)

            // Output
            //fs.writeFileSync(`${OutputFolder}/page-${ZeroPadded}.${BackgroundFType}`, Background)
        }

        // Return
        return {Background, BackgroundFType}
    }
}