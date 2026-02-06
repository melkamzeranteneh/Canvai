export interface Note {
    id: string;
    title: string;
    content: string;
    tags: string[];
    metadata: {
        createdAt: number;
        updatedAt: number;
        intent?: string;
        summary?: string;
    };
}
