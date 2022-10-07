// Dependencies
import chalk from "chalk";
import { Book } from "./modules/Book";
import type { IImage } from "./modules/Utilities";
import { AddOutlinesToPDF, ManyImageToPDF, VerboseLog } from "./modules/Utilities";

//
function toBuffer(ab: ArrayBuffer) {
    const buf = Buffer.alloc(ab.byteLength)
    const view = new Uint8Array(ab)
    for (let i = 0; i < buf.length; i++) {
        buf[i] = view[i]
    }
    return buf
}

// Starts the rip
async function DoRip(formData: FormData) {
    // Vars
    console.log("Called")
    const BookId = formData.get("bookId")?.toString()
    const SessionId = formData.get("sessionId")?.toString()
    const Pages = formData.get("pages")?.toString()
    if (!BookId || !SessionId) {
        alert("Missing data!")
        console.log(1)
        return false
    }

    // Grab our cloudfront stuff
    const { CloudFrontCookies } = await Book.GenerateCloudFront(BookId, SessionId)

    // Create the object
    const book = new Book({
        BookId,
        //SessionId: UserConfig["ASP.NET_SessionId"],
        CloudFront: CloudFrontCookies
    })

    // Make sure pages is a number
    let PagesNumber = Pages ? parseInt(Pages) : await book.GetPageCount()
    if (PagesNumber && isNaN(PagesNumber)) {
        alert("Invalid page number")
        return false
    }

    // Do it
    const Images: IImage[] = []
    const SVGs: string[] = []
    for (let i = 1; i < PagesNumber + 1; i++) {
        const SVG = await book.GetSVG(i, true).catch(e => VerboseLog(true, "Error", `Page ${i} does not have an .svg component`))
        const Background = await book.GetBackground(i, true)

        if (SVG)
            SVGs.push(SVG.toString())

        if (Background)
            Images.push({
                data: toBuffer(Background.Background),
                type: Background.BackgroundFType
            })
    }

    // PDF stuff
    if (Images.length > 0) {
        // Get the pdf
        let PDF = await ManyImageToPDF(Images, SVGs)

        // Get the details
        const Details: any = await book.GetDetails()

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