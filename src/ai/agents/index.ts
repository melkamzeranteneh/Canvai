import { AIClient } from '../ai.client';
// Note type is currently unused but imported as type

export const classifyNoteAgent = async (client: AIClient, noteContent: string): Promise<string> => {
    const prompt = `Classify the following note content. Provide a JSON response with 'topic', 'tags' (array), and 'intent'.\n\nContent:\n${noteContent}`;
    const systemPrompt = "You are a helpful assistant that organizes notes. Always respond in valid JSON.";

    const response = await client.complete(prompt, systemPrompt);
    return response.content;
};

export const summarizeNoteAgent = async (client: AIClient, noteContent: string): Promise<string> => {
    const prompt = `Provide a concise 1-sentence summary of this note:\n\n${noteContent}`;
    const response = await client.complete(prompt, "You are a concise summarizer.");
    return response.content;
};

export const writeNoteAgent = async (client: AIClient, instruction: string, context?: string): Promise<string> => {
    const prompt = `Instruction: ${instruction}${context ? `\n\nContext:\n${context}` : ''}`;
    const response = await client.complete(prompt, "You are a creative writing assistant for a markdown canvas.");
    return response.content;
};
