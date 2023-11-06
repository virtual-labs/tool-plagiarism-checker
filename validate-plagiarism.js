const fs = require('fs');
const shell = require('shelljs');
const path = require('path');
const markdownIt = require('markdown-it')();

// Function to extract text content from JSON
function extractTextFromJSON(jsonContent, prefix = '') {
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

function createDropdown(query) {
    return `<p>${query}</p>`;
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
                            const details = JSON.parse(result.stdout).details;
                            console.log("Sources are below : \n", sources);
                            console.log("Details are below : \n", details);
                            const plagiarizedLinks = details
                                .filter((detail) => detail.unique === "false")
                                .map((detail) => {
                                    return {
                                        url: detail.display.url,
                                        dropdown: createDropdown(detail.query),
                                    };
                                });

                            if (plagiarizedLinks.length > 0) {
                                htmlResult.push(`<h3>Plagiarism Links for ${file}:</h3>`);
                                htmlResult.push('<ul>');
                                // 1. Sort the plagiarizedLinks array by url
                                plagiarizedLinks.sort((a, b) => {
                                    if (a.url < b.url) {
                                        return -1;
                                    } else if (a.url > b.url) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                }
                                );
                                // Create a new array that store the concatenated dropdowns of duplicate links
                                const newPlagiarizedLinks = [];
                                let index = 0;
                                while (index < plagiarizedLinks.length) {
                                    const link = plagiarizedLinks[index];
                                    let newDropdown = link.dropdown;
                                    index++;
                                    while (index < plagiarizedLinks.length && link.url === plagiarizedLinks[index].url) {
                                        newDropdown += plagiarizedLinks[index].dropdown;
                                        index++;
                                    }
                                    newPlagiarizedLinks.push({
                                        url: link.url,
                                        dropdown: newDropdown,
                                    });
                                }
                                newPlagiarizedLinks.forEach((link) => {
                                    htmlResult.push(`<li><a href="${link.url}">${link.url}</a>`);
                                    htmlResult.push('<details>');
                                    htmlResult.push('<summary>Plagiarized Content</summary>');
                                    htmlResult.push(link.dropdown);
                                    htmlResult.push('</details>');
                                    htmlResult.push('</li>');
                                }
                                );
                                htmlResult.push('</ul>');
                            }

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
