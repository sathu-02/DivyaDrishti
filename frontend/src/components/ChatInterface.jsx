import { useState, useRef, useEffect } from "react";
import API from "../api";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";


export default function ChatInterface() {
  const { messages, setMessages } = useChat();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [expandedText, setExpandedText] = useState(null);
  const [pastedDraft, setPastedDraft] = useState("");
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!inputValue.trim() && !pastedDraft.trim()) || isLoading) return;

    let userMessage = inputValue;
    if (pastedDraft) {
      userMessage = pastedDraft + (inputValue.trim() ? "\n\n" + inputValue : "");
    }

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: userMessage, sender: "user" },
    ]);

    setInputValue("");
    setPastedDraft("");
    setIsLoading(true);

    // Add temporary loading bubble
    const loadingId = Date.now() + 999;

    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        text: "Typing...",
        sender: "ai",
        loading: true,
      },
    ]);

    try {
      const response = await API.post("/chat", {
        message: userMessage,
      });

      const { summary, visualizations } = response.data;

      // Remove loading message
      setMessages((prev) => prev.filter((msg) => msg.id !== loadingId));

      // Add summary
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: summary,
          sender: "ai",
        },
      ]);

      if (visualizations && visualizations.length > 0) {
        visualizations.forEach((viz) => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              sender: "ai",
              visualization: viz,
            },
          ]);
        });
      }
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => prev.filter((msg) => msg.id !== loadingId));

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "Error communicating with server.",
          sender: "ai",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename || "visualization.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(url, '_blank');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: `Uploaded file: ${file.name}`,
        sender: "user",
      },
    ]);

    e.target.value = "";
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble-wrapper ${msg.sender === "user" ? "user-wrapper" : "ai-wrapper"
              }`}
          >
            {msg.sender === "ai" && <div className="avatar ai-avatar">AI</div>}

            <div
              className={`chat-bubble ${msg.sender === "user" ? "bubble-user" : "bubble-ai"
                }`}
            >
              {/* If it's a visualization */}
              {msg.visualization ? (
                <>
                  {msg.visualization.type === "text" && (
                    <div
                      style={{
                        padding: "10px",
                        background: "#eef2ff",
                        borderRadius: "8px",
                      }}
                    >
                      <strong>Text Length:</strong>{" "}
                      {msg.visualization.data.length}
                    </div>
                  )}

                  {msg.visualization.type === "image" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <img
                        src={msg.visualization.data.url}
                        alt="Visualization"
                        style={{
                          maxWidth: "100%",
                          borderRadius: "10px",
                        }}
                      />
                      <button
                        onClick={() => handleDownload(msg.visualization.data.url, `visualization_${msg.id}.png`)}
                        style={{
                          alignSelf: "flex-end",
                          backgroundColor: "#1e4063",
                          color: "#fff",
                          padding: "6px 12px",
                          border: "none",
                          borderRadius: "12px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontFamily: "inherit"
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download
                      </button>
                    </div>
                  )}
                </>
              ) : msg.loading ? (
                <div className="rendering-indicator">
                  <div className="render-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </div>
                  <span className="render-text">Generating Analysis...</span>
                </div>
              ) : msg.sender === "user" && msg.text.length > 300 ? (
                <div 
                  onClick={() => setExpandedText(msg.text)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(182, 154, 116, 0.4)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxWidth: '300px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <strong style={{ fontSize: '0.9rem', color: '#1e4063' }}>Pasted content</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.text.substring(0, 60)}...
                  </p>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {(new Blob([msg.text]).size / 1024).toFixed(2)} KB • {msg.text.split('\n').length} lines
                  </div>
                </div>
              ) : (
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {msg.text}
                </div>
              )}
            </div>

            {msg.sender === "user" && (
              <div 
                className="avatar user-avatar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textTransform: 'uppercase'
                }}
              >
                {user ? (user.username || user.email || 'U').charAt(0) : 'U'}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="chat-input-form"
        onSubmit={handleSubmit}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-primary)",
          borderRadius: "24px",
          border: "1px solid var(--border-color)",
          padding: "0.5rem 1rem",
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept=".pdf,.csv,.xlsx,.txt"
          onChange={handleFileSelect}
        />

        {pastedDraft && (
          <div style={{ paddingBottom: "10px", marginBottom: "10px", width: "100%", borderBottom: "1px solid var(--border-color)" }}>
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(182, 154, 116, 0.4)',
                borderRadius: '12px',
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxWidth: '300px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                position: 'relative'
              }}
              onClick={() => setIsEditingDraft(true)}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPastedDraft(""); }}
                style={{
                  position: "absolute", top: "5px", right: "5px",
                  background: "transparent", color: "#94a3b8",
                  border: "none", cursor: "pointer", fontSize: "1.2rem", lineHeight: 1
                }}
              >
                ✕
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <strong style={{ fontSize: '0.9rem', color: '#1e4063' }}>Pasted content (Draft)</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pastedDraft.substring(0, 60)}...
              </p>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {(new Blob([pastedDraft]).size / 1024).toFixed(2)} KB • {pastedDraft.split('\n').length} lines
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "10px" }}>
          <input
            type="text"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              color: "var(--text-primary)",
            }}
            value={inputValue}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (text && text.length > 300) {
                e.preventDefault();
                setPastedDraft((prev) => prev ? prev + "\n\n" + text : text);
              }
            }}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question or paste text..."
          />

          <button
            type="submit"
            disabled={(!inputValue.trim() && !pastedDraft.trim()) || isLoading}
            style={{
              background: (inputValue.trim() || pastedDraft.trim()) ? "#1e4063" : "#e0e0e0",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: (inputValue.trim() || pastedDraft.trim()) ? "pointer" : "not-allowed",
              flexShrink: 0
            }}
          >
            ➤
          </button>
        </div>
      </form>

      {/* Modal for Expanded Text */}
      {expandedText && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
          onClick={() => setExpandedText(null)}
        >
          <div
            style={{
              background: "#1e293b",
              color: "#f8fafc",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              border: "1px solid #334155"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "600" }}>Pasted content</h3>
                <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  {(new Blob([expandedText]).size / 1024).toFixed(2)} KB • {expandedText.split('\n').length} lines
                </span>
              </div>
              <button
                onClick={() => setExpandedText(null)}
                style={{
                  background: "transparent", border: "1px solid #475569", borderRadius: "8px", 
                  width: "32px", height: "32px", color: "#94a3b8", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "1.5rem", overflowY: "auto", fontSize: "0.95rem", lineHeight: "1.6", whiteSpace: "pre-wrap", fontFamily: "monospace", color: "#cbd5e1" }}>
              {expandedText}
            </div>
          </div>
        </div>
      )}

      {/* Modal for Editing Pasted Draft */}
      {isEditingDraft && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
          onClick={() => setIsEditingDraft(false)}
        >
          <div
            style={{
              background: "#1e293b",
              color: "#f8fafc",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "800px",
              height: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              border: "1px solid #334155"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "600" }}>Edit Pasted Draft</h3>
              </div>
              <button
                onClick={() => setIsEditingDraft(false)}
                style={{
                  background: "var(--accent-primary)", border: "none", borderRadius: "8px", 
                  padding: "0.5rem 1rem", color: "white", cursor: "pointer", fontWeight: "500"
                }}
              >
                Done
              </button>
            </div>
            <div style={{ flex: 1, padding: "0" }}>
              <textarea
                value={pastedDraft}
                onChange={(e) => setPastedDraft(e.target.value)}
                style={{
                  width: "100%",
                  height: "100%",
                  background: "transparent",
                  color: "#cbd5e1",
                  border: "none",
                  padding: "1.5rem",
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                  fontFamily: "monospace",
                  outline: "none",
                  resize: "none"
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
