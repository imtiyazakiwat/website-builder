// API Key is now handled by the Netlify serverless function.

document.addEventListener('DOMContentLoaded', () => {
    const generateForm = document.getElementById('generate-form');
    const generateButton = document.getElementById('generate-button');
    const loadingProgressContainer = document.getElementById('loading-progress-container');
    const resultsContainer = document.getElementById('results-container');
    const promptInput = document.getElementById('prompt-input'); 

    // Store the generated content for easy access
    let currentGeneratedHtml = null;
    let currentGeneratedCss = null;
    let currentGeneratedJs = null;
    
    // Store user preferences
    let useTailwindCss = false;

    // Import parser utilities
    let parserUtils;
    try {
        // For browser environment, parser-utils.js needs to be loaded separately via script tag
        // This check allows the code to work in both NodeJS and browser environments
        if (typeof require !== 'undefined') {
            parserUtils = require('./parser-utils.js');
        } else {
            // In browser, assume parserUtils is already loaded as a global variable
            parserUtils = window.parserUtils;
        }
    } catch (e) {
        console.warn('Parser utilities not loaded, using built-in parsing functions.');
        
        // Fallback to built-in functions if module loading fails
        parserUtils = {
            processHtml: (html) => {
                if (!html) return '';
                html = html.replace(/```(?:html)?\s*|\s*```/gi, '');
                if (!html.trim().toLowerCase().startsWith('<!doctype')) {
                    return `<!DOCTYPE html>\n<html>\n<head>\n    <title>Generated Page</title>\n</head>\n<body>\n${html}\n</body>\n</html>`;
                }
                return html.trim();
            },
            processCss: (css) => {
                if (!css) return '';
                css = css.replace(/```(?:css)?\s*|\s*```/gi, '');
                return `/* Generated CSS */\n${css.trim()}`;
            },
            processJs: (js) => {
                if (!js) return '';
                js = js.replace(/```(?:javascript|js)?\s*|\s*```/gi, '');
                return `// Generated JavaScript\n(function() {\n${js.trim()}\n})();`;
            },
            addTailwindCss: (html, useTailwind) => {
                if (!useTailwind) return html;
                const tailwindCdn = `<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">`;
                if (html.includes('</head>')) {
                    return html.replace('</head>', `${tailwindCdn}\n</head>`);
                }
                return html;
            },
            combineFiles,
            parseApiResponse: (rawContent, options = {}) => {
                const htmlMatch = rawContent.match(/---HTML---\s*([\s\S]*?)(?=---CSS---|$)/i);
                const cssMatch = rawContent.match(/---CSS---\s*([\s\S]*?)(?=---JAVASCRIPT---|$)/i);
                const jsMatch = rawContent.match(/---JAVASCRIPT---\s*([\s\S]*?)(?=$)/i);
                
                let extractedHtml = htmlMatch ? htmlMatch[1].trim() : '';
                let extractedCss = cssMatch ? cssMatch[1].trim() : '';
                let extractedJs = jsMatch ? jsMatch[1].trim() : '';
                
                // Remove code block markers
                extractedHtml = extractedHtml.replace(/```(?:html)?\s*|\s*```/gi, '');
                extractedCss = extractedCss.replace(/```(?:css)?\s*|\s*```/gi, '');
                extractedJs = extractedJs.replace(/```(?:javascript|js)?\s*|\s*```/gi, '');
                
                return {
                    html: parserUtils.processHtml(extractedHtml),
                    css: parserUtils.processCss(extractedCss),
                    js: parserUtils.processJs(extractedJs)
                };
            }
        };
    }

    if (!generateForm || !generateButton || !loadingProgressContainer || !resultsContainer || !promptInput) {
        console.error("Initialization failed: One or more critical DOM elements are missing (generateForm, generateButton, loadingProgressContainer, resultsContainer, or promptInput).");
        if(resultsContainer) { 
            resultsContainer.innerHTML = `<div class="alert alert-danger" role="alert">Page form functionality error: Essential elements missing. Please reload.</div>`;
        }
        return; 
    }

    const originalButtonText = generateButton.textContent;

    // Function to save content to localStorage with an expiration time
    function saveToTempStorage(key, value) {
        const item = {
            value: value,
            expiry: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 hours expiration
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    // Function to get content from localStorage
    function getFromTempStorage(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        
        const item = JSON.parse(itemStr);
        const now = new Date().getTime();
        
        // Check if item is expired
        if (now > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        
        return item.value;
    }

    // Updated API response processing
    function processApiResponse(rawContent) {
        console.log('Processing API response...');
        
        try {
            // Use the parser utility to extract and process content with options
            const parsedContent = parserUtils.parseApiResponse(rawContent, { 
                useTailwind: useTailwindCss 
            });
            
            // Store the extracted and processed content
            currentGeneratedHtml = parsedContent.html;
            currentGeneratedCss = parsedContent.css;
            currentGeneratedJs = parsedContent.js;
            
            // Save to temporary storage
            saveToTempStorage('temp_html', currentGeneratedHtml);
            saveToTempStorage('temp_css', currentGeneratedCss);
            saveToTempStorage('temp_js', currentGeneratedJs);
            saveToTempStorage('use_tailwind', useTailwindCss);
            
            // Create combined HTML
            return parserUtils.combineFiles(
                currentGeneratedHtml, 
                currentGeneratedCss, 
                currentGeneratedJs,
                { useTailwind: useTailwindCss }
            );
        } catch (error) {
            console.error('Error processing API response:', error);
            return null;
        }
    }

    // Function to open the preview in a new tab
    function openPreviewInNewTab(html) {
        // Create a blob from the HTML content
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Open in new tab and handle potential popup blockers
        const newTab = window.open(url, '_blank');
        
        // Check if the window was blocked by a popup blocker
        if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
            alert('Preview was blocked by a popup blocker. Please allow popups for this site to use this feature.');
            // Provide alternative way to view
            const tempUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = tempUrl;
            link.download = 'preview.html';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(tempUrl), 100);
        } else {
            // If the tab opened successfully, we clean up when the tab is closed
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }

    generateForm.addEventListener('submit', function(event) {
        event.preventDefault(); 
        const userInput = promptInput.value.trim(); 
        resultsContainer.innerHTML = ''; 
        currentGeneratedHtml = null;
        currentGeneratedCss = null;
        currentGeneratedJs = null;

        if (userInput === "") {
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

        // Enhanced prompt engineering for modern, aesthetic websites
        const fullPrompt = `
You are an expert web developer creating a professional, production-ready website.

SYSTEM INSTRUCTIONS:
1. Generate complete, production-ready code with NO placeholders.
2. Create a fully responsive website using semantic HTML5 tags.
3. Use Tailwind CSS (via CDN) for styling with custom CSS enhancements.
4. Add interactive elements with ES6+ JavaScript functionality.
5. Include SEO-optimized content with proper heading structure.
6. Implement accessibility features (ARIA attributes, keyboard navigation).

REQUIREMENTS:
- Responsive header with navigation
- Hero section with relevant imagery
- Interactive elements (buttons, forms, cards)
- Footer with social media links
- "Back to Top" button
- Subtle animations and transitions

YOUR TASK:
Create a professional, visually appealing website based on this description: "${userInput}"

Return three components:

---HTML---
<!DOCTYPE html>
<html>
...complete HTML content...
</html>

---CSS---
/* Custom CSS styling */
...styles not covered by Tailwind...

---JAVASCRIPT---
// Complete JavaScript functionality
...all necessary JavaScript code...
`;

        // Updated fetch to use the Netlify serverless function
        fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "model": "mistralai/devstral-small:free",
                "messages": [
                    { "role": "user", "content": fullPrompt }
                ]
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    let errorDetails = errData.error ? JSON.stringify(errData.error) : JSON.stringify(errData);
                    if (errData.error && errData.error.message) {
                        errorDetails = errData.error.message;
                    } else if (typeof errData.error === 'string') {
                         errorDetails = errData.error;
                    }
                    throw new Error(`Server Function Error: ${response.status} ${response.statusText}. Details: ${errorDetails}`);
                }).catch(() => {
                    throw new Error(`Server Function Error: ${response.status} ${response.statusText}. Could not parse error response.`);
                });
            }
            return response.json();
        })
        .then(data => {
            // Log the complete API response
            console.log('Complete API Response:', data);
            console.log('%c API Response was logged! Check the response in the button below or in your console. ', 'background: #2c3e50; color: white; padding: 5px; border-radius: 3px; font-weight: bold;');

            if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                let rawContent = data.choices[0].message.content;
                
                // Also log the raw content extracted from the response
                console.log('Raw Content from API:', rawContent);
                
                // Store the API response content for display and copy
                const apiResponseElement = document.getElementById('api-response-content');
                if (apiResponseElement) {
                    // Store the raw content in a data attribute for copying
                    apiResponseElement.setAttribute('data-raw-content', rawContent);

                    // Format the response with section highlighting
                    let formattedContent = rawContent;
                    
                    // Highlight HTML section
                    formattedContent = formattedContent.replace(
                        /---HTML---\s*([\s\S]*?)(?=---CSS---|---JAVASCRIPT---|$)/i,
                        '<div class="html-section"><strong>---HTML---</strong>$1</div>'
                    );
                    
                    // Highlight CSS section
                    formattedContent = formattedContent.replace(
                        /---CSS---\s*([\s\S]*?)(?=---JAVASCRIPT---|$)/i,
                        '<div class="css-section"><strong>---CSS---</strong>$1</div>'
                    );
                    
                    // Highlight JavaScript section
                    formattedContent = formattedContent.replace(
                        /---JAVASCRIPT---\s*([\s\S]*?)(?=$)/i,
                        '<div class="javascript-section"><strong>---JAVASCRIPT---</strong>$1</div>'
                    );
                    
                    apiResponseElement.innerHTML = formattedContent;
                }
                
                // Process the API response
                const combinedHtml = processApiResponse(rawContent);
                
                if (!combinedHtml) {
                    throw new Error('Failed to process the generated content');
                }
                
                // Add loading animation with improved UI for preview generation
                resultsContainer.innerHTML = `
                    <div class="card shadow-sm">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Generated Website</h5>
                            <div class="btn-group">
                                <button id="view-preview-button" class="btn btn-primary">
                                    <i class="fas fa-external-link-alt mr-2"></i>Open Preview
                                </button>
                                <button id="refresh-preview-button" class="btn btn-outline-secondary ml-2">
                                    <i class="fas fa-sync-alt mr-2"></i>Refresh
                                </button>
                            </div>
                        </div>
                        <div class="card-body text-center">
                            <div class="preview-spinner">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="sr-only">Loading preview...</span>
                                </div>
                                <p class="mt-2">Preparing your website preview...</p>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="row">
                                <div class="col-md-4 mb-2 mb-md-0">
                                    <button id="download-html-button" class="btn btn-outline-success btn-block">
                                        <i class="fas fa-download mr-2"></i>HTML
                                    </button>
                                </div>
                                <div class="col-md-4 mb-2 mb-md-0">
                                    <button id="download-css-button" class="btn btn-outline-info btn-block">
                                        <i class="fas fa-download mr-2"></i>CSS
                                    </button>
                                </div>
                                <div class="col-md-4">
                                    <button id="download-js-button" class="btn btn-outline-warning btn-block">
                                        <i class="fas fa-download mr-2"></i>JavaScript
                                    </button>
                                </div>
                            </div>
                            <div class="mt-3">
                                <button id="download-all-button" class="btn btn-success btn-block">
                                    <i class="fas fa-download mr-2"></i>Download Complete Website
                                </button>
                            </div>
                            <div class="mt-3 d-flex justify-content-between align-items-center">
                                <div class="custom-control custom-switch">
                                    <input type="checkbox" class="custom-control-input" id="tailwind-switch">
                                    <label class="custom-control-label" for="tailwind-switch">Use Tailwind CSS</label>
                                </div>
                                <button id="apply-tailwind-button" class="btn btn-sm btn-outline-primary">
                                    Apply Changes
                                </button>
                            </div>
                            <div class="mt-3">
                                <button id="toggle-api-response" class="btn btn-outline-secondary btn-block">
                                    <i class="fas fa-code mr-2"></i>Show/Hide API Response
                                </button>
                                <div id="api-response-container" class="mt-3" style="display: none;">
                                    <div class="card bg-light">
                                        <div class="card-header d-flex justify-content-between align-items-center">
                                            <span>API Response</span>
                                            <button id="copy-api-response" class="btn btn-sm btn-outline-primary">
                                                <i class="fas fa-copy mr-1"></i>Copy to Clipboard
                            </button>
                                        </div>
                                        <div class="card-body">
                                            <pre id="api-response-content" style="max-height: 400px; overflow-y: auto; white-space: pre-wrap;"></pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Set the Tailwind switch to the current state
                const tailwindSwitch = document.getElementById('tailwind-switch');
                if (tailwindSwitch) {
                    tailwindSwitch.checked = useTailwindCss;
                }
                
                // Add animation for the preview with enhanced user feedback
                setTimeout(() => {
                    const previewSpinner = document.querySelector('.preview-spinner');
                    if (previewSpinner) {
                        previewSpinner.innerHTML = `
                            <div class="preview-ready">
                                <p class="text-success mb-3"><i class="fas fa-check-circle mr-2"></i>Preview ready!</p>
                                <div class="preview-actions mb-3">
                                    <button id="inline-preview-button" class="btn btn-sm btn-outline-primary mr-2">
                                        <i class="fas fa-eye mr-1"></i>Quick Preview
                                    </button>
                                    <button id="spin-preview-button" class="btn btn-sm btn-outline-info">
                                        <i class="fas fa-sync-alt mr-1"></i>Spin Preview
                                    </button>
                                </div>
                                <div id="quick-preview-container" style="display: none; width: 100%; height: 300px; overflow: hidden; border-radius: 8px; border: 1px solid var(--color-border); margin-top: 15px;"></div>
                            </div>
                        `;
                        
                        // Add event listener for the inline preview button
                        const inlinePreviewButton = document.getElementById('inline-preview-button');
                        if (inlinePreviewButton) {
                            inlinePreviewButton.addEventListener('click', () => {
                                const previewContainer = document.getElementById('quick-preview-container');
                                if (previewContainer) {
                                    if (previewContainer.style.display === 'none') {
                                        previewContainer.style.display = 'block';
                                        previewContainer.innerHTML = `<iframe srcdoc="${combinedHtml.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; border: none;"></iframe>`;
                                        inlinePreviewButton.innerHTML = `<i class="fas fa-eye-slash mr-1"></i>Hide Preview`;
                                    } else {
                                        previewContainer.style.display = 'none';
                                        previewContainer.innerHTML = '';
                                        inlinePreviewButton.innerHTML = `<i class="fas fa-eye mr-1"></i>Quick Preview`;
                                    }
                                }
                            });
                        }
                        
                        // Add event listener for the spin preview button
                        const spinPreviewButton = document.getElementById('spin-preview-button');
                        if (spinPreviewButton) {
                            spinPreviewButton.addEventListener('click', () => {
                                const previewContainer = document.getElementById('quick-preview-container');
                                if (previewContainer) {
                                    previewContainer.style.display = 'block';
                                    // Create animation effect
                                    previewContainer.innerHTML = `
                                        <div class="spin-preview-animation">
                                            <div class="spinner-grow text-primary" role="status">
                                                <span class="sr-only">Loading...</span>
                                            </div>
                                        </div>
                                    `;
                                    
                                    // After animation, show the iframe with rotation effect
                                    setTimeout(() => {
                                        previewContainer.innerHTML = `
                                            <div class="spin-preview-wrapper">
                                                <iframe srcdoc="${combinedHtml.replace(/"/g, '&quot;')}" 
                                                        style="width: 100%; height: 100%; border: none; 
                                                        transform-origin: center; animation: spinPreview 1s ease-out;"></iframe>
                                            </div>
                                        `;
                                        inlinePreviewButton.innerHTML = `<i class="fas fa-eye-slash mr-1"></i>Hide Preview`;
                                    }, 800);
                                }
                            });
                        }
                    }
                }, 1500);
            } else if (data.error) {
                console.error("OpenRouter API Error (via Netlify):", data.error);
                currentGeneratedHtml = null;
                currentGeneratedCss = null;
                currentGeneratedJs = null;
                throw new Error(`OpenRouter API Error: ${data.error.message || JSON.stringify(data.error)}`);
            }
            else {
                console.error("Unexpected API response structure (via Netlify):", data);
                currentGeneratedHtml = null; 
                currentGeneratedCss = null;
                currentGeneratedJs = null;
                throw new Error("Unexpected API response structure from server. Could not find generated content.");
            }
        })
        .catch(error => {
            console.error('Error during API call via Netlify function:', error);
            currentGeneratedHtml = null; 
            currentGeneratedCss = null;
            currentGeneratedJs = null;
            resultsContainer.innerHTML = `<div class="alert alert-danger" role="alert">Error generating website: ${error.message}</div>`;
        })
        .finally(() => {
            loadingProgressContainer.style.display = 'none';
            generateButton.disabled = false;
            generateButton.textContent = originalButtonText;
        });
    });

    // Event delegation for dynamically created buttons
    resultsContainer.addEventListener('click', function(event) {
        // Toggle API Response
        if (event.target.closest('#toggle-api-response')) {
            event.preventDefault();
            const apiResponseContainer = document.getElementById('api-response-container');
            if (apiResponseContainer) {
                if (apiResponseContainer.style.display === 'none') {
                    apiResponseContainer.style.display = 'block';
                    event.target.closest('#toggle-api-response').innerHTML = '<i class="fas fa-code mr-2"></i>Hide API Response';
                } else {
                    apiResponseContainer.style.display = 'none';
                    event.target.closest('#toggle-api-response').innerHTML = '<i class="fas fa-code mr-2"></i>Show API Response';
                }
            }
        }
        
        // Copy API Response to clipboard
        if (event.target.closest('#copy-api-response')) {
            event.preventDefault();
            const responseContent = document.getElementById('api-response-content');
            if (responseContent) {
                // Get the raw content from the data attribute instead of the formatted HTML
                const rawContent = responseContent.getAttribute('data-raw-content') || responseContent.textContent;
                
                navigator.clipboard.writeText(rawContent)
                    .then(() => {
                        const copyButton = event.target.closest('#copy-api-response');
                        const originalText = copyButton.innerHTML;
                        copyButton.innerHTML = '<i class="fas fa-check mr-1"></i>Copied!';
                        setTimeout(() => {
                            copyButton.innerHTML = originalText;
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Failed to copy: ', err);
                        alert('Failed to copy response to clipboard. Please try again.');
                    });
            }
        }
        
        // Open Preview Button
        if (event.target.closest('#view-preview-button')) {
            event.preventDefault();
            const combinedHtml = parserUtils.combineFiles(
                getFromTempStorage('temp_html') || currentGeneratedHtml,
                getFromTempStorage('temp_css') || currentGeneratedCss,
                getFromTempStorage('temp_js') || currentGeneratedJs,
                { useTailwind: getFromTempStorage('use_tailwind') || useTailwindCss }
            );
            openPreviewInNewTab(combinedHtml);
        }
        
        // Refresh Preview Button
        if (event.target.closest('#refresh-preview-button')) {
            event.preventDefault();
            // Show loading animation
            const cardBody = event.target.closest('.card').querySelector('.card-body');
            if (cardBody) {
                cardBody.innerHTML = `
                    <div class="preview-spinner">
                        <div class="spinner-border text-primary" role="status">
                            <span class="sr-only">Refreshing preview...</span>
                        </div>
                        <p class="mt-2">Refreshing your website preview...</p>
                    </div>
                `;
                
                // Get latest content
                const combinedHtml = parserUtils.combineFiles(
                    getFromTempStorage('temp_html') || currentGeneratedHtml,
                    getFromTempStorage('temp_css') || currentGeneratedCss,
                    getFromTempStorage('temp_js') || currentGeneratedJs,
                    { useTailwind: getFromTempStorage('use_tailwind') || useTailwindCss }
                );
                
                // After a short delay, update the preview UI
                setTimeout(() => {
                    cardBody.innerHTML = `
                        <div class="preview-ready">
                            <p class="text-success mb-3"><i class="fas fa-check-circle mr-2"></i>Preview refreshed!</p>
                            <div class="preview-actions mb-3">
                                <button id="inline-preview-button" class="btn btn-sm btn-outline-primary mr-2">
                                    <i class="fas fa-eye mr-1"></i>Quick Preview
                                </button>
                                <button id="spin-preview-button" class="btn btn-sm btn-outline-info">
                                    <i class="fas fa-sync-alt mr-1"></i>Spin Preview
                                </button>
                            </div>
                            <div id="quick-preview-container" style="display: none; width: 100%; height: 300px; overflow: hidden; border-radius: 8px; border: 1px solid var(--color-border); margin-top: 15px;"></div>
                        </div>
                    `;
                    
                    // Reattach event listeners for the preview buttons
                    attachPreviewButtonListeners(combinedHtml);
                }, 1000);
            }
        }
        
        // Download HTML Button
        if (event.target.closest('#download-html-button')) {
            event.preventDefault();
            const htmlContent = getFromTempStorage('temp_html') || currentGeneratedHtml;
            if (htmlContent) {
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'index.html';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        }
        
        // Download CSS Button
        if (event.target.closest('#download-css-button')) {
            event.preventDefault();
            const cssContent = getFromTempStorage('temp_css') || currentGeneratedCss;
            if (cssContent) {
                const blob = new Blob([cssContent], { type: 'text/css' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'styles.css';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        }
        
        // Download JS Button
        if (event.target.closest('#download-js-button')) {
            event.preventDefault();
            const jsContent = getFromTempStorage('temp_js') || currentGeneratedJs;
            if (jsContent) {
                const blob = new Blob([jsContent], { type: 'text/javascript' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'script.js';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        }
        
        // Download All Button
        if (event.target.closest('#download-all-button')) {
            event.preventDefault();
            const htmlContent = getFromTempStorage('temp_html') || currentGeneratedHtml;
            const cssContent = getFromTempStorage('temp_css') || currentGeneratedCss;
            const jsContent = getFromTempStorage('temp_js') || currentGeneratedJs;
            const useTailwind = getFromTempStorage('use_tailwind') || useTailwindCss;
            
            if (htmlContent) {
                const combinedHtml = parserUtils.combineFiles(
                    htmlContent, 
                    cssContent, 
                    jsContent,
                    { useTailwind: useTailwind }
                );
                const blob = new Blob([combinedHtml], { type: 'text/html' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'website.html';
                document.body.appendChild(link); 
                link.click();
                document.body.removeChild(link); 
                URL.revokeObjectURL(link.href); 
            }
        }
        
        // Apply Tailwind Button
        if (event.target.closest('#apply-tailwind-button')) {
            event.preventDefault();
            const tailwindSwitch = document.getElementById('tailwind-switch');
            if (tailwindSwitch) {
                useTailwindCss = tailwindSwitch.checked;
                saveToTempStorage('use_tailwind', useTailwindCss);
                
                // Refresh the preview with the new setting
                const refreshButton = document.getElementById('refresh-preview-button');
                if (refreshButton) {
                    refreshButton.click();
                }
            }
        }
        
        // Inline Preview Button (for buttons added dynamically)
        if (event.target.closest('#inline-preview-button')) {
            const button = event.target.closest('#inline-preview-button');
            const previewContainer = document.getElementById('quick-preview-container');
            
            if (previewContainer) {
                const combinedHtml = parserUtils.combineFiles(
                    getFromTempStorage('temp_html') || currentGeneratedHtml,
                    getFromTempStorage('temp_css') || currentGeneratedCss,
                    getFromTempStorage('temp_js') || currentGeneratedJs,
                    { useTailwind: getFromTempStorage('use_tailwind') || useTailwindCss }
                );
                
                if (previewContainer.style.display === 'none') {
                    previewContainer.style.display = 'block';
                    previewContainer.innerHTML = `<iframe srcdoc="${combinedHtml.replace(/"/g, '&quot;')}" style="width: 100%; height: 100%; border: none;"></iframe>`;
                    button.innerHTML = `<i class="fas fa-eye-slash mr-1"></i>Hide Preview`;
            } else {
                    previewContainer.style.display = 'none';
                    previewContainer.innerHTML = '';
                    button.innerHTML = `<i class="fas fa-eye mr-1"></i>Quick Preview`;
                }
            }
        }
        
        // Spin Preview Button (for buttons added dynamically)
        if (event.target.closest('#spin-preview-button')) {
            const previewContainer = document.getElementById('quick-preview-container');
            if (previewContainer) {
                const combinedHtml = parserUtils.combineFiles(
                    getFromTempStorage('temp_html') || currentGeneratedHtml,
                    getFromTempStorage('temp_css') || currentGeneratedCss,
                    getFromTempStorage('temp_js') || currentGeneratedJs,
                    { useTailwind: getFromTempStorage('use_tailwind') || useTailwindCss }
                );
                
                previewContainer.style.display = 'block';
                // Create animation effect
                previewContainer.innerHTML = `
                    <div class="spin-preview-animation">
                        <div class="spinner-grow text-primary" role="status">
                            <span class="sr-only">Loading...</span>
                        </div>
                    </div>
                `;
                
                // After animation, show the iframe with rotation effect
                setTimeout(() => {
                    previewContainer.innerHTML = `
                        <div class="spin-preview-wrapper">
                            <iframe srcdoc="${combinedHtml.replace(/"/g, '&quot;')}" 
                                    style="width: 100%; height: 100%; border: none; 
                                    transform-origin: center; animation: spinPreview 1s ease-out;"></iframe>
                        </div>
                    `;
                    const inlinePreviewButton = document.getElementById('inline-preview-button');
                    if (inlinePreviewButton) {
                        inlinePreviewButton.innerHTML = `<i class="fas fa-eye-slash mr-1"></i>Hide Preview`;
                    }
                }, 800);
            }
        }
    });

    // Helper function to attach event listeners to preview buttons
    function attachPreviewButtonListeners(combinedHtml) {
        // This function is called after dynamically adding buttons
        // The event listeners are now handled through event delegation above
    }

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
