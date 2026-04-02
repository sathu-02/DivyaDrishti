import { useState, useRef, useEffect, useCallback } from "react";
import API from "../api";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = [".pdf", ".docx", ".doc", ".txt"];

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100

  // ===== Speech-to-Text (STT) =====
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        if (finalTranscript) {
          setInputValue(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  // ===== Text-to-Speech (Edge Neural TTS via backend) =====
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [ttsLoading, setTtsLoading] = useState(null);
  const audioRef = useRef(null);

  const handleSpeak = useCallback(async (text, msgId) => {
    // If already playing this message, stop it
    if (speakingMsgId === msgId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setSpeakingMsgId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    setTtsLoading(msgId);

    try {
      const response = await API.post("/tts", {
        text: text,
        voice: "en-US-JennyNeural",
      });

      const audioUrl = response.data.audio_url;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setSpeakingMsgId(msgId);
        setTtsLoading(null);
      };
      audio.onended = () => {
        setSpeakingMsgId(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setSpeakingMsgId(null);
        setTtsLoading(null);
        audioRef.current = null;
        console.error("Audio playback failed");
      };

      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setTtsLoading(null);
      setSpeakingMsgId(null);
    }
  }, [speakingMsgId]);

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

  const [isUploading, setIsUploading] = useState(false);

  const processFile = async (file, inputRef) => {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: `❌ Unsupported file: .${ext}. Please upload PDF, DOCX, DOC, or TXT.`, sender: "ai" },
      ]);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: `❌ File too large: ${(file.size/1024/1024).toFixed(1)} MB. Maximum allowed is ${MAX_FILE_SIZE_MB} MB.`, sender: "ai" },
      ]);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress for UX (real progress via onUploadProgress)
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: `📎 Uploading: ${file.name} (${(file.size/1024).toFixed(0)} KB)...`, sender: "user" },
    ]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await API.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      const { text, filename, length, pages } = response.data;
      setPastedDraft((prev) => prev ? prev + "\n\n" + text : text);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: `✅ Extracted text from "${filename}" — ${(length / 1024).toFixed(1)} KB, ~${pages} section(s).\n\n💡 The content is ready in your input area. Add your question or just hit Send to generate visualizations!`,
          sender: "ai",
        },
      ]);
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to process file.';
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: `❌ ${detail}`, sender: "ai" },
      ]);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (inputRef) inputRef.value = "";
    }
  };

  const handleFileSelect = async (e) => {
    await processFile(e.target.files[0], e.target);
  };

  // Drag-and-drop handlers
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    await processFile(file, null);
  };

  return (
    <div
      className="chat-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: "relative" }}
    >
      {/* Drag-over overlay */}
      {isDragOver && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(30,64,99,0.15)",
          border: "2px dashed var(--accent-primary)", borderRadius: "16px",
          zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(2px)",
        }}>
          <div style={{ textAlign: "center", color: "var(--accent-primary)" }}>
            <div style={{ fontSize: "3rem" }}>📂</div>
            <p style={{ fontWeight: "700", fontSize: "1.1rem", margin: "0.5rem 0 0" }}>Drop your file here</p>
            <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>PDF, DOCX, DOC, TXT • Max {MAX_FILE_SIZE_MB}MB</p>
          </div>
        </div>
      )}

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
                <div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {msg.text}
                  </div>
                  {msg.sender === "ai" && msg.text && !msg.loading && (
                    <button
                      onClick={() => handleSpeak(msg.text, msg.id)}
                      disabled={ttsLoading === msg.id}
                      title={speakingMsgId === msg.id ? "Stop" : ttsLoading === msg.id ? "Generating audio..." : "Read aloud"}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '8px',
                        padding: '4px 10px',
                        border: 'none',
                        borderRadius: '20px',
                        cursor: ttsLoading === msg.id ? 'wait' : 'pointer',
                        fontSize: '0.75rem',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s ease',
                        background: speakingMsgId === msg.id
                          ? 'rgba(251, 113, 133, 0.15)'
                          : ttsLoading === msg.id
                          ? 'rgba(251, 191, 36, 0.12)'
                          : 'rgba(30, 64, 99, 0.08)',
                        color: speakingMsgId === msg.id ? '#fb7185'
                          : ttsLoading === msg.id ? '#d97706'
                          : '#64748b',
                      }}
                      onMouseOver={(e) => {
                        if (speakingMsgId !== msg.id && ttsLoading !== msg.id) {
                          e.currentTarget.style.background = 'rgba(30, 64, 99, 0.15)';
                          e.currentTarget.style.color = '#1e4063';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (speakingMsgId !== msg.id && ttsLoading !== msg.id) {
                          e.currentTarget.style.background = 'rgba(30, 64, 99, 0.08)';
                          e.currentTarget.style.color = '#64748b';
                        }
                      }}
                    >
                      {ttsLoading === msg.id ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                        </svg>
                      ) : speakingMsgId === msg.id ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                      )}
                      {ttsLoading === msg.id ? 'Loading...' : speakingMsgId === msg.id ? 'Stop' : 'Listen'}
                    </button>
                  )}
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
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileSelect}
        />

        {/* Upload progress bar */}
        {isUploading && uploadProgress > 0 && (
          <div style={{ padding: "0 0.5rem 0.5rem" }}>
            <div style={{ background: "var(--border-color)", borderRadius: "999px", height: "4px", overflow: "hidden" }}>
              <div style={{
                height: "100%", background: "var(--accent-primary)",
                width: `${uploadProgress}%`, transition: "width 0.3s ease",
                borderRadius: "999px",
              }} />
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0.3rem 0 0", textAlign: "right" }}>
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

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

        <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "8px" }}>
          {/* Upload Button — LEFT */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title={`Upload file (PDF, DOCX, DOC, TXT) • Max ${MAX_FILE_SIZE_MB}MB`}
            style={{
              background: isUploading ? 'rgba(251, 191, 36, 0.12)' : 'transparent',
              color: isUploading ? '#d97706' : '#94a3b8',
              border: isUploading ? 'none' : '1px solid #d1d5db',
              borderRadius: '50%', width: '36px', height: '36px',
              cursor: isUploading ? 'wait' : 'pointer',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={e => { if (!isUploading) { e.currentTarget.style.background = 'rgba(30,64,99,0.1)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}}
            onMouseOut={e => { if (!isUploading) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}}
          >
            {isUploading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            )}
          </button>

          {/* Text Input */}
          <input
            type="text"
            style={{
              flex: 1, border: "none", outline: "none",
              background: "transparent", padding: "0.5rem 0.5rem",
              fontSize: "1rem", color: "var(--text-primary)",
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
            placeholder={isListening ? "🎤 Listening..." : isUploading ? "⏳ Processing file..." : "Ask anything or paste text..."}
          />

          {/* Microphone Button (STT) */}
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Start voice input"}
            style={{
              background: isListening ? "#fb7185" : "transparent",
              color: isListening ? "white" : "#94a3b8",
              border: isListening ? "none" : "1px solid #d1d5db",
              borderRadius: "50%",
              width: "38px",
              height: "38px",
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              animation: isListening ? "pulse-mic 1.5s ease-in-out infinite" : "none",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

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

        {/* Animations */}
        <style>{`
          @keyframes pulse-mic {
            0%, 100% { box-shadow: 0 0 0 0 rgba(251, 113, 133, 0.4); }
            50% { box-shadow: 0 0 0 10px rgba(251, 113, 133, 0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
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
