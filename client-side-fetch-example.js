/**
 * EXAMPLE: Client-Side API Call (Alternative to Netlify Functions)
 * NOTE: This approach requires proper API key handling via environment variables
 * and potentially a proxy service to avoid exposing keys in client-side code.
 */

// Function to make direct API call to language model
async function callLanguageModel(prompt) {
  try {
    // Show loading state
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) loadingElement.style.display = 'block';
    
    // Make API call with appropriate timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2-minute timeout
    
    const response = await fetch('https://api.openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use a proxy service or secure way to inject API key
        // DO NOT hardcode API keys in client-side code
        'Authorization': `Bearer ${getSecureApiKey()}` 
      },
      body: JSON.stringify({
        "model": "mistralai/devstral-small:free",
        "messages": [
          { "role": "user", "content": prompt }
        ]
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling language model:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. The model is taking too long to generate a response.');
    }
    throw error;
  } finally {
    // Hide loading state
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) loadingElement.style.display = 'none';
  }
}

/**
 * IMPORTANT: Never expose API keys in client-side code
 * This is just a placeholder - implement a secure solution like:
 * 1. Using a lightweight proxy API (separate from your main function)
 * 2. Using a token exchange system
 * 3. Using a service like Auth0 or Firebase for secure key management
 */
function getSecureApiKey() {
  // DO NOT implement this way in production!
  // This is just a placeholder for the example
  throw new Error('Implement a secure method to get API keys');
}

// Example usage:
document.getElementById('generate-form').addEventListener('submit', async function(event) {
  event.preventDefault();
  
  try {
    const prompt = document.getElementById('prompt-input').value;
    const result = await callLanguageModel(prompt);
    
    // Process result
    if (result.choices && result.choices[0] && result.choices[0].message) {
      const rawContent = result.choices[0].message.content;
      // Process the content...
      document.getElementById('result-container').textContent = rawContent;
    }
  } catch (error) {
    document.getElementById('error-container').textContent = error.message;
  }
}); 