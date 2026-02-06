import type { Note } from '../types/note';

let notes: Note[] = [];

type Listener = (notes: Note[]) => void;
const listeners = new Set<Listener>();

export const notesStore = {
    getNotes: () => notes,
    subscribe: (listener: Listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    setNotes: (newNotes: Note[]) => {
        notes = newNotes;
        listeners.forEach(l => l(notes));
    },
    addNote: (note: Note) => {
        notesStore.setNotes([...notes, note]);
    },
    updateNote: (id: string, updates: Partial<Note>) => {
        notesStore.setNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));
    },
    removeNote: (id: string) => {
        notesStore.setNotes(notes.filter(n => n.id !== id));
    }
};
