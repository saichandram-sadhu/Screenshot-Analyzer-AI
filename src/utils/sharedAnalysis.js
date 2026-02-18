import { geminiClient } from './gemini';
import { groqClient } from './groq';
import { localClient } from './localLLM';
import { cohereClient } from './cohere';

export const analyzeFile = async (fileObj, mode, localModelName = '', onStatusUpdate = () => { }, onToken, onMetrics, signal) => {
    let activeModelName = 'Gemini';
    if (mode === 'local') activeModelName = localModelName;
    if (mode === 'groq') activeModelName = 'Llama 4 (Groq)';
    if (mode === 'cohere') activeModelName = 'Command R+ (Cohere)';

    onStatusUpdate(`Analyzing ${fileObj.file.name} with ${activeModelName}...`);

    let promptToUse;

    if (mode === 'local') {
        // Optimized Prompt for Local Models (High Detail, Text Format)
        promptToUse = `
You are an expert technical documentation engineer.
Analyze this screenshot and reconstruct the technical step.

Return a response in this exact format:

Title: [Action-oriented Title]
Description:
### 1. What Is Shown
[Explain the context, tool, and current screen]

### 2. Action Performed
[What is the user doing?]

### 3. Configuration Details
[Bullet points of strictly visible settings/values]

### 4. Step-by-Step
1. [Step 1]
2. [Step 2]

### 5. Expected Result
[What happens next?]

### 6. Notes
[Any warnings or observations]
`;
    } else {
        // Universal Technical Documentation Prompt (Cloud/Groq)
        promptToUse = `
You are an expert technical documentation engineer.
Your job is to analyze this screenshot and reconstruct the exact technical step shown.

Rules:
- Identify the software/tool/environment (e.g., AWS, Linux, n8n, Code, Jira).
- Identify the user's action.
- Extract visible settings, commands, and values.
- Reconstruct the workflow.
- Only describe what is clearly visible.

Return a JSON object with two fields:
1. "title": A short, action-oriented step title (e.g., "Configuring AWS instance details").
2. "description": A highly structured Markdown string following this EXACT format:

### 1. What Is Shown
[Explain the context, tool, and current screen]

### 2. Action Performed
[What is the user doing? e.g., Clicking 'Save', running a command]

### 3. Configuration Details
[Bullet points of every visible setting, value, or flag. Be precise.]

### 4. Step-by-Step
1. [First action]
2. [Second action]

### 5. Expected Result
[What happens next?]

### 6. Notes
[Any warnings, errors, or observations]

IMPORTANT:
- The "description" value MUST be a single string with \\n for newlines.
- Do NOT include \`\`\`json or \`\`\`markdown wrappers.
- Return ONLY valid JSON.
`;
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
    } catch (error) {
        throw new Error(error.message || "Analysis failed");
    }

    let parsedResult = { title: fileObj.file.name, description: resultText };

    try {
        const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(cleanJson);
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
            } else {
                // Heuristic: everything after title line or "Description:"
                parsedResult.description = resultText.replace(/Title:.*?\n/i, '').replace(parsedResult.title, '').trim();
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
