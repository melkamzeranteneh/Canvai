export interface Vector2 {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  type: string;
  position: Vector2;
  data: {
    noteId?: string;
    title?: string;
    badge?: string;
    status?: string;
    content?: string;
    imageUrl?: string;
    width?: number;
    height?: number;
    category?: string;
    cardType?: 'ai' | 'main' | 'detail';
  };
  width?: number;
  height?: number;
  selected?: boolean;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  label?: string;
  animated?: boolean;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
}
