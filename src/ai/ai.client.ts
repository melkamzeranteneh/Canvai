import type { AIConfig, AIResponse } from '../types/ai';

export class AIClient {
    private config: AIConfig;

    constructor(config: AIConfig) {
        this.config = config;
    }

    async complete(prompt: string, systemPrompt?: string): Promise<AIResponse> {
        if (this.config.provider === 'openai') {
            return this.completeOpenAI(prompt, systemPrompt);
        } else if (this.config.provider === 'gemini') {
            return this.completeGemini(prompt, systemPrompt);
        }

        throw new Error(`Provider ${this.config.provider} not supported`);
    }

    private async completeOpenAI(prompt: string, systemPrompt?: string): Promise<AIResponse> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: [
                    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Rate limit reached. Please check your API quota or wait a moment.');
            }
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `OpenAI request failed with status ${response.status}`);
        }

        const data = await response.json();
        return {
            content: data.choices[0].message.content,
            usage: {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens
            }
        };
    }

    private async completeGemini(prompt: string, systemPrompt?: string): Promise<AIResponse> {
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: fullPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                    }
                })
            }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Gemini request failed with status ${response.status}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return {
            content,
            usage: {
                promptTokens: data.usageMetadata?.promptTokenCount || 0,
                completionTokens: data.usageMetadata?.candidatesTokenCount || 0
            }
        };
    }
}
