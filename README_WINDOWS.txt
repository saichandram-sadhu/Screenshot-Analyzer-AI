# How to Build for Windows

Since we are developing on Linux, we couldn't create the `.exe` file directly.
Follow these simple steps to build it on any Windows computer:

## 1. Copy the Project
Copy this entire `ai-project-analize-screenshot` folder to your Windows machine.

## 2. Install Node.js
Make sure you have Node.js installed on Windows.
Download: https://nodejs.org/

## 3. Run Build Commands
Open Command Prompt (cmd) or PowerShell inside the project folder and run:

```bash
npm install
npm run electron:build:win
```

## 4. Find the App
Your `.exe` file will be created in the `dist_electron` folder.

---

## Does "Local Model Detection" work on Windows?
**YES! 100%.**
The app connects to `http://localhost:11434`.
As long as you have **Ollama** installed and running on Windows, this app will automatically find your models (Llama 3.2, Llava, etc.) just like it does on Linux.
