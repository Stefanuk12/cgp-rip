/*
Information:
    - There is an error `Error in function Array.join (: Invalid string length RangeError: Invalid string length`
        - This is caused because the PDF is TOO large
*/

// Dependencies
import chalk from "chalk";
import { VerboseLog, AddOutlinesToPDF, SizeOf, SVGtoPNG } from "./modules/Utilities"

//import * as fs from "fs"
import { jsPDF as PDFDocument } from "jspdf"
import "svg2pdf.js"

//
async function GenerateCloudFront(BookId: string, SessionId: string) {
    return await (await fetch(`http://localhost:3000/login/${SessionId}/${BookId}`, {
        method: "POST"
    })).json()
}
async function GetDetails(BookId: string, CookieString: string) {
    return await (await fetch(`http://localhost:3000/details/${BookId}`, {
        headers: {
            "cloudfront-cookie": CookieString
        }
    })).json()
}
async function GetPageCount(BookId: string, CookieString: string) {
    const TextPageCount = await (await fetch(`http://localhost:3000/page/${BookId}`, {
        headers: {
            "cloudfront-cookie": CookieString
        }
    })).text()
    return parseInt(TextPageCount)
}
async function GetSVG(BookId: string, Page: number, CookieString: string) {
    const Response = await (await fetch(`http://localhost:3000/svg/${BookId}/${Page}`, {
        headers: {
            "cloudfront-cookie": CookieString
        }
    })).text()
    return Response == "no" ? null : Response
}
async function GetBackground(BookId: string, Page: number, CookieString: string, Size = "1") {
    return <{
        Background: {
            type: "Buffer",
            data: number[]
        },
        BackgroundFType: "JPEG" | "PNG"
    }>await (await fetch(`http://localhost:3000/background/${BookId}/${Page}/${Size}`, {
        headers: {
            "cloudfront-cookie": CookieString,
        }
    })).json()
}

// Starts the rip
export async function DoRip(formElement: HTMLFormElement, BackgroundsHandle?: FileSystemDirectoryHandle, SVGsHandle?: FileSystemDirectoryHandle) {
    // Vars
    const formData = new FormData(formElement)
    const BookId = formData.get("bookId")?.toString()
    const SessionId = formData.get("sessionId")?.toString()
    const Size = formData.get("size")?.toString()
    const Pages = formData.get("pages")?.toString()
    const DPI = parseInt(formData.get("dpi")?.toString() || "1")
    if (!BookId || !SessionId || !Size) {
        alert("Missing data!")
        return false
    }

    // Grab our cloudfront stuff
    const { CloudFrontCookies, SetCookiesTrimmed, CookieString } = await GenerateCloudFront(BookId, SessionId)

    // Make sure pages is a number
    let PagesNumber = Pages ? parseInt(Pages) : await GetPageCount(BookId, CookieString)
    if (PagesNumber && isNaN(PagesNumber)) {
        alert("Invalid page number")
        return false
    }

    // Make sure DPI is a number
    if (isNaN(DPI)) {
        alert("Invalid DPI multiplier")
        return false
    }

    // Create the PDF
    let PDFDoc = new PDFDocument()
    PDFDoc.deletePage(1)

    // Do it
    let Success = false
    for (let i = 1; i < PagesNumber + 1; i++) {
        // Grab the data
        //const PaddedI = i.toString().padStart(PagesNumber.toString().length, "0")
        const SVG = await GetSVG(BookId, i, CookieString)
        const Background = await GetBackground(BookId, i, CookieString, Size)

        // We must have a background
        if (!Background) {
            VerboseLog(true, "Error", `Page ${i} does not have a background. This page is aborted.`)
            continue
        }

        //
        const ImageData = new Uint8Array(Background.Background.data)
        // const ImageMIME = Background.BackgroundFType == "PNG" ? "image/png" : "image/jpeg"
        // const ImageFileType = ImageMIME.substring(6)
        const width = 595 * DPI
        const height = 842 * DPI
        const Page = PDFDoc.addPage([width, height])
        
        // HTML parse? Doesn't work :(
        // const html = `${ImageSize.outerHTML}${SVG ? "\n" + (await SizeOf(SVG, "image/svg+xml")).outerHTML : ""}`
        // Page.html(html)
        
        // Draw the image in the centre of the page, alongwidth svg - if specified
        Page.addImage(ImageData, Background.BackgroundFType, 0, 0, width, height)
        VerboseLog(true, "Info", `Got background for page ${i}`)
        Success = true

        // Adding the SVG
        if (SVG) {
            // Create the element
            const SVGImage = await SizeOf(SVG, "image/svg+xml")

            // Convert to png
            const PNGImage = await SVGtoPNG(SVGImage.src, width)
            if (!PNGImage)
                continue
            const B64Image = PNGImage.substring(PNGImage.indexOf(",") + 1)

            // Add to the pdf
            Page.addImage(B64Image, "png", 0, 0, width, height)

            // Done
            VerboseLog(true, "Info", `Got SVG for page ${i}`)
        } else
            VerboseLog(true, "Error", `Page ${i} does not have an .svg component`)
    }

    // PDF stuff
    if (Success) {
        //
        VerboseLog(true, "Info", "Converted to pdf")

        // Get the details
        const Details = await GetDetails(BookId, CookieString)
        VerboseLog(true, "Info", "Got details")

        // Add the outlines
        PDFDoc = await AddOutlinesToPDF(PDFDoc, Details.headers, PagesNumber)
        VerboseLog(true, "Info", "Converted to pdf")

        // Save
        PDFDoc.save(`${BookId}.pdf`)
    }

    //
    console.log(chalk.bgGreen("Done"))

    //
    return false
}

// Event listener
document.forms[0].onsubmit = async function(e) {
    e.preventDefault()
    
    // Ask user for cache directory
    // const CacheHandle = await (<any>window).showDirectoryPicker()
    // const BackgroundsHandle = await CacheHandle.getDirectoryHandle("bgs", {
    //     create: true
    // })
    // const SVGsHandle = await CacheHandle.getDirectoryHandle("svgs", {
    //     create: true
    // })

    // Run
    DoRip(document.forms[0]/*, BackgroundsHandle, SVGsHandle*/)
    return false
}