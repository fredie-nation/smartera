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
const apiKeyInput = document.getElementById('api-key-input');
const modelSelect = document.getElementById('model-select');
const currentModelDisplay = document.getElementById('current-model-display');
const changeModelBtn = document.getElementById('change-model-btn');
const settingsBtn = document.getElementById('settings-btn');
const toggleApiVisibilityBtn = document.getElementById('toggle-api-visibility');
const useDefaultBtn = document.getElementById('use-default-btn');
const sidebarConversations = document.querySelector('.sidebar-conversations');
const newChatBtn = document.querySelector('.new-chat-btn');
const clearConversationsBtn = document.querySelector('.clear-conversations-btn');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileCloseBtn = document.querySelector('.mobile-close');
const sidebar = document.querySelector('.sidebar');
const exampleBtns = document.querySelectorAll('.example-btn');

// Default API key and model
const DEFAULT_API_KEY = "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";
const DEFAULT_MODEL = "google/gemini-pro";

// State
let apiKey = localStorage.getItem('openrouter_api_key') || DEFAULT_API_KEY;
let selectedModel = localStorage.getItem('openrouter_model') || DEFAULT_MODEL;
let currentConversationId = null;
let conversations = JSON.parse(localStorage.getItem('conversations')) || [];
let chatHistory = [];
let isStreaming = false;

// Model display names mapping
const modelDisplayNames = {
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

// Initialize the app
function initApp() {
  // Update model display
  updateModelDisplay();

  // Start a new chat
  startNewChat();

  // Set the selected model in the dropdown
  if (modelSelect) {
    modelSelect.value = selectedModel;
  }

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
  toggleApiVisibilityBtn.addEventListener('click', toggleApiKeyVisibility);
  useDefaultBtn.addEventListener('click', useDefaultSettings);
  
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
    const displayName = modelDisplayNames[selectedModel] || selectedModel.split('/').pop();
    currentModelDisplay.textContent = displayName;
  }
}

// Show API Key Modal
function showApiKeyModal() {
  // Mask the API key if it's the default key
  if (apiKey === DEFAULT_API_KEY) {
    apiKeyInput.value = maskApiKey(apiKey);
    apiKeyInput.type = "password";
  } else {
    apiKeyInput.value = apiKey || '';
    apiKeyInput.type = "password";
  }
  
  // Set the selected model in the dropdown
  modelSelect.value = selectedModel;
  
  apiKeyModal.style.display = 'flex';
}

// Toggle API Key Visibility
function toggleApiKeyVisibility() {
  if (apiKeyInput.type === "password") {
    apiKeyInput.type = "text";
    if (apiKey === DEFAULT_API_KEY) {
      apiKeyInput.value = apiKey;
    }
    toggleApiVisibilityBtn.innerHTML = '<span class="material-symbols-rounded">visibility_off</span>';
  } else {
    apiKeyInput.type = "password";
    if (apiKey === DEFAULT_API_KEY) {
      apiKeyInput.value = maskApiKey(apiKey);
    }
    toggleApiVisibilityBtn.innerHTML = '<span class="material-symbols-rounded">visibility</span>';
  }
}

// Use Default Settings
function useDefaultSettings() {
  apiKey = DEFAULT_API_KEY;
  selectedModel = DEFAULT_MODEL;
  localStorage.setItem('openrouter_api_key', apiKey);
  localStorage.setItem('openrouter_model', selectedModel);
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
  let key = apiKeyInput.value.trim();
  const model = modelSelect.value;
  
  // If the key is masked and it's the default key, keep using the default key
  if (key.includes('*') && apiKey === DEFAULT_API_KEY) {
    key = DEFAULT_API_KEY;
  }
  
  if (key) {
    apiKey = key;
    selectedModel = model;
    localStorage.setItem('openrouter_api_key', key);
    localStorage.setItem('openrouter_model', model);
    updateModelDisplay();
    hideApiKeyModal();
    startNewChat();
  }
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
    model: selectedModel
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
    // Check if API key is valid
    if (!apiKey) {
      throw new Error('API key is missing. Please add your OpenRouter API key.');
    }

    // Prepare messages for OpenRouter API
    const messages = chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Set streaming flag
    isStreaming = true;

    // Send message to OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'AI Chat App'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: false // We'll simulate streaming for better control
      })
    });

    // Check if response is ok
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `Error: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenRouter API key.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        throw new Error(errorMessage);
      }
    }

    // Parse response
    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('Invalid response from OpenRouter API');
    }
    
    const aiMessage = data.choices[0].message.content;
    
    if (!aiMessage || aiMessage.trim() === '') {
      throw new Error('Empty response from OpenRouter API');
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
    console.error('Error sending message to OpenRouter:', error);
    
    // Remove loading indicator
    removeLoadingIndicator(loadingId);
    
    // Reset streaming flag
    isStreaming = false;
    
    // Determine error message based on error type
    let errorMessage = 'Sorry, I encountered an error processing your request. Please try again later.';
    
    if (error.message.includes('API key')) {
      errorMessage = 'Invalid or missing API key. Please check your API key in settings.';
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
  
  // Set the model for this conversation if it exists
  if (conversation.model) {
    selectedModel = conversation.model;
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
  sidebar.classList.toggle('active');
}

// Show Error
function showError(message) {
  alert(message);
}

// Scroll to Bottom
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
