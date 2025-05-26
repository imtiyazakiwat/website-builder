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

// Simple in-memory rate limiting
// In a production environment, consider using a more robust solution like Redis
const RATE_LIMIT = {
  requestsPerMinute: 10,
  requestsPerHour: 50,
  requestLogs: [],
  ipLogs: {}
};

// Helper function to check rate limits
function checkRateLimit(ip) {
  const now = Date.now();
  
  // Clean up old requests (older than 1 hour)
  RATE_LIMIT.requestLogs = RATE_LIMIT.requestLogs.filter(time => now - time < 60 * 60 * 1000);
  
  // Initialize IP tracking if not exists
  if (!RATE_LIMIT.ipLogs[ip]) {
    RATE_LIMIT.ipLogs[ip] = [];
  }
  
  // Clean up old requests for this IP
  RATE_LIMIT.ipLogs[ip] = RATE_LIMIT.ipLogs[ip].filter(time => now - time < 60 * 60 * 1000);
  
  // Check global rate limits
  if (RATE_LIMIT.requestLogs.length >= RATE_LIMIT.requestsPerHour) {
    return {
      allowed: false,
      message: "Service is currently experiencing high demand. Please try again later.",
      retryAfter: 60 // Suggest retry after 60 seconds
    };
  }
  
  // Get requests in the last minute for this IP
  const recentIpRequests = RATE_LIMIT.ipLogs[ip].filter(time => now - time < 60 * 1000);
  
  // Check IP-specific rate limits
  if (recentIpRequests.length >= RATE_LIMIT.requestsPerMinute) {
    return {
      allowed: false,
      message: "Rate limit exceeded. Please wait before making more requests.",
      retryAfter: 60 // Suggest retry after 60 seconds
    };
  }
  
  // Request is allowed, log it
  RATE_LIMIT.requestLogs.push(now);
  RATE_LIMIT.ipLogs[ip].push(now);
  
  return {
    allowed: true
  };
}

// Helper function to implement retry logic
async function fetchWithRetry(url, options, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If response is rate limited, wait and retry
      if (response.status === 429) {
        // Get retry-after header or use exponential backoff
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
        
        console.log(`Rate limited. Retrying after ${waitTime}ms. Attempt ${attempt + 1}/${maxRetries}`);
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          const data = await response.json().catch(() => ({ error: 'Rate limit exceeded' }));
          return {
            status: 429,
            body: data,
            headers: Object.fromEntries([...response.headers])
          };
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, waitTime));
        delay *= 2; // Exponential backoff
        continue;
      }
      
      // For other responses, return as is
      return {
        status: response.status,
        body: await response.json().catch(() => ({ error: 'Failed to parse response' })),
        headers: Object.fromEntries([...response.headers])
      };
    } catch (error) {
      lastError = error;
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  
  throw lastError;
}

exports.handler = async (event) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  // Get client IP for rate limiting
  const clientIP = event.headers['client-ip'] || 
                   event.headers['x-forwarded-for'] || 
                   'unknown-ip';
  
  // Check rate limits
  const rateLimitCheck = checkRateLimit(clientIP);
  if (!rateLimitCheck.allowed) {
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': rateLimitCheck.retryAfter || 60
      },
      body: JSON.stringify({ 
        error: {
          message: rateLimitCheck.message,
          type: "rate_limit_exceeded",
          param: null,
          code: 429
        } 
      })
    };
  }

  // Ensure the request to OpenRouter is made correctly
  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: {
        message: "Bad request body: " + e.message,
        type: "invalid_request_error",
        code: 400
      }}),
    };
  }

  if (!requestBody.model || !requestBody.messages) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: {
        message: "Missing model or messages in request body",
        type: "invalid_request_error",
        code: 400
      }}),
    };
  }

  try {
    const response = await fetchWithRetry(
      'https://openrouter.ai/api/v1/chat/completions', 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': event.headers.referer || event.headers.origin || 'https://netlify-function',
          'X-Title': 'IMT Website Generator'
        },
        body: JSON.stringify({
          model: requestBody.model,
          messages: requestBody.messages
        }),
      }
    );

    // Handle non-ok responses from OpenRouter
    if (response.status !== 200) {
      console.error(`OpenRouter API error: ${response.status}`, response.body);
      
      // Handle specific error types
      if (response.status === 429) {
        const retryAfter = response.headers['retry-after'] || 60;
        return {
          statusCode: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter
          },
          body: JSON.stringify({
            error: {
              message: "Too many requests to the AI service. Please try again later.",
              type: "rate_limit_exceeded",
              param: null,
              code: 429,
              retry_after: retryAfter
            }
          }),
        };
      }
      
      return {
        statusCode: response.status,
        body: JSON.stringify(response.body.error ? response.body : { error: {
          message: `Error from AI service: ${response.status}`,
          type: "api_error",
          code: response.status
        }}),
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(response.body),
    };

  } catch (error) {
    console.error('Error in Netlify function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: {
          message: "Internal Server Error: " + error.message,
          type: "server_error",
          code: 500
        }
      }),
    };
  }
};
