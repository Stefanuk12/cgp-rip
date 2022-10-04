// Dependencies
import chalk from "chalk"
import * as fs from "fs"
import sizeOf from "image-size"
import { jsPDF as PDFDocument } from "jspdf"

//
export function CreateFolder(Name: string) {
    if (!fs.existsSync(Name))
        fs.mkdirSync(Name)
}

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

// Turns many pages into a pdf (ideally should all be the same size)
export interface IImage {
    data: Buffer
    type: "PNG" | "JPEG"
}
export async function ManyImageToPDF(Images: IImage[], SVGs: string[] = []) {
    // Create the PDF
    const PDFDoc = new PDFDocument()

    // Add each page
    for (let i in Images) {
        const image = Images[i]
        const svg = SVGs[i]
        // Load the image
        //const LoadedImage = image.type == "jpg" ? await PDFDoc.embedJpg(image.data) : await PDFDoc.embedPng(image.data)

        // Create a new page
        const ImageSize = sizeOf(image.data)
        const width = ImageSize.width || 1920
        const height = ImageSize.height || 1080
        const Page = PDFDoc.addPage([width, height])

        // Draw the image in the centre of the page
        Page.addImage(image.data, image.type, 0, 0, width, height)
        if (svg && false) // disable since does not work due no dom
            Page.addSvgAsImage(svg, 0, 0, width, height)
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