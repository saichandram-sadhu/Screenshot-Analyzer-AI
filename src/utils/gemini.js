import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiClient {
    constructor() {
        this.apiKeys = this.loadApiKeys();
        this.currentKeyIndex = 0;
        this.genAI = null;
        this.model = null;
        this.initClient();
    }

    loadApiKeys() {
        const storedKeys = localStorage.getItem('gemini_api_keys');
        let parsedKeys = [];
        if (storedKeys) {
            try {
                parsedKeys = JSON.parse(storedKeys);
            } catch (e) {
                console.error("Failed to parse stored API keys", e);
                localStorage.removeItem('gemini_api_keys');
            }
        }

        if (parsedKeys.length > 0) return parsedKeys;

        if (parsedKeys.length > 0) return parsedKeys;

        // No default keys - User must provide their own
        return [];
    }

    saveApiKeys(keys) {
        this.apiKeys = keys;
        localStorage.setItem('gemini_api_keys', JSON.stringify(keys));
        this.initClient();
    }

    initClient() {
        if (this.apiKeys.length > 0) {
            // Ensure index is within bounds
            if (this.currentKeyIndex >= this.apiKeys.length) {
                this.currentKeyIndex = 0;
            }

            const key = this.apiKeys[this.currentKeyIndex];
            // Skip empty keys
            if (!key) return;

            try {
                this.genAI = new GoogleGenerativeAI(key);
                // Switching to gemini-2.0-flash as requested
                this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            } catch (error) {
                console.error("Error initializing Gemini client:", error);
            }
        }
    }

    async rotateKey() {
        if (this.apiKeys.length <= 1) return false;

        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        console.log(`Rotating API key. New index: ${this.currentKeyIndex}`);

        // Re-initialize with new key
        this.initClient();
        return true;
    }

    async analyzeImage(file, prompt, onRetry = null) {
        if (!this.model) {
            throw new Error("API keys not configured. Please add valid API keys.");
        }

        const maxRetries = this.apiKeys.length * 3; // Allow cycling through all keys multiple times
        let attempts = 0;

        while (attempts < maxRetries) {
            try {
                const imagePart = await this.fileToGenerativePart(file);
                const result = await this.model.generateContent({
                    contents: [prompt, imagePart],
                    generationConfig: {
                        maxOutputTokens: 4096,
                        temperature: 0.2,
                        topP: 0.9,
                    }
                });
                const response = await result.response;
                return response.text();
            } catch (error) {
                console.error(`Attempt ${attempts + 1} failed:`, error.message);

                // Check for quota exceeded errors (429) or other likely key-related issues
                const isQuotaError = error.message.includes("429") || error.message.includes("quota") || error.message.includes("limit");

                if (isQuotaError && this.apiKeys.length > 0) {
                    attempts++;

                    // Logic to handle "All keys exhausted" scenario
                    // If we have tried as many times as we have keys, it means we've likely cycled through all of them at least once.
                    // We should start adding significant delays.
                    if (attempts >= this.apiKeys.length) {
                        const backoffTime = 5000 + (attempts * 2000); // 5s, 7s, 9s...
                        const waitMsg = `All keys quota limited. Waiting ${backoffTime / 1000}s before retry...`;
                        console.warn(waitMsg);
                        if (onRetry) onRetry(waitMsg);
                        await new Promise(resolve => setTimeout(resolve, backoffTime));
                    } else {
                        // Standard short delay for quick rotation
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    // Rotate
                    await this.rotateKey();
                    if (onRetry && attempts < this.apiKeys.length) {
                        onRetry(`Quota exceeded. Switching to API key #${this.currentKeyIndex + 1}...`);
                    }

                    // Continue loop to retry
                    continue;
                }

                // If not a quota error, or no keys to rotate, throw immediately
                throw error;
            }
        }

        throw new Error("Global Quota Limit: Unable to process request after checking all API keys. Please try again later.");
    }

    async fileToGenerativePart(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = reader.result.split(',')[1];
                resolve({
                    inlineData: {
                        data: base64Data,
                        mimeType: file.type
                    },
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async generateText(prompt) {
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
            } catch (error) {
                console.error(`Text Gen Attempt ${attempts + 1} failed:`, error.message);
                const isQuotaError = error.message.includes("429") || error.message.includes("quota");

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
            isConfigured: this.apiKeys.length > 0
        };
    }
}

export const geminiClient = new GeminiClient();
