import { useState, useRef, useEffect, useCallback } from "react";
import API from "../api";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import ImageModal from "./ImageModal";

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
  const [expandedImage, setExpandedImage] = useState(null);
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
          text: "We encountered an issue while generating your analysis. Please try submitting your request again.",
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
        { id: Date.now(), text: `❌ File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum allowed is ${MAX_FILE_SIZE_MB} MB.`, sender: "ai" },
      ]);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress for UX (real progress via onUploadProgress)
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: `📎 Uploading: ${file.name} (${(file.size / 1024).toFixed(0)} KB)...`, sender: "user" },
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
                        onClick={() => setExpandedImage(msg.visualization.data.url)}
                        style={{
                          maxWidth: "100%",
                          borderRadius: "10px",
                          cursor: "pointer",
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
                  <span className="render-text">Analyzing...</span>
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
                        gap: '6px',
                        marginTop: '12px',
                        padding: '6px 14px',
                        border: speakingMsgId === msg.id
                          ? '1px solid rgba(251, 113, 133, 0.3)'
                          : ttsLoading === msg.id
                            ? '1px solid rgba(251, 191, 36, 0.3)'
                            : '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '20px',
                        cursor: ttsLoading === msg.id ? 'wait' : 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s ease',
                        background: speakingMsgId === msg.id
                          ? 'linear-gradient(135deg, rgba(251, 113, 133, 0.1), rgba(225, 29, 72, 0.05))'
                          : ttsLoading === msg.id
                            ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(217, 119, 6, 0.05))'
                            : 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(59, 130, 246, 0.05))',
                        color: speakingMsgId === msg.id ? '#e11d48'
                          : ttsLoading === msg.id ? '#d97706'
                            : '#0369a1',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                      }}
                      onMouseOver={(e) => {
                        if (speakingMsgId !== msg.id && ttsLoading !== msg.id) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(59, 130, 246, 0.1))';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 10px rgba(56, 189, 248, 0.15)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (speakingMsgId !== msg.id && ttsLoading !== msg.id) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(59, 130, 246, 0.05))';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
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
          backgroundColor: "#ffffff",
          borderRadius: "32px",
          border: "1px solid rgba(0,0,0,0.06)",
          padding: "0.8rem 1.4rem",
          boxShadow: "0 12px 40px -12px rgba(0,0,0,0.1), 0 4px 12px -4px rgba(0,0,0,0.05)",
          marginBottom: "0.5rem"
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

        <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "12px" }}>
          {/* Upload Button — LEFT */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title={`Upload file (PDF, DOCX, DOC, TXT) • Max ${MAX_FILE_SIZE_MB}MB`}
            style={{
              background: isUploading ? 'rgba(251, 191, 36, 0.12)' : 'rgba(241, 245, 249, 0.8)',
              color: isUploading ? '#d97706' : '#64748b',
              border: 'none',
              borderRadius: '50%', width: '40px', height: '40px',
              cursor: isUploading ? 'wait' : 'pointer',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={e => { if (!isUploading) { e.currentTarget.style.background = 'rgba(226, 232, 240, 1)'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
            onMouseOut={e => { if (!isUploading) { e.currentTarget.style.background = 'rgba(241, 245, 249, 0.8)'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; } }}
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
              background: "transparent", padding: "0.2rem 0.5rem",
              fontSize: "1.05rem", color: "#0f172a", fontWeight: "400",
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
              background: isListening ? "#ef4444" : "rgba(241, 245, 249, 0.8)",
              color: isListening ? "white" : "#64748b",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              animation: isListening ? "pulse-mic 1.5s ease-in-out infinite" : "none",
            }}
            onMouseOver={e => { if (!isListening) { e.currentTarget.style.background = 'rgba(226, 232, 240, 1)'; e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
            onMouseOut={e => { if (!isListening) { e.currentTarget.style.background = 'rgba(241, 245, 249, 0.8)'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.transform = 'scale(1)'; } }}
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
              background: (inputValue.trim() || pastedDraft.trim()) ? "linear-gradient(135deg, #0f172a, #1e293b)" : "#f1f5f9",
              color: (inputValue.trim() || pastedDraft.trim()) ? "white" : "#cbd5e1",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: (inputValue.trim() || pastedDraft.trim()) ? "pointer" : "not-allowed",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: (inputValue.trim() || pastedDraft.trim()) ? "0 4px 12px rgba(15, 23, 42, 0.2)" : "none",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: (inputValue.trim() || pastedDraft.trim()) ? "scale(1.05)" : "scale(1)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translateX(1px)" }}>
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>

        {/* Animations & Scrollbars */}
        <style>{`
          @keyframes pulse-mic {
            0%, 100% { box-shadow: 0 0 0 0 rgba(251, 113, 133, 0.4); }
            50% { box-shadow: 0 0 0 10px rgba(251, 113, 133, 0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .premium-scrollbar::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .premium-scrollbar::-webkit-scrollbar-track {
            background: transparent;
            margin: 4px;
          }
          .premium-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.3);
            border-radius: 10px;
          }
          .premium-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(148, 163, 184, 0.5);
          }
        `}</style>
      </form>

      {/* Modal for Expanded Text */}
      {expandedText && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(8px)",
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
              background: "linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))",
              backdropFilter: "blur(12px)",
              color: "#f8fafc",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "850px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "600", letterSpacing: "0.2px" }}>Raw Data Context</h3>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>
                    {(new Blob([expandedText]).size / 1024).toFixed(2)} KB • {expandedText.split('\n').length} lines
                  </span>
                </div>
              </div>
              <button
                onClick={() => setExpandedText(null)}
                style={{
                  background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "50%",
                  width: "32px", height: "32px", color: "#cbd5e1", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s"
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; e.currentTarget.style.color = "#ef4444"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#cbd5e1"; }}
              >
                ✕
              </button>
            </div>
            <div className="premium-scrollbar" style={{ padding: "1.5rem", flex: 1, minHeight: 0, overflowY: "auto", fontSize: "0.95rem", lineHeight: "1.7", whiteSpace: "pre-wrap", fontFamily: "'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', monospace", color: "#e2e8f0" }}>
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
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(8px)",
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
              background: "linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))",
              backdropFilter: "blur(12px)",
              color: "#f8fafc",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "850px",
              height: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "1.2rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(52, 211, 153, 0.1)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "600", letterSpacing: "0.2px" }}>Edit Draft Context</h3>
                </div>
              </div>
              <button
                onClick={() => setIsEditingDraft(false)}
                style={{
                  background: "linear-gradient(135deg, #38bdf8, #3b82f6)", border: "none", borderRadius: "10px",
                  padding: "0.6rem 1.2rem", color: "white", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem",
                  boxShadow: "0 4px 12px rgba(56, 189, 248, 0.3)", transition: "transform 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                Save & Close
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: "0", display: "flex" }}>
              <textarea
                className="premium-scrollbar"
                value={pastedDraft}
                onChange={(e) => setPastedDraft(e.target.value)}
                style={{
                  width: "100%",
                  height: "100%",
                  flex: 1,
                  background: "transparent",
                  color: "#e2e8f0",
                  border: "none",
                  padding: "1.5rem",
                  fontSize: "0.95rem",
                  lineHeight: "1.7",
                  fontFamily: "'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', monospace",
                  outline: "none",
                  resize: "none"
                }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Modal for Expanded Image */}
      {expandedImage && (
        <ImageModal
          imageUrl={expandedImage}
          onClose={() => setExpandedImage(null)}
        />
      )}
    </div>
  );
}
