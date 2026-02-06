import type { AIProvider } from '../types/ai';

export interface EnvConfig {
    openaiApiKey: string;
    geminiApiKey: string;
    activeProvider: AIProvider;
    defaultModel: string;
}

/**
 * Get AI configuration from environment variables
 * Determines active provider based on which API key is available
 */
export function getEnvConfig(): EnvConfig {
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

    // Determine active provider based on available API keys
    // Prefer OpenAI if both are available
    let activeProvider: AIProvider = 'openai';
    let defaultModel = 'gpt-3.5-turbo';

    if (openaiApiKey) {
        activeProvider = 'openai';
        defaultModel = 'gpt-3.5-turbo'; // Older, more quota-friendly model
    } else if (geminiApiKey) {
        activeProvider = 'gemini';
        defaultModel = 'gemini-1.5-flash-8b'; // Smaller, faster model
    }

    return {
        openaiApiKey,
        geminiApiKey,
        activeProvider,
        defaultModel,
    };
}

/**
 * Get API key for the specified provider
 */
export function getApiKey(provider: AIProvider): string {
    const config = getEnvConfig();

    if (provider === 'openai') {
        return config.openaiApiKey;
    } else if (provider === 'gemini') {
        return config.geminiApiKey;
    }

    return '';
}
