// API Key is now handled by the Netlify serverless function.

document.addEventListener('DOMContentLoaded', () => {
    const generateForm = document.getElementById('generate-form');
    const generateButton = document.getElementById('generate-button');
    const loadingProgressContainer = document.getElementById('loading-progress-container');
    const resultsContainer = document.getElementById('results-container');
    const promptInput = document.getElementById('prompt-input'); 

    let currentGeneratedHtml = null; // Variable to store the latest generated HTML

    if (!generateForm || !generateButton || !loadingProgressContainer || !resultsContainer || !promptInput) {
        console.error("Initialization failed: One or more critical DOM elements are missing (generateForm, generateButton, loadingProgressContainer, resultsContainer, or promptInput).");
        if(resultsContainer) { 
            resultsContainer.innerHTML = `<div class="alert alert-danger" role="alert">Page form functionality error: Essential elements missing. Please reload.</div>`;
        }
        return; 
    }

    const originalButtonText = generateButton.textContent;

    generateForm.addEventListener('submit', function(event) {
        event.preventDefault(); 
        const userInput = promptInput.value.trim(); 
        resultsContainer.innerHTML = ''; 
        currentGeneratedHtml = null; // Reset on new submission

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

        const fullPrompt = "Generate a complete HTML webpage based on the following prompt. Only output the HTML code, starting with <!DOCTYPE html> and ending with </html>. Do not include any explanatory text or markdown formatting before or after the HTML code. Ensure the HTML is well-formed and uses standard Bootstrap 4 classes for styling where appropriate. Prompt: " + userInput;

        // Updated fetch to use the Netlify serverless function
        fetch('/.netlify/functions/chat', { // New endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // No Authorization header needed here; Netlify function handles it
            },
            body: JSON.stringify({ // Body now contains model and messages for the Netlify function
                "model": "mistralai/mistral-7b-instruct:free", 
                "messages": [
                    { "role": "user", "content": fullPrompt }
                ]
            })
        })
        .then(response => {
            // First, check if the response from the Netlify function itself is okay
            if (!response.ok) {
                // Try to parse the error body from the Netlify function
                return response.json().then(errData => {
                    // errData could be { error: "message from Netlify func" } or OpenRouter's error structure
                    let errorDetails = errData.error ? JSON.stringify(errData.error) : JSON.stringify(errData);
                    if (errData.error && errData.error.message) { // Specifically for OpenRouter like errors passed through
                        errorDetails = errData.error.message;
                    } else if (typeof errData.error === 'string') { // For simple { error: "message" }
                         errorDetails = errData.error;
                    }
                    throw new Error(`Server Function Error: ${response.status} ${response.statusText}. Details: ${errorDetails}`);
                }).catch(() => { // Fallback if parsing Netlify's error response fails
                    throw new Error(`Server Function Error: ${response.status} ${response.statusText}. Could not parse error response.`);
                });
            }
            return response.json(); // This is the body from the Netlify function, which should be OpenRouter's response
        })
        .then(data => { // data is now the parsed JSON response from OpenRouter (forwarded by Netlify)
            if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                let rawHtml = data.choices[0].message.content;
                currentGeneratedHtml = rawHtml.replace(/^```html\s*|```\s*$/g, '').trim();

                resultsContainer.innerHTML = `
                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h5 class="mb-0">Generated Website Preview</h5>
                        </div>
                        <div class="card-body">
                            <iframe id="html-preview-iframe" srcdoc="${currentGeneratedHtml.replace(/"/g, '&quot;')}" style="width: 100%; height: 400px; border: 1px solid var(--color-border); border-radius: var(--border-radius);" title="Generated Website Preview"></iframe>
                        </div>
                        <div class="card-footer text-center">
                             <button id="dynamic-download-button" class="btn btn-success mt-2">
                                <i class="fas fa-download mr-2"></i>Download HTML
                            </button>
                        </div>
                    </div>
                `;
            } else if (data.error) { // Handle cases where OpenRouter returns an error object within a 200 OK from Netlify
                console.error("OpenRouter API Error (via Netlify):", data.error);
                currentGeneratedHtml = null;
                throw new Error(`OpenRouter API Error: ${data.error.message || JSON.stringify(data.error)}`);
            }
            else {
                console.error("Unexpected API response structure (via Netlify):", data);
                currentGeneratedHtml = null; 
                throw new Error("Unexpected API response structure from server. Could not find generated content.");
            }
        })
        .catch(error => {
            console.error('Error during API call via Netlify function:', error);
            currentGeneratedHtml = null; 
            resultsContainer.innerHTML = `<div class="alert alert-danger" role="alert">Error generating website: ${error.message}</div>`;
        })
        .finally(() => {
            loadingProgressContainer.style.display = 'none';
            generateButton.disabled = false;
            generateButton.textContent = originalButtonText;
        });
    });

    // Event listener for the dynamically created download button
    resultsContainer.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'dynamic-download-button') {
            if (currentGeneratedHtml) {
                const blob = new Blob([currentGeneratedHtml], { type: 'text/html' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'generated_website.html';
                document.body.appendChild(link); 
                link.click();
                document.body.removeChild(link); 
                URL.revokeObjectURL(link.href); 
            } else {
                console.error("No HTML content available to download.");
                alert("No HTML content available to download. Please generate a website first.");
            }
        }
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
