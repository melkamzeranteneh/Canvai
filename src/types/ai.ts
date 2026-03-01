export type AIProvider = 'openai' | 'gemini' | 'mistral';

export interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    baseUrl?: string;
    model: string;
}

export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
    };
}
