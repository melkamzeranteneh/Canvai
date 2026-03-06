import { AIClient } from './ai.client';

export interface LangaGraphStep {
    name: string;
    durationMs: number;
    ok: boolean;
    detail: string;
}

export interface LangaGraphResult {
    content: string;
    jsonUpdate?: Record<string, unknown>;
    steps: LangaGraphStep[];
    systemPrompt: string;
}

const MAX_FILE_CONTEXT_CHARS = 12000;

const safeParseJSON = (value: string) => {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const extractJsonBlock = (text: string, tag: 'json_update' | 'langraph_plan') => {
    const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    if (!match) return null;
    return match[1].trim();
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export const buildEffectiveSystemPrompt = () => {
    return `You are Alice Gem, a strict canvas graph editor.
Return exactly one <json_update>...</json_update> block and nothing else.

Output contract:
- The JSON in <json_update> must include top-level arrays \"nodes\" and \"edges\".
- Keep every existing node id unless user explicitly asks to remove it.
- Every edge must reference existing node ids.
- Include node.position for every node with numeric x and y.
- Keep node width/height when already present.
- Use concise node content (<= 35 words).

Safety and quality:
- Resolve ambiguities using minimal-change edits.
- If request is impossible, preserve current graph and add one AI node explaining limitation.
- Never emit markdown, explanations, or extra tags.`;
};

export const runLangaGraphEdit = async (
    client: AIClient,
    userPrompt: string,
    canvasJson: string,
    fileContext?: string
): Promise<LangaGraphResult> => {
    const steps: LangaGraphStep[] = [];

    const planStart = now();
    const planningPrompt = `Create an editing plan for this request as JSON inside <langraph_plan> tags.\nRequest: ${userPrompt}\n\nReturn JSON with keys:\n- objective (string)\n- editStrategy (string)\n- checks (string array)`;
    const planResp = await client.complete(
        planningPrompt,
        'You are a planning node. Return only <langraph_plan>{...}</langraph_plan>.',
        []
    );
    const planDuration = Math.round(now() - planStart);
    const planBlock = extractJsonBlock(planResp.content, 'langraph_plan');
    const parsedPlan = planBlock ? safeParseJSON(planBlock) : null;
    steps.push({
        name: 'planner',
        durationMs: planDuration,
        ok: Boolean(parsedPlan),
        detail: parsedPlan ? 'Plan parsed' : 'Fallback plan used',
    });

    const systemPrompt = buildEffectiveSystemPrompt();
    const compactFileContext = fileContext ? fileContext.slice(0, MAX_FILE_CONTEXT_CHARS) : '';

    const editorStart = now();
    const editorResp = await client.complete(
        userPrompt,
        systemPrompt,
        [
            `<<<CANVAS_JSON_START>>>\n${canvasJson}\n<<<CANVAS_JSON_END>>>`,
            `<<<LANGRAPH_PLAN_START>>>\n${JSON.stringify(parsedPlan || { objective: 'Apply user request', editStrategy: 'minimal change', checks: ['valid nodes', 'valid edges'] }, null, 2)}\n<<<LANGRAPH_PLAN_END>>>`,
            compactFileContext ? `<<<FILE_CONTEXT_START>>>\n${compactFileContext}\n<<<FILE_CONTEXT_END>>>` : '',
        ].filter(Boolean)
    );
    const editorDuration = Math.round(now() - editorStart);

    const jsonBlock = extractJsonBlock(editorResp.content, 'json_update');
    const jsonUpdate = jsonBlock ? safeParseJSON(jsonBlock) : null;
    steps.push({
        name: 'editor',
        durationMs: editorDuration,
        ok: Boolean(jsonUpdate && typeof jsonUpdate === 'object'),
        detail: jsonUpdate ? 'json_update parsed' : 'No valid json_update found',
    });

    return {
        content: editorResp.content,
        jsonUpdate: (jsonUpdate || undefined) as Record<string, unknown> | undefined,
        steps,
        systemPrompt,
    };
};

export const runLangaGraphCapabilityTest = async (
    client: AIClient,
    canvasJson: string
): Promise<string> => {
    const testPrompt = 'Add two related nodes for project risks and connect them to the most relevant existing node.';
    const result = await runLangaGraphEdit(client, testPrompt, canvasJson);

    const hasJsonUpdate = Boolean(result.jsonUpdate);
    const hasNodes = Array.isArray((result.jsonUpdate as any)?.nodes);
    const hasEdges = Array.isArray((result.jsonUpdate as any)?.edges);

    const score = [hasJsonUpdate, hasNodes, hasEdges].filter(Boolean).length;
    const verdict = score === 3 ? 'PASS' : score === 2 ? 'PARTIAL' : 'FAIL';

    const stepLines = result.steps
        .map((s) => `- ${s.name}: ${s.ok ? 'ok' : 'failed'} (${s.durationMs}ms)`) 
        .join('\n');

    return `Langraph capability test: ${verdict}\nChecks passed: ${score}/3\n${stepLines}`;
};

export const buildFileContext = (
    fileName: string,
    mimeType: string,
    text: string
) => {
    const trimmed = text.slice(0, MAX_FILE_CONTEXT_CHARS);
    return `File name: ${fileName}\nMIME type: ${mimeType || 'unknown'}\nContent:\n${trimmed}`;
};
