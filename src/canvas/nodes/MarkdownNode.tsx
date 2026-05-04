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

    /* ── Render ───────────────────────────────────────── */
    const type = nd.cardType ?? 'default';

    return (
        <div className={`node premium-card ${type} ${selected ? 'selected' : ''}`}>
            {/* Background & decorative Blobs */}
            <div className="card-play-background">
                <div className="card-blob blob-top" />
                <div className="card-blob blob-bottom" />
            </div>

            {/* ── Header ─────────────────────────────── */}
            <div className="card-play-header">
                <div className="card-play-icon">
                    <CardIcon type={nd.cardType} />
                </div>
                {nd.badge && <div className="card-play-badge">{nd.badge}</div>}
            </div>

            {/* ── Body ───────────────────────────────── */}
            <div className="card-play-body">
                {nd.category && <div className="card-play-category">{nd.category}</div>}

                {isEditing ? (
                    <div className="nodrag" onMouseDown={e => e.stopPropagation()}>
                        <input
                            className="card-edit-title"
                            style={{ fontSize: '24px', padding: '12px' }}
                            value={nd.title ?? ''}
                            placeholder="Title"
                            onChange={e => canvasStore.updateNode(id, { data: { ...nd, title: e.target.value } })}
                            onKeyDown={e => e.key === 'Enter' && setIsEditing(false)}
                            autoFocus
                        />
                        <textarea
                            className="card-edit-body"
                            style={{ minHeight: '120px' }}
                            value={content}
                            placeholder="Add content…"
                            onChange={e => setContent(e.target.value)}
                            onBlur={handleBlur}
                        />
                    </div>
                ) : (
                    <div onDoubleClick={() => setIsEditing(true)}>
                        <h1 className="card-play-title">{nd.title || 'New Node'}</h1>
                        <div className="card-play-content">
                            {content ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                            ) : (
                                <span className="card-hint">Double-click to edit your idea…</span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Footer Stats ───────────────────────── */}
            <div className="card-play-stats">
                <div className="stat-item">
                    <div className="stat-label">Rating</div>
                    <div className="stat-value">4.9</div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">Size</div>
                    <div className="stat-value">{content.length} chars</div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">Connections</div>
                    <div className="stat-value">3</div>
                </div>
            </div>

            {/* Floating Action (Delete when selected) */}
            <div className="card-play-action">
                {selected ? (
                    <button className="play-action-btn del" onClick={handleDelete} title="Delete Card" style={{ background: '#ef4444' }}>
                        <Trash2 size={20} />
                    </button>
                ) : (
                    <button className="play-action-btn ai" onClick={handleAI} disabled={isAIWorking} title="AI Analyze">
                        {isAIWorking ? <Loader2 size={20} className="spin" /> : <Sparkles size={20} />}
                    </button>
                )}
            </div>

            {/* Connection handles (left and right only) */}
            <Handle type="target" position={Position.Left} id="left-target" className="premium-handle" />
            <Handle type="source" position={Position.Left} id="left-source" className="premium-handle" />
            <Handle type="target" position={Position.Right} id="right-target" className="premium-handle" />
            <Handle type="source" position={Position.Right} id="right-source" className="premium-handle" />
        </div>
    );
};
