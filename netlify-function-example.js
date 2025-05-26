/**
 * Example: Modified Netlify Function with Extended Timeout
 * File path: functions/chat.js
 */

// Include required packages
const axios = require('axios');

// Configure the function with a higher timeout (max allowed is 26 seconds by default,
// up to 60 seconds with netlify.toml configuration, or up to 26 minutes for background functions)
exports.handler = async (event, context) => {
  // Set function to background mode for longer processing (up to 26 minutes)
  // NOTE: This means the function will return immediately with a 202 status code
  // and continue processing in the background
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Parse the incoming request
    const body = JSON.parse(event.body);
    const { model, messages } = body;
    
    // Validate the incoming request
    if (!model || !messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Bad request: missing required fields"
        })
      };
    }
    
    // Get API key from environment variables
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Server error: API key not configured"
        })
      };
    }
    
    // Make request to the language model API with an increased timeout
    const response = await axios({
      method: 'post',
      url: 'https://api.openrouter.ai/api/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        model,
        messages
      },
      // Increase the request timeout to 55 seconds (below the 60s max for configured functions)
      timeout: 55000
    });
    
    // Return the API response
    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    // Special handling for timeout errors
    if (error.code === 'ECONNABORTED' || (error.response && error.response.status === 504)) {
      return {
        statusCode: 504,
        body: JSON.stringify({
          error: "Gateway Timeout: The request took too long to process. Try simplifying your prompt."
        })
      };
    }
    
    // Handle other errors
    console.error("Function error:", error);
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        error: error.response?.data?.error || {
          message: "An error occurred while processing the request."
        }
      })
    };
  }
}; 