# CGP Rip (WEB)
Convert an online CGP book to .pdf (not finished yet)

## How it works
It downloads the background (jpg/png) and text (svg) of each page using your session id (you must own the book). Then, it combines them to form the actual page.

## To Do
- [ ] Add the .svg to PDF

## How to run

### Running the API
You must have the API running with nodejs in the background, this allows us to get around cors.

- CD into the api folder
- Run the following commands:
  - `npm i`
  - `tsc`
- To run the API, run `node ./lib/index.js`

### Running the website
Make sure to install webpack-cli by running `npm i -g webpack-cli`

- Run the following commands:
  - `npm i`
  - `tsc`
- To build the site, run `webpack-cli`

Once built, open the html file within `lib/index.html` within your browser.
