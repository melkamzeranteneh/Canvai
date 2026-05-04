"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from './canvas/Canvas';
import { Toolbar } from './ui/components/Toolbar';
import { canvasStore } from './state/canvas.store';
import { uiStore } from './state/ui.store';
import { generateId } from './utils/id';

import { AIModal } from './ui/components/AIModal';
import {
  Bot,
  Eraser,
  Moon,
  MousePointer2,
  Network,
  Sparkles,
  Sun,
  LayoutDashboard,
  Wrench,
  BarChart3,
  Activity,
  Code2
} from 'lucide-react';
import { JSONViewer } from './ui/components/JSONViewer';
import { ScrollArea } from '@/ui/shadcn/components/ui/scroll-area';
import { Badge } from '@/ui/shadcn/components/ui/badge';

import { ReactFlowProvider } from '@xyflow/react';

type Theme = 'light' | 'dark';
type DragTarget = 'left' | 'right' | 'center' | null;

const App: React.FC = () => {
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [eraserMode, setEraserMode] = useState(uiStore.getState().eraserMode);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('canvai-theme');
      return saved === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });
  const [leftWidth, setLeftWidth] = useState(23);
  const [rightWidth, setRightWidth] = useState(31);
  const [canvasTopHeight, setCanvasTopHeight] = useState(70);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [stats, setStats] = useState(() => ({
    nodeCount: canvasStore.getState().nodes.length,
    edgeCount: canvasStore.getState().edges.length,
    nodeTitles: canvasStore
      .getState()
      .nodes.slice(0, 4)
      .map((n: any) => n?.data?.title || n.id),
  }));

  useEffect(() => {
    const unsub = uiStore.subscribe(s => {
      setEraserMode(s.eraserMode);
    });
    return unsub;
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('canvai-theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsub = canvasStore.subscribe(state => {
      setStats({
        nodeCount: state.nodes.length,
        edgeCount: state.edges.length,
        nodeTitles: state.nodes.slice(0, 4).map((n: any) => n?.data?.title || n.id),
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Add starter nodes once for first-time experience.
    if (canvasStore.getState().nodes.length === 0) {
      const node1Id = generateId('node_');
      const node2Id = generateId('node_');
      const node3Id = generateId('node_');

      canvasStore.addNode({
        id: node1Id,
        type: 'markdown',
        position: { x: 400, y: 100 },
        width: 320,
        height: 160,
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
        width: 320,
        height: 160,
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
        width: 320,
        height: 160,
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

  useEffect(() => {
    if (!dragTarget) return;

    const onMouseMove = (event: MouseEvent) => {
      if (!workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

      if (dragTarget === 'left') {
        const nextLeft = ((event.clientX - rect.left) / rect.width) * 100;
        const clampedLeft = clamp(nextLeft, 16, 34);
        const maxAllowed = 100 - rightWidth - 34;
        setLeftWidth(clamp(clampedLeft, 16, maxAllowed));
      }

      if (dragTarget === 'right') {
        const nextRight = ((rect.right - event.clientX) / rect.width) * 100;
        const clampedRight = clamp(nextRight, 24, 42);
        const maxAllowed = 100 - leftWidth - 34;
        setRightWidth(clamp(clampedRight, 24, maxAllowed));
      }

      if (dragTarget === 'center') {
        const nextTop = ((event.clientY - rect.top) / rect.height) * 100;
        setCanvasTopHeight(clamp(nextTop, 30, 70)); // More room for bottom JSON
      }
    };

    const onMouseUp = () => {
      setDragTarget(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragTarget, leftWidth, rightWidth]);

  const shellVars = useMemo(
    () => ({
      '--left-pane-width': `${leftWidth}%`,
      '--right-pane-width': `${rightWidth}%`,
      '--canvas-top-height': `${canvasTopHeight}%`,
    } as React.CSSProperties),
    [leftWidth, rightWidth, canvasTopHeight]
  );

  const WorkspacePane: React.FC<{
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    className?: string;
  }> = ({ icon, title, children, className = '' }) => (
    <div className={`workspace-pane ${className}`}>
      <div className="pane-header">
        {icon}
        <span>{title}</span>
      </div>
      <div className="pane-content">
        {children}
      </div>
    </div>
  );

  return (
    <ReactFlowProvider>
      <div className="app-container">
        <header className="app-header">
          <div className="header-left">
            <div className="logo-wrapper">
              <LayoutDashboard className="accent-text" size={24} />
            </div>
            <div className="project-info">
              <div className="project-title">Canvai Workspace</div>
              <div className="project-path">Bento Canvas Studio</div>
            </div>
          </div>
          <div className="header-right">
            <button
              className={`header-btn secondary ${eraserMode ? 'active' : ''}`}
              onClick={() => uiStore.setState({ eraserMode: !eraserMode })}
              title="Toggle Eraser Tool"
            >
              {eraserMode ? <Eraser size={16} /> : <MousePointer2 size={16} />}
              <span>{eraserMode ? 'Eraser' : 'Select'}</span>
            </button>
            <button
              className="header-btn secondary"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title="Toggle Light and Dark Theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </header>

        <main className="workspace-shell" ref={workspaceRef} style={shellVars}>
          <aside className="pane-column left-pane">
            <WorkspacePane icon={<Wrench size={14} />} title="Tool Deck" className="tools-card">
              <Toolbar />
            </WorkspacePane>

            <WorkspacePane icon={<BarChart3 size={14} />} title="Graph Snapshot" className="metrics-card">
              <div className="metric-grid">
                <Badge variant="outline" className="metric-chip">
                  <Network size={12} className="text-[#ffa116]" />
                  <span>{stats.nodeCount} Nodes</span>
                </Badge>
                <Badge variant="outline" className="metric-chip">
                  <Sparkles size={12} className="text-yellow-400" />
                  <span>{stats.edgeCount} Edges</span>
                </Badge>
              </div>
              <ScrollArea className="stats-scroll-area">
                <ul className="title-list">
                  {stats.nodeTitles.map((title, idx) => (
                    <li key={`${title}-${idx}`} className="title-item">
                      {title}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </WorkspacePane>
          </aside>

          <div
            className="pane-divider vertical"
            onMouseDown={() => setDragTarget('left')}
            title="Drag to resize left panel"
          />

          <section className="pane-column center-pane">
            <WorkspacePane icon={<Activity size={14} />} title="Canvas Area" className="canvas-card">
              <div className="canvas-shell">
                <Canvas theme={theme} />
              </div>
            </WorkspacePane>
          </section>

          <div
            className="pane-divider vertical"
            onMouseDown={() => setDragTarget('right')}
            title="Drag to resize AI panel"
          />

          <aside className="pane-column right-pane">
            <WorkspacePane icon={<Bot size={14} />} title="Agent Viewer" className="ai-card">
              <AIModal forceVisible embedded />
            </WorkspacePane>

            <div
              className="pane-divider horizontal"
              onMouseDown={() => setDragTarget('center')}
              title="Drag to resize JSON viewer"
            />

            <WorkspacePane icon={<Code2 size={14} />} title="JSON Viewer" className="json-card">
              <JSONViewer />
            </WorkspacePane>
          </aside>
        </main>

        <div className="status-bar">
          <span>Canvai v1.2.0 • LeetBento Edition</span>
          <span className="status-right">
            <span className="accent-text">{theme === 'light' ? 'Light Mode' : 'Dark Mode'} Active</span>
          </span>
        </div>

        <div className="drag-overlay" aria-hidden={dragTarget === null} style={{ display: dragTarget ? 'block' : 'none' }} />
      </div>
    </ReactFlowProvider>
  );
};

export default App;
