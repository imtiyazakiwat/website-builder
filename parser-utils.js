/**
 * Utilities for parsing API responses and extracting code components
 */

/**
 * Process HTML content
 * @param {string} html - Raw HTML content
 * @returns {string} - Processed HTML
 */
const processHtml = (html) => {
    if (!html) return '';
    
    // Remove markdown code block markers completely
    html = html.replace(/```(?:html)?\s*|\s*```/gi, '');
    
    // Ensure it starts with doctype and has html tags
    if (!html.trim().toLowerCase().startsWith('<!doctype')) {
        return `<!DOCTYPE html>\n<html>\n<head>\n    <title>Generated Page</title>\n</head>\n<body>\n${html}\n</body>\n</html>`;
    }
    
    // Add head tag if missing
    if (!html.match(/<head[^>]*>/i)) {
        html = html.replace(/<html[^>]*>/i, '$&\n<head>\n    <title>Generated Page</title>\n</head>');
    }
    
    // Add body tag if missing
    if (!html.match(/<body[^>]*>/i)) {
        html = html.replace(/<\/head>/i, '$&\n<body>');
        html = html.replace(/<\/html>/i, '</body>\n$&');
    }
    
    return html.trim();
};

/**
 * Process CSS content
 * @param {string} css - Raw CSS content
 * @returns {string} - Processed CSS
 */
const processCss = (css) => {
    if (!css) return '';
    
    // Remove markdown code block markers completely
    css = css.replace(/```(?:css)?\s*|\s*```/gi, '');
    
    // Add a comment to identify the source
    return `/* Generated CSS */\n${css.trim()}`;
};

/**
 * Process JavaScript content
 * @param {string} js - Raw JavaScript content
 * @returns {string} - Processed JavaScript
 */
const processJs = (js) => {
    if (!js) return '';
    
    // Remove markdown code block markers completely
    js = js.replace(/```(?:javascript|js)?\s*|\s*```/gi, '');
    
    // If content appears to be plain text instructions rather than code, 
    // provide a basic JavaScript template
    if (js.toLowerCase().includes('consider adding') || 
        js.toLowerCase().includes('you could add') ||
        js.toLowerCase().includes('for javascript functionality')) {
        return `// Generated JavaScript
(function() {
  // Basic functionality
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully');
    
    // Add smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
          behavior: 'smooth'
        });
      });
    });
    
    // Form validation if a form exists
    const form = document.querySelector('form');
    if (form) {
      form.addEventListener('submit', function(e) {
        let valid = true;
        const requiredInputs = form.querySelectorAll('[required]');
        
        requiredInputs.forEach(input => {
          if (!input.value.trim()) {
            valid = false;
            input.classList.add('error');
          } else {
            input.classList.remove('error');
          }
        });
        
        if (!valid) {
          e.preventDefault();
          alert('Please fill in all required fields');
        }
      });
    }
  });
})();`;
    }
    
    // Add a comment and wrap in IIFE for safety
    return `// Generated JavaScript\n(function() {\n${js.trim()}\n})();`;
};

/**
 * Add Tailwind CSS CDN to HTML if requested
 * @param {string} html - HTML content
 * @param {boolean} useTailwind - Whether to add Tailwind CSS
 * @returns {string} - HTML with Tailwind CSS added if requested
 */
const addTailwindCss = (html, useTailwind = false) => {
    if (!useTailwind) return html;
    
    const tailwindCdn = `<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">`;
    
    // Add Tailwind CSS before the closing head tag
    if (html.includes('</head>')) {
        return html.replace('</head>', `${tailwindCdn}\n</head>`);
    } else if (html.toLowerCase().includes('<!doctype html>')) {
        // If there's a doctype but no head, add it after the html tag
        return html.replace(/<html[^>]*>/i, `$&\n<head>\n    ${tailwindCdn}\n</head>`);
    } else {
        // If it's a fragment, wrap it in a complete html structure
        return `<!DOCTYPE html>\n<html>\n<head>\n    ${tailwindCdn}\n</head>\n<body>\n${html}\n</body>\n</html>`;
    }
};

/**
 * Combine HTML, CSS, and JS into a single HTML file
 * @param {string} html - Processed HTML content
 * @param {string} css - Processed CSS content
 * @param {string} js - Processed JavaScript content
 * @param {object} options - Additional options (e.g., useTailwind)
 * @returns {string} - Combined HTML
 */
const combineFiles = (html, css, js, options = {}) => {
    // Extract the body content from the HTML
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const headMatch = html.match(/<head[^>]*>([\s\S]*)<\/head>/i);
    
    let bodyContent = bodyMatch ? bodyMatch[1] : html;
    let headContent = headMatch ? headMatch[1] : '';
    
    // Add Tailwind CSS if requested
    const tailwindCdn = options.useTailwind ? 
        `\n    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">` : '';
    
    // Create the combined HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>${tailwindCdn}
    ${headContent}
    <style>
${css}
    </style>
</head>
<body>
${bodyContent}
    <script>
${js}
    </script>
</body>
</html>`;
};

/**
 * Clean and extract content between section markers
 * @param {string} content - The content to extract from
 * @param {string} marker - The section marker name (e.g., "HTML", "CSS")
 * @returns {string} - The extracted content
 */
const extractSectionContent = (content, marker) => {
    // Create a case-insensitive regex for the section marker
    const markerRegex = new RegExp(`---${marker}---\\s*([\\s\\S]*?)(?=---(?:HTML|CSS|JAVASCRIPT)---|$)`, 'i');
    const match = content.match(markerRegex);
    
    if (!match) return '';
    
    let extractedContent = match[1].trim();
    
    // Handle code blocks wrapped in backticks - match the entire content between triple backticks
    const codeBlockRegex = new RegExp(`\`\`\`(?:${marker.toLowerCase()})?([\\s\\S]*?)\`\`\``, 'gi');
    let codeBlockMatch;
    
    while ((codeBlockMatch = codeBlockRegex.exec(extractedContent)) !== null) {
        // Replace the backtick block with just the content inside
        if (codeBlockMatch[1]) {
            extractedContent = codeBlockMatch[1].trim();
        }
    }
    
    return extractedContent;
};

/**
 * Parse API response and extract HTML, CSS, and JavaScript
 * @param {string} rawContent - Raw content from API response
 * @param {object} options - Additional options (e.g., useTailwind)
 * @returns {Object} - Object containing extracted and processed HTML, CSS, and JS
 */
const parseApiResponse = (rawContent, options = {}) => {
    // Clean up the raw content
    const cleanContent = rawContent.trim();
    
    // Extract content using the helper function
    let extractedHtml = extractSectionContent(cleanContent, 'HTML');
    let extractedCss = extractSectionContent(cleanContent, 'CSS');
    let extractedJs = extractSectionContent(cleanContent, 'JAVASCRIPT');
    
    // Special case: if the whole content is already HTML (no section markers)
    if (!extractedHtml && !extractedCss && !extractedJs && 
        (cleanContent.toLowerCase().includes('<!doctype') || 
         cleanContent.toLowerCase().includes('<html') || 
         cleanContent.toLowerCase().includes('<body'))) {
        console.log("Content appears to be HTML only with no section markers");
        extractedHtml = cleanContent;
    }
    
    // If standard parsing fails, try alternative approaches
    if (!extractedHtml && !extractedCss && !extractedJs) {
        console.log("Standard parsing failed, trying alternative approaches");
        
        // Check for HTML-like content
        if (cleanContent.toLowerCase().includes('<!doctype') || 
            cleanContent.toLowerCase().includes('<html') || 
            cleanContent.toLowerCase().includes('<body')) {
            console.log("Content appears to be HTML only");
            
            // Extract the HTML-like content
            const htmlPattern = cleanContent.match(/<!DOCTYPE[^>]*>[\s\S]*<\/html>|<html[^>]*>[\s\S]*<\/html>|<body[^>]*>[\s\S]*<\/body>/i);
            extractedHtml = htmlPattern ? htmlPattern[0] : cleanContent;
        }
        
        // Try to identify CSS-like content
        const cssPatterns = [
            /([a-z0-9\s\-\._#,:*]+\s*\{[^}]*\})+/gi, // Basic CSS rules
            /@media[^{]*\{[\s\S]*?\}/gi, // Media queries
            /@keyframes[^{]*\{[\s\S]*?\}/gi, // Keyframes
            /:root\s*\{[^}]*\}/gi // CSS variables
        ];
        
        for (const pattern of cssPatterns) {
            const cssMatches = cleanContent.match(pattern);
            if (cssMatches && cssMatches.length > 0) {
                console.log("Found CSS-like patterns");
                extractedCss = cssMatches.join('\n\n');
                break;
            }
        }
        
        // Try to identify JS-like content
        const jsPatterns = [
            /function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*\{[\s\S]*?\}/g, // Function declarations
            /const\s+[a-zA-Z0-9_]+\s*=|let\s+[a-zA-Z0-9_]+\s*=|var\s+[a-zA-Z0-9_]+\s*=/g, // Variable declarations
            /document\.addEventListener\([^)]+\)/g, // Event listeners
            /window\.addEventListener\([^)]+\)/g, // Window event listeners
            /\(\s*function\s*\(\)\s*\{[\s\S]*?\}\s*\)\s*\(\)/g // IIFEs
        ];
        
        for (const pattern of jsPatterns) {
            const jsMatches = cleanContent.match(pattern);
            if (jsMatches && jsMatches.length > 0) {
                console.log("Found JS-like patterns");
                extractedJs = jsMatches.join('\n\n');
                break;
            }
        }
    }
    
    // Process the extracted content
    const processedHtml = options.useTailwind ? 
        addTailwindCss(processHtml(extractedHtml), true) : 
        processHtml(extractedHtml);
    
    const processedCss = processCss(extractedCss);
    const processedJs = processJs(extractedJs);
    
    // Return the processed components
    return {
        html: processedHtml,
        css: processedCss,
        js: processedJs
    };
};

// Export the utility functions
module.exports = {
    processHtml,
    processCss,
    processJs,
    addTailwindCss,
    combineFiles,
    parseApiResponse,
    extractSectionContent // Export for testing
}; 