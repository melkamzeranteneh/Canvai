import { MousePointer2, Type, Sparkles, Eraser } from 'lucide-react';
import { canvasStore } from '../../state/canvas.store';
import { uiStore } from '../../state/ui.store';
import { generateId } from '../../utils/id';
import { useState, useEffect } from 'react';
import './Toolbar.css';

export const Toolbar: React.FC = () => {
    const [eraserMode, setEraserMode] = useState(uiStore.getState().eraserMode);

    useEffect(() => {
        const unsubscribe = uiStore.subscribe(state => {
            setEraserMode(state.eraserMode);
        });
        return () => unsubscribe();
    }, []);

    const addNode = () => {
        canvasStore.addNode({
            id: generateId('node_'),
            type: 'markdown',
            position: { x: 50, y: 50 },
            data: { content: '' },
            width: 300,
            height: 200
        });
    };

    const toggleEraser = () => {
        uiStore.setState({ eraserMode: !eraserMode });
    };

    return (
        <div className="toolbar">
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
        </div>
    );
};
