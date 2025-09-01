
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "../styles/Chatbot.css";
import "../../public/animate.min.css";
import ReactMarkdown from "react-markdown";
import ThemeToggle from "./ThemeToggle";

// Constants
const MAX_MESSAGE_LENGTH = 1000;
const RATE_LIMIT_DURATION = 15;
const TYPING_DELAY_MIN = 12;
const TYPING_DELAY_MAX = 30;

const API_URL =
  import.meta.env.MODE === "production"
    ? "/.netlify/functions/proxy-chat" // Production → call Netlify proxy
    : import.meta.env.VITE_API_URL + "/.netlify/functions/chat"; 

// Input validation utility
const validateInput = (input) => {
  if (!input || typeof input !== 'string') return { isValid: false, error: "Invalid input" };
  if (input.trim().length === 0) return { isValid: false, error: "Message cannot be empty" };
  if (input.length > MAX_MESSAGE_LENGTH) return { isValid: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` };
  return { isValid: true, error: null };
};

// Sanitize text for display
const sanitizeText = (text) => {
  if (typeof text !== 'string') return String(text);
  return text.replace(/[<>]/g, (match) => match === '<' ? '&lt;' : '&gt;');
}; 

export default function Chatbot({ theme, setTheme }) {
  const [messages, setMessages] = useState([]);
  const [typingIdx, setTypingIdx] = useState(null);
  const [typingText, setTypingText] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimit, setRateLimit] = useState(0); // seconds left
  const [isMobile, setIsMobile] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const rateLimitTimeoutRef = useRef(null);
  const recognitionRef = useRef(null);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 480);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setInputError('Microphone access denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          setInputError('No speech detected. Please try again.');
        } else {
          setInputError('Speech recognition failed. Please try again.');
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Typing effect utility
  const createTypingEffect = useCallback((text, messageIndex, onComplete) => {
    setTypingIdx(messageIndex);
      setTypingText("");
      let i = 0;
    
    const typeChar = () => {
      if (i < text.length) {
        setTypingText(text.slice(0, i + 1));
        i++;
        typingTimeoutRef.current = setTimeout(typeChar, TYPING_DELAY_MIN + Math.random() * (TYPING_DELAY_MAX - TYPING_DELAY_MIN));
        } else {
          setTypingIdx(null);
          setTypingText("");
        if (onComplete) onComplete();
      }
    };
    
      typeChar();
  }, []);

  // Initial greeting effect
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = "Hi! How can I help you today?";
      createTypingEffect(greeting, 0, () => {
        setMessages([{ sender: "bot", text: greeting, animate: true, id: Date.now() }]);
      });
    }
  }, [messages.length, createTypingEffect]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Rate limit countdown
  useEffect(() => {
    if (rateLimit > 0) {
      rateLimitTimeoutRef.current = setTimeout(() => {
        setRateLimit((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    }
    return () => {
      if (rateLimitTimeoutRef.current) {
        clearTimeout(rateLimitTimeoutRef.current);
      }
    };
  }, [rateLimit]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (rateLimitTimeoutRef.current) clearTimeout(rateLimitTimeoutRef.current);
    };
  }, []);

  const sendMessage = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate input
    const validation = validateInput(input);
    if (!validation.isValid) {
      setInputError(validation.error);
      return;
    }
    
    setInputError("");
    const userMessage = input.trim();
    const messageId = Date.now();
    const newMessages = [...messages, { sender: "user", text: userMessage, animate: true, id: messageId }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      // Prepare messages in OpenAI format with sanitized content
      const formattedMessages = newMessages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: sanitizeText(msg.text),
      }));
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: formattedMessages }),
      });
      if (response.status === 429) {
        const rateMsg = `Too many requests. Please wait ${RATE_LIMIT_DURATION} seconds before sending another message.`;
        createTypingEffect(rateMsg, newMessages.length, () => {
            setMessages((msgs) => [
              ...msgs,
            { sender: "bot", text: rateMsg, animate: true, id: Date.now() },
          ]);
        });
        setRateLimit(RATE_LIMIT_DURATION);
        return;
      }
      if (!response.ok) {
        const errorMsg = `Server error (${response.status}). Please try again later.`;
        setMessages((msgs) => [
          ...msgs,
          { sender: "bot", text: errorMsg, animate: true, id: Date.now() },
        ]);
        return;
      }
      
      const data = await response.json();
      const botText = sanitizeText(data.choices?.[0]?.message?.content || "Sorry, I didn't get that.");
      
      createTypingEffect(botText, newMessages.length, () => {
        setMessages((msgs) => {
          // Prevent duplicate bot message if re-rendered
          if (msgs[msgs.length - 1]?.text === botText && msgs[msgs.length - 1]?.sender === 'bot') return msgs;
          return [
            ...msgs,
            { sender: "bot", text: botText, animate: true, id: Date.now() },
          ];
        });
      });
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: "Network error. Please check your connection and try again.", animate: true, id: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, createTypingEffect]);

  // Handle saving edited message and maintaining history
  const handleSaveEdit = useCallback(async () => {
    const validation = validateInput(editValue);
    if (!validation.isValid) {
      setInputError(validation.error);
      return;
    }

    const editedText = editValue.trim();
    if (editedText === messages[editIdx].text) {
      setEditIdx(null);
      setEditValue("");
      return;
    }

    // Create new messages array with edited message
    const newMessages = [...messages];
    newMessages[editIdx] = { ...newMessages[editIdx], text: editedText, edited: true };
    
    // Remove all messages after the edited message (like ChatGPT)
    const messagesUpToEdit = newMessages.slice(0, editIdx + 1);
    setMessages(messagesUpToEdit);
    setEditIdx(null);
    setEditValue("");
    setInputError("");

    // If this was the last user message, regenerate the bot response
    if (editIdx === messagesUpToEdit.length - 1 && messagesUpToEdit[editIdx].sender === 'user') {
      setLoading(true);
      try {
        // Prepare messages in OpenAI format with sanitized content
        const formattedMessages = messagesUpToEdit.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: sanitizeText(msg.text),
        }));
        
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: formattedMessages }),
        });

        if (response.status === 429) {
          const rateMsg = `Too many requests. Please wait ${RATE_LIMIT_DURATION} seconds before sending another message.`;
          createTypingEffect(rateMsg, messagesUpToEdit.length, () => {
            setMessages((msgs) => [
              ...msgs,
              { sender: "bot", text: rateMsg, animate: true, id: Date.now() },
            ]);
          });
          setRateLimit(RATE_LIMIT_DURATION);
          return;
        }

        if (!response.ok) {
          const errorMsg = `Server error (${response.status}). Please try again later.`;
          setMessages((msgs) => [
            ...msgs,
            { sender: "bot", text: errorMsg, animate: true, id: Date.now() },
          ]);
          return;
        }
        
        const data = await response.json();
        const botText = sanitizeText(data.choices?.[0]?.message?.content || "Sorry, I didn't get that.");
        
        createTypingEffect(botText, messagesUpToEdit.length, () => {
          setMessages((msgs) => {
            // Prevent duplicate bot message if re-rendered
            if (msgs[msgs.length - 1]?.text === botText && msgs[msgs.length - 1]?.sender === 'bot') return msgs;
            return [
              ...msgs,
              { sender: "bot", text: botText, animate: true, id: Date.now() },
            ];
          });
        });
    } catch (err) {
        console.error('Chat error:', err);
      setMessages((msgs) => [
        ...msgs,
          { sender: "bot", text: "Network error. Please check your connection and try again.", animate: true, id: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
    }
  }, [editValue, editIdx, messages, createTypingEffect]);

  // Speech recognition functions
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setInputError("");
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setInputError('Failed to start speech recognition. Please try again.');
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Memoized message list for performance
  const messageList = useMemo(() => 
    messages.map((msg, idx) => (
      <div
        key={msg.id || idx}
            className={`chat-message ${msg.sender} animate__animated ${msg.animate ? (msg.sender === 'user' ? 'animate__fadeInRight' : '') : ''}`}
            onAnimationEnd={e => e.currentTarget.classList.remove('animate__fadeInRight')}
            style={{ position: 'relative' }}
        role="article"
        aria-label={`${msg.sender} message`}
          >
                        {msg.sender === "bot" ? (
          <>
            {typeof msg.text === 'string' ? (
              <ReactMarkdown
                components={{
                  code: ({ node, inline, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    const codeString = String(children).replace(/\n$/, '');
                    
                    if (!inline && language) {
                      return (
                        <div className="code-block-container">
                          <div className="code-block-header">
                            <span className="code-language">{language}</span>
                            <button
                              className="code-copy-btn"
                              onClick={(e) => {
                                navigator.clipboard.writeText(codeString).then(() => {
                                  const btn = e.target.closest('.code-copy-btn');
                                  const originalContent = btn.innerHTML;
                                  btn.innerHTML = `
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                  `;
                                  btn.style.color = 'var(--success-color)';
                                  setTimeout(() => {
                                    btn.innerHTML = originalContent;
                                    btn.style.color = '';
                                  }, 2000);
                                }).catch(err => console.error('Failed to copy code:', err));
                              }}
                              title="Copy code"
                              aria-label="Copy code to clipboard"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
                              </svg>
                            </button>
                          </div>
                          <pre className="code-block">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }
                    
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children, ...props }) => {
                    // Check if this is a code block (not inline code)
                    if (children && typeof children === 'object' && children.type === 'code') {
                      return children; // Let the code component handle it
                    }
                    return <pre {...props}>{children}</pre>;
                  }
                }}
              >
                {msg.text}
              </ReactMarkdown>
            ) : Array.isArray(msg.text) ? (
              <div className="json-block-container">
                <div className="json-block-header">
                  <span className="json-label">JSON</span>
                  <button
                    className="json-copy-btn"
                    onClick={(e) => {
                      const jsonString = JSON.stringify(msg.text, null, 2);
                      navigator.clipboard.writeText(jsonString).then(() => {
                        const btn = e.target.closest('.json-copy-btn');
                        const originalContent = btn.innerHTML;
                        btn.innerHTML = `
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        `;
                        btn.style.color = 'var(--success-color)';
                        setTimeout(() => {
                          btn.innerHTML = originalContent;
                          btn.style.color = '';
                        }, 2000);
                      }).catch(err => console.error('Failed to copy JSON:', err));
                    }}
                    title="Copy JSON"
                    aria-label="Copy JSON to clipboard"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                  </button>
                </div>
                <pre className="json-block">{JSON.stringify(msg.text, null, 2)}</pre>
              </div>
            ) : typeof msg.text === 'object' && msg.text !== null ? (
              <div className="json-block-container">
                <div className="json-block-header">
                  <span className="json-label">JSON</span>
                  <button
                    className="json-copy-btn"
                    onClick={(e) => {
                      const jsonString = JSON.stringify(msg.text, null, 2);
                      navigator.clipboard.writeText(jsonString).then(() => {
                        const btn = e.target.closest('.json-copy-btn');
                        const originalContent = btn.innerHTML;
                        btn.innerHTML = `
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        `;
                        btn.style.color = 'var(--success-color)';
                        setTimeout(() => {
                          btn.innerHTML = originalContent;
                          btn.style.color = '';
                        }, 2000);
                      }).catch(err => console.error('Failed to copy JSON:', err));
                    }}
                    title="Copy JSON"
                    aria-label="Copy JSON to clipboard"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                  </button>
                </div>
                <pre className="json-block">{JSON.stringify(msg.text, null, 2)}</pre>
              </div>
            ) : (
              String(msg.text)
            )}
            {idx > 0 && (
              <button
                className="copy-btn"
                title="Copy response"
                aria-label="Copy message to clipboard"
                onClick={(e) => {
                  const textToCopy = typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text, null, 2);
                  navigator.clipboard.writeText(textToCopy).then(() => {
                    // Show success feedback
                    const btn = e.target.closest('.copy-btn');
                    const originalContent = btn.innerHTML;
                    btn.innerHTML = `
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    `;
                    btn.style.color = 'var(--success-color)';
                    setTimeout(() => {
                      btn.innerHTML = originalContent;
                      btn.style.color = '';
                    }, 2000);
                  }).catch(err => console.error('Failed to copy:', err));
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </button>
            )}
          </>
        ) : editIdx === idx ? (
          <div className="edit-mode">
                <input
                  type="text"
                  value={editValue}
              maxLength={MAX_MESSAGE_LENGTH}
                  onChange={e => setEditValue(e.target.value)}
              className="edit-input"
              aria-label="Edit message"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                } else if (e.key === 'Escape') {
                      setEditIdx(null);
                  setEditValue("");
                }
              }}
            />
            <div className="edit-actions">
              <button
                className="edit-save-btn"
                onClick={handleSaveEdit}
                aria-label="Save edited message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
                <button
                className="edit-cancel-btn"
                onClick={() => {
                  setEditIdx(null);
                  setEditValue("");
                }}
                aria-label="Cancel editing"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
            ) : (
              <>
            <div className="message-content">
                {msg.text}
              {msg.edited && (
                <span className="edited-indicator" title="This message was edited">
                  (edited)
                </span>
              )}
            </div>
            {msg.sender === "user" && (
              <button
                className="edit-message-btn"
                onClick={() => {
                  setEditIdx(idx);
                  setEditValue(msg.text);
                }}
                title="Edit message"
                aria-label="Edit this message"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
              </>
            )}
          </div>
    )), [messages, editIdx, editValue]);

  return (
    <div className="chatbot-container" role="main" aria-label="Chat interface">
      <header className="chat-header">
        <span className="chat-title">Chat</span>
        <span className="header-spacer" />
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </header>
      <div className="chat-window" role="log" aria-live="polite" aria-label="Chat messages">
        {messageList}
        {/* Typing animation for bot */}
        {typingIdx !== null && (
          <div className="chat-message bot animate__animated" style={{ position: 'relative' }} role="status" aria-label="Bot is typing">
            <ReactMarkdown>{typingText + (typingText.length < 1 ? '' : '|')}</ReactMarkdown>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form 
        className={`chat-input-row animate__animated animate__fadeInUp ${isMobile ? "mobile-input-row" : ""}`} 
        onSubmit={sendMessage}
        role="form"
        aria-label="Send message"
      >
    <input
      type="text"
      value={input}
          maxLength={MAX_MESSAGE_LENGTH}
      onChange={(e) => {
            const value = e.target.value;
            setInput(value);
            const validation = validateInput(value);
            setInputError(validation.error || "");
      }}
      placeholder={rateLimit > 0 ? `Please wait ${rateLimit}s...` : typingIdx !== null ? "Bot is typing..." : "Type your message..."}
      disabled={loading || rateLimit > 0 || typingIdx !== null}
      className="chat-input"
          aria-label="Message input"
          aria-describedby={inputError ? "input-error" : undefined}
    />
    {inputError && (
          <div id="input-error" style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: 4 }} role="alert">
            {inputError}
          </div>
        )}
                {speechSupported && (
          <button
            type="button"
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            onClick={isListening ? stopListening : startListening}
            disabled={loading || rateLimit > 0 || typingIdx !== null}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        )}
        <button 
          type="submit" 
          disabled={loading || !input.trim() || rateLimit > 0 || typingIdx !== null} 
          className="send-btn"
          aria-label={loading ? "Sending message" : rateLimit > 0 ? `Wait ${rateLimit} seconds` : "Send message"}
        >
          {loading ? <span className="loader" aria-hidden="true"></span> : rateLimit > 0 ? `${rateLimit}s` : typingIdx !== null ? <span className="loader" aria-hidden="true"></span> : "Send"}
    </button>
  </form>
      <footer className="chat-footer">
        <p>Designed for learning and exploration. Not intended for commercial use.</p>
      </footer>
    </div>
  );
}
