import fetch from 'node-fetch';

const BACKEND_URL = process.env.CHAT_HOST_URL; // just the backend domain

export async function handler(event, context) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body);

    if (!BACKEND_URL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Backend URL not configured' }),
      };
    }

    // Forward request to the real backend function
    const response = await fetch(`${BACKEND_URL}/.netlify/functions/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
