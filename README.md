# CGP Rip
Convert an online CGP book to .pdf (not finished yet). This also works both as a CLI and package.

## How it works
It downloads the background (jpg/png) and text (svg) of each page using your session id (you must own the book). Then, it combines them to form the actual page.

## To Do
- [ ] Add the .svg to PDF

## Usage
```
Usage: cgp-rip [options] [command]

Convert an online CGP book to .pdf

Options:
  -V, --version                     output the version number
  -h, --help                        display help for command

Commands:
  configure [options] <session-id>  Configure in order to be able to use
  rip [options] <book-id>           Rip an online book
  help [command]                    display help for command
```