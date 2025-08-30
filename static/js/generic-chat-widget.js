class GenericChatWidget {
  constructor(config = {}) {
    this.config = {
      // Default configuration
      companyId: config.companyId || 'vanguard',
      companyName: config.companyName || 'Vanguard Assistant',
      websocketUrl: config.websocketUrl || 'wss://your-api-gateway-url',
      primaryColor: config.primaryColor || '#FF6B35',
      position: config.position || 'bottom-right',
      autoOpen: config.autoOpen || false,
      autoOpenDelay: config.autoOpenDelay || 30000,
      welcomeMessage: config.welcomeMessage || 'Hello! How can I help you with your Vanguard investments today?',
      placeholderText: config.placeholderText || 'Ask about funds, fees, accounts...',
      maxRetries: config.maxRetries || 3,
      reconnectDelay: config.reconnectDelay || 2000,
      ...config
    };

    this.websocket = null;
    this.isConnected = false;
    this.sessionId = this.generateSessionId();
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.isTyping = false;

    this.initializeWidget();
  }

  initializeWidget() {
    this.createWidgetElements();
    this.bindEvents();
    this.loadPersistedState();
    
    if (this.config.autoOpen) {
      setTimeout(() => this.openChat(), this.config.autoOpenDelay);
    }
  }

  createWidgetElements() {
    // Create widget HTML structure
    const widgetHtml = `
      <div id="chat-widget-trigger" class="chat-widget-trigger" style="--primary-color: ${this.config.primaryColor}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1h.5c.2 0 .4-.1.5-.2L14.1 18H20c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>
        </svg>
        <span class="chat-widget-badge" id="chat-widget-badge" style="display: none;">1</span>
      </div>
      
      <div id="chat-widget-popup" class="chat-widget-popup" style="--primary-color: ${this.config.primaryColor}">
        <div class="chat-widget-header">
          <div class="chat-widget-company-info">
            <h3>${this.config.companyName}</h3>
            <span class="chat-widget-status" id="chat-status">Connecting...</span>
          </div>
          <button id="chat-widget-close" class="chat-widget-close">&times;</button>
        </div>
        
        <div id="chat-widget-messages" class="chat-widget-messages">
          <div class="chat-message system-message">
            ${this.config.welcomeMessage}
          </div>
        </div>
        
        <div class="chat-widget-input-container">
          <input 
            type="text" 
            id="chat-widget-input" 
            class="chat-widget-input"
            placeholder="${this.config.placeholderText}"
            maxlength="500"
          />
          <button id="chat-widget-send" class="chat-widget-send" disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Inject widget into page
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'generic-chat-widget';
    widgetContainer.innerHTML = widgetHtml;
    document.body.appendChild(widgetContainer);

    // Load CSS
    this.loadStyles();
  }

  loadStyles() {
    const css = `
      #generic-chat-widget * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .chat-widget-trigger {
        position: fixed;
        ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        ${this.config.position.includes('top') ? 'top: 20px;' : 'bottom: 20px;'}
        width: 60px;
        height: 60px;
        background: var(--primary-color);
        border-radius: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        z-index: 1000;
        user-select: none;
      }

      .chat-widget-trigger:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }

      .chat-widget-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ff4444;
        color: white;
        border-radius: 10px;
        width: 20px;
        height: 20px;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }

      .chat-widget-popup {
        display: none;
        position: fixed;
        ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        ${this.config.position.includes('top') ? 'top: 20px;' : 'bottom: 90px;'}
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        z-index: 1001;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .chat-widget-header {
        background: var(--primary-color);
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .chat-widget-company-info h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .chat-widget-status {
        font-size: 12px;
        opacity: 0.9;
        margin-top: 2px;
        display: block;
      }

      .chat-widget-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 15px;
        transition: background-color 0.2s;
      }

      .chat-widget-close:hover {
        background: rgba(255,255,255,0.1);
      }

      .chat-widget-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f8f9fa;
      }

      .chat-message {
        margin: 12px 0;
        padding: 10px 14px;
        border-radius: 18px;
        max-width: 80%;
        word-wrap: break-word;
        line-height: 1.4;
        font-size: 14px;
      }

      .user-message {
        background: var(--primary-color);
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 4px;
      }

      .assistant-message {
        background: white;
        border: 1px solid #e1e5e9;
        margin-right: auto;
        border-bottom-left-radius: 4px;
      }

      .system-message {
        background: #e3f2fd;
        color: #1565c0;
        margin: 0 auto;
        text-align: center;
        font-size: 13px;
        max-width: 90%;
      }

      .typing-indicator {
        background: white;
        border: 1px solid #e1e5e9;
        margin-right: auto;
        border-bottom-left-radius: 4px;
        padding: 16px 14px 12px;
      }

      .typing-dots {
        display: inline-block;
      }

      .typing-dots span {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #999;
        margin: 0 1px;
        animation: typing 1.4s infinite ease-in-out;
      }

      .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
      .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

      @keyframes typing {
        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
      }

      .chat-widget-input-container {
        display: flex;
        padding: 16px;
        background: white;
        border-top: 1px solid #e1e5e9;
        gap: 12px;
      }

      .chat-widget-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid #e1e5e9;
        border-radius: 24px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }

      .chat-widget-input:focus {
        border-color: var(--primary-color);
      }

      .chat-widget-send {
        width: 44px;
        height: 44px;
        border-radius: 22px;
        background: var(--primary-color);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .chat-widget-send:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .chat-widget-send:not(:disabled):hover {
        transform: scale(1.05);
      }

      @media (max-width: 480px) {
        .chat-widget-popup {
          width: calc(100vw - 40px);
          height: calc(100vh - 40px);
          top: 20px !important;
          right: 20px !important;
          left: 20px !important;
          bottom: 20px !important;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = css;
    document.head.appendChild(styleSheet);
  }

  bindEvents() {
    // Get DOM elements
    this.elements = {
      trigger: document.getElementById('chat-widget-trigger'),
      popup: document.getElementById('chat-widget-popup'),
      close: document.getElementById('chat-widget-close'),
      messages: document.getElementById('chat-widget-messages'),
      input: document.getElementById('chat-widget-input'),
      send: document.getElementById('chat-widget-send'),
      status: document.getElementById('chat-status'),
      badge: document.getElementById('chat-widget-badge')
    };

    // Bind event listeners
    this.elements.trigger.addEventListener('click', () => this.openChat());
    this.elements.close.addEventListener('click', () => this.closeChat());
    this.elements.send.addEventListener('click', () => this.sendMessage());
    this.elements.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.elements.input.addEventListener('input', () => this.updateSendButton());
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.websocket && this.websocket.readyState !== WebSocket.OPEN) {
        this.reconnectWebSocket();
      }
    });
  }

  openChat() {
    this.elements.popup.style.display = 'flex';
    this.elements.trigger.style.display = 'none';
    this.elements.input.focus();
    
    if (!this.isConnected) {
      this.connectWebSocket();
    }
    
    this.saveState({ isOpen: true });
  }

  closeChat() {
    this.elements.popup.style.display = 'none';
    this.elements.trigger.style.display = 'flex';
    this.saveState({ isOpen: false });
  }

  connectWebSocket() {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return;
    }

    const url = `${this.config.websocketUrl}?company=${this.config.companyId}&session=${this.sessionId}`;
    
    try {
      this.websocket = new WebSocket(url);
      this.setupWebSocketHandlers();
      this.updateConnectionStatus('Connecting...');
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.updateConnectionStatus('Connection failed');
      this.scheduleReconnect();
    }
  }

  setupWebSocketHandlers() {
    this.websocket.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('Connected');
      this.processPendingMessages();
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleIncomingMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.websocket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.updateConnectionStatus('Disconnected');
      
      if (event.code !== 1000) { // Not normal closure
        this.scheduleReconnect();
      }
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateConnectionStatus('Connection error');
    };
  }

  handleIncomingMessage(data) {
    this.hideTypingIndicator();
    
    switch (data.type) {
      case 'response':
        this.displayMessage(data.message, 'assistant');
        break;
      case 'error':
        this.displayMessage(data.message, 'system');
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  sendMessage() {
    const text = this.elements.input.value.trim();
    if (!text) return;

    this.elements.input.value = '';
    this.updateSendButton();
    this.displayMessage(text, 'user');

    const message = {
      action: 'sendMessage',
      text: text,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };

    if (this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
      this.showTypingIndicator();
    } else {
      this.messageQueue.push(message);
      this.connectWebSocket();
    }
  }

  displayMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    messageDiv.textContent = text;
    
    this.elements.messages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    if (this.isTyping) return;
    
    this.isTyping = true;
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'chat-message typing-indicator';
    typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div> Typing...';
    
    this.elements.messages.appendChild(typingDiv);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    if (!this.isTyping) return;
    
    this.isTyping = false;
    const typingDiv = document.getElementById('typing-indicator');
    if (typingDiv) {
      typingDiv.remove();
    }
  }

  scrollToBottom() {
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }

  updateSendButton() {
    const hasText = this.elements.input.value.trim().length > 0;
    this.elements.send.disabled = !hasText || !this.isConnected;
  }

  updateConnectionStatus(status) {
    this.elements.status.textContent = status;
    this.updateSendButton();
  }

  processPendingMessages() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.websocket.send(JSON.stringify(message));
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.config.maxRetries) {
      this.reconnectAttempts++;
      const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
        this.connectWebSocket();
      }, delay);
    } else {
      this.updateConnectionStatus('Connection lost');
      this.displayMessage('Connection lost. Please refresh the page to reconnect.', 'system');
    }
  }

  reconnectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
    }
    this.reconnectAttempts = 0;
    this.connectWebSocket();
  }

  generateSessionId() {
    return 'session-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }

  saveState(state) {
    const currentState = this.loadState();
    const newState = { ...currentState, ...state };
    localStorage.setItem(`chat-widget-${this.config.companyId}`, JSON.stringify(newState));
  }

  loadState() {
    try {
      const state = localStorage.getItem(`chat-widget-${this.config.companyId}`);
      return state ? JSON.parse(state) : {};
    } catch {
      return {};
    }
  }

  loadPersistedState() {
    const state = this.loadState();
    if (state.isOpen) {
      this.openChat();
    }
  }

  destroy() {
    if (this.websocket) {
      this.websocket.close();
    }
    
    const widget = document.getElementById('generic-chat-widget');
    if (widget) {
      widget.remove();
    }
  }
}

// Export for use
window.GenericChatWidget = GenericChatWidget;
