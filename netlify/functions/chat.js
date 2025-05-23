// IMPORTANT: This Netlify function uses 'node-fetch'.
// To ensure it works correctly when deployed, you MUST include 'node-fetch'
// in your project's `package.json` file in the root directory.
// For CommonJS 'require' syntax as used below, 'node-fetch' version 2.x is recommended.
// Example `package.json` dependency:
// {
//   "dependencies": {
//     "node-fetch": "^2.6.7"
//     // ... other dependencies
//   }
// }
// After adding to package.json, run `npm install` or `yarn install`.
// Netlify will then include it when deploying the function.

const fetch = require('node-fetch'); // Ensure node-fetch v2 is in package.json

exports.handler = async (event) => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Ensure the request to OpenRouter is made correctly
  // The event.body from the client will contain the model and messages
  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Bad request body: " + e.message }),
    };
  }

  if (!requestBody.model || !requestBody.messages) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing model or messages in request body" }),
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ // Forward model and messages to OpenRouter
          model: requestBody.model,
          messages: requestBody.messages
      }),
    });

    const data = await response.json();

    // Handle non-ok responses from OpenRouter after trying to parse them
    if (!response.ok) {
        return {
            statusCode: response.status,
            body: JSON.stringify(data), // Forward OpenRouter's error
        };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('Error in Netlify function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error: " + error.message }),
    };
  }
};
