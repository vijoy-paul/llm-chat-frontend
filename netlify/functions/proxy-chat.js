// netlify/functions/proxy-chat.js

const BACKEND_URL = process.env.CHAT_HOST_URL; // Set in Netlify dashboard or .env for local

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    if (!BACKEND_URL) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Backend URL not configured" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    // Use native fetch (Node 18+ on Netlify, no need for node-fetch)
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("Proxy error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
