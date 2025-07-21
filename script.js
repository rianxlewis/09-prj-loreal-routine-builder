/* Global state management */
let allProducts = [];
let selectedProducts = [];
let currentDisplayedProducts = [];
let conversationHistory = [];

/* Configuration - Replace with your actual API endpoint */
const API_ENDPOINT = "https://lorealbot-worker.rianxlewis.workers.dev/"; // Update this with your actual endpoint

/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const selectedCount = document.getElementById("selectedCount");
const clearAllBtn = document.getElementById("clearAll");
const rtlToggle = document.getElementById("rtlToggle");

/* Initialize the app */
document.addEventListener("DOMContentLoaded", async () => {
  // Load products and initialize
  allProducts = await loadProducts();
  loadSelectedProducts();
  loadRTLPreference();
  updateSelectedProductsUI();

  /* Show initial placeholder until user selects a category */
  productsContainer.innerHTML = `
    <div class="placeholder-message">
      <i class="fas fa-shopping-bag"></i>
      <p>Select a category or search for products to get started</p>
    </div>
  `;
});

/* Load product data from JSON file */
async function loadProducts() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    return data.products;
  } catch (error) {
    console.error("Error loading products:", error);
    return [];
  }
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  currentDisplayedProducts = products;

  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        <i class="fas fa-search"></i>
        <p>No products found. Try a different category or search term.</p>
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card ${
      selectedProducts.some((p) => p.id === product.id) ? "selected" : ""
    }" 
         data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}" loading="lazy">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p class="brand">${product.brand}</p>
        <div class="product-actions">
          <button class="description-toggle" data-product-id="${product.id}">
            <i class="fas fa-info-circle"></i>
            <span>Details</span>
          </button>
          <button class="select-product-btn ${
            selectedProducts.some((p) => p.id === product.id) ? "selected" : ""
          }" 
                  data-product-id="${product.id}">
            <i class="fas ${
              selectedProducts.some((p) => p.id === product.id)
                ? "fa-check"
                : "fa-plus"
            }"></i>
            <span>${
              selectedProducts.some((p) => p.id === product.id)
                ? "Selected"
                : "Select"
            }</span>
          </button>
        </div>
      </div>
      <div class="product-description" id="desc-${
        product.id
      }" style="display: none;">
        <p>${product.description}</p>
      </div>
    </div>
  `
    )
    .join("");

  // Add event listeners to product cards
  addProductEventListeners();
}

/* Add event listeners to product cards */
function addProductEventListeners() {
  // Product selection buttons
  document.querySelectorAll(".select-product-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = parseInt(btn.dataset.productId);
      toggleProductSelection(productId);
    });
  });

  // Description toggle buttons
  document.querySelectorAll(".description-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = btn.dataset.productId;
      toggleProductDescription(productId);
    });
  });

  // Card click for selection
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (!e.target.closest(".product-actions")) {
        const productId = parseInt(card.dataset.productId);
        toggleProductSelection(productId);
      }
    });
  });
}

/* Toggle product selection */
function toggleProductSelection(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  const existingIndex = selectedProducts.findIndex((p) => p.id === productId);

  if (existingIndex > -1) {
    // Remove from selection
    selectedProducts.splice(existingIndex, 1);
  } else {
    // Add to selection
    selectedProducts.push(product);
  }

  // Update UI and localStorage
  updateSelectedProductsUI();
  saveSelectedProducts();

  // Update the current displayed products
  displayProducts(currentDisplayedProducts);
}

/* Toggle product description visibility */
function toggleProductDescription(productId) {
  const description = document.getElementById(`desc-${productId}`);
  const button = document.querySelector(
    `[data-product-id="${productId}"].description-toggle`
  );
  const icon = button.querySelector("i");
  const text = button.querySelector("span");

  if (description.style.display === "none") {
    description.style.display = "block";
    icon.className = "fas fa-eye-slash";
    text.textContent = "Hide";
  } else {
    description.style.display = "none";
    icon.className = "fas fa-info-circle";
    text.textContent = "Details";
  }
}

/* Update selected products UI */
function updateSelectedProductsUI() {
  selectedCount.textContent = `(${selectedProducts.length})`;

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p class="empty-selection">No products selected yet. Click on products to add them to your routine.</p>';
    clearAllBtn.style.display = "none";
    generateRoutineBtn.disabled = true;
  } else {
    selectedProductsList.innerHTML = selectedProducts
      .map(
        (product) => `
      <div class="selected-product-item">
        <img src="${product.image}" alt="${product.name}">
        <div class="selected-product-info">
          <h4>${product.name}</h4>
          <p>${product.brand}</p>
        </div>
        <button class="remove-product-btn" data-product-id="${product.id}" title="Remove product">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `
      )
      .join("");

    clearAllBtn.style.display = "inline-flex";
    generateRoutineBtn.disabled = false;

    // Add remove button event listeners
    document.querySelectorAll(".remove-product-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const productId = parseInt(btn.dataset.productId);
        toggleProductSelection(productId);
      });
    });
  }
}

/* Search and filter functionality */
function filterProducts(searchTerm = "", category = "") {
  let filtered = allProducts;

  // Filter by category if selected
  if (category) {
    filtered = filtered.filter((product) => product.category === category);
  }

  // Filter by search term if provided
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term)
    );
  }

  displayProducts(filtered);
}

/* Event listeners */

// Category filter
categoryFilter.addEventListener("change", (e) => {
  const selectedCategory = e.target.value;
  const searchTerm = productSearch.value;
  filterProducts(searchTerm, selectedCategory);
});

// Product search
productSearch.addEventListener("input", (e) => {
  const searchTerm = e.target.value;
  const selectedCategory = categoryFilter.value;
  filterProducts(searchTerm, selectedCategory);
});

// Generate routine button
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) return;

  generateRoutineBtn.disabled = true;
  generateRoutineBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Generating...';

  try {
    // Generate personalized routine using selected products
    const routine = await generatePersonalizedRoutine(selectedProducts);
    displayMessage(routine, "ai");

    // Add follow-up prompt after routine generation
    setTimeout(() => {
      displayMessage(
        "I'd be happy to answer any follow-up questions about your routine, skincare tips, product usage, or beauty recommendations! What would you like to know?",
        "ai"
      );
    }, 1500);
  } catch (error) {
    console.error("Error generating routine:", error);
    displayMessage(
      "I apologize, but I'm having trouble generating your routine right now. Please check your API connection and try again.",
      "ai"
    );
  } finally {
    generateRoutineBtn.disabled = false;
    generateRoutineBtn.innerHTML =
      '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Routine';
  }
});

// Clear all button
clearAllBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to remove all selected products?")) {
    selectedProducts = [];
    updateSelectedProductsUI();
    saveSelectedProducts();

    // Update displayed products if any are shown
    if (currentDisplayedProducts.length > 0) {
      displayProducts(currentDisplayedProducts);
    }
  }
});

// Chat form submission
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  // Display user message
  displayMessage(message, "user");
  userInput.value = "";

  // Disable form while processing
  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    // Get AI response for follow-up questions
    const response = await getChatResponse(message);
    displayMessage(response, "ai");
  } catch (error) {
    console.error("Error getting chat response:", error);
    displayMessage(
      "I'm sorry, I'm having trouble responding right now. Please check your API connection and try again.",
      "ai"
    );
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
  }
});

// RTL Toggle functionality
rtlToggle.addEventListener("click", () => {
  const html = document.documentElement;
  const isRTL = html.getAttribute("dir") === "rtl";

  if (isRTL) {
    // Switch to LTR
    html.setAttribute("dir", "ltr");
    html.setAttribute("lang", "en");
    rtlToggle.innerHTML = '<i class="fas fa-globe"></i> عربي';

    // Save preference
    localStorage.setItem("lorealRTL", "false");
  } else {
    // Switch to RTL
    html.setAttribute("dir", "rtl");
    html.setAttribute("lang", "ar");
    rtlToggle.innerHTML = '<i class="fas fa-globe"></i> English';

    // Save preference
    localStorage.setItem("lorealRTL", "true");
  }
});

/* Chat UI Functions */
function displayMessage(message, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${sender}-message`;

  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="sender">${
        sender === "user" ? "You" : "L'Oréal Assistant"
      }</span>
      <span class="timestamp">${timestamp}</span>
    </div>
    <div class="message-content">${formatMessage(message)}</div>
  `;

  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function formatMessage(message) {
  // Convert markdown-style formatting to HTML
  let formatted = message
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");

  // Convert URLs to clickable links
  formatted = formatted.replace(
    /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>'
  );

  // Format citations (e.g., [1], [2], etc.)
  formatted = formatted.replace(
    /\[(\d+)\]/g,
    '<sup class="citation">[$1]</sup>'
  );

  return formatted;
}

/* localStorage Functions */
function saveSelectedProducts() {
  localStorage.setItem(
    "lorealSelectedProducts",
    JSON.stringify(selectedProducts)
  );
}

function loadSelectedProducts() {
  const saved = localStorage.getItem("lorealSelectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
    } catch (error) {
      console.error("Error loading saved products:", error);
      selectedProducts = [];
    }
  }
}

function loadRTLPreference() {
  const rtlPreference = localStorage.getItem("lorealRTL");
  const html = document.documentElement;

  if (rtlPreference === "true") {
    html.setAttribute("dir", "rtl");
    html.setAttribute("lang", "ar");
    rtlToggle.innerHTML = '<i class="fas fa-globe"></i> English';
  } else {
    html.setAttribute("dir", "ltr");
    html.setAttribute("lang", "en");
    rtlToggle.innerHTML = '<i class="fas fa-globe"></i> عربي';
  }
}

/* AI Integration Functions */

async function generatePersonalizedRoutine(products) {
  // Prepare product data for the API
  const productsData = products.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  // Create the initial messages array for routine generation
  const messages = [
    {
      role: "system",
      content: `You are a professional beauty and skincare expert for L'Oréal with access to current beauty trends and product information. Create personalized, step-by-step beauty routines based on selected products.

Instructions:
- Analyze the provided products and create a logical, effective routine
- Provide clear step-by-step instructions with proper order of application
- Include timing recommendations (morning/evening/frequency)
- Explain why products work well together and their benefits
- Give practical usage tips and application techniques
- Keep recommendations professional, helpful, and engaging
- Format your response with clear sections and bullet points for easy reading
- If products are from different categories (skincare, makeup, haircare), organize them appropriately
- Include current beauty trends and tips when relevant
- If you have access to web search, include recent information about L'Oréal products and beauty routines

IMPORTANT: When providing information, cite sources when using current web data and include relevant links if available.`,
    },
    {
      role: "user",
      content: `Please create a personalized beauty routine using these selected products:

${JSON.stringify(productsData, null, 2)}

Provide a comprehensive routine with:
1. Step-by-step application order
2. Morning vs evening usage recommendations
3. Frequency of use for each product
4. Tips for best results
5. How these products complement each other`,
    },
  ];

  // Store conversation history for follow-up questions
  conversationHistory = [...messages];

  try {
    const response = await callOpenAI(messages, true); // Enable web search for routine generation

    // Add the AI response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: response,
    });

    return response;
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}

async function getChatResponse(userMessage) {
  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  // Create system message for follow-up context
  const systemMessage = {
    role: "system",
    content: `You are a L'Oréal beauty expert assistant with access to current beauty information and trends. You help users with follow-up questions about their personalized beauty routines and general beauty topics.

Context:
- The user has already received a personalized routine based on their selected products
- Answer questions about skincare, haircare, makeup, fragrance, and beauty techniques
- Reference the previously generated routine when relevant
- Provide helpful, professional, and actionable advice
- Keep responses concise but informative
- If asked about products not in their routine, you can make general recommendations
- Include current beauty trends, tips, and L'Oréal product information when relevant
- If you have web search access, provide up-to-date information about beauty topics

Guidelines:
- Be encouraging and supportive
- Use your expertise to provide valuable insights
- Reference specific products from their routine when applicable
- Suggest complementary products or techniques when appropriate
- Cite sources when providing current information from web searches
- Include relevant links when available from web search results

IMPORTANT: When using web search data, always cite your sources and include links when available.`,
  };

  // Prepare messages for API call (include system message + conversation history)
  const messages = [systemMessage, ...conversationHistory];

  try {
    const response = await callOpenAI(messages, true); // Enable web search for follow-up questions

    // Add AI response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: response,
    });

    return response;
  } catch (error) {
    console.error("Error getting chat response:", error);
    throw error;
  }
}

async function callOpenAI(messages, useWebSearch = false) {
  // Check if API endpoint is configured
  if (API_ENDPOINT === "YOUR_CLOUDFLARE_WORKER_URL") {
    throw new Error("Please configure your API endpoint in the script.js file");
  }

  const requestBody = {
    messages: messages,
    model: "gpt-3.5-turbo", // You can change this to gpt-4 if preferred
    max_tokens: 1000,
    temperature: 0.7,
  };

  // Add web search flag if requested
  if (useWebSearch) {
    requestBody.useWebSearch = true;
  }

  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content
  ) {
    return data.choices[0].message.content.trim();
  } else {
    throw new Error("Invalid response format from API");
  }
}
