import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIClient } from '../../ai/ai.client';
import { summarizeNoteAgent } from '../../ai/agents';
import {
    Sparkles, Loader2, Trash2,
    FileText, User, MoreHorizontal, Plus,
    GripVertical,
} from 'lucide-react';
import { canvasStore } from '../../state/canvas.store';
import { toast } from '../../utils/toast';
import { getEnvConfig, getApiKey } from '../../config/env.config';
import { useState, useEffect, useCallback } from 'react';
import { generateId } from '../../utils/id';
import './Node.css';

/* ─── Types ────────────────────────────────────────────── */
interface NodeData extends Record<string, unknown> {
    content?: string;
    title?: string;
    badge?: string;
    category?: string;
    cardType?: 'ai' | 'main' | 'detail';
}

type Side = 'top' | 'right' | 'bottom' | 'left';

/* ─── Icon helper ───────────────────────────────────────── */
const CardIcon = ({ type }: { type?: string }) => {
    if (type === 'ai') return <Sparkles size={13} />;
    if (type === 'main') return <FileText size={13} />;
    return <User size={13} />;
};

/* ─── Component ─────────────────────────────────────────── */
export const MarkdownNode = ({ data, id, selected }: NodeProps) => {
    const nd = data as NodeData;
    const { getNode } = useReactFlow();

    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(nd.content ?? '');
    const [isAIWorking, setIsAIWorking] = useState(false);

    /* Sync external content changes */
    useEffect(() => { setContent(nd.content ?? ''); }, [nd.content]);

    /* ── Handlers ─────────────────────────────────────── */
    const handleDelete = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        // use confirm toast instead of browser confirm
        const { confirmToast } = await import('../../utils/toast');
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

            {/* Resizer — shows resize handles when selected */}
            {/* Simple node: no resizer to avoid layout issues */}

            {/* Top colour stripe */}
            <div className="card-type-stripe" />

            {/* ── Header ─────────────────────────────── */}
            <div className="card-header">
                <div className={`card-icon ${type}`}>
                    <CardIcon type={nd.cardType} />
                </div>

                <div className="card-title-block">
                    <div className="card-title">{nd.title || 'New Node'}</div>
                    {nd.category && <div className="card-subtitle">{nd.category}</div>}
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button className="card-action-btn ai" onClick={handleAI} disabled={isAIWorking} title="AI Summarize">
                        {isAIWorking ? <Loader2 size={11} className="spin" /> : <Sparkles size={11} />}
                    </button>
                    {selected && (
                        <button className="card-action-btn del" onClick={handleDelete} title="Delete">
                            <Trash2 size={11} />
                        </button>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="card-rule" />

            {/* ── Body ───────────────────────────────── */}
                <div className={`card-body ${isEditing ? 'editing' : ''}`}>
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
                                placeholder="Add content…"
                                onChange={e => setContent(e.target.value)}
                                onBlur={handleBlur}
                            />
                        </div>
                    ) : (
                        <div onDoubleClick={() => setIsEditing(true)}>
                            {content ? (
                                <div className="card-preview">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                                </div>
                            ) : (
                                <p className="card-hint">Double-click to edit…</p>
                            )}
                        </div>
                    )}
                </div>

            {/* ── Connection handles (left and right only) ── */}
            {/* Provide both source and target handles on left/right for flexible horizontal connections */}
            <Handle type="target" position={Position.Left} id="left-target" className="premium-handle" />
            <Handle type="source" position={Position.Left} id="left-source" className="premium-handle" />
            <Handle type="target" position={Position.Right} id="right-target" className="premium-handle" />
            <Handle type="source" position={Position.Right} id="right-source" className="premium-handle" />
        </div>
    );
};
