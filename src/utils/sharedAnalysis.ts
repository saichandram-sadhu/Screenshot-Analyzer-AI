import { geminiClient } from './gemini';
import { groqClient } from './groq';
import { localClient } from './localLLM';
import { cohereClient } from './cohere';
import { generateDynamicPrompt } from './promptGenerator';

export const analyzeFile = async (
    fileObj: any,
    mode: 'cloud' | 'local' | 'groq' | 'cohere',
    localModelName: string = '',
    onStatusUpdate: (msg: string) => void = () => { },
    onToken?: (token: string) => void,
    onMetrics?: (metrics: any) => void,
    signal?: AbortSignal,
    settings: any = {}
) => {
    let activeModelName = 'Gemini';
    if (mode === 'local') activeModelName = localModelName;
    if (mode === 'groq') activeModelName = 'Llama 4 (Groq)';
    if (mode === 'cohere') activeModelName = 'Command R+ (Cohere)';

    onStatusUpdate(`Analyzing ${fileObj.file.name} with ${activeModelName}...`);

    let promptToUse;

    if (mode === 'local') {
        // Optimized Prompt for Local Models (High Detail, Text Format)
        // For local models, we might still want a simpler prompt or the one from settings?
        // Let's use the dynamic prompt even for local, but maybe strip complex instructions if needed.
        // For now, let's use the dynamic prompt which is better structured.
        promptToUse = generateDynamicPrompt(settings);
        // Append specific instruction for LOCAL output format if strictly needed, 
        // but the dynamic prompt is quite general. 
        // Actually, local models might struggle with complex structure. 
        // Let's keep the specialized local prompt layout logic if we prefer,
        // OR just use the dynamic one.
        // decision: Use dynamic prompt but maybe append "Return as clear text" if local?
        // The promptGenerator has structure instructions.
    } else {
        // Cloud/Groq/Cohere
        promptToUse = generateDynamicPrompt(settings);

        // Append JSON requirement for cloud models if not already in dynamic prompt?
        // The dynamic prompt in promptGenerator.ts does NOT strictly enforce JSON output format 
        // in the implementation I wrote in `promptGenerator.ts`.
        // Wait, I should double check `promptGenerator.ts`.
        // It returns text instructions.

        // I need to ensure Cloud models return JSON if the settings.outputFormat is JSON.
        // `generateDynamicPrompt` mainly handles content/tone.

        // Let's look at `promptGenerator.ts` content again.
        // It has Tone, Style, Depth.
        // It DOES NOT have specific JSON formatting rules.

        // I should append the JSON formatting rules here if it's cloud/groq.
        if (settings?.outputFormat === 'json' || !settings?.outputFormat) {
            promptToUse += `\n\nReturn the result in valid JSON format with 'title' and 'description' fields. The description should be valid Markdown.`;
        }
    }

    let resultText;

    try {
        if (mode === 'cloud') {
            resultText = await geminiClient.analyzeImage(fileObj.file, promptToUse, onStatusUpdate);
        } else if (mode === 'groq') {
            resultText = await groqClient.analyzeImage(fileObj.file, promptToUse);
        } else if (mode === 'cohere') {
            resultText = await cohereClient.analyzeImage(fileObj.file, promptToUse);
        } else {
            // Updated to pass callback and signal
            resultText = await localClient.analyzeImage(fileObj.file, promptToUse, onToken, onMetrics, signal);
        }
    } catch (error: any) {
        throw new Error(error.message || "Analysis failed");
    }

    let parsedResult: any = { title: fileObj.file.name, description: resultText, text: resultText };

    try {
        const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(cleanJson);
        // Ensure text field exists for backward compatibility
        if (!parsedResult.text && parsedResult.description) {
            parsedResult.text = parsedResult.description;
        }
    } catch (e) {
        // Fallback parsing for non-JSON responses (Local LLM or failed JSON)
        const lines = resultText.split('\n');
        if (lines.length > 0) {

            // Try regex parsing first
            const titleMatch = resultText.match(/Title:\s*(.+)/i);
            const descMatch = resultText.match(/Description:\s*([\s\S]+)/i);

            if (titleMatch && titleMatch[1]) {
                parsedResult.title = titleMatch[1].trim();
            } else {
                parsedResult.title = lines[0].replace(/#|\*/g, '').trim();
            }

            if (descMatch && descMatch[1]) {
                parsedResult.description = descMatch[1].trim();
                parsedResult.text = descMatch[1].trim();
            } else {
                // Heuristic: everything after title line or "Description:"
                parsedResult.description = resultText.replace(/Title:.*?\n/i, '').replace(parsedResult.title, '').trim();
                parsedResult.text = parsedResult.description;
            }
        }
    }

    return {
        id: fileObj.id || Date.now().toString(),
        file: fileObj.file,
        preview: fileObj.preview,
        title: parsedResult.title || "New Step",
        text: parsedResult.description || parsedResult.text || resultText
    };
};
