export class GroqClient {
    private apiKeys: string[];
    public currentKeyIndex: number;
    private baseUrl: string;

    private preferredModel: string;

    constructor() {
        this.apiKeys = this.loadApiKeys();
        this.currentKeyIndex = 0;
        // Use proxy in development to avoid CORS
        this.baseUrl = "/api/groq/v1/chat/completions";
        this.preferredModel = localStorage.getItem('groq_preferred_model') || "llama-3.2-11b-vision-preview";

        // Electron / File Protocol Override
        if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
            this.baseUrl = "https://api.groq.com/openai/v1/chat/completions";
        }
    }

    loadApiKeys(): string[] {
        const stored = localStorage.getItem('groq_api_keys');
        return stored ? JSON.parse(stored) : [];
    }

    saveApiKeys(keys: string[]): void {
        this.apiKeys = keys;
        localStorage.setItem('groq_api_keys', JSON.stringify(keys));
        this.currentKeyIndex = 0; // Reset on update
    }

    async autoDetectModel(key: string): Promise<string | null> {
        // Try models in order of preference (Quality -> Speed -> Reliable)
        const modelsToTry = [
            "llama-3.2-90b-vision-preview", // Best Quality
            "llama-3.2-11b-vision-preview", // Fast & Good
            "llama-guard-3-8b"              // Fallback / Validation only
        ];

        for (const model of modelsToTry) {
            try {
                const response = await fetch(this.baseUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: "user", content: "Test" }],
                        max_tokens: 1
                    })
                });

                if (response.ok) {
                    console.log(`Groq: Auto-detected best model: ${model}`);
                    return model;
                }
            } catch (e) {
                console.warn(`Groq: Model ${model} failed.`, e);
            }
        }
        return null;
    }

    getAvailableModels(): string[] {
        return [
            "llama-3.2-90b-vision-preview",
            "llama-3.2-11b-vision-preview",
            "llama-guard-3-8b",
            "llama3-70b-8192",
            "llama3-8b-8192",
            "mixtral-8x7b-32768"
        ];
    }

    setModel(modelId: string) {
        this.preferredModel = modelId;
        localStorage.setItem('groq_preferred_model', modelId);
        console.log(`Groq: Manually set model to ${modelId}`);
    }

    async verifyModel(key: string, modelId: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: "user", content: "Test" }],
                    max_tokens: 1
                })
            });

            if (response.ok) {
                return { valid: true };
            }
            const errorData = await response.json();
            return { valid: false, error: errorData.error?.message || response.statusText };
        } catch (e: any) {
            return { valid: false, error: e.message || "Network Error" };
        }
    }

    async validateKey(key: string): Promise<{ valid: boolean; model?: string }> {
        const detectedModel = await this.autoDetectModel(key);
        if (detectedModel) {
            if (!localStorage.getItem('groq_preferred_model')) {
                this.preferredModel = detectedModel;
                localStorage.setItem('groq_preferred_model', detectedModel);
            }
            return { valid: true, model: detectedModel };
        }
        return { valid: false };
    }

    async analyzeImage(
        base64Image: string,
        prompt: string,
        systemPrompt: string = "You are a helpful assistant."
    ): Promise<string> {
        if (this.apiKeys.length === 0) {
            throw new Error("No Groq API keys available.");
        }

        const key = this.apiKeys[this.currentKeyIndex];

        try {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: this.preferredModel, // Use detected model
                    messages: [
                        { role: "system", content: systemPrompt },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: base64Image // Groq accepts data URI directly
                                    }
                                }
                            ]
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1024
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || "No analysis generated.";

        } catch (error) {
            console.error("Groq Analysis Failed:", error);
            throw error;
        }
    }


    async generateText(prompt: string, systemPrompt: string = "You are a helpful assistant."): Promise<string> {
        if (this.apiKeys.length === 0) throw new Error("No Groq API keys available.");

        const key = this.apiKeys[this.currentKeyIndex];

        try {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: this.preferredModel,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 1024
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Groq API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || "No response.";
        } catch (error) {
            console.error("Groq Text Gen Failed:", error);
            throw error;
        }
    }
    getServiceStatus() {
        return {
            totalKeys: this.apiKeys.length,
            currentKeyIndex: this.currentKeyIndex,
            isConfigured: this.apiKeys.length > 0,
            activeModel: this.preferredModel
        };
    }
}

export const groqClient = new GroqClient();
