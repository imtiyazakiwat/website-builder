document.addEventListener('DOMContentLoaded', () => {
    // Existing form submission logic
    const generateForm = document.getElementById('generate-form');
    const generateButton = document.getElementById('generate-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultsContainer = document.getElementById('results-container');
    const promptInput = document.getElementById('prompt-input'); 

    if (generateForm && generateButton && loadingIndicator && resultsContainer && promptInput) {
        const originalButtonText = generateButton.textContent;

        generateForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            const userInput = promptInput.value.trim(); 
            resultsContainer.innerHTML = ''; 

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

            loadingIndicator.style.display = 'block'; 
            generateButton.textContent = 'Generating...';
            generateButton.disabled = true;

            setTimeout(function() {
                loadingIndicator.style.display = 'none';
                generateButton.textContent = originalButtonText;
                generateButton.disabled = false;
                
                const mockHtmlPreview = `
                    <div class="card shadow-sm">
                        <div class="card-body">
                            <h5 class="card-title text-success"><i class="fas fa-check-circle mr-2"></i>Generation Complete!</h5>
                            <p class="card-text">A mock preview of the generated website for your prompt: <br><em>"${userInput.substring(0, 150).replace(/</g, "&lt;").replace(/>/g, "&gt;")}..."</em></p>
                            <a href="#" class="btn btn-success mt-2" 
                               onclick="alert('This would open the full generated site in a new tab or download it. This is a mock action for demonstration.'); return false;">
                                <i class="fas fa-external-link-alt mr-2"></i>View Full Site (Mock)
                            </a>
                        </div>
                    </div>
                `;
                resultsContainer.innerHTML = mockHtmlPreview;
            }, 2500); 
        });
    } else {
        console.error("Initialization failed for form elements: One or more form-related DOM elements are missing.");
        if(resultsContainer) { 
            resultsContainer.innerHTML = `<div class="alert alert-danger" role="alert">Page form functionality error: Essential elements missing. Please reload.</div>`;
        }
    }

    // --- Light/Dark Mode Theme Toggle Logic ---
    const themeToggleButton = document.getElementById('theme-toggle'); // This ID will be added to HTML
    const bodyElement = document.body;

    // Function to apply the saved theme or default to light
    function applyTheme(theme) {
        if (theme === 'dark') {
            bodyElement.classList.add('dark-mode');
            if (themeToggleButton) themeToggleButton.textContent = 'Light Mode'; // Update button text
        } else {
            bodyElement.classList.remove('dark-mode');
            if (themeToggleButton) themeToggleButton.textContent = 'Dark Mode'; // Update button text
        }
    }

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme('light'); // Default to light theme if no preference saved
    }

    // Event listener for the theme toggle button
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            bodyElement.classList.toggle('dark-mode');
            let currentTheme;
            if (bodyElement.classList.contains('dark-mode')) {
                currentTheme = 'dark';
            } else {
                currentTheme = 'light';
            }
            localStorage.setItem('theme', currentTheme);
            applyTheme(currentTheme); // Update button text via applyTheme
        });
    } else {
        console.warn("Theme toggle button (#theme-toggle) not found. Theme switching will not be available.");
    }
});
