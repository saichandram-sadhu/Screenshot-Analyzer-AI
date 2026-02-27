# Design System: Screenshot Analyzer AI
**Project ID:** screenshot-analyzer-ai-premium

## 1. Visual Theme & Atmosphere
**Atmosphere:** Premium, Modern, Professional, Clean.
**Keywords:** Glassmorphism, Airy, Crisp, Trustworthy, High-Performance.
The interface should feel lightweight but powerful, utilizing subtle glass effects (backdrop-blur) to create depth without clutter. The focus is on the content (screenshots and analysis), with the UI receding gracefully.

## 2. Color Palette & Roles

### Primary Brand
- **Cosmic Blue (#0ea5e9 - Sky 500)**: Used for primary actions, active states, and key highlights. Vibrant and energetic.
- **Deep Void (#0f172a - Slate 900)**: Used for the main background in dark mode. A rich, deep navy-black that reduces eye strain.

### Functional Colors
- **Surface/Card (#1e293b - Slate 800)**: Used for card backgrounds and container surfaces. Slightly lighter than the void.
- **Surface Highlight (#334155 - Slate 700)**: Used for hover states on cards and interactive elements.
- **Text Primary (#f8fafc - Slate 50)**: High contrast text for headings and body.
- **Text Secondary (#94a3b8 - Slate 400)**: Muted text for meta-data, subtitles, and descriptions.
- **Border/Divider (#1e293b - Slate 800)**: Subtle separation lines.

### Semantic Colors
- **Success (#22c55e - Green 500)**: Completion, valid states.
- **Error (#ef4444 - Red 500)**: Critical failures, validation errors.
- **Warning (#f59e0b - Amber 500)**: Cautions, non-critical issues.
- **Info (#3b82f6 - Blue 500)**: Informational toasts or badges.

## 3. Typography Rules
**Font Family:** 'Inter', sans-serif. Clean, modern, and highly legible at all sizes.

- **Display (H1):** Bold (700), Tight tracking (-0.02em). Used for main page titles and hero sections.
- **Heading (H2/H3):** Semibold (600). Used for section headers and card titles.
- **Body:** Regular (400). Used for all standard text. High readability.
- **Code/Monospace:** 'Jetbrains Mono' or 'Fira Code' (if available), otherwise system-ui monospace. Used for JSON, code snippets, and technical data.

## 4. Component Stylings

* **Buttons:**
    *   *Primary:* Pill-shaped or slightly rounded (rounded-lg). Solid Primary color with subtle shadow. Transition on hover: brightness-110 and slight lift (-1px).
    *   *Secondary:* Glass effect (bg-white/10 or bg-slate-800/50). Backdrop blur. White text. Border-1px (slate-700).
    *   *Ghost:* Transparent background. Hover: bg-slate-800/50.

* **Cards/Containers:**
    *   *Standard:* rounded-xl. bg-slate-800/50 (Glass). backdrop-blur-md. Border-1px (slate-700/50).
    *   *Hover Effect:* Transition-all duration-300. Hover: border-sky-500/30 (Glow effect).

* **Inputs/Forms:**
    *   rounded-lg. bg-slate-900/50. Border-1px (slate-700). Focus: Ring-2 ring-sky-500/50. Text-slate-100.

## 5. Layout Principles
- **Whitespace:** Generous. Use `gap-6` or `gap-8` to let content breathe.
- **Grid:** Responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3) for analysis cards.
- **Alignment:** Center-aligned main containers with max-width (max-w-7xl).
- **Depth:** Use z-index and shadows to establish hierarchy. Modals > Dropdowns > Sticky Headers > Page Content > Background.

## 6. Animation Tokens (Framer Motion)
- **Transition:** `type: "spring", stiffness: 300, damping: 30` (Snappy but smooth).
- **Hover:** `scale: 1.02` for cards.
- **Page Load:** `opacity: 0 -> 1`, `y: 20 -> 0`.
