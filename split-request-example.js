/**
 * EXAMPLE: Breaking Up Complex Generation into Multiple Requests
 * This approach splits the generation process into multiple steps to avoid timeouts
 */

// Step 1: Generate HTML structure
async function generateHtmlStructure(description) {
  const htmlPrompt = `
You are a web developer focusing solely on HTML structure.

Create a well-structured, semantic HTML5 document based on this description: "${description}"

Include proper meta tags, responsive viewport settings, and placeholders for CSS and JavaScript.

Return ONLY the HTML - no explanation or other content.
`;
  return await callNetlifyFunction(htmlPrompt);
}

// Step 2: Generate CSS styling
async function generateCss(description, htmlStructure) {
  const cssPrompt = `
You are a web designer focusing solely on CSS.

Create custom CSS styling for this website: "${description}"

Here's the HTML structure you're styling:
${htmlStructure.substring(0, 2000)}... (truncated for brevity)

Use Tailwind classes in the HTML where possible, and provide custom CSS only where needed.

Return ONLY the CSS - no explanation or other content.
`;
  return await callNetlifyFunction(cssPrompt);
}

// Step 3: Generate JavaScript functionality
async function generateJavaScript(description, htmlStructure) {
  const jsPrompt = `
You are a frontend developer focusing solely on JavaScript.

Create JavaScript functionality for this website: "${description}"

Here's the HTML structure you're working with:
${htmlStructure.substring(0, 2000)}... (truncated for brevity)

Include event listeners, animations, form validation, etc. as needed.

Return ONLY the JavaScript - no explanation or other content.
`;
  return await callNetlifyFunction(jsPrompt);
}

// Helper function to call Netlify function
async function callNetlifyFunction(prompt) {
  const response = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      "model": "google/gemini-2.0-flash-exp:free",
      "messages": [
        { "role": "user", "content": prompt }
      ]
    })
  });
  
  if (!response.ok) {
    throw new Error(`Netlify function error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Main function to coordinate the process
async function generateWebsite(description) {
  try {
    // Step 1: Generate HTML
    document.getElementById('status').textContent = "Generating HTML structure...";
    const html = await generateHtmlStructure(description);
    
    // Step 2: Generate CSS
    document.getElementById('status').textContent = "Generating CSS styling...";
    const css = await generateCss(description, html);
    
    // Step 3: Generate JavaScript
    document.getElementById('status').textContent = "Generating JavaScript functionality...";
    const js = await generateJavaScript(description, html);
    
    // Step 4: Combine results
    document.getElementById('status').textContent = "Assembling final website...";
    return {
      html: html,
      css: css,
      js: js
    };
  } catch (error) {
    console.error("Error generating website:", error);
    throw error;
  } finally {
    document.getElementById('status').textContent = "Done";
  }
}

// Example usage
document.getElementById('generate-button').addEventListener('click', async () => {
  const description = document.getElementById('prompt-input').value;
  
  try {
    const result = await generateWebsite(description);
    
    // Display or use the generated code
    document.getElementById('html-output').textContent = result.html;
    document.getElementById('css-output').textContent = result.css;
    document.getElementById('js-output').textContent = result.js;
  } catch (error) {
    document.getElementById('error-container').textContent = error.message;
  }
}); 