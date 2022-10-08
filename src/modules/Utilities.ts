// Dependencies
import chalk from "chalk"
//import * as fs from "fs"
import { jsPDF as PDFDocument } from "jspdf"
import "svg2pdf.js"

//
// export function CreateFolder(Name: string) {
//     if (!fs.existsSync(Name))
//         fs.mkdirSync(Name)
// }

//
export type LogType = "Success" | "Error" | "Warn" | "Neutral" | "Info"
export const LogColourChalk = {
    Success: chalk.green,
    Error: chalk.red,
    Warn: chalk.yellow,
    Neutral: chalk.white,
    Info: chalk.blue
}
export function VerboseLog(Verbose: boolean, Type: LogType, ...args: any) {
    // Make sure is verbose
    if (!Verbose)
        return

    // Get the time
    const Now = new Date()
    const Time = `${Now.getHours().toString().padStart(2, "0")}:${Now.getMinutes().toString().padStart(2, "0")}:${Now.getSeconds().toString().padStart(2, "0")}`
    const ColouredTime = chalk.magenta("[") + chalk.bold(Time) + chalk.magenta("]")

    //
    const ChalkColour = LogColourChalk[Type]
    console.log(ColouredTime + " " + ChalkColour(...args))
}

//
function ArrayToB64(bytes: Uint8Array) {
    // Vars
    let Base64Output = ""

    // Loop
    for (let i = 0; i < bytes.byteLength; i++){
        Base64Output += String.fromCharCode(bytes[i])
    }

    // Return
    return window.btoa(Base64Output);
}

// Gets an image size (via browser api)
function SizeOf(Data: Uint8Array, mime: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        let image = new Image()
        image.onload = function() {
            resolve(image)
        }
        const b64 = ArrayToB64(Data)
        image.src = `data:${mime};base64,${b64}`
    })  
}

// SVG XML -> Element
function XMLToElement(XML: string) {
    const Placeholder = document.createElement("div")
    Placeholder.innerHTML = XML
    return <SVGElement>Placeholder.firstElementChild
}

// Turns many pages into a pdf (ideally should all be the same size)
export interface IImage {
    data: Uint8Array
    type: "PNG" | "JPEG"
}
export async function ManyImageToPDF(Images: IImage[], SVGs: string[] = []) {
    // Create the PDF
    const PDFDoc = new PDFDocument()

    // Add each page
    for (let i in Images) {
        // Vars
        const image = Images[i]
        const svg = SVGs[i]

        // Create a new page
        const ImageSize = await SizeOf(image.data, image.type == "PNG" ? "image/png" : "image/jpeg")
        const [x, y] = [0, 0]
        const width = ImageSize.width || 1920
        const height = ImageSize.height || 1080
        const Page = PDFDoc.addPage([width, height])

        // Draw the image in the centre of the page, alongwidth svg - if specified
        Page.addImage(image.data, image.type, 0, 0, width, height)
        if (svg) {
            // Create the element
            const SVGElement = XMLToElement(svg)

            // Add
            Page.addSvgAsImage(svg, x, y, width, height)
            // Page.svg(SVGElement, {
            //     x,
            //     y,
            //     width,
            //     height
            // })
        }
            
    }

    // Return the PDF
    return PDFDoc
}

// Adds all of the outlines
export interface IOutlinePDF {
    [name: string]: string
}
export async function AddOutlinesToPDF(PDFDoc: PDFDocument, Headers: IOutlinePDF, MaxPages?: number) {
    // Loop through the headers
    for (const [k, v] of Object.entries(Headers)) {
        // Make sure the page number cannot be bigger than the user selected amount
        const pageNumber = parseInt(<string>v)
        if (MaxPages && pageNumber > MaxPages)
            continue

        // Custom header name handling (e.g. Credits)
        const headerNumber = parseInt(k) - 1
        if (isNaN(headerNumber)) {
            PDFDoc.outline.add(null, k, {pageNumber: pageNumber})
            continue
        }

        // Regular page header
        PDFDoc.outline.add(null, `Page ${headerNumber}`, {pageNumber: pageNumber})
    }

    // Return
    return PDFDoc
}