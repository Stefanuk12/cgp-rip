// Dependencies
import chalk from "chalk";
import { VerboseLog, IImage, ManyImageToPDF, AddOutlinesToPDF } from "./modules/Utilities"

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
    return await (await fetch(`http://localhost:3000/svg/${BookId}/${Page}`, {
        headers: {
            "cloudfront-cookie": CookieString
        }
    })).text()
}
async function GetBackground(BookId: string, Page: number, CookieString: string) {
    return await (await fetch(`http://localhost:3000/background/${BookId}/${Page}`, {
        headers: {
            "cloudfront-cookie": CookieString
        }
    })).json()
}

// Starts the rip
export async function DoRip(formElement: HTMLFormElement) {
    // Vars
    const formData = new FormData(formElement)
    const BookId = formData.get("bookId")?.toString()
    const SessionId = formData.get("sessionId")?.toString()
    const Pages = formData.get("pages")?.toString()
    if (!BookId || !SessionId) {
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

    // Do it
    const Images: IImage[] = []
    const SVGs: string[] = []
    for (let i = 1; i < PagesNumber + 1; i++) {
        const SVG = await GetSVG(BookId, i, CookieString).catch(e => VerboseLog(true, "Error", `Page ${i} does not have an .svg component`))
        const Background = await GetBackground(BookId, i, CookieString)

        if (SVG)
            SVGs.push(SVG.toString())

        if (Background)
            Images.push({
                data: new Uint8Array(Background.Background.data),
                type: Background.BackgroundFType
            })
    }

    // PDF stuff
    if (Images.length > 0) {
        // Get the pdf
        let PDF = await ManyImageToPDF(Images, SVGs)

        // Get the details
        const Details = await GetDetails(BookId, CookieString)
    
        // Add the outlines
        PDF = await AddOutlinesToPDF(PDF, Details.headers, PagesNumber)

        // Save
        let blob = PDF.output("blob")
        let link = document.createElement("a")
        link.href = window.URL.createObjectURL(blob)
        link.download = `${BookId}.pdf`
        link.click()
    }

    //
    console.log(chalk.bgGreen("Done"))

    //
    return false
}

// Event listener
document.forms[0].onsubmit = function(e) {
    e.preventDefault()
    DoRip(document.forms[0])
    return false
}