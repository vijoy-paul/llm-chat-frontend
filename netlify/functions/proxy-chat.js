import fetch from 'node-fetch';

const BACKEND_URL = process.env.CHAT_HOST_URL; // must be set in Netlify dashboard

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!BACKEND_URL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Backend URL not configured' }),
      };
    }

    const body = JSON.parse(event.body);

    const response = await fetch(BACKEND_URL, {
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
