import React, { useEffect } from 'react';
import { Canvas } from './canvas/Canvas';
import { Toolbar } from './ui/components/Toolbar';
import { canvasStore } from './state/canvas.store';
import { uiStore } from './state/ui.store';
import { generateId } from './utils/id';
import { Search, Sparkles } from 'lucide-react';
import './App.css';

import { AIModal } from './ui/components/AIModal';
import { MousePointer2, Eraser } from 'lucide-react';

import { ReactFlowProvider } from '@xyflow/react';

const App: React.FC = () => {
  const [eraserMode, setEraserMode] = React.useState(uiStore.getState().eraserMode);

  React.useEffect(() => {
    const unsub = uiStore.subscribe(s => {
      setEraserMode(s.eraserMode);
    });
    return unsub;
  }, []);
  useEffect(() => {
    // Add some initial nodes for demo
    if (canvasStore.getState().nodes.length === 0) {
      const node1Id = generateId('node_');
      const node2Id = generateId('node_');
      const node3Id = generateId('node_');

      canvasStore.addNode({
        id: node1Id,
        type: 'markdown',
        position: { x: 400, y: 100 },
        data: {
          title: 'Customer Onboarding',
          badge: 'Main',
          cardType: 'main',
          category: 'Process',
          content: 'The core journey of getting a new client into the ecosystem. This card will grow if you add more text to it!'
        },
      });

      canvasStore.addNode({
        id: node2Id,
        type: 'markdown',
        position: { x: 100, y: 450 },
        data: {
          title: 'Sales Assignment',
          badge: 'AI Suggestion',
          cardType: 'ai',
          category: 'Routing',
          content: 'Automated routing based on expertise and bandwidth.'
        },
      });

      canvasStore.addNode({
        id: node3Id,
        type: 'markdown',
        position: { x: 700, y: 450 },
        data: {
          title: 'Discarded Leads',
          badge: 'Archive',
          cardType: 'detail',
          category: 'Storage',
          content: 'Leads that do not match criteria are moved to cold storage.'
        },
      });

      canvasStore.addEdge({
        id: generateId('edge_'),
        source: node1Id,
        target: node2Id,
      });

      canvasStore.addEdge({
        id: generateId('edge_'),
        source: node1Id,
        target: node3Id,
      });
    }
  }, []);

  return (
    <ReactFlowProvider>
      <div className="app-container">
        <header className="app-header">
          <div className="header-left">
            <div className="logo-wrapper">
              <Sparkles size={18} />
            </div>
            <div className="project-info">
              <div className="project-title">Client onboarding</div>
              <div className="project-path">Sales Operations / Flow Design</div>
            </div>
          </div>
          <div className="header-right">
            <button className="search-btn"><Search size={18} /></button>
            <button
              className={`header-btn secondary ${eraserMode ? 'active' : ''}`}
              onClick={() => uiStore.setState({ eraserMode: !eraserMode })}
              title="Toggle Edit Tool"
            >
              {eraserMode ? <Eraser size={16} /> : <MousePointer2 size={16} />}
              <span style={{ marginLeft: 8 }}>{eraserMode ? 'Eraser' : 'Edit'}</span>
            </button>
            <button className="header-btn primary">Share</button>
          </div>
        </header>
        <div className="main-layout">
          <div className="main-content">
            <Toolbar />
            <Canvas />
          </div>
          <AIModal />
        </div>
        <div className="status-bar">
          <span>Canvai v1.0.0</span>
          <span className="accent-text">Connected to Mistral AI</span>
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default App;
