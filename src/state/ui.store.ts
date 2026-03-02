interface UIState {
    selectedNodeId: string | null;
    isDragging: boolean;
    isConnecting: boolean;
    activeModal: 'ai' | 'json' | null;
    isLoading: boolean;
    eraserMode: boolean;
    fastJsonSync: boolean;
    connectingSourceId: string | null;
    connectionStartPos: { x: number, y: number } | null;
    connectionTargetPos: { x: number, y: number } | null;
}

let state: UIState = {
    selectedNodeId: null,
    isDragging: false,
    isConnecting: false,
    activeModal: null,
    isLoading: false,
    eraserMode: false,
    fastJsonSync: true,
    connectingSourceId: null,
    connectionStartPos: null,
    connectionTargetPos: null,
};

type Listener = (state: UIState) => void;
const listeners = new Set<Listener>();

export const uiStore = {
    getState: () => state,
    subscribe: (listener: Listener) => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },
    setState: (updates: Partial<UIState>) => {
        state = { ...state, ...updates };
        listeners.forEach(l => l(state));
    }
};
