import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

export default function Chat() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async () => {
    if (!input.trim()) return;

    // 1. Create the user message object
    const userMsg = { role: 'user', text: input };
    
    // 2. Clear input immediately for better UX
    const currentInput = input;
    // Capture history before we mutate, take last 5
    const history = messages.slice(-5);
    setInput('');

    // 3. Update UI with user message first
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
        // 4. Call the Node.js backend
        const res = await api.post('/ai/ask', { query: currentInput, history });
        
        // 5. Append the bot response to whatever the messages are at that moment
        const answer = res.data.answer || (res.data && typeof res.data === 'string' ? res.data : "I found some info for you.");
        const actions = res.data.actions || [];
        
        setMessages(prev => [...prev, { role: 'bot', text: answer, actions }]);
    } catch (err) {
        setMessages(prev => [...prev, { role: 'bot', text: "Assistant is currently offline." }]);
    } finally {
        setIsLoading(false);
    }
};
    const handleAction = (action) => {
        if (action.type === 'link' && action.url) {
            window.open(action.url, '_blank');
        } else if (action.type === 'calendar') {
            const title = encodeURIComponent(action.event_title || 'Event');
            const details = encodeURIComponent(action.event_details || '');
            const loc = encodeURIComponent(action.event_location || '');
            let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${loc}`;
            window.open(url, '_blank');
        }
    };

    return (
        <div className="chat-window glass-panel">
            <div className="chat-header">
                <h2>AI Core Assistant</h2>
            </div>
            <div className="messages">
                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                        <div className="message-content">{m.text}</div>
                        {m.actions && m.actions.length > 0 && (
                            <div className="message-actions" style={{marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                {m.actions.map((act, actIdx) => (
                                    <button 
                                        key={actIdx} 
                                        onClick={() => handleAction(act)}
                                        className="btn-secondary"
                                        style={{fontSize: '0.8rem', padding: '6px 12px'}}
                                    >
                                        {act.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="message bot">
                        <div className="typing-indicator" style={{ display: 'flex', gap: '4px', padding: '6px' }}>
                            <span style={{ width: '6px', height: '6px', background: '#888', borderRadius: '50%', animation: 'float 1s infinite alternate' }}></span>
                            <span style={{ width: '6px', height: '6px', background: '#888', borderRadius: '50%', animation: 'float 1s infinite alternate 0.3s' }}></span>
                            <span style={{ width: '6px', height: '6px', background: '#888', borderRadius: '50%', animation: 'float 1s infinite alternate 0.6s' }}></span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
            <div className="chat-input-area">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask about Campus rules or Academic details..." />
                <button onClick={handleSend} className="chat-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>
        </div>
    );
}