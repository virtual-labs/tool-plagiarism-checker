const fs = require('fs');
const shell = require('shelljs');

// Function to extract text content from HTML
function extractTextFromHTML(htmlContent) {
    // Use regex or an HTML parsing library like 'cheerio' to extract text
    // In this example, we use a simple regex to remove HTML tags
    return htmlContent.replace(/<[^>]*>/g, '');
}

// Read the content of the 'index.html' file
fs.readFile('index.html', 'utf8', (err, htmlContent) => {
    try {
        if (err) {
            throw new Error('Error reading the HTML file: ' + err);
        }

        // Extract the text content from the HTML
        const textContent = extractTextFromHTML(htmlContent);

        // Encode the text content using encodeURIComponent()
        const encodedTextContent = encodeURIComponent(textContent);
        const keyValue = process.argv[2];
        // Use the encoded text in the curlCommand
        const curlCommand = `curl -X POST https://www.prepostseo.com/apis/checkPlag ` +
            `-d "key=${keyValue}" ` +
            `-d "data=${encodedTextContent}"`;

        // Execute the curl command
        const result = shell.exec(curlCommand);
        if (result.code !== 0) {
            throw new Error('Error: ' + result.stderr);
        }
        console.log("=============================================================================================");
        const sources = JSON.parse(result.stdout).sources;
        console.log("The plagiarism is with the following links:");
        sources.forEach((source) => {
            console.log(source.link);
        });
        console.log("=============================================================================================");
        const plagPercent = JSON.parse(result.stdout).plagPercent;
        console.log("The plagiarism percentage is: " + plagPercent);
    } catch (error) {
        console.error(error.message);
    }
});
