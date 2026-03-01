import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIClient } from '../../ai/ai.client';
import { summarizeNoteAgent } from '../../ai/agents';
import { Sparkles, Loader2, Trash2, FileText, User } from 'lucide-react';
import { canvasStore } from '../../state/canvas.store';
import { toast } from '../../utils/toast';
import { getEnvConfig, getApiKey } from '../../config/env.config';
import { useState, useEffect } from 'react';
import './Node.css';

interface NodeData extends Record<string, unknown> {
    content?: string;
    title?: string;
    badge?: string;
    category?: string;
    cardType?: 'ai' | 'main' | 'detail';
}

const CardBackground = ({ type }: { type?: string }) => {
    if (type === 'ai') {
        return (
            <svg className="card-bg-svg" viewBox="0 0 400 200" preserveAspectRatio="none">
                <path d="M0 120 Q 100 80 200 120 T 400 120 V 200 H 0 Z" fill="#3b82f6" opacity="0.1" />
                <path d="M0 150 Q 80 120 180 160 T 400 140 V 200 H 0 Z" fill="#7c3aed" opacity="0.15" />
            </svg>
        );
    }
    if (type === 'main') {
        return (
            <svg className="card-bg-svg" viewBox="0 0 400 200" preserveAspectRatio="none">
                <circle cx="350" cy="180" r="80" fill="#10b981" opacity="0.1" />
                <circle cx="20" cy="190" r="60" fill="#10b981" opacity="0.08" />
            </svg>
        );
    }
    if (type === 'detail') {
        return (
            <svg className="card-bg-svg" viewBox="0 0 400 200" preserveAspectRatio="none">
                <path d="M250 200 L400 50 L400 200 Z" fill="#ef4444" opacity="0.1" />
            </svg>
        );
    }
    return (
        <svg className="card-bg-svg" viewBox="0 0 400 200" preserveAspectRatio="none">
            <path d="M0 180 Q 200 150 400 180 V 200 H 0 Z" fill="#64748b" opacity="0.05" />
        </svg>
    );
};

export const MarkdownNode = ({ data, id, selected }: NodeProps) => {
    const nodeData = data as NodeData;
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(nodeData.content || '');
    const [isAIProcessing, setIsAIProcessing] = useState(false);

    useEffect(() => {
        setContent(nodeData.content || '');
    }, [nodeData.content]);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this card?')) {
            canvasStore.removeNode(id);
        }
    };

    const handleAIAction = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const envConfig = getEnvConfig();
        const apiKey = getApiKey(envConfig.activeProvider);

        if (!apiKey) return;

        setIsAIProcessing(true);
        // wrap the entire ai call in a promise toast if available
        await toast.promise(
            (async () => {
                const client = new AIClient({
                    provider: envConfig.activeProvider,
                    apiKey: apiKey,
                    model: envConfig.defaultModel
                });

                const summary = await summarizeNoteAgent(client, content);
                const newContent = content + `\n\n> **AI Summary:** ${summary}`;
                setContent(newContent);
                canvasStore.updateNode(id, {
                    data: { ...nodeData, content: newContent }
                });
            })(),
            {
                pending: 'Generating summary...',
                success: 'Summary generated',
                error: 'AI generation failed'
            }
        ).catch(() => {/* errors already shown in toast */})
        .finally(() => {
            setIsAIProcessing(false);
        });
    };

    const handleBlur = () => {
        setIsEditing(false);
        canvasStore.updateNode(id, {
            data: { ...nodeData, content }
        });
    };

    return (
        <div className={`node premium-card ${nodeData.cardType || 'default'} ${selected ? 'selected' : ''}`}>
            <NodeResizer
                color="var(--accent-color)"
                isVisible={selected}
                minWidth={300}
                minHeight={150}
            />

            <div className="card-top-row">
                <div className={`brand-logo ${nodeData.cardType || 'default'}`}>
                    {nodeData.cardType === 'ai' ? <Sparkles size={14} /> :
                        nodeData.cardType === 'main' ? <FileText size={14} /> :
                            <User size={14} />}
                </div>
                {nodeData.badge && <div className="card-badge-pill">{nodeData.badge}</div>}
            </div>

            <div className="card-main-content">
                <div className="card-category-label">{nodeData.category || 'Documentation'}</div>
                {isEditing ? (
                    <div className="card-editor-fields nodrag">
                        <input
                            className="card-title-input"
                            value={nodeData.title || ''}
                            onChange={(e) => canvasStore.updateNode(id, { data: { ...nodeData, title: e.target.value } })}
                            onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(false); }}
                            autoFocus
                        />
                        <textarea
                            className="card-content-editor"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onBlur={handleBlur}
                        />
                    </div>
                ) : (
                    <div className="card-display-view" onDoubleClick={() => setIsEditing(true)}>
                        <h1 className="card-main-title">{nodeData.title || 'Module Name'}</h1>
                        <div className="card-markdown-preview">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content || '_Double click to edit_'}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>

            <div className="card-floating-actions">
                <button className="float-action-btn ai" onClick={handleAIAction} disabled={isAIProcessing}>
                    {isAIProcessing ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
                </button>
                {selected && (
                    <button className="float-action-btn delete" onClick={handleDelete}>
                        <Trash2 size={12} />
                    </button>
                )}
            </div>

            <CardBackground type={nodeData.cardType} />

            {/* Standard Handles for stable connections */}
            <Handle type="target" position={Position.Top} className="premium-handle" />
            <Handle type="source" position={Position.Top} className="premium-handle" />

            <Handle type="target" position={Position.Bottom} className="premium-handle" />
            <Handle type="source" position={Position.Bottom} className="premium-handle" />

            <Handle type="target" position={Position.Left} className="premium-handle" />
            <Handle type="source" position={Position.Left} className="premium-handle" />

            <Handle type="target" position={Position.Right} className="premium-handle" />
            <Handle type="source" position={Position.Right} className="premium-handle" />
        </div>
    );
};
