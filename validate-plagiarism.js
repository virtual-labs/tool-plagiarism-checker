const fs = require('fs');
const shell = require('shelljs');
const path = require('path');
const markdownIt = require('markdown-it')();

// Function to extract text content from JSON
function extractTextFromJSON2(jsonContent, prefix = ' ') {
    let result = '';

    if (Array.isArray(jsonContent)) {
        for (let i = 0; i < jsonContent.length; i++) {
            result += extractTextFromJSON(jsonContent[i], `${prefix}`);
        }
    } else if (typeof jsonContent === 'object') {
        for (const key in jsonContent) {
            result += extractTextFromJSON(jsonContent[key], `${prefix}`);
        }
    } else if (typeof jsonContent === 'string' || typeof jsonContent === 'number') {
        result += `${prefix}${jsonContent.toString()} `;
    }

    return result.trim() + '\n';
}

function extractTextFromJSON(jsonContent,prefix=''){
    // iterate over the questions list in jsonContent.questions
    let result = '';
    for (let i = 0; i < jsonContent.questions.length; i++) {
        // iterate over the options list in jsonContent.questions[i].options
        result += `${prefix}${jsonContent.questions[i].question} `;
        result += `${prefix}${jsonContent.questions[i].answers.a} `;
        result += `${prefix}${jsonContent.questions[i].answers.b} `;
        result += `${prefix}${jsonContent.questions[i].answers.c} `;
        result += `${prefix}${jsonContent.questions[i].answers.d} `;
    }
    return result.trim() + '\n';
}

// Function to extract text content from Markdown, skipping images
function extractTextFromMarkdown(markdownContent) {
    const htmlTagRegex = /<img[^>]*>/g;
    markdownContent = markdownContent.replace(htmlTagRegex, '');
    // remove special markdown characters such as **, *, #,>,<=,< etc.
    markdownContent = markdownContent.replace(/[*#]/g, '');

    // Use a Markdown parsing library to handle Markdown content properly

    // Tokenize the Markdown content
    const tokens = markdownIt.parse(markdownContent, {});

    // Filter out inline tokens that contain the <img> tag and exclude HTML blocks
    const textTokens = tokens.filter(
        (token) =>
            (token.type === 'inline' && token.content.includes('<img')) ||
            token.type !== 'html_block'
    );

    const textContent = textTokens.map((token) => token.content).join(' ');

    return textContent;
}

// Read files from the specified folder
const folderPath = './';

const htmlResult = []; // Store HTML results

fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('Error reading the folder: ' + err);
        return;
    }

    files.forEach((file) => {
        const filePath = path.join(folderPath, file);
        const fileExtension = path.extname(filePath);

        // Check if it's a JSON or Markdown file
        if (fileExtension === '.json' || fileExtension === '.md') {
            fs.readFile(filePath, 'utf8', (readErr, content) => {
                if (readErr) {
                    console.error('Error reading the file: ' + readErr);
                } else {
                    // Extract the text content based on the file type
                    let textContent = '';
                    if (file === 'posttest.json' || file === 'pretest.json') {
                        // parse the content to JSON
                        content = JSON.parse(content);
                        textContent = extractTextFromJSON(content);
                    } else if (fileExtension === '.md') {
                        // parse the content to Markdown
                        textContent = extractTextFromMarkdown(content);
                    }
                    // Write the textContent to posttest.txt if posttest.json

                    if (textContent) {
                        const keyValue = process.argv[2];
                        // Use the encoded text in the curlCommand
                        const encodedTextContent = encodeURIComponent(textContent);
                        const curlCommand = `curl -X POST https://www.prepostseo.com/apis/checkPlag ` +
                            `-d "key=${keyValue}" ` +
                            `-d "data=${encodedTextContent}"`;

                        // Execute the curl command
                        const result = shell.exec(curlCommand);
                        if (result.code !== 0) {
                            console.error('Error: ' + result.stderr);
                        } else {
                            const sources = JSON.parse(result.stdout).sources;
                            const links = sources.map((source) => source.link);
                            htmlResult.push(`<h3>Plagiarism Links for ${file}:</h3>`);
                            htmlResult.push('<ul>');
                            links.forEach((link) => {
                                htmlResult.push(`<li><a href="${link}">${link}</a></li>`);
                            });
                            htmlResult.push('</ul>');

                            const plagPercent = JSON.parse(result.stdout).plagPercent;
                            htmlResult.push(`<p>Plagiarism Percentage for ${file}: ${plagPercent}%</p>`);
                        }
                    }
                }
            });
        } else {
            console.log(`Skipping unsupported file: ${file}`);
        }
    });
});

// When all file processing is complete, write the HTML results to a file
process.on('exit', () => {
    fs.writeFileSync('result.html', htmlResult.join('\n'), 'utf8');
    console.log('Results written to result.html');
});
