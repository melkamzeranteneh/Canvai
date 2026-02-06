import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIClient } from '../../ai/ai.client';
import { summarizeNoteAgent } from '../../ai/agents';
import { Sparkles, Loader2, Trash2 } from 'lucide-react';
import { canvasStore } from '../../state/canvas.store';
import { getEnvConfig, getApiKey } from '../../config/env.config';
import { useState, useEffect } from 'react';
import './Node.css';

interface NodeData extends Record<string, unknown> {
    content?: string;
    noteId?: string;
    width?: number;
    height?: number;
}

export const MarkdownNode = ({ data: _data, id, selected }: NodeProps) => {
    const data = _data as NodeData;
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(data.content || '');
    const [isAIProcessing, setIsAIProcessing] = useState(false);

    useEffect(() => {
        setContent(data.content as string || '');
    }, [data.content]);

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

        if (!apiKey) {
            alert(`Please set ${envConfig.activeProvider.toUpperCase()}_API_KEY in your .env file`);
            return;
        }

        setIsAIProcessing(true);
        try {
            const client = new AIClient({
                provider: envConfig.activeProvider,
                apiKey: apiKey,
                model: envConfig.defaultModel
            });
            const summary = await summarizeNoteAgent(client, content);
            const newContent = content + `\n\n> **AI Summary:** ${summary}`;
            setContent(newContent);
            canvasStore.updateNode(id, {
                data: { ...data, content: newContent }
            });
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsAIProcessing(false);
        }
    };

    const handleBlur = () => {
        setIsEditing(false);
        canvasStore.updateNode(id, {
            data: { ...data, content }
        });
    };

    return (
        <div
            className={`node markdown-node ${selected ? 'selected' : ''}`}
            style={{ width: data.width || 300, height: data.height || 200 }}
            onDoubleClick={() => setIsEditing(true)}
        >
            <NodeResizer
                color="var(--accent-color)"
                isVisible={selected}
                minWidth={150}
                minHeight={100}
                onResize={(_e, params) => {
                    canvasStore.updateNode(id, {
                        width: params.width,
                        height: params.height,
                        data: { ...data, width: params.width, height: params.height }
                    });
                }}
            />
            <div className="node-header nodrag">
                <span className="node-type-icon">M↓</span>
                <span className="node-title">{data.noteId || 'Draft'}</span>
                <div style={{ flex: 1 }} />
                <button
                    className={`node-ai-btn ${isAIProcessing ? 'processing' : ''}`}
                    onClick={handleAIAction}
                    title="Summarize with AI"
                    disabled={isAIProcessing}
                >
                    {isAIProcessing ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                </button>
                {selected && (
                    <button className="node-delete-btn" onClick={handleDelete} title="Delete Card">
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            <div className="node-content">
                {isEditing ? (
                    <textarea
                        autoFocus
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onBlur={handleBlur}
                        className="node-editor nodrag"
                    />
                ) : (
                    <div className="markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content || '_Empty note_'}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            {/* React Flow Handles */}
            <Handle type="target" position={Position.Top} className="node-handle top" />
            <Handle type="source" position={Position.Top} className="node-handle top" />

            <Handle type="target" position={Position.Right} className="node-handle right" />
            <Handle type="source" position={Position.Right} className="node-handle right" />

            <Handle type="target" position={Position.Bottom} className="node-handle bottom" />
            <Handle type="source" position={Position.Bottom} className="node-handle bottom" />

            <Handle type="target" position={Position.Left} className="node-handle left" />
            <Handle type="source" position={Position.Left} className="node-handle left" />
        </div>
    );
};
