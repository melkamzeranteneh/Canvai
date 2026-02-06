import React, { useState, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { uiStore } from '../../state/ui.store';
import { AIClient } from '../../ai/ai.client';
import { getEnvConfig, getApiKey } from '../../config/env.config';
import './AIModal.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export const AIModal: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am your AI assistant. How can I help you with your brainstorm today?' }
    ]);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        const unsubscribe = uiStore.subscribe(state => {
            setIsVisible(state.activeModal === 'ai');
        });
        return () => unsubscribe();
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsTyping(true);

        try {
            const envConfig = getEnvConfig();
            const apiKey = getApiKey(envConfig.activeProvider);

            if (!apiKey) {
                throw new Error(`API key for ${envConfig.activeProvider} is not set in .env file.`);
            }

            const client = new AIClient({
                provider: envConfig.activeProvider,
                apiKey: apiKey,
                model: envConfig.defaultModel
            });

            const response = await client.complete(userMessage, "You are a helpful brainstorming assistant. Help the user organize their thoughts and provide creative insights.");

            setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="modal-overlay" onClick={() => uiStore.setState({ activeModal: null })}>
            <div className="modal-content ai-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-title">
                        <Sparkles size={18} className="accent-text" />
                        <h2>AI Assistant</h2>
                    </div>
                    <button onClick={() => uiStore.setState({ activeModal: null })}><X size={20} /></button>
                </div>

                <div className="modal-body chat-container">
                    {messages.map((msg, i) => (
                        <div key={i} className={`chat-message ${msg.role}`}>
                            <div className="message-icon">
                                {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                            </div>
                            <div className="message-content">
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="chat-message assistant">
                            <div className="message-icon">
                                <Loader2 size={16} className="spin" />
                            </div>
                            <div className="message-content typing">
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer chat-input-area">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Type your message..."
                        autoFocus
                    />
                    <button className="send-btn" onClick={handleSend} disabled={!input.trim() || isTyping}>
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
