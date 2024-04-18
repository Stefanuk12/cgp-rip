// Dependencies
import got from "got"
import { CreateFolder, VerboseLog } from "./Utilities.js"
import * as fs from "fs"
import { CookieJar } from "tough-cookie"

//
const prefixUrl = "https://library.cgpbooks.co.uk/digitalcontent" 
export const HttpClientAgent = got.extend({
    prefixUrl,
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.36"
    }
})

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
        const Response = await got.post(`https://library.cgpbooks.co.uk/digitalaccess/${BookId}/Online`, {
            headers: {
                cookie: `ASP.Net_SessionId=${SessionId}`
            },
            form: {
                UserGuid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa",
                Signature: Math.random().toString(36).slice(2, 42) // does not matter what this is
            }
        })

        // Parse the cookies
        const SetCookies = Response.headers["set-cookie"]
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

    // Gets the cookie jar
    static getJar(CloudFront: ICloudFront, currentUrl: string = prefixUrl) {
        // Create the jar and add each
        const jar = new CookieJar()
        jar.setCookieSync(`CloudFront-Signature=${CloudFront["CloudFront-Signature"]}`, currentUrl)
        jar.setCookieSync(`CloudFront-Policy=${CloudFront["CloudFront-Policy"]}`, currentUrl)
        jar.setCookieSync(`CloudFront-Key-Pair-Id=${CloudFront["CloudFront-Key-Pair-Id"]}`, currentUrl)

        //
        return jar
    }
    getJar(currentUrl?: string) {
        return Book.getJar(this.CloudFront, currentUrl)
    }

    // Gets some book details
    static async GetDetails(BookId: string, CloudFront: ICloudFront) {
        return await HttpClientAgent(`${BookId}/assets/common/pager.js`, {
            cookieJar: Book.getJar(CloudFront)
        }).json()
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
        const SVG = await HttpClientAgent(URL, {
            cookieJar: this.getJar()
        }).buffer()
        VerboseLog(Verbose, "Success", `Got ${For}`)

        // Output
        if (OutputDirectory) {
            // Create the folder
            CreateFolder(`${OutputDirectory}/svgs`)
            const OutputFolder = `${OutputDirectory}/svgs/${this.BookId}`
            CreateFolder(OutputFolder)

            // Output
            fs.writeFileSync(`${OutputFolder}/page-${ZeroPadded}.svg`, SVG)
        }

        // Return
        return SVG
    }

    // Grab the page background (either jpg ot png)
    async GetBackground(Page: number, Verbose: boolean = true, OutputDirectory?: string, quality: 1 | 2 | 3 | 4 = 4) {
        // Vars
        const ZeroPadded = Page.toString().padStart(4, "0")
        const URL = `${this.BookId}/assets/common/page-html5-substrates/page${ZeroPadded}_${quality.toString()}.` // the _4 indicates a higher resolution. i believe this is the maximum or 5
        const cookieJar = this.getJar()

        // Grab it
        const For = `background for ${this.BookId}:${Page}`
        let BackgroundFType: "PNG" | "JPEG" = "JPEG"
        VerboseLog(Verbose, "Info", `Attempting to get ${For}`)
        const Background = await HttpClientAgent(URL + "jpg", {cookieJar}).buffer().catch(async e => {
            BackgroundFType = "PNG"
            return await HttpClientAgent(URL + "png", {cookieJar}).buffer()
        })
        VerboseLog(Verbose, "Success", `Got ${For}`)

        // Output
        if (OutputDirectory) {
            // Create the folder
            CreateFolder(`${OutputDirectory}/bgs`)
            const OutputFolder = `${OutputDirectory}/bgs/${this.BookId}`
            CreateFolder(OutputFolder)

            // Output
            fs.writeFileSync(`${OutputFolder}/page-${ZeroPadded}.${BackgroundFType}`, Background)
        }

        // Return
        return {Background, BackgroundFType}
    }
}