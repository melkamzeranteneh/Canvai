import type { Note } from '../../types/note';
import type { CanvasState } from '../../types/canvas';

const CANVAS_STORAGE_KEY = 'brainstorm_canvas_state';
const NOTES_STORAGE_KEY = 'brainstorm_notes';

export const persistence = {
    saveCanvasState: (state: CanvasState) => {
        localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(state));
    },

    loadCanvasState: (): CanvasState | null => {
        const saved = localStorage.getItem(CANVAS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    },

    saveNotes: (notes: Note[]) => {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    },

    loadNotes: (): Note[] => {
        const saved = localStorage.getItem(NOTES_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    },

    // Helper to export notes as MD files (simulated for local-first)
    exportNoteAsMarkdown: (note: Note) => {
        const blob = new Blob([note.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title || 'untitled'}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }
};
