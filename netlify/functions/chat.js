// Netlify Function: Secure API Proxy for DeepSeek
// This keeps your API key safe on the server, not exposed in frontend code

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    // Get API key from Netlify environment variable (set in Netlify dashboard)
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'API key not configured on server' }),
        };
    }

    try {
        const requestBody = JSON.parse(event.body);

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.text();

        // Handle streaming vs non-streaming responses
        if (requestBody.stream) {
            // For streaming, we need to pass through the response
            return {
                statusCode: response.status,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Access-Control-Allow-Origin': '*',
                },
                body: data,
            };
        }

        return {
            statusCode: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: data,
        };
    } catch (error) {
        console.error('Proxy error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to proxy request to API' }),
        };
    }
};
