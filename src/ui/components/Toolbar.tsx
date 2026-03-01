import { MousePointer2, Type, Sparkles, Eraser } from 'lucide-react';
import { canvasStore } from '../../state/canvas.store';
import { uiStore } from '../../state/ui.store';
import { generateId } from '../../utils/id';
import { useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import './Toolbar.css';
import Card from './Card';

export const Toolbar: React.FC = () => {
    const { screenToFlowPosition, getViewport } = useReactFlow();
    const [eraserMode, setEraserMode] = useState(uiStore.getState().eraserMode);

    useEffect(() => {
        const unsubscribe = uiStore.subscribe(state => {
            setEraserMode(state.eraserMode);
        });
        return () => unsubscribe();
    }, []);

    const addNode = () => {
        const viewport = getViewport();
        // Calculate center of the current screen in flow coordinates
        const centerX = -viewport.x / viewport.zoom + (window.innerWidth / 2) / viewport.zoom;
        const centerY = -viewport.y / viewport.zoom + (window.innerHeight / 2) / viewport.zoom;

        canvasStore.addNode({
            id: generateId('node_'),
            type: 'markdown',
            position: { x: centerX - 150, y: centerY - 100 },
            data: { content: '' },
            width: 300,
            height: 200
        });
    };

    const toggleEraser = () => {
        uiStore.setState({ eraserMode: !eraserMode });
    };

    return (
        <Card className="toolbar" compact>
            <div className="toolbar-section">
                <button
                    className={`toolbar-btn ${!eraserMode ? 'active' : ''}`}
                    onClick={() => uiStore.setState({ eraserMode: false })}
                    title="Select"
                >
                    <MousePointer2 size={18} />
                </button>
                <button
                    className={`toolbar-btn ${eraserMode ? 'active' : ''}`}
                    onClick={toggleEraser}
                    title="Eraser Tool"
                >
                    <Eraser size={18} />
                </button>
                <button className="toolbar-btn" onClick={addNode} title="Add Text Node">
                    <Type size={18} />
                </button>
            </div>

            <div className="toolbar-divider" />

            <div className="toolbar-section">
                <button
                    className="toolbar-btn ai-btn"
                    title="AI Assistant"
                    onClick={() => uiStore.setState({ activeModal: 'ai' })}
                >
                    <Sparkles size={18} />
                    <span>Ask AI</span>
                </button>
            </div>
        </Card>
    );
};
