
import React, { useState, useRef, useEffect } from "react";
import "../styles/Chatbot.css";
import "../../public/animate.min.css";
import ReactMarkdown from "react-markdown";
import ThemeToggle from "./ThemeToggle";

const API_URL = import.meta.env.CHAT_HOST_URL || 'http://localhost:3001/api/chat';


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
  const chatEndRef = useRef(null);

  // Typing effect for initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = "Hi! How can I help you today?";
      setTypingIdx(0);
      setTypingText("");
      let i = 0;
      function typeChar() {
        setTypingText(greeting.slice(0, i));
        if (i < greeting.length) {
          i++;
          setTimeout(typeChar, 12 + Math.random() * 30);
        } else {
          setMessages([{ sender: "bot", text: greeting, animate: true }]);
          setTypingIdx(null);
          setTypingText("");
        }
      }
      typeChar();
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (rateLimit > 0) {
      const timer = setInterval(() => setRateLimit((s) => (s > 0 ? s - 1 : 0)), 1000);
      return () => clearInterval(timer);
    }
  }, [rateLimit]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (input.length > 1000) {
      setInputError("Message too long (max 1000 characters).");
      return;
    }
    setInputError("");
    const userMessage = input;
    const newMessages = [...messages, { sender: "user", text: userMessage, animate: true }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      // Prepare messages in OpenAI format
      const formattedMessages = newMessages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify({ messages: formattedMessages }),
      });
      if (response.status === 429) {
        // Typing effect for rate limit message
        const rateMsg = "Too many requests. Please wait 15 seconds before sending another message.";
        setTypingIdx(messages.length + 1);
        setTypingText("");
        let i = 0;
        function typeChar() {
          setTypingText(rateMsg.slice(0, i));
          if (i < rateMsg.length) {
            i++;
            setTimeout(typeChar, 12 + Math.random() * 30);
          } else {
            setMessages((msgs) => [
              ...msgs,
              { sender: "bot", text: rateMsg, animate: true },
            ]);
            setTypingIdx(null);
            setTypingText("");
          }
        }
        typeChar();
        setRateLimit(15);
        return;
      }
      if (!response.ok) {
        setMessages((msgs) => [
          ...msgs,
          { sender: "bot", text: `Server error (${response.status}). Please try again later.`, animate: true },
        ]);
        return;
      }
      const data = await response.json();
      const botText = data.choices?.[0]?.message?.content || "Sorry, I didn't get that.";
      setTypingIdx(messages.length + 1); // index of the new bot message
      setTypingText("");
      let i = 0;
      function typeChar() {
        setTypingText(botText.slice(0, i));
        if (i < botText.length) {
          i++;
          setTimeout(typeChar, 12 + Math.random() * 30);
        } else {
          // Only add the message if it hasn't already been added
          setMessages((msgs) => {
            // Prevent duplicate bot message if re-rendered
            if (msgs[msgs.length - 1]?.text === botText && msgs[msgs.length - 1]?.sender === 'bot') return msgs;
            return [
              ...msgs,
              { sender: "bot", text: botText, animate: true },
            ];
          });
          setTypingIdx(null);
          setTypingText("");
        }
      }
      typeChar();
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { sender: "bot", text: "Network error. Please check your connection and try again.", animate: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="chatbot-container">
      <header className="chat-header">
        <span className="chat-title">Chat</span>
        <span className="header-spacer" />
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </header>
      <div className="chat-window">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-message ${msg.sender} animate__animated ${msg.animate ? (msg.sender === 'user' ? 'animate__fadeInRight' : '') : ''}`}
            onAnimationEnd={e => e.currentTarget.classList.remove('animate__fadeInRight')}
            style={{ position: 'relative' }}
          >
            {msg.sender === "bot" ? (
              <>
                {typeof msg.text === 'string' ? (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                ) : Array.isArray(msg.text) ? (
                  <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{JSON.stringify(msg.text, null, 2)}</pre>
                ) : typeof msg.text === 'object' && msg.text !== null ? (
                  <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{JSON.stringify(msg.text, null, 2)}</pre>
                ) : (
                  String(msg.text)
                )}
                {!(idx === 0 && msg.text === "Hi! How can I help you today?") && (
                  <button
                    style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: '#007aff', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    title="Copy response"
                    onClick={() => navigator.clipboard.writeText(typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text, null, 2))}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="6" y="6" width="9" height="9" rx="2" stroke="#007aff" strokeWidth="1.5" fill="white"/>
                      <rect x="3" y="3" width="9" height="9" rx="2" stroke="#007aff" strokeWidth="1.5" fill="white"/>
                    </svg>
                  </button>
                )}
              </>
            ) : editIdx === idx ? (
              <>
                <input
                  type="text"
                  value={editValue}
                  maxLength={1000}
                  onChange={e => setEditValue(e.target.value)}
                  style={{ width: '80%' }}
                />
                <button
                  style={{ marginLeft: 8, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => {
                    if (editValue.trim() && editValue.length <= 1000) {
                      const newMsgs = [...messages];
                      newMsgs[idx].text = editValue;
                      setMessages(newMsgs);
                      setEditIdx(null);
                    }
                  }}
                >Save</button>
                <button
                  style={{ marginLeft: 4, color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => setEditIdx(null)}
                >Cancel</button>
              </>
            ) : (
              <>
                {msg.text}
                {/* Edit icon removed as requested */}
              </>
            )}
          </div>
        ))}
        {/* Typing animation for bot */}
        {typingIdx !== null && (
          <div className="chat-message bot animate__animated" style={{ position: 'relative' }}>
            <ReactMarkdown>{typingText + (typingText.length < 1 ? '' : '|')}</ReactMarkdown>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
  <form className={"chat-input-row animate__animated animate__fadeInUp" + (window.innerWidth <= 480 ? " mobile-input-row" : "")} onSubmit={sendMessage}>
    <input
      type="text"
      value={input}
      maxLength={1000}
      onChange={(e) => {
        setInput(e.target.value);
        if (e.target.value.length > 1000) {
          setInputError("Message too long (max 1000 characters).");
        } else {
          setInputError("");
        }
      }}
      placeholder={rateLimit > 0 ? `Please wait ${rateLimit}s...` : typingIdx !== null ? "Bot is typing..." : "Type your message..."}
      disabled={loading || rateLimit > 0 || typingIdx !== null}
      className="chat-input"
    />
    {inputError && (
      <div style={{ color: '#d32f2f', fontSize: '0.9em', marginTop: 4 }}>{inputError}</div>
    )}
    <button type="submit" disabled={loading || !input.trim() || rateLimit > 0 || typingIdx !== null} className="send-btn">
      {loading ? <span className="loader"></span> : rateLimit > 0 ? `${rateLimit}s` : typingIdx !== null ? <span className="loader"></span> : "Send"}
    </button>
  </form>
  <footer className="chat-footer">This chatbot is designed for educational purposes only and is not intended for commercial or high-volume use.</footer>
    </div>
  );
}
