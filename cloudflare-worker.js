/**
 * Cloudflare Worker for L'Oréal Routine Builder
 *
 * This worker acts as a proxy to the OpenAI API, keeping your API key secure
 * and handling CORS for your frontend application.
 *
 * Deploy this to Cloudflare Workers and update the API_ENDPOINT in script.js
 */

// Add your OpenAI API key here (or use Cloudflare environment variables)
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"; // Replace with your actual API key

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env, ctx) {
    // Handle preflight CORS request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      // Parse the request body
      const body = await request.json();

      // Validate required fields
      if (!body.messages || !Array.isArray(body.messages)) {
        return new Response(
          JSON.stringify({
            error: "Invalid request: messages array is required",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // Prepare the OpenAI API request
      const openaiRequest = {
        model: body.model || "gpt-3.5-turbo",
        messages: body.messages,
        max_tokens: body.max_tokens || 1000,
        temperature: body.temperature || 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      };

      // Make the request to OpenAI
      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(openaiRequest),
        }
      );

      // Check if the OpenAI request was successful
      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("OpenAI API error:", errorText);

        return new Response(
          JSON.stringify({
            error: "OpenAI API request failed",
            details: errorText,
          }),
          {
            status: openaiResponse.status,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // Parse and return the OpenAI response
      const openaiData = await openaiResponse.json();

      return new Response(JSON.stringify(openaiData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } catch (error) {
      console.error("Worker error:", error);

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
  },
};
