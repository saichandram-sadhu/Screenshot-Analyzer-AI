export interface PromptSettings {
    systemPrompt: string;
    userPrompt: string;
    polishPrompt: string;
}

export interface ExportSettings {
    headerColor: string;
    fontFamily: string;
    footerText: string;
    showLogo: boolean;
    logoUrl: string;
}

export interface AppSettings {
    // Core Settings (Existing)
    prompts: PromptSettings;
    exportInfo: ExportSettings;

    // Feature Flags & Customization (New)
    analysisTone: 'formal' | 'technical' | 'casual' | 'analytical' | 'executive';
    analysisStyle: 'step-by-step' | 'breakdown' | 'developer' | 'beginner' | 'audit' | 'ux-critique';
    analysisDepth: 'basic' | 'medium' | 'deep' | 'ultra';
    outputFormat: 'markdown' | 'json' | 'ui-blocks';
    layoutMode: 'single' | 'split' | 'focus';
    customInstructions: string;
    theme: 'dark' | 'light' | 'system';
}

export interface AnalysisFile {
    file: File;
    preview: string;
    id: string;
    status?: 'pending' | 'analyzing' | 'completed' | 'error';
    error?: string | null;
}
