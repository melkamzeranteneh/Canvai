import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Loader2, Paperclip, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uiStore } from '../../state/ui.store';
import { AIClient } from '../../ai/ai.client';
import { getEnvConfig, getApiKey } from '../../config/env.config';
import { buildFileContext, runLangaGraphCapabilityTest, runLangaGraphEdit } from '../../ai/langraph';
import './AIModal.css';

import { Plus, Trash2, Check, X as XIcon } from 'lucide-react';
import { canvasStore } from '../../state/canvas.store';
import { generateId } from '../../utils/id';
import { saveGraphToLocalStorage, applyImportedGraph } from '../../notes/storage/graph';
import { loadingToast, toast } from '../../utils/toast';
import { ScrollArea } from '@/ui/shadcn/components/ui/scroll-area';
import { Badge } from '@/ui/shadcn/components/ui/badge';

interface CanvasAction {
    type: 'add_node' | 'remove_node' | 'add_edge' | 'remove_edge';
    data: any;
    status: 'pending' | 'confirmed' | 'rejected';
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
    // support single or multiple actions
    action?: CanvasAction | CanvasAction[];
    jsonUpdate?: any;
}

interface UploadedFileContext {
    name: string;
    type: string;
    content: string;
}

interface AIModalProps {
    forceVisible?: boolean;
    embedded?: boolean;
}

export const AIModal: React.FC<AIModalProps> = ({ forceVisible = false, embedded = false }) => {
    const [isVisible, setIsVisible] = useState(() => uiStore.getState().activeModal === 'ai');
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hey! 👋\n\nI'm **Alice Gem** — your AI assistant. I'm here to help you brainstorm and organize your canvas.\n\nYou can ask me to:\n- Generate ideas for a new project\n- Summarize your notes\n- Create a project timeline\n- Analyze your brainstorm structure"
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [uploadedFile, setUploadedFile] = useState<UploadedFileContext | null>(null);
    const [isRunningTest, setIsRunningTest] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Content server endpoint used in dev: write/read Content.json
    const CONTENT_URL = '/api/content';

    const loadContentFromServer = async () => {
        try {
            const res = await fetch(CONTENT_URL);
            if (!res.ok) return;
            const data = await res.json();
            // apply to canvas if it looks like a canvas state
            if (data && (data.nodes || data.edges)) {
                canvasStore.setState({ nodes: data.nodes ?? [], edges: data.edges ?? [] });
            }
        } catch (e) {
            // ignore network errors in dev
        }
    };

    const saveContentToServer = async (obj: any) => {
        try {
            await fetch(CONTENT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(obj),
            });
        } catch (e) {
            console.error('Failed to save content to server', e);
        }
    };

    useEffect(() => {
        // On mount, attempt to load Content.json from local server
        loadContentFromServer();
    }, []);

    useEffect(() => {
        const unsubscribe = uiStore.subscribe(state => {
            console.log('AIModal: uiStore activeModal =', state.activeModal);
            setIsVisible(state.activeModal === 'ai');
        });
        return () => unsubscribe();
    }, []);

    const parseAction = (text: string): { content: string; action?: CanvasAction | CanvasAction[]; jsonUpdate?: any } => {
        const actionRegex = /<canvas_action>([\s\S]*?)<\/canvas_action>/g;
        const jsonRegex = /<json_update>([\s\S]*?)<\/json_update>/g;
        const matches = Array.from(text.matchAll(actionRegex));
        const actions: CanvasAction[] = [];

        let cleaned = text;
        for (const m of matches) {
            try {
                const actionData = JSON.parse(m[1]);
                actions.push({ ...actionData, status: 'pending' });
                cleaned = cleaned.replace(m[0], '');
            } catch (e) {
                console.error('Failed to parse action JSON', e);
            }
        }

        // parse json_update block if present
        const jsonMatch = jsonRegex.exec(text);
        let parsedJson: any = undefined;
        if (jsonMatch) {
            try {
                parsedJson = JSON.parse(jsonMatch[1]);
                cleaned = cleaned.replace(jsonMatch[0], '');
            } catch (e) {
                console.error('Failed to parse json_update', e);
            }
        }

        const result: { content: string; action?: CanvasAction | CanvasAction[]; jsonUpdate?: any } = { content: cleaned.trim() };
        if (actions.length === 1) result.action = actions[0];
        if (actions.length > 1) result.action = actions;
        if (parsedJson !== undefined) result.jsonUpdate = parsedJson;
        return result;
    };

    const createAIClient = () => {
        const envConfig = getEnvConfig();
        const apiKey = getApiKey(envConfig.activeProvider);
        if (!apiKey) {
            throw new Error(`API key for ${envConfig.activeProvider} is not set in .env file.`);
        }

        return new AIClient({
            provider: envConfig.activeProvider,
            apiKey,
            model: envConfig.defaultModel,
        });
    };

    const readFileAsText = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsText(file);
        });

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await readFileAsText(file);
            const content = text.slice(0, 12000);
            const context: UploadedFileContext = {
                name: file.name,
                type: file.type,
                content,
            };

            setUploadedFile(context);
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: `Loaded file **${file.name}** (${Math.round(file.size / 1024)} KB). I will use it as context for analysis and edits.`,
                },
            ]);

            const client = createAIClient();
            const analysis = await client.complete(
                `Analyze this file and provide:\n1) 5 key insights\n2) data quality risks\n3) suggested canvas structure\n\n${buildFileContext(context.name, context.type, context.content)}`,
                'You are a concise analyst. Return markdown with short sections.'
            );

            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: `### File Analysis: ${context.name}\n\n${analysis.content}`,
                },
            ]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error loading file: ${error.message}` }]);
        } finally {
            event.target.value = '';
        }
    };

    const handleRunCapabilityTest = async () => {
        if (isTyping || isRunningTest) return;
        setIsRunningTest(true);

        try {
            const client = createAIClient();
            const report = await runLangaGraphCapabilityTest(client, JSON.stringify(canvasStore.getState()));
            setMessages(prev => [...prev, { role: 'assistant', content: `### Langraph Test Report\n\n${report}` }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Capability test failed: ${error.message}` }]);
        } finally {
            setIsRunningTest(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setIsTyping(true);

        try {
            const client = createAIClient();

            // Prefer the disk-backed Content.json if available so AI and editor operate on same source of truth
            let fullCanvasJson: string | null = null;
            try {
                const resp = await fetch(CONTENT_URL);
                if (resp.ok) fullCanvasJson = await resp.text();
            } catch (e) {
                // ignore network error and fall back
            }

            const loader = loadingToast('Alice is thinking...');
            if (!fullCanvasJson) fullCanvasJson = JSON.stringify(canvasStore.getState());
            const fileContext = uploadedFile
                ? buildFileContext(uploadedFile.name, uploadedFile.type, uploadedFile.content)
                : undefined;
            const response = await runLangaGraphEdit(client, userMessage, fullCanvasJson, fileContext);
            const { content, action, jsonUpdate } = parseAction(response.content);

            setMessages(prev => {
                const next: Message[] = [...prev, { role: 'assistant', content, action, jsonUpdate }];
                return next;
            });

            // If AI provided a JSON update block, attempt to apply it immediately and update editor
            if (jsonUpdate) {
                try {
                    // If JSON looks like full canvas state
                    if (jsonUpdate && typeof jsonUpdate === 'object' && ('nodes' in jsonUpdate || 'edges' in jsonUpdate)) {
                        // If nodes have missing positions, apply a horizontal auto-layout
                        const nodes = Array.isArray(jsonUpdate.nodes) ? jsonUpdate.nodes : [];
                        const edges = Array.isArray(jsonUpdate.edges) ? jsonUpdate.edges : [];
                        const needLayout = nodes.length > 0 && nodes.some((n: any) => !n.position || (n.position.x === 0 && n.position.y === 0));
                        if (needLayout) {
                            let x = 100;
                            const gap = 40;
                            nodes.forEach((n: any) => {
                                const w = n.width ?? 320;
                                n.position = { x, y: n.position?.y ?? 100 };
                                x += w + gap;
                            });
                            // If no edges provided, connect sequentially left -> right
                            if (!edges || edges.length === 0) {
                                for (let i = 0; i < nodes.length - 1; i++) {
                                    edges.push({ id: generateId('edge_'), source: nodes[i].id, target: nodes[i + 1].id, label: '' });
                                }
                            }
                            jsonUpdate.nodes = nodes;
                            jsonUpdate.edges = edges;
                        }

                        canvasStore.setState({ nodes: jsonUpdate.nodes ?? [], edges: jsonUpdate.edges ?? [] });
                        saveGraphToLocalStorage();
                        // persist updated canvas back to Content.json
                        saveContentToServer(jsonUpdate);
                        toast.success({ title: 'AI updated canvas JSON (applied)' });
                    } else {
                        // Try import format
                        const ok = applyImportedGraph(jsonUpdate);
                        if (ok) {
                            // persist imported format as well
                            saveContentToServer(jsonUpdate);
                            toast.success({ title: 'AI updated graph (import applied)' });
                        } else {
                            // If not importable, keep canvas unchanged and notify user.
                            toast.info({ title: 'AI provided JSON (review in editor)' });
                        }
                    }
                } catch (e) {
                    console.error('Failed to apply AI json_update', e);
                    toast.error({ title: 'Failed to apply AI JSON update' });
                }
            }
            loader.close?.();
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
            toast.error({ title: 'AI request failed' });
        } finally {
            setIsTyping(false);
        }
    };

    const handleActionConfirm = (index: number) => {
        const message = messages[index];
        if (!message || !message.action) return;

        // Execute the action(s) and mark the message as confirmed
        executeCanvasAction(message.action, index);
    };

    // Execute an action programmatically (used to auto-apply AI suggestions)
    const executeCanvasAction = (action: CanvasAction | CanvasAction[], markIndex?: number) => {
        try {
            const toApply = Array.isArray(action) ? action : [action];
            // Place new nodes to the right of existing canvas nodes and arrange horizontally
            const existing = canvasStore.getState().nodes || [];
            const existingRight = existing.length ? Math.max(...existing.map(n => (n.position?.x ?? 0) + (n.width ?? 320))) : 0;
            const gap = 40;
            const createdIds: string[] = [];
            let nextX = existingRight + gap;

            toApply.forEach(a => {
                const { type, data } = a;
                if (type === 'add_node') {
                    const id = data.id || generateId('node_');
                    const w = data.width || 320;
                    const h = data.height || 160;
                    const pos = { x: nextX, y: data.position?.y ?? 100 };
                    canvasStore.addNode({ id, type: 'markdown', position: pos, width: w, height: h, data: { ...data, status: 'Suggested' } });
                    createdIds.push(id);
                    nextX += w + gap;
                } else if (type === 'remove_node') {
                    canvasStore.removeNode(data.id);
                } else if (type === 'add_edge') {
                    // ensure edge direction is left -> right by checking positions
                    const source = data.source;
                    const target = data.target;
                    canvasStore.addEdge({ id: generateId('edge_'), source, target, label: data.label });
                } else if (type === 'remove_edge') {
                    canvasStore.removeEdge(data.id);
                }
            });

            // If multiple nodes were created in this batch, connect them sequentially left->right
            if (createdIds.length > 1) {
                for (let i = 0; i < createdIds.length - 1; i++) {
                    const s = createdIds[i];
                    const t = createdIds[i + 1];
                    canvasStore.addEdge({ id: generateId('edge_'), source: s, target: t, label: '' });
                }
            }

            saveGraphToLocalStorage();
            toast.success({ title: 'AI actions applied' });

            if (typeof markIndex === 'number') {
                const newMessages = [...messages];
                const msg = newMessages[markIndex];
                if (msg) {
                    if (Array.isArray(msg.action)) {
                        newMessages[markIndex] = { ...msg, action: msg.action.map(a => ({ ...a, status: 'confirmed' })) };
                    } else if (msg.action) {
                        newMessages[markIndex] = { ...msg, action: { ...(msg.action as CanvasAction), status: 'confirmed' } };
                    }
                    setMessages(newMessages);
                }
            }
        } catch (err) {
            console.error('executeCanvasAction error', err);
        }
    };

    const handleActionReject = (index: number) => {
        const message = messages[index];
        if (!message || !message.action) return;

        const newMessages = [...messages];
        if (Array.isArray(message.action)) {
            newMessages[index] = { ...message, action: message.action.map(a => ({ ...a, status: 'rejected' })) };
        } else {
            newMessages[index] = { ...message, action: { ...(message.action as CanvasAction), status: 'rejected' } };
        }
        setMessages(newMessages);
    };

    if (!isVisible && !forceVisible) return null;

    return (
        <div className={`ai-modal-container ${embedded ? 'embedded' : ''}`}>
            <div className="ai-modal-header">
                <div style={{ fontWeight: 600 }}>Alice Gem</div>
                <button className="close-btn" onClick={() => uiStore.setState({ activeModal: null })}>
                    <X size={18} />
                </button>
            </div>

            <div className="ai-chat-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <ScrollArea className="flex-1 px-4">
                    <div className="py-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={`chat-line ${msg.role}`}>
                                {msg.role === 'assistant' ? (
                                    <div className="assistant-message">
                                        <div className="assistant-name">
                                            <Badge variant="secondary" className="gap-1 px-2 py-0.5">
                                                <Sparkles size={10} className="text-yellow-500" />
                                                <span>Alice Gem</span>
                                            </Badge>
                                        </div>
                                        <div className="message-bubble">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Support single or multiple actions */}
                                        {msg.action && (Array.isArray(msg.action) ? (
                                            <div className="multi-action-list">
                                                {msg.action.map((a, idx) => (
                                                    <div key={idx} className={`action-request-card ${a.status}`}>
                                                        <div className="action-header">
                                                            {a.type === 'add_node' ? <Plus size={16} /> : <Trash2 size={16} />}
                                                            <span>{a.type.replace('_', ' ')}</span>
                                                        </div>
                                                        <div className="action-details">
                                                            {a.type === 'add_node' && (
                                                                <div className="node-preview">
                                                                    <strong>{a.data.title}</strong>
                                                                    <p>{a.data.content?.substring(0, 50)}...</p>
                                                                </div>
                                                            )}
                                                            {a.type === 'remove_node' && (
                                                                <div className="node-preview">
                                                                    <span>Remove node ID: {a.data.id}</span>
                                                                </div>
                                                            )}
                                                            {(a.type === 'add_edge' || a.type === 'remove_edge') && (
                                                                <div className="edge-preview">
                                                                    <span>{a.data.source} → {a.data.target}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="action-btns">
                                                    <button className="confirm-btn" onClick={() => handleActionConfirm(i)}>
                                                        <Check size={14} /> Confirm All
                                                    </button>
                                                    <button className="reject-btn" onClick={() => handleActionReject(i)}>
                                                        <XIcon size={14} /> Reject All
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`action-request-card ${(msg.action as any).status}`}>
                                                <div className="action-header">
                                                    {(msg.action as any).type === 'add_node' ? <Plus size={16} /> : <Trash2 size={16} />}
                                                    <span>{(msg.action as any).type.replace('_', ' ')}</span>
                                                </div>
                                                <div className="action-details">
                                                    {(msg.action as any).type === 'add_node' && (
                                                        <div className="node-preview">
                                                            <strong>{(msg.action as any).data.title}</strong>
                                                            <p>{(msg.action as any).data.content?.substring(0, 50)}...</p>
                                                        </div>
                                                    )}
                                                    {(msg.action as any).type === 'remove_node' && (
                                                        <div className="node-preview">
                                                            <span>Remove node ID: {(msg.action as any).data.id}</span>
                                                        </div>
                                                    )}
                                                    {(((msg.action as any).type === 'add_edge') || ((msg.action as any).type === 'remove_edge')) && (
                                                        <div className="edge-preview">
                                                            <span>{(msg.action as any).data.source} → {(msg.action as any).data.target}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {(msg.action as any).status === 'pending' ? (
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
                                                        {(msg.action as any).status === 'confirmed' ? 'Action executed' : 'Action declined'}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* message actions removed to simplify UI */}
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
                                        <Badge variant="outline" className="gap-1 px-2 py-0.5 animate-pulse">
                                            <Loader2 size={10} className="spin" />
                                            <span>Alice Gem is thinking...</span>
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
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
                        autoFocus={!embedded}
                    />
                    <div className="input-actions-bar">
                        <div className="left-actions">
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                                accept=".txt,.md,.json,.csv,.ts,.tsx,.js,.jsx,.py,.log"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isTyping || isRunningTest}
                                title="Upload file for analysis"
                            >
                                <Paperclip size={13} />
                                <span>{uploadedFile ? uploadedFile.name : 'Upload'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleRunCapabilityTest}
                                disabled={isTyping || isRunningTest}
                                title="Run Langraph capability test"
                            >
                                <Zap size={13} />
                                <span>{isRunningTest ? 'Testing...' : 'Test AI'}</span>
                            </button>
                        </div>
                        <div className="right-actions">
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
