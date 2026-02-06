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
    content?: string;
    imageUrl?: string;
    width?: number;
    height?: number;
  };
  width?: number;
  height?: number;
  selected?: boolean;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
}
