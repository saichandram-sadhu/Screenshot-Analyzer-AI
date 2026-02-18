
export class CohereClient {
    constructor() {
        this.apiKeys = this.loadApiKeys();
        this.currentKeyIndex = 0;
        this.model = "command-a-vision-07-2025";
    }

    loadApiKeys() {
        const storedKeys = localStorage.getItem('cohere_api_keys');
        if (storedKeys) {
            try {
                const parsed = JSON.parse(storedKeys);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {
                console.error("Failed to parse Cohere keys", e);
            }
        }

        // Fallback to legacy single key
        const legacyKey = localStorage.getItem('cohere_api_key');
        if (legacyKey) {
            const keys = [legacyKey];
            this.saveApiKeys(keys);
            localStorage.removeItem('cohere_api_key');
            return keys;
        }

        return [];
    }

    saveApiKeys(keys) {
        this.apiKeys = keys;
        localStorage.setItem('cohere_api_keys', JSON.stringify(keys));
        this.currentKeyIndex = 0;
    }

    getApiKeys() {
        return this.apiKeys;
    }

    rotateKey() {
        if (this.apiKeys.length <= 1) return false;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        console.log(`Rotating Cohere Key to index ${this.currentKeyIndex}`);
        return true;
    }

    getBaseUrl() {
        return import.meta.env.PROD ? 'https://api.cohere.com' : '/api/cohere';
    }

    async validateKey(key) {
        try {
            // Use list models endpoint to validate key (lighter and safer)
            const response = await fetch(`${this.getBaseUrl()}/v1/models`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json",
                    "X-Client-Name": "ScreenshotAnalyzer"
                }
            });
            return response.ok;
        } catch (error) {
            console.error("Cohere key validation error:", error);
            return false;
        }
    }

    async generateText(prompt) {
        if (this.apiKeys.length === 0) {
            throw new Error("Cohere API Key is missing.");
        }

        const maxRetries = this.apiKeys.length * 2;
        let attempts = 0;

        while (attempts < maxRetries) {
            const currentKey = this.apiKeys[this.currentKeyIndex];

            try {
                const response = await fetch(`${this.getBaseUrl()}/v2/chat`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${currentKey}`,
                        "Content-Type": "application/json",
                        "X-Client-Name": "ScreenshotAnalyzer"
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: [
                            {
                                role: "user",
                                content: [{ type: "text", text: prompt }]
                            }
                        ],
                        temperature: 0.3,
                        max_tokens: 2048
                    })
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        console.warn(`Cohere Key ${this.currentKeyIndex} Rate Limited (Polish).`);
                        if (this.rotateKey()) {
                            attempts++;
                            continue;
                        } else {
                            throw new Error("Cohere Rate Limit Reached.");
                        }
                    }
                    throw new Error(`Cohere API Error: ${response.status}`);
                }

                const data = await response.json();
                if (data.message?.content?.[0]?.text) {
                    return data.message.content[0].text;
                }
                throw new Error("Unexpected Cohere response format");

            } catch (error) {
                if (error.message.includes("429") || error.message.includes("quota")) {
                    if (this.rotateKey()) {
                        attempts++;
                        continue;
                    }
                }
                console.error("Cohere text generation failed:", error);
                throw error;
            }
        }
        throw new Error("All Cohere API Keys exhausted.");
    }

    async analyzeImage(file, prompt) {
        if (this.apiKeys.length === 0) {
            throw new Error("Cohere API Key is missing. Please add at least one key.");
        }

        const base64Image = await this.fileToBase64(file);
        const dataUrl = `data:${file.type};base64,${base64Image}`;

        const maxRetries = this.apiKeys.length * 2;
        let attempts = 0;

        while (attempts < maxRetries) {
            const currentKey = this.apiKeys[this.currentKeyIndex];

            try {
                // Use local proxy to avoid CORS issues
                const response = await fetch(`${this.getBaseUrl()}/v2/chat`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${currentKey}`,
                        "Content-Type": "application/json",
                        "X-Client-Name": "ScreenshotAnalyzer"
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: [
                            {
                                role: "user",
                                content: [
                                    { type: "text", text: prompt },
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: dataUrl
                                        }
                                    }
                                ]
                            }
                        ],
                        temperature: 0.2,
                        max_tokens: 4096
                    })
                });

                if (!response.ok) {
                    // Check for Rate Limit (429)
                    if (response.status === 429) {
                        console.warn(`Cohere Key ${this.currentKeyIndex} Rate Limited.`);
                        if (this.rotateKey()) {
                            attempts++;
                            continue;
                        } else {
                            throw new Error("Cohere Rate Limit Reached (No other keys available).");
                        }
                    }

                    const errText = await response.text();
                    throw new Error(`Cohere API Error (${response.status}): ${errText}`);
                }

                const data = await response.json();

                if (data.message && data.message.content && data.message.content.length > 0) {
                    return data.message.content.find(c => c.type === 'text')?.text || "No text description returned.";
                }

                throw new Error("Unexpected response format from Cohere");

            } catch (error) {
                if (error.message.includes("429") || error.message.includes("quota")) {
                    console.warn("Cohere Quota/Rate Limit Error caught.");
                    if (this.rotateKey()) {
                        attempts++;
                        continue;
                    }
                }
                console.error("Cohere analysis failed:", error);
                throw error;
            }
        }
        throw new Error("All Cohere API Keys exhausted or rate limited.");
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

export const cohereClient = new CohereClient();
