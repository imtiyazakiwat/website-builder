// Test case for parsing API responses
// This script tests how code is retrieved from the API and parsed correctly

// Sample API responses to test with different formats and edge cases
const testResponses = [
    {
        name: "Standard Format",
        content: `
---HTML---
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>

---CSS---
body {
    background-color: #f0f0f0;
    color: #333;
}
h1 {
    color: blue;
}

---JAVASCRIPT---
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');
});
`
    },
    {
        name: "Missing Components",
        content: `
---HTML---
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <h1>Hello World</h1>
</body>
</html>

---CSS---
body {
    background-color: #f0f0f0;
}
`
    },
    {
        name: "Different Casing",
        content: `
---html---
<!DOCTYPE html>
<html>
<body>
    <h1>Hello World</h1>
</body>
</html>

---css---
h1 { color: red; }

---javascript---
console.log('Hello');
`
    },
    {
        name: "No Section Markers",
        content: `
<!DOCTYPE html>
<html>
<body>
    <h1>Hello World</h1>
</body>
</html>
`
    },
    {
        name: "Extra Whitespace",
        content: `

---HTML---    

<!DOCTYPE html>
<html>
<body>
    <h1>Hello World</h1>
</body>
</html>

   ---CSS---   
   
body { 
    margin: 0; 
}

   ---JAVASCRIPT---   
   
// Just a comment
`
    },
    {
        name: "Code blocks with backticks",
        content: `
---HTML---
\`\`\`html
<!DOCTYPE html>
<html>
<body>
    <h1>Hello World</h1>
</body>
</html>
\`\`\`

---CSS---
\`\`\`css
body { margin: 0; }
\`\`\`

---JAVASCRIPT---
\`\`\`javascript
console.log('test');
\`\`\`
`
    }
];

// Process functions (copied from index.js for testing)
const processHtml = (html) => {
    if (!html) return '';
    // Ensure it starts with doctype and has html tags
    if (!html.trim().toLowerCase().startsWith('<!doctype')) {
        return `<!DOCTYPE html>\n<html>\n<body>\n${html}\n</body>\n</html>`;
    }
    return html.trim();
};

const processCss = (css) => {
    if (!css) return '';
    // Add a comment to identify the source
    return `/* Generated CSS */\n${css.trim()}`;
};

const processJs = (js) => {
    if (!js) return '';
    // Add a comment and wrap in IIFE for safety
    return `// Generated JavaScript\n(function() {\n${js.trim()}\n})();`;
};

// Function to combine HTML, CSS, and JS
function combineFiles(html, css, js) {
    // Extract the body content from the HTML
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const headMatch = html.match(/<head[^>]*>([\s\S]*)<\/head>/i);
    
    let bodyContent = bodyMatch ? bodyMatch[1] : html;
    let headContent = headMatch ? headMatch[1] : '';
    
    // Create the combined HTML
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Website</title>
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
}

// Test function to parse API responses
function testApiResponseParsing(response) {
    console.log(`\n===== Testing: ${response.name} =====`);
    console.log("Raw content length:", response.content.length);
    
    // Enhanced extraction of HTML, CSS, and JavaScript from the response
    const htmlMatch = response.content.match(/---HTML---\s*([\s\S]*?)(?=---CSS---|$)/i);
    const cssMatch = response.content.match(/---CSS---\s*([\s\S]*?)(?=---JAVASCRIPT---|$)/i);
    const jsMatch = response.content.match(/---JAVASCRIPT---\s*([\s\S]*?)(?=$)/i);
    
    // Process the matches to extract content
    let extractedHtml = htmlMatch ? htmlMatch[1].trim() : '';
    let extractedCss = cssMatch ? cssMatch[1].trim() : '';
    let extractedJs = jsMatch ? jsMatch[1].trim() : '';
    
    // Remove any markdown code block syntax
    extractedHtml = extractedHtml.replace(/^\`\`\`html\s*|\`\`\`\s*$/g, '');
    extractedCss = extractedCss.replace(/^\`\`\`css\s*|\`\`\`\s*$/g, '');
    extractedJs = extractedJs.replace(/^\`\`\`javascript\s*|\`\`\`\s*$/g, '');
    
    // Process and validate the extracted content
    const processedHtml = processHtml(extractedHtml);
    const processedCss = processCss(extractedCss);
    const processedJs = processJs(extractedJs);
    
    // Print the extraction results
    console.log("HTML extracted:", extractedHtml ? "Yes" : "No", `(${extractedHtml.length} chars)`);
    console.log("CSS extracted:", extractedCss ? "Yes" : "No", `(${extractedCss.length} chars)`);
    console.log("JS extracted:", extractedJs ? "Yes" : "No", `(${extractedJs.length} chars)`);
    
    // Print the processed content
    console.log("\nProcessed HTML:", processedHtml.substring(0, 50) + "...");
    console.log("Processed CSS:", processedCss.substring(0, 50) + "...");
    console.log("Processed JS:", processedJs.substring(0, 50) + "...");
    
    // Combine the files
    const combinedHtml = combineFiles(processedHtml, processedCss, processedJs);
    console.log("\nCombined HTML size:", combinedHtml.length);
    
    // Check for potential issues
    const issues = [];
    if (!processedHtml) issues.push("Missing HTML content");
    if (!processedCss) issues.push("Missing CSS content");
    if (!processedJs) issues.push("Missing JavaScript content");
    if (!processedHtml.includes("<body>")) issues.push("HTML missing body tag");
    if (!processedHtml.includes("<head>")) issues.push("HTML missing head tag");
    
    if (issues.length > 0) {
        console.log("\nPotential Issues:", issues.join(", "));
    } else {
        console.log("\nNo issues detected.");
    }
    
    return {
        html: processedHtml,
        css: processedCss,
        js: processedJs,
        combined: combinedHtml,
        issues: issues
    };
}

// Enhanced parser to handle more complex cases
function enhancedParser(rawContent) {
    console.log("\n===== Testing Enhanced Parser =====");
    
    // First attempt: standard section markers
    let htmlMatch = rawContent.match(/---HTML---\s*([\s\S]*?)(?=---CSS---|$)/i);
    let cssMatch = rawContent.match(/---CSS---\s*([\s\S]*?)(?=---JAVASCRIPT---|$)/i);
    let jsMatch = rawContent.match(/---JAVASCRIPT---\s*([\s\S]*?)(?=$)/i);
    
    // If standard parsing fails, try alternative approaches
    if (!htmlMatch && !cssMatch && !jsMatch) {
        console.log("Standard parsing failed, trying alternative approaches");
        
        // Check if it's just HTML without markers
        if (rawContent.trim().toLowerCase().startsWith('<!doctype') || 
            rawContent.includes('<html>') || rawContent.includes('<body>')) {
            console.log("Content appears to be HTML only");
            htmlMatch = [null, rawContent.trim()];
        }
        
        // Try to identify sections based on content patterns
        if (!htmlMatch) {
            const htmlPattern = rawContent.match(/<html[^>]*>[\s\S]*<\/html>/i);
            if (htmlPattern) {
                console.log("Found HTML pattern");
                htmlMatch = [null, htmlPattern[0]];
            }
        }
        
        if (!cssMatch) {
            // Look for CSS-like patterns (rule sets with braces)
            const cssPattern = rawContent.match(/([a-z0-9\s\.,#]+\s*\{[\s\S]*?\})+/i);
            if (cssPattern) {
                console.log("Found CSS pattern");
                cssMatch = [null, cssPattern[0]];
            }
        }
        
        if (!jsMatch) {
            // Look for JS-like patterns (function declarations, event listeners)
            const jsPattern = rawContent.match(/(function\s*\(|document\.addEventListener|const\s+|let\s+|var\s+)[\s\S]+/i);
            if (jsPattern) {
                console.log("Found JS pattern");
                jsMatch = [null, jsPattern[0]];
            }
        }
    }
    
    // Extract and clean up content
    let extractedHtml = htmlMatch ? htmlMatch[1].trim() : '';
    let extractedCss = cssMatch ? cssMatch[1].trim() : '';
    let extractedJs = jsMatch ? jsMatch[1].trim() : '';
    
    // Remove code block markers if present
    extractedHtml = extractedHtml.replace(/^\`\`\`html\s*|\`\`\`\s*$/g, '');
    extractedCss = extractedCss.replace(/^\`\`\`css\s*|\`\`\`\s*$/g, '');
    extractedJs = extractedJs.replace(/^\`\`\`javascript\s*|\`\`\`\s*$/g, '');
    
    console.log("HTML extracted:", extractedHtml ? "Yes" : "No", `(${extractedHtml.length} chars)`);
    console.log("CSS extracted:", extractedCss ? "Yes" : "No", `(${extractedCss.length} chars)`);
    console.log("JS extracted:", extractedJs ? "Yes" : "No", `(${extractedJs.length} chars)`);
    
    return {
        html: processHtml(extractedHtml),
        css: processCss(extractedCss),
        js: processJs(extractedJs)
    };
}

// Run tests on all sample responses
console.log("==== STARTING TESTS ====");
const testResults = testResponses.map(response => testApiResponseParsing(response));

// Test the enhanced parser on a complex case
const enhancedResult = enhancedParser(testResponses[3].content);
console.log("\nEnhanced parser result:", 
    enhancedResult.html.substring(0, 40) + "...",
    enhancedResult.css.substring(0, 30) + "...",
    enhancedResult.js.substring(0, 30) + "..."
);

// Test parsing API response with mixed content
console.log("\n==== TESTING REAL-WORLD API RESPONSE SIMULATION ====");
const mixedResponse = `
I've created a responsive landing page for a photography portfolio as requested. Here's the code:

---HTML---
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Photography Portfolio</title>
</head>
<body>
    <header>
        <nav>
            <div class="logo">PhotoFolio</div>
            <ul class="menu">
                <li><a href="#home">Home</a></li>
                <li><a href="#gallery">Gallery</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
            <div class="hamburger">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </nav>
    </header>
    <main>
        <!-- Content here -->
    </main>
    <footer>
        <p>&copy; 2024 PhotoFolio. All rights reserved.</p>
    </footer>
</body>
</html>

---CSS---
:root {
  --primary-color: #2c3e50;
  --accent-color: #e74c3c;
  --text-color: #333;
  --light-color: #f4f4f4;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Poppins', sans-serif;
  line-height: 1.6;
  color: var(--text-color);
}

header {
  background-color: var(--primary-color);
  color: white;
  padding: 1rem 0;
}

/* More styles here */

---JAVASCRIPT---
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.querySelector('.hamburger');
  const menu = document.querySelector('.menu');
  
  hamburger.addEventListener('click', function() {
    hamburger.classList.toggle('active');
    menu.classList.toggle('active');
  });
  
  // More interactions here
});

I hope this meets your requirements! The design is modern and responsive with a clean layout.
`;

const realWorldResult = enhancedParser(mixedResponse);
console.log("\nReal-world API response parsing result:");
console.log("HTML:", realWorldResult.html.substring(0, 40) + "...");
console.log("CSS:", realWorldResult.css.substring(0, 40) + "...");
console.log("JS:", realWorldResult.js.substring(0, 40) + "...");

// Summary of test results
console.log("\n==== TEST SUMMARY ====");
console.log(`Total tests: ${testResponses.length}`);
const failedTests = testResults.filter(result => result.issues.length > 0);
console.log(`Tests with issues: ${failedTests.length}`);

if (failedTests.length > 0) {
    console.log("\nIssues found:");
    failedTests.forEach((result, index) => {
        console.log(`- Test #${index + 1}: ${result.issues.join(', ')}`);
    });
}

// Run this test file with: node test-parser.js 