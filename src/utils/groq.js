
export class GroqClient {
    constructor() {
        this.apiKeys = this.loadApiKeys();
        this.currentKeyIndex = 0;
        this.model = "meta-llama/llama-4-maverick-17b-128e-instruct";
    }

    loadApiKeys() {
        const storedKeys = localStorage.getItem('groq_api_keys');
        if (storedKeys) {
            try {
                const parsed = JSON.parse(storedKeys);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {
                console.error("Failed to parse Groq keys", e);
            }
        }

        // Fallback to legacy single key if exists
        const legacyKey = localStorage.getItem('groq_api_key');
        if (legacyKey) {
            const keys = [legacyKey];
            this.saveApiKeys(keys); // Migrate to new format
            localStorage.removeItem('groq_api_key');
            return keys;
        }

        return [];
    }

    saveApiKeys(keys) {
        this.apiKeys = keys;
        localStorage.setItem('groq_api_keys', JSON.stringify(keys));
        this.currentKeyIndex = 0; // Reset index on update
    }

    getApiKeys() {
        return this.apiKeys;
    }

    rotateKey() {
        if (this.apiKeys.length <= 1) return false;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        console.log(`Rotating Groq Key to index ${this.currentKeyIndex}`);
        return true;
    }

    async validateKey(key) {
        try {
            // Simple model list check to validate key
            const response = await fetch("https://api.groq.com/openai/v1/models", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json"
                }
            });
            return response.ok;
        } catch (error) {
            console.error("Groq key validation error:", error);
            return false;
        }
    }

    async generateText(prompt) {
        if (this.apiKeys.length === 0) {
            throw new Error("Groq API Key is missing.");
        }

        const maxRetries = this.apiKeys.length * 2;
        let attempts = 0;

        while (attempts < maxRetries) {
            const currentKey = this.apiKeys[this.currentKeyIndex];

            try {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${currentKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        model: this.model,
                        temperature: 0.3,
                        max_tokens: 2048
                    })
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        console.warn(`Groq Key ${this.currentKeyIndex} Rate Limited (Polish).`);
                        if (this.rotateKey()) {
                            attempts++;
                            continue;
                        } else {
                            throw new Error("Groq Rate Limit Reached.");
                        }
                    }
                    throw new Error(`Groq API Error: ${response.status}`);
                }

                const data = await response.json();
                return data.choices[0].message.content;

            } catch (error) {
                if (error.message.includes("429") || error.message.includes("quota")) {
                    if (this.rotateKey()) {
                        attempts++;
                        continue;
                    }
                }
                console.error("Groq text generation failed:", error);
                throw error;
            }
        }
        throw new Error("All Groq API Keys exhausted.");
    }

    async analyzeImage(file, prompt) {
        if (this.apiKeys.length === 0) {
            throw new Error("Groq API Key is missing. Please add at least one key.");
        }

        const base64Image = await this.fileToBase64(file);
        const imageUrl = `data:image/png;base64,${base64Image}`;

        const maxRetries = this.apiKeys.length * 2;
        let attempts = 0;

        while (attempts < maxRetries) {
            const currentKey = this.apiKeys[this.currentKeyIndex];

            try {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${currentKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        messages: [{
                            role: "user",
                            content: [
                                { type: "text", text: prompt + " \n IMPORTANT: Return ONLY valid JSON. No markdown." },
                                {
                                    type: "image_url",
                                    image_url: {
                                        "url": imageUrl
                                    }
                                }
                            ]
                        }],
                        model: this.model,
                        temperature: 0.2,
                        max_tokens: 4096,
                        response_format: { type: "json_object" }
                    })
                });

                if (!response.ok) {
                    // Check for Rate Limit (429)
                    if (response.status === 429) {
                        console.warn(`Groq Key ${this.currentKeyIndex} Rate Limited.`);
                        if (this.rotateKey()) {
                            attempts++;
                            continue; // Retry with new key
                        } else {
                            // No other keys, must wait
                            throw new Error("Groq Rate Limit Reached (No other keys available).");
                        }
                    }

                    const errText = await response.text();
                    throw new Error(`Groq API Error (${response.status}): ${errText}`);
                }

                const data = await response.json();
                return data.choices[0].message.content;

            } catch (error) {
                // Check network level 429 or quota errors if safe parsing fails
                if (error.message.includes("429") || error.message.includes("quota")) {
                    console.warn("Groq Quota/Rate Limit Error caught.");
                    if (this.rotateKey()) {
                        attempts++;
                        continue;
                    }
                }
                console.error("Groq analysis failed:", error);
                throw error;
            }
        }
        throw new Error("All Groq API Keys exhausted or rate limited.");
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

export const groqClient = new GroqClient();
