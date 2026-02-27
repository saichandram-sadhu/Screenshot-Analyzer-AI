export class CohereClient {
    private apiKeys: string[];
    public currentKeyIndex: number;
    private baseUrl: string;

    private preferredModel: string;

    constructor() {
        this.apiKeys = this.loadApiKeys();
        this.currentKeyIndex = 0;
        // Always use proxy in Dev to avoid CORS.
        this.baseUrl = '/api/cohere/v1/chat';
        this.preferredModel = localStorage.getItem('cohere_preferred_model') || "command-r-plus";

        // Electron / specific environment override
        if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
            this.baseUrl = 'https://api.cohere.com/v1/chat';
        }
    }

    loadApiKeys(): string[] {
        const stored = localStorage.getItem('cohere_api_keys');
        return stored ? JSON.parse(stored) : [];
    }

    saveApiKeys(keys: string[]): void {
        this.apiKeys = keys;
        localStorage.setItem('cohere_api_keys', JSON.stringify(keys));
        this.currentKeyIndex = 0;
    }

    getCurrentKey(): string | null {
        if (this.apiKeys.length === 0) return null;
        return this.apiKeys[this.currentKeyIndex];
    }

    rotateKey(): boolean {
        if (this.apiKeys.length <= 1) return false;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        return true;
    }

    async autoDetectModel(key: string): Promise<string | null> {
        // Try models (R+ is best, R is faster/cheaper/more available)
        const modelsToTry = ["command-r-plus", "command-r", "command-r-08-2024"];

        for (const model of modelsToTry) {
            try {
                const response = await fetch(this.baseUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json",
                        "X-Client-Name": "Screenshot-Analyzer-AI"
                    },
                    body: JSON.stringify({
                        message: "Test",
                        model: model
                    })
                });

                if (response.ok) {
                    console.log(`Cohere: Auto-detected best model: ${model}`);
                    return model;
                }
            } catch (e) {
                console.warn(`Cohere: Model ${model} failed.`, e);
            }
        }
        return null;
    }

    getAvailableModels(): string[] {
        return [
            // Enterprise / High Performance
            "command-r-plus",
            "command-r-plus-08-2024",
            "command-r",
            "command-r-08-2024",

            // Specialized / Efficient
            "command-r7b-12-2024",

            // Multilingual / Open Weights
            "c4ai-aya-expanse-32b",
            "c4ai-aya-expanse-8b",

            // Legacy / Other
            "command-light",
            "command-nightly"
        ];
    }

    setModel(modelId: string) {
        this.preferredModel = modelId;
        localStorage.setItem('cohere_preferred_model', modelId);
        console.log(`Cohere: Manually set model to ${modelId}`);
    }

    async verifyModel(key: string, modelId: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json",
                    "X-Client-Name": "Screenshot-Analyzer-AI"
                },
                body: JSON.stringify({
                    message: "Test",
                    model: modelId
                })
            });

            if (response.ok) {
                return { valid: true };
            }
            const error = await response.json();
            return { valid: false, error: error.message || response.statusText };
        } catch (e: any) {
            return { valid: false, error: e.message || "Network Error" };
        }
    }

    async validateKey(key: string): Promise<{ valid: boolean; model?: string }> {
        const detectedModel = await this.autoDetectModel(key);
        if (detectedModel) {
            if (!localStorage.getItem('cohere_preferred_model')) {
                this.preferredModel = detectedModel;
                localStorage.setItem('cohere_preferred_model', detectedModel);
            }
            return { valid: true, model: detectedModel };
        }
        return { valid: false };
    }

    async analyzeText(
        text: string,
        prompt: string,
        systemPrompt: string = "You are a helpful assistant."
    ): Promise<string> {
        if (this.apiKeys.length === 0) throw new Error("No Cohere API keys available.");

        let attempts = 0;
        const maxAttempts = this.apiKeys.length;

        while (attempts < maxAttempts) {
            const key = this.apiKeys[this.currentKeyIndex];
            try {
                const response = await fetch(this.baseUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json",
                        "X-Client-Name": "Screenshot-Analyzer-AI"
                    },
                    body: JSON.stringify({
                        message: prompt + "\n\nContext:\n" + text,
                        preamble: systemPrompt,
                        model: this.preferredModel, // Use detected model
                        temperature: 0.3
                    })
                });

                if (response.status === 429) {
                    console.warn(`Cohere Key ${this.currentKeyIndex} exhausted. Rotating...`);
                    if (this.rotateKey()) {
                        attempts++;
                        continue;
                    } else {
                        throw new Error("All Cohere keys exhausted.");
                    }
                }

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Cohere API Error: ${error.message || response.statusText}`);
                }

                const data = await response.json();
                return data.text || "No response generated.";

            } catch (error) {
                console.error("Cohere Request Failed:", error);
                if (attempts === maxAttempts - 1) throw error;
                this.rotateKey();
                attempts++;
            }
        }
        throw new Error("Cohere analysis failed after retries.");
    }


    async generateText(prompt: string, systemPrompt: string = "You are a helpful assistant."): Promise<string> {
        if (this.apiKeys.length === 0) throw new Error("No Cohere API keys available.");

        const key = this.apiKeys[this.currentKeyIndex];

        try {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json",
                    "X-Client-Name": "Screenshot-Analyzer-AI"
                },
                body: JSON.stringify({
                    message: prompt,
                    preamble: systemPrompt,
                    model: this.preferredModel,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Cohere API Error: ${error.message || response.statusText}`);
            }

            const data = await response.json();
            return data.text || "No response generated.";
        } catch (error) {
            console.error("Cohere Text Gen Failed:", error);
            throw error;
        }
    }
    private fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }

    async analyzeImage(file: File, prompt: string): Promise<string> {
        if (this.apiKeys.length === 0) throw new Error("No Cohere API keys available.");

        try {
            const base64Image = await this.fileToBase64(file);
            const key = this.apiKeys[this.currentKeyIndex];

            // Use 'images' parameter for the Chat API (Native Cohere Vision)
            // Note: This requires models that support vision (Command R 08-2024 / Command R+ 08-2024)
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json",
                    "X-Client-Name": "Screenshot-Analyzer-AI"
                },
                body: JSON.stringify({
                    message: prompt,
                    model: this.preferredModel, // Must be a vision-capable model
                    images: [base64Image],
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const error = await response.json();
                // Specific handling for "model does not support vision" to give helpful error
                if (error.message?.includes('vision') || error.message?.includes('image')) {
                    throw new Error(`Current model (${this.preferredModel}) does not support images. Try 'command-r-plus-08-2024'.`);
                }
                throw new Error(`Cohere API Error: ${error.message || response.statusText}`);
            }

            const data = await response.json();
            return data.text || "No response generated.";

        } catch (error) {
            console.error("Cohere Vision Failed:", error);
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

export const cohereClient = new CohereClient();
