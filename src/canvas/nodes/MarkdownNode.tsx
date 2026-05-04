import { Handle, Position, type NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIClient } from '../../ai/ai.client';
import { summarizeNoteAgent } from '../../ai/agents';
import {
    Sparkles, Loader2, Trash2,
    FileText, User,
} from 'lucide-react';
import { canvasStore } from '../../state/canvas.store';
import { confirmToast, toast } from '../../utils/toast';
import { getEnvConfig, getApiKey } from '../../config/env.config';
import { useState, useEffect, useCallback } from 'react';
import './Node.css';

/* ─── Types ────────────────────────────────────────────── */
interface NodeData extends Record<string, unknown> {
    content?: string;
    title?: string;
    badge?: string;
    category?: string;
    cardType?: 'ai' | 'main' | 'detail';
}

/* ─── Icon helper ───────────────────────────────────────── */
const CardIcon = ({ type }: { type?: string }) => {
    if (type === 'ai') return <Sparkles size={28} />;
    if (type === 'main') return <FileText size={28} />;
    return <User size={28} />;
};

/* ─── Component ─────────────────────────────────────────── */
export const MarkdownNode = ({ data, id, selected }: NodeProps) => {
    const nd = data as NodeData;

    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(nd.content ?? '');
    const [isAIWorking, setIsAIWorking] = useState(false);

    /* Sync external content changes */
    useEffect(() => { setContent(nd.content ?? ''); }, [nd.content]);

    /* ── Handlers ─────────────────────────────────────── */
    const handleDelete = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        const ok = await confirmToast('Delete this card?', 'Delete', 'Cancel');
        if (ok) canvasStore.removeNode(id);
    }, [id]);

    const handleAI = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        const cfg = getEnvConfig();
        const apiKey = getApiKey(cfg.activeProvider);
        if (!apiKey) return;

        setIsAIWorking(true);
        try {
            const client = new AIClient({ provider: cfg.activeProvider, apiKey, model: cfg.defaultModel });
            const summary = await summarizeNoteAgent(client, content);
            const next = `${content}\n\n> **AI Summary:** ${summary}`;
            setContent(next);
            canvasStore.updateNode(id, { data: { ...nd, content: next } });
            toast.success({ title: 'Summary generated' });
        } catch {
            toast.error({ title: 'AI generation failed' });
        } finally {
            setIsAIWorking(false);
        }
    }, [content, id, nd]);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        canvasStore.updateNode(id, { data: { ...nd, content } });
    }, [content, id, nd]);

    // Simplified node: removed complex add-node UI to avoid buggy behavior

/* ─── Render ───────────────────────────────────────── */
    const type = nd.cardType ?? 'default';

    return (
        <div className={`node google-card ${type} ${selected ? 'selected' : ''}`}>
            {/* ── Header ─────────────────────────────── */}
            <div className="card-header">
                <div className="card-type-icon">
                    <CardIcon type={nd.cardType} />
                </div>
                <div className="header-actions">
                    {nd.badge && <div className="card-badge">{nd.badge}</div>}
                    <button className="card-del-btn" onClick={handleDelete} title="Delete Card">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* ── Body ───────────────────────────────── */}
            <div className="card-body">
                {nd.category && <div className="card-category">{nd.category}</div>}

                {isEditing ? (
                    <div className="nodrag" onMouseDown={e => e.stopPropagation()}>
                        <input
                            className="card-edit-title"
                            value={nd.title ?? ''}
                            placeholder="Title"
                            onChange={e => canvasStore.updateNode(id, { data: { ...nd, title: e.target.value } })}
                            onKeyDown={e => e.key === 'Enter' && setIsEditing(false)}
                            autoFocus
                        />
                        <textarea
                            className="card-edit-body"
                            value={content}
                            placeholder="Note content…"
                            onChange={e => setContent(e.target.value)}
                            onBlur={handleBlur}
                        />
                    </div>
                ) : (
                    <div className="card-content-wrapper" onDoubleClick={() => setIsEditing(true)}>
                        <h3 className="card-title">{nd.title || 'Note'}</h3>
                        <div className="card-content">
                            {content ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                            ) : (
                                <span className="card-hint">Take a note…</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* AI Action Button */}
            <div className="card-ai-action">
                <button 
                    className={`ai-fab ${isAIWorking ? 'working' : ''}`} 
                    onClick={handleAI} 
                    disabled={isAIWorking} 
                    title="Ask Alice to analyze"
                >
                    {isAIWorking ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                </button>
            </div>

            {/* Connection handles */}
            <Handle type="target" position={Position.Left} id="left-target" className="google-handle" />
            <Handle type="source" position={Position.Left} id="left-source" className="google-handle" />
            <Handle type="target" position={Position.Right} id="right-target" className="google-handle" />
            <Handle type="source" position={Position.Right} id="right-source" className="google-handle" />
        </div>
    );
};
