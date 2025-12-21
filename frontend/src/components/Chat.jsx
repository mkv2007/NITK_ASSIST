import { useState } from 'react';
import api from '../services/api';

export default function Chat() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);

    const handleSend = async () => {
    if (!input.trim()) return;

    // 1. Create the user message object
    const userMsg = { role: 'user', text: input };
    
    // 2. Clear input immediately for better UX
    const currentInput = input;
    setInput('');

    // 3. Update UI with user message first
    setMessages(prev => [...prev, userMsg]);

    try {
        // 4. Call the Node.js backend
        const res = await api.post('/ai/ask', { query: currentInput });
        
        // 5. Append the bot response to whatever the messages are at that moment
        setMessages(prev => [...prev, { role: 'bot', text: res.data.answer }]);
    } catch (err) {
        setMessages(prev => [...prev, { role: 'bot', text: "Assistant is currently offline." }]);
    }
};
    return (
        <div className="chat-window">
            <div className="messages">
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        {m.text}
                    </div>
                ))}
            </div>
            <div className="chat-input-area">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about NITK rules, hostel, etc..." />
                <button onClick={handleSend} className="btn-primary" style={{width: 'auto', padding: '0 20px'}}>Send</button>
            </div>
        </div>
    );
}