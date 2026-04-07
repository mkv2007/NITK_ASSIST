import { useState } from 'react';
import api from '../../services/api';
import ChatWindow from './ChatWindow';
import ChatInput from './ChatInput';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);

  const sendMessage = async (input) => {
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await api.post('/ai/ask', { query: input });
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: res.data.answer,
          sources: res.data.sources || []
        }
      ]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Assistant offline', sources: [] }]);
    }
  };

  return (
    <div className="chat-window">
      <ChatWindow messages={messages} />
      <ChatInput onSend={sendMessage} />
    </div>
  );
}
