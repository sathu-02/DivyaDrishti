import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

const initialMessages = [
  {
    id: 1,
    text: "Hello! I'm DivyaDhrishti AI \ud83d\udc4b\n\nI can help you:\n\u2022 \ud83d\udcca Visualize data from your text, documents, or pasted content\n\u2022 \ud83d\udcc4 Upload PDF, DOCX, DOC, or TXT files (max 5 MB) \u2014 just click the \ud83d\udcce button or drag & drop\n\u2022 \ud83c\udfa4 Use voice input with the mic button\n\u2022 \ud83d\udcc8 Generate insightful charts, graphs, and diagrams\n\nWhat would you like to explore today?",
    sender: "ai",
  },
];

export function ChatProvider({ children }) {
  const { user } = useAuth();

  const [messages, setMessages] = useState(initialMessages);

  // 🔥 Auto reset chat when user logs out
  useEffect(() => {
    if (!user) {
      setMessages(initialMessages);
    }
  }, [user]);

  return (
    <ChatContext.Provider value={{ messages, setMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);
