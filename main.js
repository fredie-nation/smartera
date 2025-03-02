import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

// Configure marked with syntax highlighting
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

// Configure marked for tighter spacing
marked.use({
  renderer: {
    paragraph(text) {
      return `<p>${text}</p>`;
    },
    // Add copy button to code blocks
    code(code, language) {
      const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
      const highlightedCode = hljs.highlight(code, { language: validLanguage }).value;
      
      return `<div class="code-block-wrapper">
                <pre><code class="hljs language-${validLanguage}">${highlightedCode}</code></pre>
                <button class="copy-code-btn" title="Copy code">
                  <span class="material-symbols-rounded">content_copy</span>
                </button>
              </div>`;
    }
  }
});

// DOM Elements
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const welcomeScreen = document.getElementById('welcome-screen');
const apiKeyModal = document.getElementById('api-key-modal');
const apiKeyForm = document.getElementById('api-key-form');
const currentModelDisplay = document.getElementById('current-model-display');
const changeModelBtn = document.getElementById('change-model-btn');
const settingsBtn = document.getElementById('settings-btn');
const useDefaultBtn = document.getElementById('use-default-btn');
const sidebarConversations = document.querySelector('.sidebar-conversations');
const newChatBtn = document.querySelector('.new-chat-btn');
const clearConversationsBtn = document.querySelector('.clear-conversations-btn');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileCloseBtn = document.querySelector('.mobile-close');
const sidebar = document.querySelector('.sidebar-conversations');
const exampleBtns = document.querySelectorAll('.example-btn');

// API Provider Elements
const apiProviderRadios = document.querySelectorAll('input[name="api-provider"]');
const openrouterSettings = document.getElementById('openrouter-settings');
const groqSettings = document.getElementById('groq-settings');
const googleSettings = document.getElementById('google-settings');
const openrouterApiKeyInput = document.getElementById('openrouter-api-key-input');
const groqApiKeyInput = document.getElementById('groq-api-key-input');
const googleApiKeyInput = document.getElementById('google-api-key-input');
const openrouterModelSelect = document.getElementById('openrouter-model-select');
const groqModelSelect = document.getElementById('groq-model-select');
const googleModelSelect = document.getElementById('google-model-select');
const toggleOpenrouterVisibilityBtn = document.getElementById('toggle-openrouter-visibility');
const toggleGroqVisibilityBtn = document.getElementById('toggle-groq-visibility');
const toggleGoogleVisibilityBtn = document.getElementById('toggle-google-visibility');

// Default API keys and models
const DEFAULT_OPENROUTER_API_KEY = "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";
const DEFAULT_OPENROUTER_MODEL = "google/gemini-pro";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const DEFAULT_GOOGLE_MODEL = "gemini-2.0-flash";

// State
let apiProvider = localStorage.getItem('api_provider') || 'openrouter';
let openrouterApiKey = localStorage.getItem('openrouter_api_key') || DEFAULT_OPENROUTER_API_KEY;
let groqApiKey = localStorage.getItem('groq_api_key') || '';
let googleApiKey = localStorage.getItem('google_api_key') || '';
let selectedOpenrouterModel = localStorage.getItem('openrouter_model') || DEFAULT_OPENROUTER_MODEL;
let selectedGroqModel = localStorage.getItem('groq_model') || DEFAULT_GROQ_MODEL;
let selectedGoogleModel = localStorage.getItem('google_model') || DEFAULT_GOOGLE_MODEL;
let currentConversationId = null;
let conversations = JSON.parse(localStorage.getItem('conversations')) || [];
let chatHistory = [];
let isStreaming = false;

// Model display names mapping
const openrouterModelDisplayNames = {
  'openai/gpt-3.5-turbo': 'GPT-3.5 Turbo',
  'openai/gpt-4': 'GPT-4',
  'anthropic/claude-instant-v1': 'Claude Instant',
  'anthropic/claude-3-haiku': 'Claude 3 Haiku',
  'anthropic/claude-3-opus': 'Claude 3 Opus',
  'anthropic/claude-3-sonnet': 'Claude 3 Sonnet',
  'google/gemini-pro': 'Gemini Pro',
  'meta-llama/llama-2-13b-chat': 'Llama 2 13B',
  'meta-llama/llama-2-70b-chat': 'Llama 2 70B',
  'meta-llama/llama-3-8b-instruct': 'Llama 3 8B',
  'meta-llama/llama-3-70b-instruct': 'Llama 3 70B',
  'mistralai/mistral-7b-instruct': 'Mistral 7B',
  'mistralai/mixtral-8x7b-instruct': 'Mixtral 8x7B',
  'mistralai/mistral-small': 'Mistral Small',
  'deepseek/deepseek-chat': 'DeepSeek Chat',
  'deepseek/deepseek-coder': 'DeepSeek Coder',
  'cohere/command-r': 'Cohere Command-R',
  'cohere/command-r-plus': 'Cohere Command-R+',
  'perplexity/sonar-small-online': 'Perplexity Sonar Small',
  'rwkv/rwkv-5-world-3b': 'RWKV-5 World 3B',
  'palm/chat-bison': 'PaLM Chat-Bison',
  '01-ai/yi-34b-chat': 'Yi 34B Chat',
  'databricks/dbrx-instruct': 'DBRX Instruct',
  'qwen/qwen-14b-chat': 'Qwen 14B Chat',
  'microsoft/phi-2': 'Phi-2',
  'nousresearch/nous-hermes-2-mixtral-8x7b-dpo': 'Nous Hermes 2 Mixtral',
  'gryphe/mythomist-7b': 'Mythomist 7B',
  'allenai/tulu-2-dpo-70b': 'Tulu-2-DPO 70B'
};

const groqModelDisplayNames = {
  'llama-3.3-70b-versatile': 'Llama 3.3 70B Versatile',
  'llama-3.1-8b-instant': 'Llama 3.1 8B Instant',
  'llama-guard-3-8b': 'Llama Guard 3 8B',
  'llama3-70b-8192': 'Llama3 70B (8K context)',
  'llama3-8b-8192': 'Llama3 8B (8K context)',
  'mixtral-8x7b-32768': 'Mixtral 8x7B (32K context)',
  'gemma2-9b-it': 'Gemma 2 9B',
  'mistral-saba-24b': 'Mistral Saba 24B',
  'qwen-2.5-coder-32b': 'Qwen 2.5 Coder 32B',
  'qwen-2.5-32b': 'Qwen 2.5 32B',
  'deepseek-r1-distill-qwen-32b': 'DeepSeek R1 Distill Qwen 32B',
  'deepseek-r1-distill-llama-70b-specdec': 'DeepSeek R1 Distill Llama 70B SpecDec',
  'deepseek-r1-distill-llama-70b': 'DeepSeek R1 Distill Llama 70B',
  'llama-3.3-70b-specdec': 'Llama 3.3 70B SpecDec',
  'llama-3.2-1b-preview': 'Llama 3.2 1B Preview',
  'llama-3.2-3b-preview': 'Llama 3.2 3B Preview',
  'llama-3.2-11b-vision-preview': 'Llama 3.2 11B Vision Preview',
  'llama-3.2-90b-vision-preview': 'Llama 3.2 90B Vision Preview'
};

const googleModelDisplayNames = {
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini-1.0-pro': 'Gemini 1.0 Pro'
};

// Initialize the app
function initApp() {
  // Set the API provider radio button
  document.querySelector(`input[name="api-provider"][value="${apiProvider}"]`).checked = true;
  
  // Show the appropriate settings panel
  toggleProviderSettings();
  
  // Update model display
  updateModelDisplay();

  // Start a new chat
  startNewChat();

  // Set the selected models in the dropdowns
  if (openrouterModelSelect) {
    openrouterModelSelect.value = selectedOpenrouterModel;
  }
  
  if (groqModelSelect) {
    groqModelSelect.value = selectedGroqModel;
  }
  
  if (googleModelSelect) {
    googleModelSelect.value = selectedGoogleModel;
  }
  
  // Set API key inputs
  openrouterApiKeyInput.value = openrouterApiKey === DEFAULT_OPENROUTER_API_KEY ? maskApiKey(openrouterApiKey) : openrouterApiKey;
  groqApiKeyInput.value = groqApiKey;
  googleApiKeyInput.value = googleApiKey;

  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = (chatInput.scrollHeight) + 'px';
  });

  // Load conversations
  renderConversations();

  // Event listeners
  chatForm.addEventListener('submit', handleChatSubmit);
  apiKeyForm.addEventListener('submit', handleApiKeySubmit);
  newChatBtn.addEventListener('click', startNewChat);
  clearConversationsBtn.addEventListener('click', clearAllConversations);
  mobileMenuBtn.addEventListener('click', toggleSidebar);
  mobileCloseBtn.addEventListener('click', toggleSidebar);
  changeModelBtn.addEventListener('click', showApiKeyModal);
  settingsBtn.addEventListener('click', showApiKeyModal);
  toggleOpenrouterVisibilityBtn.addEventListener('click', () => toggleApiKeyVisibility('openrouter'));
  toggleGroqVisibilityBtn.addEventListener('click', () => toggleApiKeyVisibility('groq'));
  toggleGoogleVisibilityBtn.addEventListener('click', () => toggleApiKeyVisibility('google'));
  useDefaultBtn.addEventListener('click', useDefaultSettings);
  
  // Add event listener for API provider change
  apiProviderRadios.forEach(radio => {
    radio.addEventListener('change', toggleProviderSettings);
  });
  
  // Add event listener for copy buttons (delegated to document)
  document.addEventListener('click', handleCopyButtonClick);
  
  exampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const exampleText = btn.textContent.replace(/"/g, '');
      chatInput.value = exampleText;
      chatInput.style.height = 'auto';
      chatInput.style.height = (chatInput.scrollHeight) + 'px';
      chatInput.focus();
    });
  });

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === apiKeyModal) {
      hideApiKeyModal();
    }
  });

  // Escape key to close modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && apiKeyModal.style.display === 'flex') {
      hideApiKeyModal();
    }
  });
}

// Toggle provider settings based on selected provider
function toggleProviderSettings() {
  const selectedProvider = document.querySelector('input[name="api-provider"]:checked').value;
  
  if (selectedProvider === 'openrouter') {
    openrouterSettings.style.display = 'block';
    groqSettings.style.display = 'none';
    googleSettings.style.display = 'none';
  } else if (selectedProvider === 'groq') {
    openrouterSettings.style.display = 'none';
    groqSettings.style.display = 'block';
    googleSettings.style.display = 'none';
  } else if (selectedProvider === 'google') {
    openrouterSettings.style.display = 'none';
    groqSettings.style.display = 'none';
    googleSettings.style.display = 'block';
  }
}

// Handle copy button clicks
function handleCopyButtonClick(e) {
  // Check if it's a copy message button
  if (e.target.closest('.copy-message-btn')) {
    const button = e.target.closest('.copy-message-btn');
    const messageDiv = button.closest('.message');
    const messageText = messageDiv.querySelector('.message-text');
    
    // Get text content to copy
    let textToCopy;
    if (messageDiv.classList.contains('user-message')) {
      // For user messages, just get the text content
      textToCopy = messageText.textContent;
    } else {
      // For AI messages, get the text content but preserve formatting
      textToCopy = messageText.innerText;
    }
    
    copyToClipboard(textToCopy, button);
    return;
  }
  
  // Check if it's a copy code button
  if (e.target.closest('.copy-code-btn')) {
    const button = e.target.closest('.copy-code-btn');
    const codeBlock = button.closest('.code-block-wrapper').querySelector('code');
    const codeToCopy = codeBlock.textContent;
    
    copyToClipboard(codeToCopy, button);
  }
}

// Copy text to clipboard
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    // Show copied feedback
    const originalIcon = button.innerHTML;
    button.innerHTML = '<span class="material-symbols-rounded">check</span>';
    button.classList.add('copied');
    
    // Reset after 2 seconds
    setTimeout(() => {
      button.innerHTML = originalIcon;
      button.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

// Update model display
function updateModelDisplay() {
  if (currentModelDisplay) {
    let displayName;
    
    if (apiProvider === 'openrouter') {
      displayName = openrouterModelDisplayNames[selectedOpenrouterModel] || selectedOpenrouterModel.split('/').pop();
      displayName = `OpenRouter: ${displayName}`;
    } else if (apiProvider === 'groq') {
      displayName = groqModelDisplayNames[selectedGroqModel] || selectedGroqModel;
      displayName = `Groq: ${displayName}`;
    } else if (apiProvider === 'google') {
      displayName = googleModelDisplayNames[selectedGoogleModel] || selectedGoogleModel;
      displayName = `Google: ${displayName}`;
    }
    
    currentModelDisplay.textContent = displayName;
  }
}

// Show API Key Modal
function showApiKeyModal() {
  // Set the API provider radio button
  document.querySelector(`input[name="api-provider"][value="${apiProvider}"]`).checked = true;
  
  // Show the appropriate settings panel
  toggleProviderSettings();
  
  // Mask the OpenRouter API key if it's the default key
  if (openrouterApiKey === DEFAULT_OPENROUTER_API_KEY) {
    openrouterApiKeyInput.value = maskApiKey(openrouterApiKey);
    openrouterApiKeyInput.type = "password";
  } else {
    openrouterApiKeyInput.value = openrouterApiKey || '';
    openrouterApiKeyInput.type = "password";
  }
  
  // Set the Groq API key
  groqApiKeyInput.value = groqApiKey || '';
  groqApiKeyInput.type = "password";
  
  // Set the Google API key
  googleApiKeyInput.value = googleApiKey || '';
  googleApiKeyInput.type = "password";
  
  // Set the selected models in the dropdowns
  openrouterModelSelect.value = selectedOpenrouterModel;
  groqModelSelect.value = selectedGroqModel;
  googleModelSelect.value = selectedGoogleModel;
  
  apiKeyModal.style.display = 'flex';
}

// Toggle API Key Visibility
function toggleApiKeyVisibility(provider) {
  if (provider === 'openrouter') {
    if (openrouterApiKeyInput.type === "password") {
      openrouterApiKeyInput.type = "text";
      if (openrouterApiKey === DEFAULT_OPENROUTER_API_KEY) {
        openrouterApiKeyInput.value = openrouterApiKey;
      }
      toggleOpenrouterVisibilityBtn.innerHTML = '<span class="material-symbols-rounded">visibility_off</span>';
    } else {
      openrouterApiKeyInput.type = "password";
      if (openrouterApiKey === DEFAULT_OPENROUTER_API_KEY) {
        openrouterApiKeyInput.value = maskApiKey(openrouterApiKey);
      }
      toggleOpenrouterVisibilityBtn.innerHTML = '<span class="material-symbols-rounded">visibility</span>';
    }
  } else if (provider === 'groq') {
    if (groqApiKeyInput.type === "password") {
      groqApiKeyInput.type = "text";
      toggleGroqVisibilityBtn.innerHTML = '<span class="material-symbols-rounded">visibility_off</span>';
    } else {
      groqApiKeyInput.type = "password";
      toggleGroqVisibilityBtn.innerHTML = '<span class="material-symbols-rounded">visibility</span>';
    }
  } else if (provider === 'google') {
    if (googleApiKeyInput.type === "password") {
      googleApiKeyInput.type = "text";
      toggleGoogleVisibilityBtn.innerHTML = '<span class="material-symbols-rounded">visibility_off</span>';
    } else {
      googleApiKeyInput.type = "password";
      toggleGoogleVisibilityBtn.innerHTML = '<span class="material-symbols-rounded">visibility</span>';
    }
  }
}

// Use Default Settings
function useDefaultSettings() {
  apiProvider = 'openrouter';
  openrouterApiKey = DEFAULT_OPENROUTER_API_KEY;
  selectedOpenrouterModel = DEFAULT_OPENROUTER_MODEL;
  
  localStorage.setItem('api_provider', apiProvider);
  localStorage.setItem('openrouter_api_key', openrouterApiKey);
  localStorage.setItem('openrouter_model', selectedOpenrouterModel);
  
  document.querySelector('input[name="api-provider"][value="openrouter"]').checked = true;
  toggleProviderSettings();
  
  updateModelDisplay();
  hideApiKeyModal();
  startNewChat();
}

// Mask API Key
function maskApiKey(key) {
  if (!key) return '';
  const firstFour = key.substring(0, 4);
  const lastFour = key.substring(key.length - 4);
  const middleLength = key.length - 8;
  const maskedMiddle = '*'.repeat(middleLength > 0 ? middleLength : 0);
  return firstFour + maskedMiddle + lastFour;
}

// Hide API Key Modal
function hideApiKeyModal() {
  apiKeyModal.style.display = 'none';
}

// Handle API Key Submit
function handleApiKeySubmit(e) {
  e.preventDefault();
  
  // Get the selected API provider
  const selectedProvider = document.querySelector('input[name="api-provider"]:checked').value;
  
  if (selectedProvider === 'openrouter') {
    let key = openrouterApiKeyInput.value.trim();
    const model = openrouterModelSelect.value;
    
    // If the key is masked and it's the default key, keep using the default key
    if (key.includes('*') && openrouterApiKey === DEFAULT_OPENROUTER_API_KEY) {
      key = DEFAULT_OPENROUTER_API_KEY;
    }
    
    if (key) {
      apiProvider = 'openrouter';
      openrouterApiKey = key;
      selectedOpenrouterModel = model;
      
      localStorage.setItem('api_provider', apiProvider);
      localStorage.setItem('openrouter_api_key', key);
      localStorage.setItem('openrouter_model', model);
    }
  } else if (selectedProvider === 'groq') {
    const key = groqApiKeyInput.value.trim();
    const model = groqModelSelect.value;
    
    if (key) {
      apiProvider = 'groq';
      groqApiKey = key;
      selectedGroqModel = model;
      
      localStorage.setItem('api_provider', apiProvider);
      localStorage.setItem('groq_api_key', key);
      localStorage.setItem('groq_model', model);
    } else {
      alert('Please enter a valid Groq API key');
      return;
    }
  } else if (selectedProvider === 'google') {
    const key = googleApiKeyInput.value.trim();
    const model = googleModelSelect.value;
    
    if (key) {
      apiProvider = 'google';
      googleApiKey = key;
      selectedGoogleModel = model;
      
      localStorage.setItem('api_provider', apiProvider);
      localStorage.setItem('google_api_key', key);
      localStorage.setItem('google_model', model);
    } else {
      alert('Please enter a valid Google Gemini API key');
      return;
    }
  }
  
  updateModelDisplay();
  hideApiKeyModal();
  startNewChat();
}

// Start New Chat
function startNewChat() {
  // Don't start a new chat if streaming is in progress
  if (isStreaming) return;
  
  // Reset chat history
  chatHistory = [];

  // Create a new conversation
  currentConversationId = Date.now().toString();
  const newConversation = {
    id: currentConversationId,
    title: 'New Conversation',
    messages: [],
    createdAt: new Date().toISOString(),
    provider: apiProvider,
    model: apiProvider === 'openrouter' 
      ? selectedOpenrouterModel 
      : apiProvider === 'groq' 
        ? selectedGroqModel 
        : selectedGoogleModel
  };

  conversations.unshift(newConversation);
  saveConversations();
  renderConversations();

  // Clear chat and show welcome screen
  chatMessages.innerHTML = '';
  chatMessages.style.display = 'none';
  welcomeScreen.style.display = 'flex';
}

// Handle Chat Submit
async function handleChatSubmit(e) {
  e.preventDefault();
  
  const message = chatInput.value.trim();
  if (!message || isStreaming) return;

  // Hide welcome screen and show chat
  welcomeScreen.style.display = 'none';
  chatMessages.style.display = 'block';

  // Add user message to UI
  addMessageToUI('user', message);
  
  // Clear input
  chatInput.value = '';
  chatInput.style.height = 'auto';
  
  // Find current conversation
  const conversation = conversations.find(conv => conv.id === currentConversationId);
  
  // Update conversation title if it's the first message
  if (conversation && conversation.messages.length === 0) {
    // Truncate title if too long
    conversation.title = message.length > 30 ? message.substring(0, 30) + '...' : message;
    saveConversations();
    renderConversations();
  }
  
  // Add message to conversation
  if (conversation) {
    conversation.messages.push({
      role: 'user',
      content: message
    });
    saveConversations();
  }

  // Add user message to chat history
  chatHistory.push({
    role: 'user',
    content: message
  });

  // Add AI thinking indicator
  const loadingId = addLoadingIndicator();

  try {
    let response;
    
    if (apiProvider === 'openrouter') {
      // Check if API key is valid
      if (!openrouterApiKey) {
        throw new Error('OpenRouter API key is missing. Please add your OpenRouter API key.');
      }

      // Prepare messages for OpenRouter API
      const messages = prepareMessagesForAPI(chatHistory, 'openrouter');

      // Set streaming flag
      isStreaming = true;

      // Send message to OpenRouter API
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'AI Chat App'
        },
        body: JSON.stringify({
          model: selectedOpenrouterModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 4096,
          stream: false // We'll simulate streaming for better control
        })
      });
    } else if (apiProvider === 'groq') {
      // Check if API key is valid
      if (!groqApiKey) {
        throw new Error('Groq API key is missing. Please add your Groq API key.');
      }

      // Prepare messages for Groq API
      const messages = prepareMessagesForAPI(chatHistory, 'groq');

      // Set streaming flag
      isStreaming = true;

      // Send message to Groq API
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: selectedGroqModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 4096,
          stream: false // We'll simulate streaming for better control
        })
      });
    } else if (apiProvider === 'google') {
      // Check if API key is valid
      if (!googleApiKey) {
        throw new Error('Google Gemini API key is missing. Please add your Google Gemini API key.');
      }

      // Set streaming flag
      isStreaming = true;

      // Prepare messages for Google Gemini API
      const formattedMessages = prepareMessagesForAPI(chatHistory, 'google');

      // Send message to Google Gemini API
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedGoogleModel}:generateContent?key=${googleApiKey}`;
      
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: formattedMessages
        })
      });
    }

    // Check if response is ok
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage;
      
      if (apiProvider === 'google') {
        errorMessage = errorData.error?.message || `Error: ${response.status} ${response.statusText}`;
      } else {
        errorMessage = errorData.error?.message || `Error: ${response.status} ${response.statusText}`;
      }
      
      if (response.status === 401) {
        throw new Error(`Invalid API key. Please check your ${apiProvider === 'openrouter' ? 'OpenRouter' : apiProvider === 'groq' ? 'Groq' : 'Google Gemini'} API key.`);
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(errorMessage);
      }
    }

    // Parse response
    const data = await response.json();
    
    let aiMessage;
    
    if (apiProvider === 'google') {
      // Extract message from Google Gemini response
      if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
        throw new Error('Invalid response from Google Gemini API');
      }
      
      aiMessage = data.candidates[0].content.parts[0].text;
    } else {
      // Extract message from OpenRouter or Groq response
      if (!data.choices || data.choices.length === 0) {
        throw new Error(`Invalid response from ${apiProvider === 'openrouter' ? 'OpenRouter' : 'Groq'} API`);
      }
      
      aiMessage = data.choices[0].message.content;
    }
    
    if (!aiMessage || aiMessage.trim() === '') {
      throw new Error(`Empty response from ${apiProvider === 'openrouter' ? 'OpenRouter' : apiProvider === 'groq' ? 'Groq' : 'Google Gemini'} API`);
    }
    
    // Add AI response to chat history
    chatHistory.push({
      role: 'assistant',
      content: aiMessage
    });
    
    // Remove loading indicator
    removeLoadingIndicator(loadingId);
    
    // Add AI response to UI with streaming effect
    await addStreamingMessageToUI('ai', aiMessage);
    
    // Add AI response to conversation
    if (conversation) {
      conversation.messages.push({
        role: 'ai',
        content: aiMessage
      });
      saveConversations();
    }
    
    // Reset streaming flag
    isStreaming = false;
    
    // Scroll to bottom
    scrollToBottom();
  } catch (error) {
    console.error(`Error sending message to ${apiProvider === 'openrouter' ? 'OpenRouter' : apiProvider === 'groq' ? 'Groq' : 'Google Gemini'}:`, error);
    
    // Remove loading indicator
    removeLoadingIndicator(loadingId);
    
    // Reset streaming flag
    isStreaming = false;
    
    // Determine error message based on error type
    let errorMessage = 'Sorry, I encountered an error processing your request. Please try again later.';
    
    if (error.message.includes('API key')) {
      errorMessage = `Invalid or missing API key. Please check your ${apiProvider === 'openrouter' ? 'OpenRouter' : apiProvider === 'groq' ? 'Groq' : 'Google Gemini'} API key in settings.`;
      // Show API key modal if key is invalid
      setTimeout(() => {
        showApiKeyModal();
      }, 1500);
    } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('unavailable')) {
      errorMessage = 'Network error. Please check your internet connection and try again.';
    } else if (error.message.includes('rate limit') || error.message.includes('quota') || error.message.includes('limit')) {
      errorMessage = 'API rate limit exceeded. Please try again later.';
    } else if (error.message.includes('blocked') || error.message.includes('safety')) {
      errorMessage = 'The request was blocked due to safety settings. Please modify your message and try again.';
    } else if (error.message.includes('empty') || error.message.includes('Invalid response')) {
      errorMessage = 'Received an empty response. Please try a different prompt.';
    }
    
    // Add error message to UI
    addMessageToUI('ai', errorMessage);
    
    if (conversation) {
      conversation.messages.push({
        role: 'ai',
        content: errorMessage
      });
      saveConversations();
    }
  }
}

// Prepare messages for different API formats
function prepareMessagesForAPI(messages, provider) {
  if (provider === 'openrouter' || provider === 'groq') {
    // OpenRouter and Groq use similar formats but with slight differences
    return messages.map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.content
    }));
  } else if (provider === 'google') {
    // For Google Gemini API, we need to format messages differently
    // Create a conversation history in the format Google Gemini expects
    const formattedHistory = [];
    
    // Add system message to set the context
    let currentUserMessage = '';
    
    // Process the messages to create the conversation format
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (msg.role === 'user') {
        // If this is a user message, store it
        currentUserMessage = msg.content;
        
        // If there's a next message and it's from the assistant, create a pair
        if (i + 1 < messages.length && (messages[i + 1].role === 'assistant' || messages[i + 1].role === 'ai')) {
          formattedHistory.push({
            role: 'user',
            parts: [{ text: currentUserMessage }]
          });
        } else if (i === messages.length - 1) {
          // If this is the last message, add it
          formattedHistory.push({
            role: 'user',
            parts: [{ text: currentUserMessage }]
          });
        }
      } else if ((msg.role === 'assistant' || msg.role === 'ai') && i > 0 && (messages[i - 1].role === 'user')) {
        // If this is an assistant message following a user message, add it
        formattedHistory.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    }
    
    return formattedHistory;
  }
  
  // Default fallback
  return messages;
}

// Add Message to UI
function addMessageToUI(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = `message-avatar ${role}-avatar`;
  
  if (role === 'user') {
    avatarDiv.textContent = 'U';
  } else {
    avatarDiv.textContent = 'A';
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  const textDiv = document.createElement('div');
  textDiv.className = 'message-text';
  
  // Parse markdown for AI messages
  if (role === 'ai') {
    try {
      // Process content to fix spacing issues
      const processedContent = processMarkdownSpacing(content);
      textDiv.innerHTML = marked.parse(processedContent);
    } catch (error) {
      console.error('Error parsing markdown:', error);
      textDiv.textContent = content; // Fallback to plain text if markdown parsing fails
    }
  } else {
    textDiv.textContent = content;
  }
  
  // Add copy button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-message-btn';
  copyBtn.title = 'Copy message';
  copyBtn.innerHTML = '<span class="material-symbols-rounded">content_copy</span>';
  
  contentDiv.appendChild(textDiv);
  contentDiv.appendChild(copyBtn);
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

// Process markdown to fix spacing issues
function processMarkdownSpacing(content) {
  // Replace excessive newlines (more than 2) with just 2 newlines
  let processed = content.replace(/\n{3,}/g, '\n\n');
  
  // Ensure proper spacing for lists
  processed = processed.replace(/\n\n([-*+]|\d+\.)\s/g, '\n$1 ');
  
  // Fix spacing around headings
  processed = processed.replace(/\n\n(#{1,6})\s/g, '\n$1 ');
  
  return processed;
}

// Add Streaming Message to UI
async function addStreamingMessageToUI(role, content) {
  // Create message container
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = `message-avatar ${role}-avatar`;
  avatarDiv.textContent = role === 'user' ? 'U' : 'A';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  const textDiv = document.createElement('div');
  textDiv.className = 'message-text';
  
  // Add cursor for streaming effect
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  
  contentDiv.appendChild(textDiv);
  contentDiv.appendChild(cursor);
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  chatMessages.appendChild(messageDiv);
  
  // Process content to fix spacing issues
  const processedContent = processMarkdownSpacing(content);
  
  // Simulate streaming effect
  let currentText = '';
  const words = processedContent.split(' ');
  
  // Process content in chunks to handle markdown properly
  for (let i = 0; i < words.length; i++) {
    // Add word with space
    currentText += words[i] + (i < words.length - 1 ? ' ' : '');
    
    // Update content with markdown parsing
    try {
      textDiv.innerHTML = marked.parse(currentText);
    } catch (error) {
      console.error('Error parsing markdown during streaming:', error);
      textDiv.textContent = currentText;
    }
    
    // Scroll to bottom as content streams
    scrollToBottom();
    
    // Random delay between words for natural typing effect
    const delay = Math.floor(Math.random() * 30) + 10; // 10-40ms
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Remove cursor when done
  cursor.remove();
  
  // Add copy button after streaming is complete
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-message-btn';
  copyBtn.title = 'Copy message';
  copyBtn.innerHTML = '<span class="material-symbols-rounded">content_copy</span>';
  contentDiv.appendChild(copyBtn);
  
  return messageDiv;
}

// Add Loading Indicator
function addLoadingIndicator() {
  const id = Date.now().toString();
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message ai-message';
  loadingDiv.id = `loading-${id}`;
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'message-avatar ai-avatar';
  avatarDiv.textContent = 'A';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'loading-indicator';
  
  const loadingDots = document.createElement('div');
  loadingDots.className = 'loading-dots';
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    loadingDots.appendChild(dot);
  }
  
  loadingIndicator.appendChild(loadingDots);
  contentDiv.appendChild(loadingIndicator);
  loadingDiv.appendChild(avatarDiv);
  loadingDiv.appendChild(contentDiv);
  
  chatMessages.appendChild(loadingDiv);
  scrollToBottom();
  
  return id;
}

// Remove Loading Indicator
function removeLoadingIndicator(id) {
  const loadingDiv = document.getElementById(`loading-${id}`);
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

// Render Conversations
function renderConversations() {
  sidebarConversations.innerHTML = '';
  
  conversations.forEach(conv => {
    const convDiv = document.createElement('div');
    convDiv.className = `conversation-item ${conv.id === currentConversationId ? 'active' : ''}`;
    convDiv.dataset.id = conv.id;
    
    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.textContent = 'chat';
    
    const title = document.createElement('span');
    title.textContent = conv.title;
    
    convDiv.appendChild(icon);
    convDiv.appendChild(title);
    
    convDiv.addEventListener('click', () => {
      loadConversation(conv.id);
    });
    
    sidebarConversations.appendChild(convDiv);
  });
}

// Load Conversation
function loadConversation(id) {
  // Don't load if streaming is in progress
  if (isStreaming) return;
  
  // Set current conversation
  currentConversationId = id;
  
  // Find conversation
  const conversation = conversations.find(conv => conv.id === id);
  
  if (!conversation) return;
  
  // Clear chat
  chatMessages.innerHTML = '';
  
  // Hide welcome screen and show chat
  welcomeScreen.style.display = 'none';
  chatMessages.style.display = 'block';
  
  // Reset chat history
  chatHistory = [];
  
  // Set the provider and model for this conversation if it exists
  if (conversation.provider) {
    apiProvider = conversation.provider;
  }
  
  if (conversation.model) {
    if (apiProvider === 'openrouter') {
      selectedOpenrouterModel = conversation.model;
    } else if (apiProvider === 'groq') {
      selectedGroqModel = conversation.model;
    } else if (apiProvider === 'google') {
      selectedGoogleModel = conversation.model;
    }
    updateModelDisplay();
  }
  
  // Add messages to UI and chat history
  conversation.messages.forEach(msg => {
    addMessageToUI(msg.role, msg.content);
    
    // Add to chat history
    if (msg.role === 'user') {
      chatHistory.push({
        role: 'user',
        content: msg.content
      });
    } else if (msg.role === 'ai') {
      chatHistory.push({
        role: 'assistant',
        content: msg.content
      });
    }
  });
  
  // Update active state in sidebar
  renderConversations();
  
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    toggleSidebar();
  }
  
  // Scroll to bottom after loading conversation
  scrollToBottom();
}

// Clear All Conversations
function clearAllConversations() {
  if (isStreaming) return;
  
  if (confirm('Are you sure you want to clear all conversations? This cannot be undone.')) {
    conversations = [];
    saveConversations();
    startNewChat();
  }
}

// Save Conversations
function saveConversations() {
  localStorage.setItem('conversations', JSON.stringify(conversations));
}

// Toggle Sidebar
function toggleSidebar() {
  sidebar.parentElement.classList.toggle('active');
}

// Scroll to Bottom
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
