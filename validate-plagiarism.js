const fs = require('fs');
const shell = require('shelljs');
const path = require('path');
const markdownIt = require('markdown-it')();

// Function to extract text content from JSON
function extractTextFromJSON(jsonContent, prefix = '') {
    let result = '';

    if (Array.isArray(jsonContent)) {
        for (let i = 0; i < jsonContent.length; i++) {
            result += extractTextFromJSON(jsonContent[i], `${prefix}${i + 1}. `);
        }
    } else if (typeof jsonContent === 'object') {
        for (const key in jsonContent) {
            result += `${prefix}${key}: `;
            result += extractTextFromJSON(jsonContent[key], `${prefix}  `);
        }
    } else if (typeof jsonContent === 'string') {
        result += `${jsonContent} `;
    }

    return result.trim() + '\n';
}


// Function to extract text content from Markdown, skipping images
function extractTextFromMarkdown(markdownContent) {
    // Use a Markdown parsing library to handle Markdown content properly

    // Tokenize the Markdown content
    const tokens = markdownIt.parse(markdownContent, {});

    // Filter out image tokens and extract the remaining text
    const textTokens = tokens.filter((token) => token.type !== 'image' && token.type !== 'html_block');
    const textContent = textTokens.map((token) => token.content).join(' ');

    return textContent;
}

// Read files from the specified folder
const folderPath = './';

fs.readdir(folderPath, (err, files) => {
    if (err) {
        console.error('Error reading the folder: ' + err);
        return;
    }

    files.forEach((file) => {
        console.log(file);
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
                        textContent = extractTextFromJSON(content);
                    } else if (fileExtension === '.md') {
                        textContent = extractTextFromMarkdown(content);
                    }
                    // redirect textContent to a file if it is .json
                    if (file === 'posttest.json' || file === 'pretest.json') {
                        fs.writeFile('posttest1.txt', textContent, (err) => {
                            if (err) throw err;
                            console.log('The file has been saved!');
                        });
                    }
                    if (textContent) {
                        // Encode the text content using encodeURIComponent()
                        const encodedTextContent = encodeURIComponent(textContent);
                        console.log("encoded text content: ",encodedTextContent);
                        const keyValue = process.argv[2];
                        console.log("==============================================");
                        // redirect text content of md files and json files to different files
                        if (file === 'posttest.json' || file === 'pretest.json') {
                            fs.writeFile('posttest.txt', textContent, (err) => {
                                if (err) throw err;
                                console.log('The file has been saved!');
                            });
                        } else if (fileExtension === '.md') {
                            fs.writeFile('theory.txt', textContent, (err) => {
                                if (err) throw err;
                                console.log('The file has been saved!');
                            });
                        }
                        // Use the encoded text in the curlCommand
                        // const curlCommand = `curl -X POST https://www.prepostseo.com/apis/checkPlag ` +
                        //     `-d "key=${keyValue}" ` +
                        //     `-d "data=${encodedTextContent}"`;

                        // // Execute the curl command
                        // const result = shell.exec(curlCommand);
                        // if (result.code !== 0) {
                        //     console.error('Error: ' + result.stderr);
                        // } else {
                        //     console.log("=============================================================================================");
                        //     const sources = JSON.parse(result.stdout).sources;
                        //     console.log("The plagiarism is with the following links for file: " + file);
                        //     sources.forEach((source) => {
                        //         console.log(source.link);
                        //     });
                        //     console.log("=============================================================================================");
                        //     const plagPercent = JSON.parse(result.stdout).plagPercent;
                        //     console.log("The plagiarism percentage for file " + file + " is: " + plagPercent);
                        // }
                    }
                }
            });
        } else {
            console.log(`Skipping unsupported file: ${file}`);
        }
    });
});
