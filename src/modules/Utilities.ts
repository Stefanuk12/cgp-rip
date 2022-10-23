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
export function ArrayToB64(bytes: Uint8Array) {
    // Vars
    let Base64Output = ""

    // Loop
    for (let i = 0; i < bytes.byteLength; i++){
        Base64Output += String.fromCharCode(bytes[i])
    }

    // Return
    return window.btoa(Base64Output)
}

// Gets an image size (via browser api)
export function SizeOf(Data: Uint8Array | string, mime: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        let image = new Image()
        image.onload = function() {
            resolve(image)
        }
        const b64 = Data instanceof Uint8Array ? ArrayToB64(Data) : Data
        image.src = `data:${mime};base64,${b64}`
    })  
}

//
export async function DownloadItem(Name: string, Data: Blob | MediaSource | string) {
    let link = document.createElement("a")

    // Setting download link
    if (typeof(Data) == "string") {
        const CleanedLink = Data.replace(/^data:image\/\w+;base64,/, "")
        link.href = `data:application/octet-stream;base64,${encodeURIComponent(CleanedLink)}`
    } else
        link.href = window.URL.createObjectURL(Data)

    // Downloading
    link.download = Name
    link.click()
}

// Firefox doesn't correctly handle SVG with size = 0, see https://bugzilla.mozilla.org/show_bug.cgi?id=700533
export function SVGFireFoxFix(SVGDocument: any): Document {
    try {
        let Width = parseInt(SVGDocument.documentElement.width.baseVal.value) || 500
        let Height = parseInt(SVGDocument.documentElement.height.baseVal.value) || 500
        SVGDocument.documentElement.width.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, Width)
        SVGDocument.documentElement.height.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, Height)
        return SVGDocument
    } catch (e) {
        return SVGDocument
    }
}

// Converts SVGDocument to Base64
export function SVGtoB64(SVG: Document) {
    try {
        const B64SVG = btoa(new XMLSerializer().serializeToString(SVG))
        return "data:image/svg+xml;base64," + B64SVG
    } catch (e) {
        return null
    }
}

// Converts Base64 to SVGDocument
export function B64toSVG(B64: string) {
    let SVG = atob(B64.substring(B64.indexOf('base64,') + 7))
    SVG = SVG.substring(SVG.indexOf('<svg'))

    let Parser = new DOMParser()
    return Parser.parseFromString(SVG, "image/svg+xml")
}

// Converts SVG to PNG
export function SVGtoPNG(SourceB64: string, Width: number, DataUrl: string = "image/png", SecondTry = false): Promise<string | null> {
    return new Promise((resolve, reject) => {
        // Create our placeholder
        let img = document.createElement('img')

        // Ran whenever the image is loaded
        img.onload = async function () {
            //
            if (!SecondTry && (img.naturalWidth === 0 || img.naturalHeight === 0)) {
                // Converting to SVG
                let SVG = B64toSVG(SourceB64)
                let FixedSVG = SVGFireFoxFix(SVG)
                const SVGB64 = SVGtoB64(FixedSVG)
                if (!SVGB64) {
                    const Message = "Unable to convert SVG to B64"
                    return reject(new Error(Message))
                }

                // Convert to PNG
                const result = await SVGtoPNG(SVGB64, Width, DataUrl, true)

                // Done, yay!
                resolve(result)
            }

            // Creating the canvas
            document.body.appendChild(img)
            let Canvas = document.createElement("canvas")
            let Ratio = (img.clientWidth / img.clientHeight) || 1
            document.body.removeChild(img)

            // Setting resolution
            Canvas.width = Width
            Canvas.height = Width / Ratio

            // Drawing the image
            let CanvasCTX = Canvas.getContext("2d")
            if (!CanvasCTX) {
                const Message = "Unable to get canvas context"
                return reject(new Error(Message))
            }
            CanvasCTX.drawImage(img, 0, 0, Canvas.width, Canvas.height)

            // Attempting to convert to png
            try {
                resolve(Canvas.toDataURL(DataUrl))
            } catch (e) {
                resolve(null)
            }
        }

        // Set
        img.src = SourceB64
    })
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