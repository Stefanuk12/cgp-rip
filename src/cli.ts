#!/usr/bin/env node

// Dependencies
import { program } from "commander"
import * as fs from "fs"
import { Book } from "./modules/Book.js"
import { AddOutlinesToPDF, CreateFolder, IImage, ManyImageToPDF, VerboseLog } from "./modules/Utilities.js";
import chalk from "chalk"

// Vars
const PackageData = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf-8"))

// Program Data
program
    .name(PackageData.name)
    .description(PackageData.description)
    .version(PackageData.version);

// Creates the cookie jar
interface IConfigureOptions {
    file: string
}
interface IConfigureData {
    "ASP.NET_SessionId": string
}
{
    const Command = program.command("configure").description("Configure in order to be able to use")

    // Arguments
    Command.argument("<session-id>", "ASP.NET_SessionId")

    // Options 
    Command.option("-f, --file", "The path to the configuration file", "config.json")

    // Main functionality
    Command.action(async (SessionId: string, Options: IConfigureOptions) => {
        // Vars
        let config: IConfigureData = {
            "ASP.NET_SessionId": SessionId
        }
        const file = Options.file

        // See if we currently have a config
        if (fs.existsSync(file)) {
            config = JSON.parse(fs.readFileSync(file, "utf-8"))
        }

        // Add each cookie if it is inputted
        if (SessionId != "")
            config["ASP.NET_SessionId"] = SessionId

        // Output to file
        const FormattedJar = JSON.stringify(config)
        fs.writeFileSync(file, FormattedJar)

        //
        console.log(chalk.bgGreen("Done"))
    })
}

// Rips a book
interface IRipOptions {
    pages: string
    svg: boolean
    background: boolean
    merge: boolean
    pdf: boolean
    output: string
    file: string
    verbose: boolean
}
{
    const Command = program.command("rip").description("Rip an online book")

    // Arguments
    Command.argument("<book-id>", "The book's id")
    
    // Options
    Command.option("-p, --pages <number>", "The amount of pages to grab", "")
    Command.option("--svg", "Rip the SVG text", true)
    Command.option("--background", "Rip the background", true)
    Command.option("--merge", "Merge the SVG and background (ignores --svg and --background)", false)
    Command.option("--pdf", "Creates a PDF", true)
    Command.option("-o, --output <directory>", "The output directory", "./")
    Command.option("-f, --file <directory>", "Config file path", "config.json")
    Command.option("-v, --verbose", "Output what it is doing", true)

    // Main functionality
    Command.action(async (BookId: string, Options: IRipOptions) => {
        // Make sure is configured
        if (!fs.existsSync(Options.file))
            throw(new Error("Not configured. Please run configure first."))
        const UserConfig = <IConfigureData>JSON.parse(fs.readFileSync(Options.file, "utf-8"))
        const {CloudFrontCookies} = await Book.GenerateCloudFront(BookId, UserConfig["ASP.NET_SessionId"])

        // Create the object
        const book = new Book({
            BookId,
            //SessionId: UserConfig["ASP.NET_SessionId"],
            CloudFront: CloudFrontCookies
        })

        // Make sure pages is a number
        const Pages = parseInt(Options.pages || (await book.GetPageCount()).toString())
        if (isNaN(Pages))
            throw(new Error("pages - number not given"))

        // Doit
        const Images: IImage[] = []
        const SVGs: string[] = []
        for (let i = 1; i < Pages + 1; i++) {
            const SVG = (Options.svg || Options.merge) ? await book.GetSVG(i, Options.verbose, Options.output).catch(e => VerboseLog(true, "Error", `Page ${i} does not have an .svg component`)) : undefined
            const Background = (Options.background || Options.merge) ? await book.GetBackground(i, Options.verbose, Options.output) : undefined

            if (SVG)
                SVGs.push(SVG.toString())

            if (Background)
                Images.push({
                    data: Background.Background,
                    type: Background.BackgroundFType
                })
        }
    
        // PDF stuff
        if (Images.length > 0 && Options.pdf) {
            // Get the pdf
            let PDF = await ManyImageToPDF(Images, SVGs)

            // Get the details
            const Details: any = await book.GetDetails()

            // Add the outlines
            PDF = await AddOutlinesToPDF(PDF, Details.headers, Pages)

            // Save
            const OutputDirectory = `${Options.output}/pdfs`
            CreateFolder(OutputDirectory)
            PDF.save(`${OutputDirectory}/${BookId}.pdf`)
        }

        //
        console.log(chalk.bgGreen("Done"))
    })
}

// Parse it all
program.parse(process.argv)