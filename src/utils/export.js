import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, Header, Footer, PageBreak, PageNumber } from 'docx';

// Utility to strip markdown syntax for cleaner output
const cleanText = (text) => {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
        .replace(/\*(.*?)\*/g, '$1')     // Italic
        .replace(/##\s?/g, '')           // H2
        .replace(/#\s?/g, '')            // H1
        .replace(/__\s?/g, '')           // Underline/Bold
        .trim();
};

const getImageDimensions = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = reject;
        img.src = url;
    });
};

export const exportToPDF = async (steps, docTitle, options = {}) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;
    let yPos = 20;

    const reportTitle = docTitle || "Screenshot Analysis Report";
    const {
        footerText = "Screenshot Analyzer",
        brandingText = "Developed by Saichandram Sadhu",
        logoBase64 = null,
        theme = 'blue'
    } = options;

    // Theme Colors
    const colors = {
        blue: { primary: [14, 165, 233], secondary: [240, 249, 255] }, // Sky 500, Sky 50
        purple: { primary: [168, 85, 247], secondary: [250, 245, 255] }, // Purple 500, Purple 50
        minimal: { primary: [30, 41, 59], secondary: [248, 250, 252] }, // Slate 800, Slate 50
    };
    const activeTheme = colors[theme] || colors.blue;

    // --- COVER PAGE ---
    doc.setFillColor(...activeTheme.secondary); // Background
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    let titleY = pageHeight / 3;

    // Logo
    if (logoBase64) {
        try {
            const logoW = 40;
            const logoH = 40; // Aspect ratio usually preserved by PDF lib or mocked here
            // Centered logo
            doc.addImage(logoBase64, 'PNG', (pageWidth - logoW) / 2, titleY - 60, logoW, logoH);
        } catch (e) {
            console.error("Logo Error PDF", e);
        }
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(15, 23, 42); // Slate 900
    const titleLines = doc.splitTextToSize(reportTitle, maxLineWidth);
    doc.text(titleLines, pageWidth / 2, titleY, { align: "center" });

    // Subtitle / Date - REMOVED per user request
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105); // Slate 600
    // doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, (pageHeight / 3) + 20, { align: "center" });

    // Credit
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(brandingText, pageWidth / 2, pageHeight - 30, { align: "center" });

    doc.addPage();
    yPos = 20;

    // --- CONTENT PAGES ---
    let index = 0;
    for (const step of steps) {
        index++;
        // Reset check
        if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = 20;
        }

        // Step Badge - REMOVED per user request
        /*
        doc.setFillColor(...activeTheme.primary);
        doc.roundedRect(margin, yPos, 20, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`STEP ${index + 1}`, margin + 10, yPos + 5.5, { align: "center" });
        */

        // Removed extra space from badge
        // yPos += 15;

        yPos += 15;

        // Step Title
        const title = step.title || `Action Step ${index + 1}`;
        doc.setTextColor(30, 41, 59); // Slate 800
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        const stepTitleLines = doc.splitTextToSize(title, maxLineWidth);
        doc.text(stepTitleLines, margin, yPos);
        yPos += (stepTitleLines.length * 7) + 8;

        // Image
        if (step.preview) {
            try {
                // Convert Blob URL/File to Base64 for jsPDF
                const base64Data = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg', 0.8)); // Compress slightly
                    };
                    img.onerror = reject;
                    img.src = step.preview;
                });

                const imgProps = doc.getImageProperties(base64Data);
                const maxWidth = maxLineWidth;
                const maxHeight = pageHeight * 0.5;

                let pdfImgWidth = maxWidth;
                let pdfImgHeight = (imgProps.height * maxWidth) / imgProps.width;

                if (pdfImgHeight > maxHeight) {
                    pdfImgHeight = maxHeight;
                    pdfImgWidth = (imgProps.width * maxHeight) / imgProps.height;
                }

                // Page Break Check for Image
                if (yPos + pdfImgHeight > pageHeight - margin) {
                    doc.addPage();
                    yPos = 20;
                }

                const xPos = margin + (maxLineWidth - pdfImgWidth) / 2;

                // Image Border
                doc.setDrawColor(226, 232, 240); // Slate 200
                doc.setLineWidth(0.5);
                doc.rect(xPos - 1, yPos - 1, pdfImgWidth + 2, pdfImgHeight + 2);

                doc.addImage(base64Data, 'JPEG', xPos, yPos, pdfImgWidth, pdfImgHeight);
                yPos += pdfImgHeight + 12;
            } catch (e) {
                console.error("Error adding image to PDF", e);
            }
        }

        // Description
        const cleanedText = cleanText(step.text);
        doc.setFont("times", "normal"); // 'roman' is not a valid style, use 'normal'
        doc.setFontSize(12);
        doc.setTextColor(51, 65, 85); // Slate 700

        const lines = doc.splitTextToSize(cleanedText || "", maxLineWidth);

        lines.forEach(line => {
            if (yPos > pageHeight - margin) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(line, margin, yPos);
            yPos += 7; // Line height
        });

        yPos += 15; // Space between steps

        // Separator Line
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(1);
        doc.line(margin, yPos - 7, pageWidth - margin, yPos - 7);
    }

    // Page Numbers Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        // Skip cover page (page 1)
        if (i === 1) continue;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
        doc.text(footerText, margin, pageHeight - 10, { align: "left" });
    }

    doc.save(`${reportTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
};

export const exportToWord = async (steps, docTitle, options = {}) => {
    try {
        const reportTitle = docTitle || "Screenshot Analysis Report";
        const {
            headerText = reportTitle,
            footerText = "Screenshot Analyzer",
            brandingText = "Developed by Saichandram Sadhu",
            showPageNumbers = true,
            logoBase64 = null,
            theme = 'blue'
        } = options;

        const themeColors = {
            blue: "0ea5e9", // Sky 500
            purple: "a855f7", // Purple 500
            minimal: "1e293b" // Slate 800
        };
        const accentColor = themeColors[theme] || themeColors.blue;

        const children = [];

        // --- TITLE PAGE CONTENT ---

        // Logo (if exists)
        if (logoBase64) {
            try {
                // Ensure base64 string is valid
                const base64Data = logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64;
                const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                children.push(new Paragraph({
                    children: [
                        new ImageRun({
                            data: imageBuffer,
                            transformation: { width: 100, height: 100 },
                            type: "png",
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 3000, after: 1000 }
                }));
            } catch (e) {
                console.error("Logo Error Word", e);
            }
        }

        // Title
        children.push(new Paragraph({
            children: [
                new TextRun({
                    text: reportTitle,
                    bold: true,
                    size: 64, // 32pt
                    color: "1e293b", // Slate 800
                })
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: logoBase64 ? 500 : 3000, after: 300 }
        }));

        // Date - REMOVED per user request
        /*
        children.push(new Paragraph({
            children: [
                new TextRun({
                    text: `Generated on ${new Date().toLocaleDateString()}`,
                    color: "64748b",
                    size: 24
                })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 5000 }
        }));
        */

        // Page Break after title page
        children.push(new Paragraph({
            children: [new PageBreak()]
        }));

        // --- STEPS ---
        const stepParagraphs = await Promise.all(steps.map(async (step, index) => {
            const stepChildren = [];

            // Step Title
            stepChildren.push(new Paragraph({
                text: `Step ${index + 1}: ${step.title || 'Action'}`,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 600, after: 300 },
                border: {
                    bottom: {
                        color: accentColor,
                        space: 1,
                        value: "single",
                        size: 12,
                    },
                },
            }));

            // Image
            if (step.preview) {
                try {
                    // safer image fetching
                    const response = await fetch(step.preview);
                    if (response.ok) {
                        const blob = await response.blob();
                        const imageBuffer = await blob.arrayBuffer();

                        if (imageBuffer.byteLength > 0) {
                            const dims = await getImageDimensions(step.preview);
                            const maxW = 550; // Max width for Word doc
                            let w = dims.width;
                            let h = dims.height;

                            if (w > maxW) {
                                h = (h * maxW) / w;
                                w = maxW;
                            }

                            stepChildren.push(new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: imageBuffer,
                                        transformation: { width: w, height: h },
                                        type: "png", // Assume PNG/JPEG works
                                    })
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { after: 300 },
                                border: {
                                    top: { color: "e2e8f0", space: 1, value: "single", size: 6 },
                                    bottom: { color: "e2e8f0", space: 1, value: "single", size: 6 },
                                    left: { color: "e2e8f0", space: 1, value: "single", size: 6 },
                                    right: { color: "e2e8f0", space: 1, value: "single", size: 6 },
                                }
                            }));
                        }
                    }
                } catch (e) {
                    console.error("Word Image Error (Skipping)", e);
                    stepChildren.push(new Paragraph({
                        children: [new TextRun({ text: "[Image Unavailable]", color: "ef4444", italics: true })],
                        alignment: AlignmentType.CENTER
                    }));
                }
            }

            // --- Smart Description Parsing ---
            const parseDescription = (text) => {
                const paragraphs = [];
                if (!text) return paragraphs;

                // 1. Split by newlines first
                const lines = text.split('\n');

                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return; // Skip empty lines

                    // Check for Section Headers (e.g., "1. What Is Shown", "Step 1:", "## Header")
                    // Also handles inline headers like "1. What Is Shown: The screen..."
                    const headerMatch = trimmed.match(/^(\d+\.\s+[^:]+|Step\s+\d+:?|#{1,6}\s+.*?)[:.]?\s+(.*)/i);
                    const isBullet = trimmed.match(/^[-*•]\s+(.*)/);

                    if (headerMatch) {
                        // It's likely a header.
                        // Group 1: Header (e.g., "1. What Is Shown")
                        // Group 2: Content (e.g., "The screen displays...")
                        const headerText = headerMatch[1].replace(/[*#]/g, '').trim();
                        const contentText = headerMatch[2].trim();

                        paragraphs.push(new Paragraph({
                            children: [
                                new TextRun({
                                    text: headerText,
                                    bold: true,
                                    size: 24, // 12pt
                                    font: "Calibri",
                                    color: "1e293b" // Slate 800
                                })
                            ],
                            spacing: { before: 200, after: 100 }
                        }));

                        if (contentText) {
                            paragraphs.push(new Paragraph({
                                children: [
                                    new TextRun({
                                        text: contentText,
                                        size: 24,
                                        font: "Calibri",
                                        color: "334155"
                                    })
                                ],
                                spacing: { after: 200 }
                            }));
                        }
                    } else if (isBullet) {
                        // Bullet parsing
                        paragraphs.push(new Paragraph({
                            children: [
                                new TextRun({
                                    text: isBullet[1],
                                    size: 24,
                                    font: "Calibri",
                                    color: "334155"
                                })
                            ],
                            bullet: {
                                level: 0
                            },
                            spacing: { after: 100 }
                        }));
                    } else {
                        // Regular paragraph
                        // Check if the WHOLE line is just a strict header (e.g. "1. What Is Shown")
                        const strictHeader = trimmed.match(/^(\d+\.\s+[^:]+|Step\s+\d+:?|#{1,6}\s+.*?)$/i);
                        if (strictHeader) {
                            const headerText = strictHeader[1].replace(/[*#]/g, '').trim();
                            paragraphs.push(new Paragraph({
                                children: [
                                    new TextRun({
                                        text: headerText,
                                        bold: true,
                                        size: 24,
                                        font: "Calibri",
                                        color: "1e293b"
                                    })
                                ],
                                spacing: { before: 200, after: 100 }
                            }));
                        } else {
                            paragraphs.push(new Paragraph({
                                children: [
                                    new TextRun({
                                        text: trimmed.replace(/\*\*/g, ''), // Strip bold markers if any remaining
                                        size: 24,
                                        font: "Calibri",
                                        color: "334155"
                                    })
                                ],
                                spacing: { after: 200 },
                                alignment: AlignmentType.JUSTIFIED
                            }));
                        }
                    }
                });

                return paragraphs;
            };

            const descParagraphs = parseDescription(step.text);
            stepChildren.push(...descParagraphs);

            return stepChildren;
        }));

        children.push(...stepParagraphs.flat());

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 2500,
                            right: 2500,
                            bottom: 2500,
                            left: 2500,
                        },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: headerText,
                                        color: "94a3b8",
                                        size: 20,
                                    })
                                ],
                                alignment: AlignmentType.RIGHT,
                            })
                        ]
                    })
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: brandingText,
                                        color: "cbd5e1",
                                        size: 16,
                                    }),
                                    ...(showPageNumbers ? [
                                        new TextRun({
                                            children: [" | Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                                            color: "cbd5e1",
                                            size: 16,
                                        })
                                    ] : [])
                                ],
                                alignment: AlignmentType.CENTER,
                            })
                        ]
                    })
                },
                children: children
            }]
        });

        const blob = await Packer.toBlob(doc);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Word Export Failed:", error);
        alert(`Word Export Failed: ${error.message}\nCheck console for details.`);
    }
};

export const exportToHTML = async (steps, docTitle, options = {}) => {
    const reportTitle = docTitle || "Screenshot Analysis Report";
    const {
        footerText = "Screenshot Analyzer",
        brandingText = "Developed by Saichandram Sadhu",
        logoBase64 = null,
        theme = 'blue'
    } = options;

    const themeConfig = {
        blue: { bg: "bg-slate-900", accent: "text-sky-400", border: "border-sky-500/30", gradient: "from-sky-900/20 to-slate-900", badge: "bg-sky-500/10 text-sky-300" },
        purple: { bg: "bg-slate-950", accent: "text-purple-400", border: "border-purple-500/30", gradient: "from-purple-900/20 to-slate-950", badge: "bg-purple-500/10 text-purple-300" },
        minimal: { bg: "bg-white", accent: "text-slate-900", border: "border-slate-200", gradient: "from-slate-50 to-white", badge: "bg-slate-100 text-slate-700" }
    };
    const t = themeConfig[theme] || themeConfig.blue;
    const isLight = theme === 'minimal';
    const textColor = isLight ? "text-slate-800" : "text-slate-300";
    const titleColor = isLight ? "text-slate-900" : "text-white";
    const cardBg = isLight ? "bg-white shadow-sm" : "bg-slate-800/50";

    // Process steps to embed images as Base64
    const stepsWithImages = await Promise.all(steps.map(async (step) => {
        let imageSrc = null;
        if (step.preview) {
            if (step.preview.startsWith('data:')) {
                imageSrc = step.preview;
            } else {
                try {
                    const response = await fetch(step.preview);
                    const blob = await response.blob();
                    await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            imageSrc = reader.result;
                            resolve();
                        }
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error("Failed to convert image for HTML", e);
                }
            }
        }
        return { ...step, imageSrc };
    }));

    const stepsHtml = stepsWithImages.map((step, index) => `
        <div class="mb-8 break-inside-avoid">
            <div class="${cardBg} rounded-xl border ${t.border} overflow-hidden p-6">
                <div class="flex items-center gap-4 mb-4">
                    <span class="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${t.badge}">Step ${index + 1}</span>
                    <h2 class="text-xl font-bold ${titleColor}">${step.title || `Action Step ${index + 1}`}</h2>
                </div>
                
                ${step.imageSrc ? `
                <div class="mb-6 rounded-lg overflow-hidden border ${isLight ? 'border-slate-100' : 'border-slate-700/50'}">
                    <img src="${step.imageSrc}" alt="Step ${index + 1}" class="w-full h-auto max-h-[500px] object-contain bg-black/5" />
                </div>` : ''}

                <div class="prose ${isLight ? 'prose-slate' : 'prose-invert'} max-w-none">
                    <p class="text-lg leading-relaxed ${textColor}">${cleanText(step.text)}</p>
                </div>
            </div>
        </div>
    `).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportTitle}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="${t.bg} min-h-screen py-10 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <header class="text-center mb-16 space-y-4">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="h-16 mx-auto mb-6 draggable="false" />` : ''}
            <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight ${titleColor}">${reportTitle}</h1>
            <p class="${isLight ? 'text-slate-500' : 'text-slate-400'}">Generated on ${new Date().toLocaleDateString()}</p>
        </header>

        <!-- Content -->
        <main class="space-y-8">
            ${stepsHtml}
        </main>

        <!-- Footer -->
        <footer class="mt-20 pt-8 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'} text-center">
            <p class="text-sm ${isLight ? 'text-slate-400' : 'text-slate-600'}">${footerText} • ${brandingText}</p>
        </footer>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
};
