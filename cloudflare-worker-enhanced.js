/**
 * Enhanced Cloudflare Worker for L'Oréal Routine Builder with Web Search
 *
 * This worker supports both standard OpenAI API calls and web search functionality
 * using Perplexity AI (which has built-in web search) or OpenAI with web search tools.
 *
 * Deploy this to Cloudflare Workers and update the API_ENDPOINT in script.js
 */

// Configuration - Add your API keys here or use Cloudflare environment variables
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY_HERE"; // Replace with your actual OpenAI API key
const PERPLEXITY_API_KEY = "YOUR_PERPLEXITY_API_KEY_HERE"; // Optional: for web search capabilities

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

      // Check if web search is requested
      const useWebSearch = body.useWebSearch || false;

      if (
        useWebSearch &&
        PERPLEXITY_API_KEY !== "YOUR_PERPLEXITY_API_KEY_HERE"
      ) {
        // Use Perplexity for web search capabilities
        return await callPerplexity(body);
      } else {
        // Use standard OpenAI
        return await callOpenAI(body);
      }
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

async function callOpenAI(body) {
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
}

async function callPerplexity(body) {
  // Prepare the Perplexity API request (includes web search)
  const perplexityRequest = {
    model: "llama-3.1-sonar-small-128k-online", // This model has web search
    messages: body.messages,
    max_tokens: body.max_tokens || 1000,
    temperature: body.temperature || 0.7,
    top_p: 0.9,
    return_citations: true,
    search_domain_filter: [
      "loreal.com",
      "sephora.com",
      "ulta.com",
      "dermstore.com",
    ], // Beauty-focused domains
    return_images: false,
    return_related_questions: false,
    search_recency_filter: "month", // Recent information
    top_k: 0,
    stream: false,
    presence_penalty: 0,
    frequency_penalty: 1,
  };

  // Make the request to Perplexity
  const perplexityResponse = await fetch(
    "https://api.perplexity.ai/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(perplexityRequest),
    }
  );

  // Check if the Perplexity request was successful
  if (!perplexityResponse.ok) {
    const errorText = await perplexityResponse.text();
    console.error("Perplexity API error:", errorText);

    // Fallback to OpenAI if Perplexity fails
    console.log("Falling back to OpenAI...");
    return await callOpenAI(body);
  }

  // Parse and return the Perplexity response
  const perplexityData = await perplexityResponse.json();

  // Format response to match OpenAI structure
  const formattedResponse = {
    choices: [
      {
        message: {
          content: perplexityData.choices[0].message.content,
          role: "assistant",
        },
        finish_reason: perplexityData.choices[0].finish_reason,
      },
    ],
    usage: perplexityData.usage,
    citations: perplexityData.citations || [],
  };

  return new Response(JSON.stringify(formattedResponse), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}
