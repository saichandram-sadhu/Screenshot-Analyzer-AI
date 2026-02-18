# How to Build for Mac (macOS) 🍎

Building a valid `.dmg` installer requires a Mac computer.

## 1. Get the Project
You can use the same `project_ready_for_windows.zip` file, or copy the project folder to your Mac.

## 2. Install Node.js
Make sure **Node.js** is installed on your Mac.
Download: https://nodejs.org/

## 3. Run Build Commands
Open **Terminal** inside the project folder and run:

```bash
npm install
npm run electron:build:mac
```

## 4. Find the App
Your `.dmg` installer will be created in the `dist_electron` folder.
*   The **App Icon** will be automatically applied.
*   **Ollama Auto-Detection** works perfectly on Mac too (ensure Ollama is running).

## Note on Signing
If you plan to distribute this to others, you may need an Apple Developer Account to "Sign" the app, otherwise macOS might say "Unverified Developer" when opening.
For personal use, you can just Right-Click -> Open to bypass this.
