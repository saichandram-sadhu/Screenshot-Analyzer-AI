class LocalLLMClient {
    constructor() {
        this.baseUrl = 'http://localhost:11434';
        this.selectedModel = 'llava'; // Default vision model, can be changed
    }

    async checkAvailability() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) return false;
            const data = await response.json();
            return {
                available: true,
                models: data.models || []
            };
        } catch (error) {
            console.error("Ollama check failed:", error);
            return { available: false, error: "Ollama not running or unreachable" };
        }
    }

    async getRunningInfo() {
        try {
            const response = await fetch(`${this.baseUrl}/api/ps`);
            if (!response.ok) return null;
            const data = await response.json();
            if (data.models?.length > 0) {
                if (data.models?.length > 0) {
                    const model = data.models[0];
                    const gpuPercent = ((model.size_vram / model.size) * 100).toFixed(1);
                    console.log(`Ollama Status: ${model.name} | GPU Layer: ${gpuPercent}% | VRAM: ${(model.size_vram / 1024 / 1024 / 1024).toFixed(2)}GB | RAM: ${(model.size / 1024 / 1024 / 1024).toFixed(2)}GB`);
                    return model;
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    async listVisionModels() {
        const status = await this.checkAvailability();
        if (!status.available) return [];

        // Filter for known vision models or just return all (Ollama doesn't strictly tag vision capability in API yet)
        // Common vision models: llava, moondream, llama3.2-vision
        return status.models.filter(m =>
            m.name.includes('llava') ||
            m.name.includes('moondream') ||
            m.name.includes('vision') ||
            m.name.includes('qwen') ||
            m.name.includes('vl') ||
            m.details?.families?.includes('clip') // often indicates vision support
        );
    }

    async generateText(prompt) {
        if (!this.selectedModel) {
            throw new Error("No local model selected.");
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.selectedModel,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.3,
                        num_ctx: 4096
                    }
                })
            });

            if (!response.ok) {
                throw new Error("Ollama generation failed");
            }

            const data = await response.json();
            return data.response;

        } catch (error) {
            console.error("Local text generation failed:", error);
            throw error;
        }
    }

    async analyzeImage(file, prompt, onToken, onMetrics, signal) {
        if (!this.selectedModel) {
            throw new Error("No local model selected.");
        }

        const base64Image = await this.fileToBase64(file);
        let fullResponse = "";
        let startTime = Date.now();
        let lastUpdate = 0;
        let tokenCount = 0;

        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.selectedModel,
                    prompt: prompt,
                    images: [base64Image],
                    stream: true, // Enable streaming
                    options: {
                        temperature: 0.2,
                        num_ctx: 4096,
                        num_predict: 4096
                    }
                }),
                signal: signal // Pass abort signal
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Ollama API Error: ${errText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                // Ollama sends multiple JSON objects in one chunk sometimes
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.response) {
                            fullResponse += json.response;
                            tokenCount++;
                            if (onToken) onToken(json.response);
                        }

                        // Calculate Metrics
                        if (json.done) {
                            // Final metrics from Ollama
                            if (onMetrics) {
                                const durationSec = json.eval_duration / 1e9; // nanoseconds to seconds
                                const speed = json.eval_count / durationSec;
                                onMetrics({
                                    tps: speed.toFixed(1),
                                    totalTokens: json.eval_count,
                                    duration: (json.total_duration / 1e9).toFixed(1),
                                    done: true
                                });
                            }
                        } else {
                            // Estimated metrics during stream
                            const now = Date.now();
                            const elapsed = (now - startTime) / 1000;

                            // Throttle UI updates to every 100ms to prevent freezing
                            if (onMetrics && (now - lastUpdate > 100)) {
                                lastUpdate = now;
                                console.log("LocalLLM Metrics Update:", tokenCount, elapsed.toFixed(1));
                                onMetrics({
                                    tps: (tokenCount / elapsed).toFixed(1),
                                    totalTokens: tokenCount,
                                    duration: elapsed.toFixed(1),
                                    done: false
                                });
                            }
                        }
                    } catch (e) {
                        console.error("Error parsing Ollama chunk", e);
                    }
                }
            }

            return fullResponse;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log("Analysis aborted by user");
                throw new Error("Analysis aborted");
            }
            console.error("Local analysis failed:", error);
            if (error.message.includes("Failed to fetch")) {
                throw new Error("Cannot connect to Ollama. Is 'ollama serve' running?");
            }
            throw error;
        }
    }

    // Helper to get raw base64 string without data URI prefix
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // remove "data:image/png;base64," prefix
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    setModel(modelName) {
        this.selectedModel = modelName;
    }

    async unloadModel(modelName) {
        if (!modelName) return;
        try {
            console.log(`Unloading model: ${modelName}`);

            // Strategy 1: Standard Unload
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    keep_alive: 0
                })
            });

            if (response.ok) {
                console.log(`Model ${modelName} unloaded successfully.`);
                return true;
            } else {
                console.error(`Failed to unload model: ${response.statusText}`);
                return false;
            }
        } catch (e) {
            console.error("Failed to unload model:", e);
            return false;
        }
    }
}

export const localClient = new LocalLLMClient();
