import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Loader2, ChevronDown, Paperclip, Zap, Layout, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uiStore } from '../../state/ui.store';
import { AIClient } from '../../ai/ai.client';
import { getEnvConfig, getApiKey } from '../../config/env.config';
import './AIModal.css';

import { Plus, Trash2, Check, X as XIcon } from 'lucide-react';
import { canvasStore } from '../../state/canvas.store';
import { generateId } from '../../utils/id';

interface CanvasAction {
    type: 'add_node' | 'remove_node' | 'add_edge' | 'remove_edge';
    data: any;
    status: 'pending' | 'confirmed' | 'rejected';
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
    action?: CanvasAction;
}

export const AIModal: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hey! 👋\n\nI'm **Alice Gem** — your AI assistant. I'm here to help you brainstorm and organize your canvas.\n\nYou can ask me to:\n- Generate ideas for a new project\n- Summarize your notes\n- Create a project timeline\n- Analyze your brainstorm structure"
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    useEffect(() => {
        const unsubscribe = uiStore.subscribe(state => {
            setIsVisible(state.activeModal === 'ai');
        });
        return () => unsubscribe();
    }, []);

    const parseAction = (text: string): { content: string; action?: CanvasAction } => {
        const actionRegex = /<canvas_action>([\s\S]*?)<\/canvas_action>/;
        const match = text.match(actionRegex);

        if (match) {
            try {
                const actionData = JSON.parse(match[1]);
                return {
                    content: text.replace(actionRegex, '').trim(),
                    action: { ...actionData, status: 'pending' }
                };
            } catch (e) {
                console.error('Failed to parse action JSON', e);
            }
        }

        return { content: text };
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
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

            const currentNodes = canvasStore.getState().nodes;
            const currentEdges = canvasStore.getState().edges;
            const canvasContext = `Current Canvas State:
Nodes: ${JSON.stringify(currentNodes.map(n => ({ id: n.id, title: n.data.title || n.data.content?.substring(0, 20) })))}
Edges: ${JSON.stringify(currentEdges.map(e => ({ source: e.source, target: e.target, label: e.label })))}`;

            const systemPrompt = `You are Alice Gem, a professional AI assistant for a brainstorm canvas application. 
You can suggest actions to modify the canvas by including a <canvas_action> block in your response.
Example for adding a node:
<canvas_action>
{
  "type": "add_node",
  "data": { "title": "New Node", "content": "Node description", "badge": "AI Suggestion" }
}
</canvas_action>

Example for deleting a node:
<canvas_action>
{
  "type": "remove_node",
  "data": { "id": "node_id" }
}
</canvas_action>

Example for adding a connection:
<canvas_action>
{
  "type": "add_edge",
  "data": { "source": "node_a", "target": "node_b", "label": "connection" }
}
</canvas_action>

${canvasContext}

Always provide creative, structured, and helpful responses. Use markdown for better formatting. 
When suggesting an action, explain why you think it's helpful and Wait for user confirmation.
You can only suggest ONE action at a time.`;

            const response = await client.complete(userMessage, systemPrompt);
            const { content, action } = parseAction(response.content);

            setMessages(prev => [...prev, { role: 'assistant', content, action }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleActionConfirm = (index: number) => {
        const message = messages[index];
        if (!message || !message.action || message.action.status !== 'pending') return;

        const { type, data } = message.action;

        try {
            if (type === 'add_node') {
                canvasStore.addNode({
                    id: generateId('node_'),
                    type: 'markdown',
                    position: { x: 100, y: 100 },
                    data: { ...data, status: 'Suggested' },
                    width: 320,
                    height: 180
                });
            } else if (type === 'remove_node') {
                canvasStore.removeNode(data.id);
            } else if (type === 'add_edge') {
                canvasStore.addEdge({
                    id: generateId('edge_'),
                    source: data.source,
                    target: data.target,
                    label: data.label
                });
            } else if (type === 'remove_edge') {
                canvasStore.removeEdge(data.id);
            }

            const newMessages = [...messages];
            newMessages[index] = {
                ...message,
                action: { ...message.action, status: 'confirmed' }
            };
            setMessages(newMessages);
        } catch (e) {
            console.error('Failed to execute action', e);
        }
    };

    const handleActionReject = (index: number) => {
        const message = messages[index];
        if (!message || !message.action || message.action.status !== 'pending') return;

        const newMessages = [...messages];
        newMessages[index] = {
            ...message,
            action: { ...message.action, status: 'rejected' }
        };
        setMessages(newMessages);
    };

    if (!isVisible) return null;

    return (
        <div className="ai-modal-container">
            <div className="ai-modal-header">
                <button className="history-btn">
                    History <ChevronDown size={14} />
                </button>
                <button className="expand-btn">
                    <Layout size={14} />
                </button>
                <button className="close-btn" onClick={() => uiStore.setState({ activeModal: null })}>
                    <X size={18} />
                </button>
            </div>

            <div className="ai-chat-body">
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-line ${msg.role}`}>
                        {msg.role === 'assistant' ? (
                            <div className="assistant-message">
                                <div className="assistant-name">
                                    <Sparkles size={12} fill="var(--accent-color)" stroke="var(--accent-color)" />
                                    <span>Alice Gem</span>
                                </div>
                                <div className="message-bubble">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>

                                {msg.action && (
                                    <div className={`action-request-card ${msg.action.status}`}>
                                        <div className="action-header">
                                            {msg.action.type === 'add_node' ? <Plus size={16} /> : <Trash2 size={16} />}
                                            <span>{msg.action.type.replace('_', ' ')}</span>
                                        </div>
                                        <div className="action-details">
                                            {msg.action.type === 'add_node' && (
                                                <div className="node-preview">
                                                    <strong>{msg.action.data.title}</strong>
                                                    <p>{msg.action.data.content?.substring(0, 50)}...</p>
                                                </div>
                                            )}
                                            {msg.action.type === 'remove_node' && (
                                                <div className="node-preview">
                                                    <span>Remove node ID: {msg.action.data.id}</span>
                                                </div>
                                            )}
                                            {(msg.action.type === 'add_edge' || msg.action.type === 'remove_edge') && (
                                                <div className="edge-preview">
                                                    <span>{msg.action.data.source} → {msg.action.data.target}</span>
                                                </div>
                                            )}
                                        </div>
                                        {msg.action.status === 'pending' ? (
                                            <div className="action-btns">
                                                <button className="confirm-btn" onClick={() => handleActionConfirm(i)}>
                                                    <Check size={14} /> Confirm
                                                </button>
                                                <button className="reject-btn" onClick={() => handleActionReject(i)}>
                                                    <XIcon size={14} /> Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="action-status-label">
                                                {msg.action.status === 'confirmed' ? 'Action executed' : 'Action declined'}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="message-actions">
                                    <button><ThumbsUp size={14} /></button>
                                    <button><ThumbsDown size={14} /></button>
                                    <button><RotateCcw size={14} /></button>
                                </div>
                            </div>
                        ) : (
                            <div className="user-message">
                                <div className="message-bubble">
                                    {msg.content}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {isTyping && (
                    <div className="chat-line assistant">
                        <div className="assistant-message">
                            <div className="assistant-name">
                                <Loader2 size={12} className="spin" />
                                <span>Alice Gem is thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="ai-modal-footer">
                <div className="input-label">Ask anything</div>
                <div className="input-wrapper">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Ask Alice anything..."
                        autoFocus
                    />
                    <div className="input-actions-bar">
                        <div className="left-actions">
                            <button><Paperclip size={14} /> Attach</button>
                            <button><Zap size={14} /> Shortcuts</button>
                        </div>
                        <div className="right-actions">
                            <span className="model-info">Mistral 3.6 (beta)</span>
                            <button className="send-btn" onClick={handleSend} disabled={!input.trim() || isTyping}>
                                <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
