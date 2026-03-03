import { useState, useRef, useEffect } from "react";
import API from "../api";
import { useChat } from "../context/ChatContext";


export default function ChatInterface() {
 const { messages, setMessages } = useChat();
  const [isLoading, setIsLoading] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

 const handleSubmit = async (e) => {
   e.preventDefault();
   if (!inputValue.trim() || isLoading) return;

   const userMessage = inputValue;

   setMessages((prev) => [
     ...prev,
     { id: Date.now(), text: userMessage, sender: "user" },
   ]);

   setInputValue("");
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
            className={`chat-bubble-wrapper ${
              msg.sender === "user" ? "user-wrapper" : "ai-wrapper"
            }`}
          >
            {msg.sender === "ai" && <div className="avatar ai-avatar">AI</div>}

            <div
              className={`chat-bubble ${
                msg.sender === "user" ? "bubble-user" : "bubble-ai"
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
                    <img
                      src={msg.visualization.data.url}
                      alt="Visualization"
                      style={{
                        maxWidth: "100%",
                        borderRadius: "10px",
                      }}
                    />
                  )}
                </>
              ) : msg.loading ? (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                msg.text
              )}
            </div>

            {msg.sender === "user" && (
              <div className="avatar user-avatar">U</div>
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
          alignItems: "center",
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
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question or upload a PDF..."
        />

        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          style={{
            background: inputValue.trim() ? "#1e4063" : "#e0e0e0",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            cursor: inputValue.trim() ? "pointer" : "not-allowed",
          }}
        >
          ➤
        </button>
      </form>
    </div>
  );
}
