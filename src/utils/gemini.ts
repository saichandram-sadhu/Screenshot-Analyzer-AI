import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

class GeminiClient {
    apiKeys: string[];
    currentKeyIndex: number;
    genAI: GoogleGenerativeAI | null;
    model: GenerativeModel | null;
    preferredModel: string;

    constructor() {
        this.apiKeys = this.loadApiKeys();
        this.currentKeyIndex = 0;
        this.genAI = null;
        this.model = null;
        this.preferredModel = localStorage.getItem('gemini_preferred_model') || "gemini-1.5-flash";
        this.initClient();
    }

    loadApiKeys(): string[] {
        const storedKeys = localStorage.getItem('gemini_api_keys');
        let parsedKeys: string[] = [];
        if (storedKeys) {
            try {
                parsedKeys = JSON.parse(storedKeys);
            } catch (e) {
                console.error("Failed to parse stored API keys", e);
                localStorage.removeItem('gemini_api_keys');
            }
        }
        return parsedKeys.length > 0 ? parsedKeys : [];
    }

    saveApiKeys(keys: string[]) {
        this.apiKeys = keys;
        localStorage.setItem('gemini_api_keys', JSON.stringify(keys));
        this.initClient();
    }

    initClient() {
        if (this.apiKeys.length > 0) {
            if (this.currentKeyIndex >= this.apiKeys.length) {
                this.currentKeyIndex = 0;
            }

            const key = this.apiKeys[this.currentKeyIndex];
            if (!key) return;

            try {
                this.genAI = new GoogleGenerativeAI(key);
                this.model = this.genAI.getGenerativeModel({ model: this.preferredModel });
                console.log(`Initialized Gemini with model: ${this.preferredModel}`);
            } catch (error) {
                console.error("Error initializing Gemini client:", error);
            }
        }
    }

    async autoDetectModel(key: string): Promise<string | null> {
        // Try models in order of preference (Newest/Best -> Standard -> Fast)
        const modelsToTry = [
            "gemini-2.0-pro-exp-02-05", // Experimental Pro 2.0
            "gemini-2.0-flash",         // Flash 2.0
            "gemini-1.5-pro",           // Standard Pro 1.5
            "gemini-1.5-flash",         // Standard Flash 1.5

            // User Requested / Speculative (Will work if/when released)
            "gemini-3.0",
            "gemini-2.5",
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash-exp",
        ];
        const genAI = new GoogleGenerativeAI(key);

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Test");
                const response = await result.response;
                if (response.text()) {
                    console.log(`Auto-detected best model for key: ${modelName}`);
                    return modelName;
                }
            } catch (e) {
                console.warn(`Model ${modelName} failed for key:`, e);
            }
        }
        return null;
    }

    getAvailableModels(): string[] {
        return [
            // Latest / Stable & Preview
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite-preview-02-05", // Experimental Preview
            "gemini-2.0-flash-lite",                 // Stable Alias?
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",

            // Experimental
            "gemini-2.0-pro-exp-02-05",
            "gemini-2.0-flash-thinking-exp-01-21",

            // Gemini 2.5 Series (2026)
            "gemini-2.5-flash",
            "gemini-2.5-flash-001",
            "gemini-2.5-pro",
            "gemini-2.5-pro-001",
            "gemini-2.5-flash-lite", // User requested
            "gemini-2.5-lite",       // Possible alias
        ];
    }

    setModel(modelId: string) {
        this.preferredModel = modelId;
        localStorage.setItem('gemini_preferred_model', modelId);
        this.initClient();
        console.log(`Gemini: Manually set model to ${modelId}`);
    }

    async verifyModel(key: string, modelId: string): Promise<{ valid: boolean; error?: string }> {
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent("Test");
            const response = await result.response;
            if (response.text()) {
                return { valid: true };
            }
            return { valid: false, error: "No response text" };
        } catch (e: any) {
            let errorMsg = e.message || "Unknown error";
            if (e.message?.includes('404')) errorMsg = "Model not found/available";
            if (e.message?.includes('403')) errorMsg = "Access denied (Region/Key)";
            if (e.message?.includes('429')) errorMsg = "Quota exceeded";
            return { valid: false, error: errorMsg };
        }
    }

    async validateKey(key: string): Promise<{ valid: boolean; model?: string; error?: string }> {
        try {
            const detectedModel = await this.autoDetectModel(key);
            if (detectedModel) {
                if (!localStorage.getItem('gemini_preferred_model')) {
                    this.preferredModel = detectedModel;
                    localStorage.setItem('gemini_preferred_model', detectedModel);
                }

                // Re-init with new model preference if this key is active
                if (this.apiKeys.includes(key)) {
                    this.initClient();
                }
                return { valid: true, model: detectedModel };
            }
            return { valid: false, error: "Model auto-detection failed" };
        } catch (e: any) {
            if (e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('limit')) {
                return { valid: false, error: "quota" };
            }
            return { valid: false, error: e.message || "Unknown error" };
        }
    }

    async rotateKey() {
        if (this.apiKeys.length <= 1) return false;

        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        console.log(`Rotating API key. New index: ${this.currentKeyIndex}`);

        // Re-initialize 
        this.initClient();
        return true;
    }

    async analyzeImage(file: File, prompt: string, onRetry: ((msg: string) => void) | null = null): Promise<string> {
        if (!this.model) {
            throw new Error("API keys not configured. Please add valid API keys.");
        }

        const maxRetries = this.apiKeys.length * 3;
        let attempts = 0;

        while (attempts < maxRetries) {
            try {
                const imagePart = await this.fileToGenerativePart(file);
                const result = await this.model.generateContent({
                    contents: [
                        { role: 'user', parts: [{ text: prompt }, imagePart] }
                    ],
                    generationConfig: {
                        maxOutputTokens: 4096,
                        temperature: 0.2,
                        topP: 0.9,
                    }
                });
                const response = await result.response;
                return response.text();
            } catch (error: any) {
                console.error(`Attempt ${attempts + 1} failed:`, error.message);

                const isQuotaError = error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("limit");

                if (isQuotaError && this.apiKeys.length > 0) {
                    attempts++;

                    if (attempts >= this.apiKeys.length) {
                        const backoffTime = 5000 + (attempts * 2000);
                        const waitMsg = `All keys quota limited. Waiting ${backoffTime / 1000}s before retry...`;
                        console.warn(waitMsg);
                        if (onRetry) onRetry(waitMsg);
                        await new Promise(resolve => setTimeout(resolve, backoffTime));
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    await this.rotateKey();
                    if (onRetry && attempts < this.apiKeys.length) {
                        onRetry(`Quota exceeded. Switching to API key #${this.currentKeyIndex + 1}...`);
                    }
                    continue;
                }
                throw error;
            }
        }
        throw new Error("Global Quota Limit: Unable to process request after checking all API keys.");
    }

    async fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    const base64Data = reader.result.split(',')[1];
                    resolve({
                        inlineData: {
                            data: base64Data,
                            mimeType: file.type
                        },
                    });
                } else {
                    reject(new Error("Failed to read file"));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async generateText(prompt: string): Promise<string> {
        if (!this.model) {
            throw new Error("API keys not configured.");
        }

        const maxRetries = this.apiKeys.length * 2;
        let attempts = 0;

        while (attempts < maxRetries) {
            try {
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (error: any) {
                console.error(`Text Gen Attempt ${attempts + 1} failed:`, error.message);
                const isQuotaError = error.message?.includes("429") || error.message?.includes("quota");

                if (isQuotaError && this.apiKeys.length > 0) {
                    attempts++;
                    await this.rotateKey();
                    continue;
                }
                throw error;
            }
        }
        throw new Error("Global Quota Limit for Text Generation.");
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

export const geminiClient = new GeminiClient();
