export const generateDynamicPrompt = (settings: any) => {
    const { analysisTone, analysisStyle, analysisDepth, customInstructions, prompts, manualPrompt } = settings;

    let toneInstruction = "";
    switch (analysisTone) {
        case 'technical': toneInstruction = "Use precise technical terminology. Focus on architecture, protocols, and exact values."; break;
        case 'executive': toneInstruction = "Focus on high-level insights, business value, and strategic implications. Avoid minor details."; break;
        case 'casual': toneInstruction = "Use a friendly, conversational tone. Explain concepts simply."; break;
        case 'formal': toneInstruction = "Use strict professional language. Avoid contractions or slang."; break;
        case 'analytical': default: toneInstruction = "Balance technical detail with clarity. Be objective and structured."; break;
    }

    let styleInstruction = "";
    switch (analysisStyle) {
        case 'breakdown': styleInstruction = "Deconstruct the UI into its component parts (Header, Sidebar, Content, etc.)."; break;
        case 'developer': styleInstruction = "Analyze from a developer's perspective (Computed styles, Layout components, Potential API calls)."; break;
        case 'ux-critique': styleInstruction = "Critique the User Experience. Highlight usability issues, accessibility, and design patterns."; break;
        case 'audit': styleInstruction = "Perform a security and compliance audit. Look for PII, insecure configurations, or policy violations."; break;
        case 'step-by-step': default: styleInstruction = "Provide a sequential walkthrough of the user actions and flow."; break;
    }

    let depthInstruction = "";
    switch (analysisDepth) {
        case 'basic': depthInstruction = "Focus only on the main action and primary elements. Keep it brief."; break;
        case 'deep': depthInstruction = "Include detailed descriptions of all visible elements, text, and icons."; break;
        case 'ultra': depthInstruction = "Exhaustive analysis. Transcribe all text, describe every pixel, valid every setting value."; break;
        case 'medium': default: depthInstruction = "Cover the main workflow and important secondary details."; break;
    }

    let formatInstruction = "";
    switch (settings.outputFormat) {
        case 'json': formatInstruction = "Refine the response to be strict, valid JSON only. Do not wrap in markdown."; break;
        case 'ui-blocks': formatInstruction = "Structure the description as a list of independent UI components (e.g., 'Hero Section', 'Nav Bar') with distinct properties."; break;
        case 'markdown': default: formatInstruction = "Use clean, standard Markdown formatting."; break;
    }

    return `
${prompts?.systemPrompt || "You are an expert technical documentation engineer."}

${toneInstruction}
${styleInstruction}
${depthInstruction}
${formatInstruction}

${customInstructions ? `IMPORTANT OVERRIDE: ${customInstructions}` : ""}

${manualPrompt || prompts?.userPrompt || "Analyze this screenshot."}
`;
};
