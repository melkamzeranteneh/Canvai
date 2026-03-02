import { MousePointer2, Sparkles, Eraser, Type } from 'lucide-react';
import { canvasStore } from '../../state/canvas.store';
import { uiStore } from '../../state/ui.store';
import { generateId } from '../../utils/id';
import { useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import './Toolbar.css';
import Card from './Card';
import { exportGraphJson, getGraphPreviewString } from '../../notes/storage/graph';
import { confirmToast } from '../../utils/toast';

// Keep only core tools to reduce clutter
const tools = [
    { id: 'select', icon: MousePointer2 },
    { id: 'node', icon: Type },
    { id: 'eraser', icon: Eraser },
];

export const Toolbar: React.FC = () => {
    const { getViewport } = useReactFlow();
    const [activeTool, setActiveTool] = useState<string>('select');

    useEffect(() => {
        const unsub = uiStore.subscribe(s => {
            // Prefer showing active modal (ai/json) in toolbar, fall back to eraser/select
            if (s.activeModal === 'ai') setActiveTool('ai');
            else if (s.activeModal === 'json') setActiveTool('json');
            else setActiveTool(s.eraserMode ? 'eraser' : 'select');
        });
        return unsub;
    }, []);

    const handleTool = (id: string) => {
        if (id === 'eraser') {
            uiStore.setState({ eraserMode: true });
            setActiveTool('eraser');
        } else if (id === 'node') {
            // add a node at current viewport centre
            const viewport = getViewport();
            const cx = -viewport.x / viewport.zoom + (window.innerWidth / 2) / viewport.zoom;
            const cy = -viewport.y / viewport.zoom + (window.innerHeight / 2) / viewport.zoom;
            canvasStore.addNode({
                id: generateId('node_'),
                type: 'markdown',
                position: { x: cx - 140, y: cy - 80 },
                width: 320,
                height: 160,
                data: { title: 'New Node', content: '', cardType: 'detail', category: 'Note' },
            });
            uiStore.setState({ eraserMode: false });
            setActiveTool('select');
        } else {
            uiStore.setState({ eraserMode: false });
            setActiveTool(id);
        }
    };

    return (
        <Card className="toolbar" compact>
            <div className="toolbar-section">
                {tools.map(({ id, icon: Icon }) => (
                    <button
                        key={id}
                        className={`toolbar-btn icon-only ${activeTool === id ? 'active' : ''}`}
                        onClick={() => handleTool(id)}
                        title={id}
                    >
                        <Icon size={18} />
                    </button>
                ))}
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-section">
                <button
                    className={`toolbar-btn ai-btn ${activeTool === 'ai' ? 'active' : ''}`}
                    title="Ask AI"
                    onClick={() => {
                        console.log('Toolbar: Ask AI clicked');
                        uiStore.setState({ activeModal: 'ai' });
                        setActiveTool('ai');
                    }}
                >
                    <Sparkles size={17} />
                    <span>Ask AI</span>
                </button>
                {/* JSON viewer moved into AI modal; remove standalone JSON button */}
                <button
                    className="toolbar-btn"
                    title="Export JSON"
                    onClick={async () => {
                        const preview = getGraphPreviewString();
                        const ok = await confirmToast('Export current canvas as JSON?\n\nPreview will be shown in console.', 'Export', 'Cancel');
                        if (ok) {
                            console.log('Graph preview:\n', preview);
                            exportGraphJson();
                        }
                    }}
                >
                    <span>Export JSON</span>
                </button>
            </div>
        </Card>
    );
};
