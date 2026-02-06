import React, { useEffect } from 'react';
import { Canvas } from './canvas/Canvas';
import { Toolbar } from './ui/components/Toolbar';
import { canvasStore } from './state/canvas.store';
import { generateId } from './utils/id';
import './App.css';

import { AIModal } from './ui/components/AIModal';

const App: React.FC = () => {
  useEffect(() => {
    // Add some initial nodes for demo
    if (canvasStore.getState().nodes.length === 0) {
      const node1Id = generateId('node_');
      const node2Id = generateId('node_');

      canvasStore.addNode({
        id: node1Id,
        type: 'markdown',
        position: { x: 100, y: 100 },
        data: { content: '# Hello Brainstorm\n\nThis is a local-first markdown canvas. Double click to edit me!' },
        width: 300,
        height: 200
      });

      canvasStore.addNode({
        id: node2Id,
        type: 'markdown',
        position: { x: 500, y: 300 },
        data: { content: '## Features\n\n- Pan & Zoom (React Flow)\n- Drag nodes\n- Inline Markdown editing' },
        width: 300,
        height: 200
      });

      canvasStore.addEdge({
        id: generateId('edge_'),
        source: node1Id,
        target: node2Id
      });
    }
  }, []);

  return (
    <div className="app-container">
      <Toolbar />
      <main className="main-content">
        <Canvas />
      </main>
      <AIModal />
      <div className="status-bar">
        <span>Brainstorm v1.0.0</span>
        <span className="accent-text">Local-First</span>
      </div>
    </div>
  );
};

export default App;
