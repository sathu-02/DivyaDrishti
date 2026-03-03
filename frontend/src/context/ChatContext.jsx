import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

const initialMessages = [
  {
    id: 1,
    text: "Hello! I am Divya Drishti AI.",
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
