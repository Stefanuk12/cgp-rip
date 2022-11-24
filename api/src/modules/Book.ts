// Also includes built in express endpoints to make an api easier

// Dependencies
import { Request, Response } from "express"
import got from "got"
import { CookieJar } from "tough-cookie"
import { /*CreateFolder, */VerboseLog } from "./Utilities.js"
//import * as fs from "fs"

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
export interface Book extends IBook { }
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

        //
        if (Response.statusCode != 200) {
            const Message = "Unable to get cloudfront"
            alert(Message)
            throw (Message)
        }

        // Parse the cookies
        const SetCookies = Response.headers["set-cookie"]
        if (!SetCookies)
            throw (new Error("Did not get set-cookie"))
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

        //
        const CookieString = SetCookiesTrimmed.join(";")

        // Return
        return { CloudFrontCookies, SetCookiesTrimmed, CookieString }
    }
    async GenerateCloudFront(SessionId: string) {
        return await Book.GenerateCloudFront(this.BookId, SessionId)
    }
    static async GenerateCloudFrontAPI(request: Request, response: Response) {
        // Grab data
        const { BookId, SessionId } = request.params

        // Make sure we have the data
        if (!BookId || !SessionId) {
            return response.status(400).send("Missing params")
        }

        // Respond
        return response.json(await Book.GenerateCloudFront(BookId, SessionId))
    }

    // Gets the cookies as a string
    static getCookieString(CloudFront: ICloudFront) {
        return `CloudFront-Signature=${CloudFront["CloudFront-Signature"]};CloudFront-Policy=${CloudFront["CloudFront-Policy"]};CloudFront-Key-Pair-Id=${CloudFront["CloudFront-Key-Pair-Id"]}`
    }
    getCookieString(currentUrl?: string) {
        return Book.getCookieString(this.CloudFront)
    }

    // Cookie string to object
    static getCookieObject(CloudFrontCookie: string) {
        // Parse the cookie
        const CloudFront: ICloudFront = {
            "CloudFront-Signature": "",
            "CloudFront-Policy": "",
            "CloudFront-Key-Pair-Id": ""
        }
        CloudFrontCookie.split(";").forEach(cookie => {
            // Set
            const [key, value] = cookie.split("=")
            CloudFront[key as keyof typeof CloudFront] = value
        })

        // Return
        return CloudFront
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
        return await HttpClientAgent(`${BookId}/assets/pager.js`, {
            cookieJar: Book.getJar(CloudFront)
        }).json()
    }
    async GetDetails() {
        return await Book.GetDetails(this.BookId, this.CloudFront)
    }
    static async GetDetailsAPI(request: Request, response: Response) {
        // Vars
        const { BookId } = request.params
        const CloudFrontCookie = request.headers["cloudfront-cookie"]?.toString()

        // Verify data
        if (!BookId || !CloudFrontCookie) {
            return response.status(400).send("Missing data")
        }

        // Parse the cookie
        const CloudFront = Book.getCookieObject(CloudFrontCookie)

        //
        return response.json(await Book.GetDetails(BookId, CloudFront))
    }

    // Gets page count
    static async GetPageCount(BookId: string, CloudFront: ICloudFront) {
        const Details: any = await Book.GetDetails(BookId, CloudFront)
        return <number>Details.pages.structure.length
    }
    async GetPageCount() {
        return await Book.GetPageCount(this.BookId, this.CloudFront)
    }
    static async GetPageCountAPI(request: Request, response: Response) {
        // Vars
        const { BookId } = request.params
        const CloudFrontCookie = request.headers["cloudfront-cookie"]?.toString()

        // Verify data
        if (!BookId || !CloudFrontCookie) {
            return response.status(400).send("Missing data")
        }

        // Parse the cookie
        const CloudFront = Book.getCookieObject(CloudFrontCookie)

        // Get the pages
        const PageCount = await Book.GetPageCount(BookId, CloudFront)
        // Return
        return response.send(PageCount.toString())
    }

    // Grab the svg
    static async GetSVG(BookId: string, Page: number, CloudFront: ICloudFront, Verbose: boolean = true, OutputDirectory?: string) {
        // Vars
        const ZeroPadded = Page.toString().padStart(4, "0")
        const URL = `${BookId}/assets/common/page-vectorlayers/${ZeroPadded}.svg`

        // Grab it
        const For = `SVG for ${BookId}:${Page}`
        VerboseLog(Verbose, "Info", `Attempting to get ${For}`)
        const SVG = await HttpClientAgent(URL, {
            cookieJar: Book.getJar(CloudFront)
        }).buffer()
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
    async GetSVG(Page: number, Verbose: boolean = true, OutputDirectory?: string) {
        return await Book.GetSVG(this.BookId, Page, this.CloudFront, Verbose, OutputDirectory)
    }
    static async GetSVGAPI(request: Request, response: Response) {
        // Vars
        const { BookId, Page } = request.params
        const CloudFrontCookie = request.headers["cloudfront-cookie"]?.toString()

        // Verify data
        if (!BookId || !CloudFrontCookie) {
            return response.status(400).send("Missing data")
        }

        // Make sure page is a number
        const PageNumber = parseInt(Page)
        if (isNaN(PageNumber)) {
            return response.status(400).send("page is not a number")
        }

        //
        try {
            return response.send(await Book.GetSVG(BookId, PageNumber, Book.getCookieObject(CloudFrontCookie), false))
        } catch (e) {
            return response.send("no")
        }
    }

    // Grab the page background (either jpg or png)
    static async GetBackground(BookId: string, Page: number, CloudFront: ICloudFront, Verbose: boolean = true, OutputDirectory?: string, Size = "4") {
        // Vars
        const ZeroPadded = Page.toString().padStart(4, "0")
        const URL = `${BookId}/assets/common/page-html5-substrates/page${ZeroPadded}_${Size}.` // the _4 indicates a higher resolution. i believe this is the maximum or 5
        const cookieJar = Book.getJar(CloudFront)

        // Grab it
        const For = `background for ${BookId}:${Page}`
        let BackgroundFType: "PNG" | "JPEG" = "JPEG"
        VerboseLog(Verbose, "Info", `Attempting to get ${For}`)
        const Background = await HttpClientAgent(URL + "jpg", { cookieJar }).buffer().catch(async e => {
            BackgroundFType = "PNG"
            return await HttpClientAgent(URL + "png", { cookieJar }).buffer()
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
        return { Background, BackgroundFType }
    }
    async GetBackground(Page: number, Verbose: boolean = true, OutputDirectory?: string) {
        return await Book.GetBackground(this.BookId, Page, this.CloudFront, Verbose, OutputDirectory)
    }
    static async GetBackgroundAPI(request: Request, response: Response) {
        // Vars
        const { BookId, Page, Size } = request.params
        const CloudFrontCookie = request.headers["cloudfront-cookie"]?.toString()

        // Verify data
        if (!BookId || !CloudFrontCookie || !Size) {
            return response.status(400).send("Missing data")
        }

        // Make sure page is a number
        const PageNumber = parseInt(Page)
        if (isNaN(PageNumber)) {
            return response.status(400).send("page is not a number")
        }

        //
        try {
            return response.send(await Book.GetBackground(BookId, PageNumber, Book.getCookieObject(CloudFrontCookie), false, undefined, Size))
        } catch(e) {
            return response.send("no")
        }
    }
}