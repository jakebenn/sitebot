'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatWidgetProps {
  companyId?: string;
  companyName?: string;
  websocketUrl?: string;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
  autoOpen?: boolean;
  autoOpenDelay?: number;
  welcomeMessage?: string;
  placeholderText?: string;
  maxRetries?: number;
  reconnectDelay?: number;
}

interface Message {
  id: string;
  content: string;
  type: 'user' | 'bot' | 'system';
  timestamp: Date;
}

interface WebSocketMessage {
  type: string;
  message?: string;
  error?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  companyId = 'vanguard',
  companyName = 'Vanguard Assistant',
  websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL as string,
  primaryColor = '#FF6B35',
  position = 'bottom-right',
  autoOpen = false,
  autoOpenDelay = 30000,
  welcomeMessage = 'Hello! How can I help you with your Vanguard investments today?',
  placeholderText = 'Ask about funds, fees, accounts...',
  maxRetries = 3,
  reconnectDelay = 2000,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', content: welcomeMessage, type: 'system', timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);

  const websocketRef = useRef<WebSocket | null>(null);
  const connectingRef = useRef(false);
  const shouldReconnectRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sessionIdRef = useRef<string>('');
  if (!sessionIdRef.current && typeof window !== 'undefined') {
    const existing = window.localStorage.getItem('chat_session_id');
    const sid = existing || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionIdRef.current = sid;
    if (!existing) window.localStorage.setItem('chat_session_id', sid);
  }

  const connectWebSocket = useCallback(() => {
    if (!websocketUrl) {
      console.error('ChatWidget: NEXT_PUBLIC_WEBSOCKET_URL is not set. Please define it in services/web/.env.local');
      return;
    }
    if (connectingRef.current) return;
    if (websocketRef.current && (websocketRef.current.readyState === WebSocket.OPEN || websocketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    connectingRef.current = true;
    const url = `${websocketUrl}?company=${companyId}&session=${sessionIdRef.current}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      connectingRef.current = false;
      setIsConnected(true);
      setReconnectAttempts(0);
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      connectingRef.current = false;
      setIsConnected(false);
      if (shouldReconnectRef.current) handleReconnect();
    };

    ws.onerror = () => {
      connectingRef.current = false;
      setIsConnected(false);
    };

    websocketRef.current = ws;
  }, [websocketUrl, companyId]);

  const handleReconnect = () => {
    if (reconnectAttempts < maxRetries) {
      const delay = reconnectDelay * (reconnectAttempts + 1);
      setTimeout(() => {
        setReconnectAttempts(prev => prev + 1);
        connectWebSocket();
      }, delay);
    }
  };

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case 'response':
        setIsTyping(false);
        if (data.message) addMessage(data.message, 'bot');
        break;
      case 'error':
        setIsTyping(false);
        if (data.error) addMessage(`Error: ${data.error}`, 'system');
        break;
      default:
        break;
    }
  };

  const addMessage = (content: string, type: 'user' | 'bot' | 'system') => {
    const newMessage: Message = { id: Date.now().toString(), content, type, timestamp: new Date() };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = () => {
    if (!inputValue.trim() || !isConnected) return;
    const text = inputValue.trim();
    setInputValue('');
    addMessage(text, 'user');
    setIsTyping(true);
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        action: 'sendMessage',
        text,
        sessionId: sessionIdRef.current,
        companyId
      }));
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 40;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setAutoScroll(atBottom);
  };

  const scrollToBottom = () => {
    if (!autoScroll) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const t = setTimeout(() => connectWebSocket(), 150);
    if (autoOpen) setTimeout(() => setIsOpen(true), autoOpenDelay);
    return () => {
      shouldReconnectRef.current = false;
      if (process.env.NODE_ENV === 'production') {
        try { websocketRef.current?.close(); } catch {}
      }
      clearTimeout(t);
    };
  }, [connectWebSocket, autoOpen, autoOpenDelay]);

  useEffect(() => { scrollToBottom(); }, [messages]);
  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);

  const popupEdgeStyle = position.includes('right') ? { right: 0 } : { left: 0 };

  return (
    <div className="fixed z-50" style={{ [position.includes('right') ? 'right' : 'left']: '20px', bottom: '20px' }}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 hover:scale-110" style={{ backgroundColor: primaryColor }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1h.5c.2 0 .4-.1.5-.2L14.1 18H20c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/></svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-16 w-[41rem] max-w-[calc(100vw-40px)] max-h-[85vh] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col" style={popupEdgeStyle}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: primaryColor }}>
            <div className="text-white">
              <h3 className="font-semibold">{companyName}</h3>
              <span className="text-sm opacity-90">{isConnected ? 'Connected' : 'Connecting...'}</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:opacity-80 text-xl font-bold">×</button>
          </div>

          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="flex-1 min-h-0 overflow-y-auto p-4 pr-3 space-y-3"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[31rem] px-3 py-2 rounded-lg ${message.type === 'user' ? 'bg-blue-500 text-white' : message.type === 'bot' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {message.type === 'bot' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start"><div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg"><div className="flex space-x-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div></div></div></div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-end space-x-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder={placeholderText}
                rows={3}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-40 overflow-y-auto"
                disabled={!isConnected}
              />
              <button onClick={sendMessage} disabled={!inputValue.trim() || !isConnected} className="px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
