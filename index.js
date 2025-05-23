// API Key is now handled by the Netlify serverless function.

document.addEventListener('DOMContentLoaded', () => {
    const generateForm = document.getElementById('generate-form');
    const generateButton = document.getElementById('generate-button');
    const loadingProgressContainer = document.getElementById('loading-progress-container');
    const loadingTextElement = document.getElementById('loading-text'); 
    const resultsContainer = document.getElementById('results-container');
    const promptInput = document.getElementById('prompt-input'); 

    let userOriginalPrompt = '';
    let currentGeneratedHtml = ''; 
    let currentGeneratedCss = '';
    let currentGeneratedJs = '';

    if (!generateForm || !generateButton || !loadingProgressContainer || !resultsContainer || !promptInput || !loadingTextElement) {
        console.error("Initialization failed: One or more critical DOM elements are missing.");
        if(resultsContainer) { 
            resultsContainer.innerHTML = `<div class="alert alert-danger" role="alert">Page form functionality error: Essential elements missing. Please reload.</div>`;
        }
        return; 
    }

    const originalButtonText = generateButton.textContent;
    const originalLoadingText = loadingTextElement.textContent; 

    // --- AI Output Cleaning Functions ---
    function cleanAiHtmlOutput(htmlString) {
        if (!htmlString) return '';
        let cleanedHtml = htmlString.trim();
        cleanedHtml = cleanedHtml.replace(/^```html\s*/i, '');
        cleanedHtml = cleanedHtml.replace(/\s*```$/, '');
        const commonPhrases = ["here's the html code:", "certainly, here is your html:", "here is the html:", "sure, here's the html:", "here's your html:", "here is your html code:", "okay, here's the html structure:", "sure, here is the html code for your request:"];
        for (const phrase of commonPhrases) {
            if (cleanedHtml.toLowerCase().startsWith(phrase)) {
                cleanedHtml = cleanedHtml.substring(phrase.length).trimStart();
                break; 
            }
        }
        if (!cleanedHtml.toLowerCase().startsWith('<!doctype html>') && !cleanedHtml.toLowerCase().startsWith('<html')) {
            console.warn("Cleaned HTML output does not start with <!doctype html> or <html>. It might be an explanation or error from AI:", cleanedHtml.substring(0, 200));
        }
        return cleanedHtml;
    }

    function cleanAiCssOutput(cssString) {
        if (!cssString) return '';
        let cleanedCss = cssString.trim();
        cleanedCss = cleanedCss.replace(/^```css\s*/i, '');
        cleanedCss = cleanedCss.replace(/\s*```$/, '');
        const commonPhrases = ["here's the css:", "here is the css code:", "sure, here's the css:"];
        for (const phrase of commonPhrases) {
            if (cleanedCss.toLowerCase().startsWith(phrase)) {
                cleanedCss = cleanedCss.substring(phrase.length).trimStart();
                break;
            }
        }
        return cleanedCss;
    }

    function cleanAiJsOutput(jsString) {
        if (!jsString) return '';
        let cleanedJs = jsString.trim();
        cleanedJs = cleanedJs.replace(/^```javascript\s*/i, '');
        cleanedJs = cleanedJs.replace(/^```js\s*/i, '');
        cleanedJs = cleanedJs.replace(/\s*```$/, '');
        const commonPhrases = ["here's the javascript:", "here is the javascript code:", "sure, here's the javascript:"];
        for (const phrase of commonPhrases) {
            if (cleanedJs.toLowerCase().startsWith(phrase)) {
                cleanedJs = cleanedJs.substring(phrase.length).trimStart();
                break;
            }
        }
        if (cleanedJs.toLowerCase().includes("no javascript needed") || cleanedJs.toLowerCase().includes("no javascript necessary")) {
            return "// No JavaScript specified by AI for this request."; // Return a comment instead of empty
        }
        return cleanedJs;
    }

    // --- Main Form Submission Logic (Sequential API Calls) ---
    generateForm.addEventListener('submit', async function(event) { 
        event.preventDefault(); 
        userOriginalPrompt = promptInput.value.trim(); 
        resultsContainer.innerHTML = ''; 
        currentGeneratedHtml = ''; 
        currentGeneratedCss = '';
        currentGeneratedJs = '';

        if (userOriginalPrompt === "") {
            const errorHtml = `
                <div class="alert alert-warning alert-dismissible fade show" role="alert">
                    <strong>Oops!</strong> Please enter a description for the website you want to create.
                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>`;
            resultsContainer.innerHTML = errorHtml;
            return; 
        }

        loadingProgressContainer.style.display = 'block'; 
        generateButton.textContent = 'Generating...';
        generateButton.disabled = true;
        loadingTextElement.textContent = 'Generating HTML...'; 

        try {
            // Step 1: Generate HTML
            const htmlPrompt = `You are an expert web developer. Your task is to generate a complete, modern, and aesthetically stunning HTML webpage based on the following user requirement.
User Requirement: "${userOriginalPrompt}"
IMPORTANT INSTRUCTIONS:
1. Respond ONLY with the raw HTML code for the webpage.
2. Do NOT include any explanations, comments, or any text outside of the HTML tags.
3. The HTML should be well-structured, semantic, and ready to be styled with a separate CSS file. It should use standard HTML5 tags.
4. Ensure the HTML structure is suitable for a modern, visually appealing user interface. Incorporate Bootstrap 4 classes for layout and basic styling (e.g., grid system, buttons, cards, typography) where appropriate.
5. Start directly with <!DOCTYPE html> and end with </html>. Include a minimal <head> with a <title> based on the user requirement, and link to a placeholder 'style.css' and 'script.js'.
6. Do NOT use markdown formatting (like \`\`\`html) around the HTML code block.`;

            let response = await fetch('/.netlify/functions/chat', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    "model": "mistralai/mistral-7b-instruct:free", 
                    "messages": [{ "role": "user", "content": htmlPrompt }]
                })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: "Failed to parse error response from server."}) );
                throw new Error(`HTML Generation Failed: ${response.status} ${response.statusText}. Details: ${errData.error?.message || JSON.stringify(errData.error || errData)}`);
            }
            let htmlData = await response.json();
            if (!htmlData.choices || !htmlData.choices[0] || !htmlData.choices[0].message || !htmlData.choices[0].message.content) {
                throw new Error("Invalid response structure from HTML generation API.");
            }
            currentGeneratedHtml = cleanAiHtmlOutput(htmlData.choices[0].message.content);
            if (!currentGeneratedHtml || (!currentGeneratedHtml.toLowerCase().includes('<html') && !currentGeneratedHtml.toLowerCase().includes('<!doctype html'))) {
                 throw new Error("The AI did not return valid HTML content for the webpage structure. Please try rephrasing your prompt.");
            }

            // Step 2: Generate CSS
            loadingTextElement.textContent = 'Generating CSS...';
            const cssPrompt = `You are an expert web developer. Based on the following user requirement and HTML structure, generate the necessary CSS code to style it into a modern, aesthetically stunning webpage.
User Requirement for the overall page was: "${userOriginalPrompt}"
HTML Structure:
\`\`\`html
${currentGeneratedHtml}
\`\`\`
IMPORTANT INSTRUCTIONS:
1. Respond ONLY with the raw CSS code.
2. Do NOT include any explanations, comments, HTML tags (like <style>), or any text outside of the CSS rules.
3. The CSS should be self-contained and suitable for a file named 'style.css'.
4. Make the webpage visually appealing and modern. Ensure good contrast and readability.
5. Do NOT use markdown formatting (like \`\`\`css) around the CSS code block.`;
            
            const cssMessages = [
                { role: "user", content: htmlPrompt }, 
                { role: "assistant", content: currentGeneratedHtml }, 
                { role: "user", content: cssPrompt } 
            ];
            response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "model": "mistralai/mistral-7b-instruct:free", "messages": cssMessages })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: "Failed to parse error response from server."}) );
                throw new Error(`CSS Generation Failed: ${response.status} ${response.statusText}. Details: ${errData.error?.message || JSON.stringify(errData.error || errData)}`);
            }
            let cssData = await response.json();
            if (!cssData.choices || !cssData.choices[0] || !cssData.choices[0].message || !cssData.choices[0].message.content) {
                throw new Error("Invalid response structure from CSS generation API.");
            }
            currentGeneratedCss = cleanAiCssOutput(cssData.choices[0].message.content);

            // Step 3: Generate JavaScript
            loadingTextElement.textContent = 'Generating JavaScript...';
            const jsPrompt = `You are an expert web developer. Based on the following user requirement, HTML structure, and CSS, generate any necessary JavaScript code to add interactivity or functionality as implied by the user's original requirement or to enhance the user experience.
User Requirement for the overall page was: "${userOriginalPrompt}"
HTML Structure:
\`\`\`html
${currentGeneratedHtml}
\`\`\`
CSS:
\`\`\`css
${currentGeneratedCss}
\`\`\`
IMPORTANT INSTRUCTIONS:
1. Respond ONLY with the raw JavaScript code.
2. Do NOT include any explanations, comments, HTML tags (like <script>), or any text outside of the JS code.
3. The JavaScript should be self-contained and suitable for a file named 'script.js'.
4. If no JavaScript is strictly necessary for the user's request, respond with just a comment like "// No JavaScript specified by AI for this request." or an empty string.
5. Do NOT use markdown formatting (like \`\`\`javascript or \`\`\`js) around the JS code block.`;

            const jsMessages = [
                { role: "user", content: htmlPrompt }, { role: "assistant", content: currentGeneratedHtml },
                { role: "user", content: cssPrompt }, { role: "assistant", content: currentGeneratedCss },
                { role: "user", content: jsPrompt }
            ];
            response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ "model": "mistralai/mistral-7b-instruct:free", "messages": jsMessages })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: "Failed to parse error response from server."}) );
                throw new Error(`JavaScript Generation Failed: ${response.status} ${response.statusText}. Details: ${errData.error?.message || JSON.stringify(errData.error || errData)}`);
            }
            let jsData = await response.json();
            if (!jsData.choices || !jsData.choices[0] || !jsData.choices[0].message || !jsData.choices[0].message.content) {
                throw new Error("Invalid response structure from JavaScript generation API.");
            }
            currentGeneratedJs = cleanAiJsOutput(jsData.choices[0].message.content);

            // All successful - Update results container with info and action buttons
            resultsContainer.innerHTML = `
                <div class="card shadow-sm">
                    <div class="card-header">
                        <h5 class="mb-0 text-success"><i class="fas fa-check-circle mr-2"></i>Website Components Generated!</h5>
                    </div>
                    <div class="card-body">
                        <p>Your HTML, CSS, and JavaScript components have been generated. You can now preview the combined result or prepare for download.</p>
                        <div class="mt-3 text-center">
                            <button id="open-preview-button" class="btn btn-info mr-2 mt-2">
                               <i class="fas fa-external-link-alt mr-2"></i>Open Preview in New Tab
                            </button>
                            <button id="download-zip-button" class="btn btn-success mt-2" disabled>
                                <i class="fas fa-file-archive mr-2"></i>Download ZIP (Coming Soon)
                            </button>
                        </div>
                        <hr>
                        <h6 class="mt-4">Generated HTML (Snippet):</h6>
                        <pre style="max-height: 150px; overflow-y: auto; background-color: var(--color-surface-alt); padding: 10px; border-radius: var(--border-radius);"><code>${currentGeneratedHtml.replace(/</g, "&lt;").replace(/>/g, "&gt;").substring(0, 1000)}...</code></pre>
                        <h6 class="mt-3">Generated CSS (Snippet):</h6>
                        <pre style="max-height: 150px; overflow-y: auto; background-color: var(--color-surface-alt); padding: 10px; border-radius: var(--border-radius);"><code>${currentGeneratedCss.substring(0, 1000)}...</code></pre>
                        <h6 class="mt-3">Generated JavaScript (Snippet):</h6>
                        <pre style="max-height: 150px; overflow-y: auto; background-color: var(--color-surface-alt); padding: 10px; border-radius: var(--border-radius);"><code>${currentGeneratedJs.substring(0, 1000)}...</code></pre>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error during multi-step generation:', error);
            resultsContainer.innerHTML = `<div class="alert alert-danger" role="alert">Error generating website components: ${error.message}</div>`;
        } finally {
            loadingProgressContainer.style.display = 'none';
            generateButton.disabled = false;
            generateButton.textContent = originalButtonText;
            loadingTextElement.textContent = originalLoadingText; 
        }
    });

    // Event listener for dynamically created action buttons in resultsContainer
    resultsContainer.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'open-preview-button') {
            if (currentGeneratedHtml) {
                // Construct the full HTML page content
                // Ensure the AI-generated HTML includes <head> and links to style.css and script.js
                // For preview, we will embed CSS and JS directly.
                
                // Basic check if currentGeneratedHtml is a full document
                let finalHtmlToPreview = currentGeneratedHtml;
                if (!currentGeneratedHtml.toLowerCase().includes('<!doctype html>')) {
                    // If not a full document, wrap it for preview
                    finalHtmlToPreview = `
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Generated Preview</title>
                            <style>
                                \n${currentGeneratedCss || ''}\n
                            </style>
                        </head>
                        <body>
                            ${currentGeneratedHtml}
                            <script>
                                \n${currentGeneratedJs || ''}\n
                            </script>
                        </body>
                        </html>`;
                } else {
                    // If it's a full document, try to inject CSS and JS more intelligently
                    // This is a simplified injection, assuming <head> and <body> tags exist
                    let headEnd = finalHtmlToPreview.indexOf('</head>');
                    if (headEnd !== -1) {
                        finalHtmlToPreview = finalHtmlToPreview.slice(0, headEnd) + `<style>\n${currentGeneratedCss || ''}\n</style>` + finalHtmlToPreview.slice(headEnd);
                    } else { // Fallback if no </head>
                        finalHtmlToPreview = `<style>\n${currentGeneratedCss || ''}\n</style>` + finalHtmlToPreview;
                    }

                    let bodyEnd = finalHtmlToPreview.indexOf('</body>');
                    if (bodyEnd !== -1) {
                        finalHtmlToPreview = finalHtmlToPreview.slice(0, bodyEnd) + `<script>\n${currentGeneratedJs || ''}\n</script>` + finalHtmlToPreview.slice(bodyEnd);
                    } else { // Fallback if no </body>
                        finalHtmlToPreview += `<script>\n${currentGeneratedJs || ''}\n</script>`;
                    }
                }


                const blob = new Blob([finalHtmlToPreview], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                // No URL.revokeObjectURL(url) here, as the new tab needs it.
            } else {
                alert("No HTML content generated yet to preview.");
            }
        }
        // Future: Add handler for 'download-zip-button'
    });

    // --- Light/Dark Mode Theme Toggle Logic ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const bodyElement = document.body;

    function applyTheme(theme) {
        if (theme === 'dark') {
            bodyElement.classList.add('dark-mode');
            if (themeToggleButton) themeToggleButton.textContent = 'Light Mode';
        } else {
            bodyElement.classList.remove('dark-mode');
            if (themeToggleButton) themeToggleButton.textContent = 'Dark Mode';
        }
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme('light'); 
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            bodyElement.classList.toggle('dark-mode');
            let currentTheme = bodyElement.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', currentTheme);
            applyTheme(currentTheme);
        });
    } else {
        console.warn("Theme toggle button (#theme-toggle) not found. Theme switching will not be available.");
    }
});
