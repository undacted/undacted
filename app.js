// Undacted App - Logic Rebuild
// Architecture: Step-based State Machine

// --- Constants & Config ---
const CONFIG = {
    fontFamilies: ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Helvetica', 'Inter', 'Segoe UI'],
    defaultFontSize: 16
};

// --- State ---
const state = {
    currentStep: 0,
    excelData: null,
    image: null,
    detectedBox: { x: 0, y: 0, w: 0, h: 0 },
    calibration: {
        text: "jeevacation@gmail.com",
        fontFamily: "Arial",
        fontSize: 16,
        isBold: false,
        offset: { x: 0, y: 0 }
    }
};

// --- DOM Elements ---
const dom = {
    // Buttons
    steps: [0, 1, 2, 3, 4, 5].map(i => document.getElementById(`btn-step-${i}`)),

    // Stages
    uploadStage: document.getElementById('upload-stage'),
    canvasStage: document.getElementById('canvas-stage'),
    workspace: document.querySelector('.workspace'),

    // Inputs
    imageInput: document.getElementById('image-upload'),
    excelInput: document.getElementById('excel-upload'),
    dropZone: document.getElementById('drop-zone'),
    dataBtn: document.getElementById('data-btn'),
    settingsBtn: document.getElementById('settings-btn'),
    closeSettingsBtn: document.getElementById('close-settings'),

    // Canvas & Overlays
    canvas: document.getElementById('main-canvas'),
    ctx: document.getElementById('main-canvas').getContext('2d', { willReadFrequently: true }),
    selectionOverlay: document.getElementById('selection-overlay'),
    calibrationText: document.getElementById('calibration-text'),
    matchOverlay: document.getElementById('match-overlay'),

    // Controls
    calibControls: document.getElementById('calibration-controls'),
    calibInput: document.getElementById('calib-text-input'),
    fontSize: document.getElementById('font-size'),
    fontFamily: document.getElementById('font-family'),
    fontBoldBtn: document.getElementById('font-bold-btn'),

    // Info & Results
    stepInfo: document.getElementById('step-info'),
    infoTitle: document.getElementById('info-title'),
    infoContent: document.getElementById('info-content'),
    resultsArea: document.getElementById('results-area'),

    // New Results UI Elements
    targetWidth: document.getElementById('target-width'),
    targetHeight: document.getElementById('target-height'),
    toleranceInput: document.getElementById('tolerance'),
    matchesList: document.getElementById('matches-list'),
    transposePreview: document.getElementById('transpose-preview'),
    saveResultBtn: document.getElementById('save-result-btn'),
    shareResultBtn: document.getElementById('share-result-btn'),
    resultsBackBtn: document.getElementById('results-back-btn'),

    // Modals & Status
    settingsModal: document.getElementById('settings-modal'),
    dataStatus: document.getElementById('data-status'),
    apiKey: document.getElementById('api-key'),

    // Back Button
    backBtn: document.getElementById('back-btn'),

    // View Toggle
    viewToggleBtn: document.getElementById('view-toggle'),
    appContainer: document.querySelector('.app-container')
};

// --- Initialization ---
function init() {
    setupEventListeners();
    checkPreloadedData();

    // Clear any old saved view preference - always auto-detect on load
    localStorage.removeItem('undacted_view_mode');

    // Auto-detect view mode based on screen width
    autoDetectViewMode();

    // Listen for window resize to auto-adjust
    window.addEventListener('resize', debounce(() => {
        autoDetectViewMode();
    }, 250));
}

// Auto-detect desktop or mobile based on screen width
function autoDetectViewMode() {
    const isWideScreen = window.innerWidth > 900;
    console.log('Auto-detect: width=' + window.innerWidth + ', isWide=' + isWideScreen);

    if (isWideScreen) {
        toggleView('desktop', false);
    } else {
        toggleView('mobile', false);
    }
}

// Simple debounce utility
function debounce(fn, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

function setupEventListeners() {
    // View Toggle
    if (dom.viewToggleBtn) {
        dom.viewToggleBtn.addEventListener('click', () => {
            const isDesktop = dom.appContainer.classList.contains('desktop-view');
            toggleView(isDesktop ? 'mobile' : 'desktop');
        });
    }

    // Back Button
    if (dom.backBtn) {
        dom.backBtn.addEventListener('click', () => {
            if (state.currentStep > 0) setStep(state.currentStep - 1);
        });
    }

    // Step Navigation (Clicking buttons to jump if allowed)
    // For this strict flow, buttons mainly act as status, but let's allow jumping back.
    dom.steps.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            // Allow clicking on current step or previous steps
            if (index <= state.currentStep) {
                if (index === state.currentStep) {
                    if (index === 2) {
                        // Confirm Selection -> Go to Analysis
                        setStep(3);
                    } else if (index === 5) {
                        // Re-run matching
                        runMatching();
                    }
                }
            }
            // Special case: Allow clicking Analyze (step 5) from Calibration (step 4)
            if (index === 5 && state.currentStep === 4) {
                setStep(5);
            }
        });
    });

    // Upload
    dom.dropZone.addEventListener('click', () => dom.imageInput.click());
    dom.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dom.dropZone.style.backgroundColor = '#e4e4e7'; });
    dom.dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dom.dropZone.style.backgroundColor = '#fff'; });
    dom.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.dropZone.style.backgroundColor = '#fff';
        const file = e.dataTransfer.files[0];
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
            handleImageUpload(file);
        }
    });
    dom.imageInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleImageUpload(e.target.files[0]);
    });

    // Data Loading
    dom.dataBtn.addEventListener('click', () => dom.excelInput.click());
    dom.excelInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleDataUpload(e.target.files[0]);
    });

    // Canvas Interaction
    dom.canvas.addEventListener('mousedown', handleCanvasClick);

    // Calibration
    dom.calibInput.addEventListener('input', (e) => {
        state.calibration.text = e.target.value;
        renderCalibration();
    });
    dom.fontSize.addEventListener('input', (e) => {
        state.calibration.fontSize = parseFloat(e.target.value) || 16;
        renderCalibration();
    });
    dom.fontFamily.addEventListener('change', (e) => {
        state.calibration.fontFamily = e.target.value;
        renderCalibration();
    });
    dom.fontBoldBtn.addEventListener('click', () => {
        state.calibration.isBold = !state.calibration.isBold;
        dom.fontBoldBtn.style.background = state.calibration.isBold ? '#000' : '#fff';
        dom.fontBoldBtn.style.color = state.calibration.isBold ? '#fff' : '#000';
        renderCalibration();
    });

    // Draggable Calibration Text
    makeDraggable(dom.calibrationText);

    // Settings
    dom.settingsBtn.addEventListener('click', () => dom.settingsModal.classList.remove('hidden'));
    dom.closeSettingsBtn.addEventListener('click', () => {
        dom.settingsModal.classList.add('hidden');
        if (dom.apiKey.value) localStorage.setItem('gemini_api_key', dom.apiKey.value);
    });

    // Load saved key
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) dom.apiKey.value = savedKey;

    // Results Back Button - go back to calibration step
    if (dom.resultsBackBtn) {
        dom.resultsBackBtn.addEventListener('click', () => {
            document.body.classList.remove('results-active');
            dom.resultsArea.classList.add('hidden');
            setStep(4);
        });
    }

    // Save Result Button
    if (dom.saveResultBtn) {
        dom.saveResultBtn.addEventListener('click', saveResultAsPNG);
    }

    // Share Result Button
    if (dom.shareResultBtn) {
        dom.shareResultBtn.addEventListener('click', shareResult);
    }
}

// --- AI Analysis ---
async function performAIAnalysis() {
    const apiKey = (localStorage.getItem('gemini_api_key') || '').trim();

    if (!apiKey) {
        showInfo("MISSING API KEY", "Please enter your Gemini API Key in Settings to use AI Analysis.");
        return; // Or just skip to calibration?
    }

    showInfo("AI ANALYSIS", "Analyzing font characteristics...");

    // Create a context crop
    const box = state.detectedBox;
    const padding = 100; // Look around the box
    const cropCanvas = document.createElement('canvas');
    const ctx = cropCanvas.getContext('2d');

    // Calculate crop bounds (clamped to image)
    const sx = Math.max(0, box.x - padding);
    const sy = Math.max(0, box.y - padding);
    const sw = Math.min(state.image.width - sx, box.w + padding * 2);
    const sh = Math.min(state.image.height - sy, box.h + padding * 2);

    cropCanvas.width = sw;
    cropCanvas.height = sh;

    // Draw the image crop
    ctx.drawImage(state.image, sx, sy, sw, sh, 0, 0, sw, sh);

    const base64Image = cropCanvas.toDataURL('image/jpeg').split(',')[1];

    // List of models to try - using current stable models (Feb 2026)
    const models = [
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.5-pro'
    ];

    let firstError = null;

    for (const model of models) {
        try {
            console.log(`Trying AI model: ${model}`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Analyze this image crop from a document. There is a blacked-out redaction box somewhere in or near this image. Identify the font being used in the text NEAR the redaction box. Return the font family (closest match from: Arial, Times New Roman, Courier New, Verdana, Helvetica, Inter) and the approximate font size in CSS pixels (typically 10-20px for body text). Be precise with the font size estimate. Return strictly JSON: {\"fontFamily\": \"string\", \"fontSize\": number}." },
                            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
                        ]
                    }]
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error(`Error with model ${model}:`, data.error);
                if (!firstError) firstError = data.error; // Capture the first error (most relevant)
                continue;
            }

            if (data.candidates && data.candidates[0].content) {
                const text = data.candidates[0].content.parts[0].text;
                // Clean JSON
                const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const result = JSON.parse(jsonStr);

                if (result.fontFamily) {
                    state.calibration.fontFamily = result.fontFamily;
                    dom.fontFamily.value = result.fontFamily;
                }

                // Use AI fontSize if reasonable, otherwise estimate from box height
                if (result.fontSize && result.fontSize > 8 && result.fontSize < 72) {
                    state.calibration.fontSize = parseFloat(result.fontSize);
                } else {
                    // Fallback: estimate font size from box height (typical line height ~1.2x font size)
                    state.calibration.fontSize = Math.round(state.detectedBox.h * 0.85);
                }
                dom.fontSize.value = state.calibration.fontSize;

                renderCalibration();
                setStep(4);
                return; // Success
            }

        } catch (e) {
            console.warn(`Failed model ${model}`, e);
        }
    }

    // If we get here, all failed. Show the first error.
    const errorMsg = firstError ? `${firstError.message} (Code: ${firstError.code})` : "Unknown connection error";
    showInfo("AI ERROR", `Analysis failed. ${errorMsg}`);
    setTimeout(() => setStep(4), 5000);
}

// --- dragging util ---
function makeDraggable(el) {
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    // Drag handler
    el.addEventListener('mousedown', (e) => {
        // Prevent drag if clicking on the resize handle (bottom-right corner)
        const rect = el.getBoundingClientRect();
        const isInResizeArea = e.clientX > rect.right - 20 && e.clientY > rect.bottom - 20;

        if (isInResizeArea) return; // Let the browser handle the resize

        isDragging = true;
        offset.x = e.clientX - parseInt(el.style.left || 0);
        offset.y = e.clientY - parseInt(el.style.top || 0);
        el.style.cursor = 'grabbing';
        e.stopPropagation(); // Prevent canvas click
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        el.style.left = (e.clientX - offset.x) + 'px';
        el.style.top = (e.clientY - offset.y) + 'px';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        el.style.cursor = 'move';
    });
}

// --- Logic ---

function setStep(step) {
    state.currentStep = step;

    // Update Button UI
    dom.steps.forEach((btn, idx) => {
        btn.classList.remove('active', 'disabled');
        if (idx === step) {
            btn.classList.add('active');
        } else if (idx < step) {
            // Previous steps are active but not highlighted (or maybe we keep them clickable?)
            // For now, let's keep them 'normal'
        } else {
            btn.classList.add('disabled');
        }
    });

    // Stage Switching
    if (step === 0) {
        dom.uploadStage.classList.add('active');
        dom.canvasStage.classList.remove('active');
    } else {
        dom.uploadStage.classList.remove('active');
        dom.canvasStage.classList.add('active');
    }

    // Back Button Visibility
    if (dom.backBtn) {
        dom.backBtn.style.display = step > 0 ? 'block' : 'none';
    }

    // Step Specific Logic
    dom.stepInfo.classList.add('hidden');
    dom.calibControls.classList.add('hidden');
    dom.calibrationText.style.display = 'none';

    if (step === 1) {
        showInfo("SELECT REDACTION", "Click on the black box in the document to select it.");
    } else if (step === 2) {
        showInfo("CONFIRM SELECTION", "Selection captured. Click 'CONFIRM SELECTION' button below to proceed.");
    } else if (step === 3) {
        performAIAnalysis();
    } else if (step === 4) {
        showInfo("FONT CALIBRATION", "Drag the text to align. Adjust settings to match.");
        dom.calibControls.classList.remove('hidden');
        dom.calibrationText.style.display = 'block';

        // Initial placement of calibration text near the box
        // We need screen coords.
        // Simplified: just center it for now or rely on CSS default
        renderCalibration();
    } else if (step === 5) {
        showInfo("ANALYSIS RESULTS", "Select a match from the list, then save or share.");
        dom.resultsArea.classList.remove('hidden');
        // Populate target box info and run matching
        if (dom.targetWidth) dom.targetWidth.value = state.detectedBox.w;
        if (dom.targetHeight) dom.targetHeight.value = state.detectedBox.h;
        runMatching();
    }
}

function showInfo(title, text) {
    dom.infoTitle.textContent = title;
    dom.infoContent.textContent = text;
    dom.stepInfo.classList.remove('hidden');
}

// --- Image & PDF Handling ---
function handleImageUpload(file) {
    if (file.type === 'application/pdf') {
        handlePdfUpload(file);
    } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        alert('Unsupported file type. Please upload an image or PDF.');
    }
}

function handlePdfUpload(file) {
    const fileReader = new FileReader();
    fileReader.onload = function () {
        const typedarray = new Uint8Array(this.result);

        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            // Fetch the first page
            pdf.getPage(1).then(page => {
                const viewport = page.getViewport({ scale: 2.0 }); // Scale up for better quality
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                showInfo("PROCESSING PDF", "Rendering PDF page...");

                page.render(renderContext).promise.then(() => {
                    const dataUrl = canvas.toDataURL('image/png');
                    loadImage(dataUrl);
                });
            });
        }).catch(err => {
            console.error('Error loading PDF:', err);
            alert('Error loading PDF. Please try again.');
        });
    };
    fileReader.readAsArrayBuffer(file);
}

function loadImage(src) {
    state.image = new Image();
    state.image.onload = () => {
        dom.canvas.width = state.image.width;
        dom.canvas.height = state.image.height;
        dom.ctx.drawImage(state.image, 0, 0);
        setStep(1);
    };
    state.image.src = src;
}

// --- Canvas Logic (Box Detection) ---
function handleCanvasClick(e) {
    if (state.currentStep !== 1) return;

    const rect = dom.canvas.getBoundingClientRect();
    const scaleX = dom.canvas.width / rect.width;
    const scaleY = dom.canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    detectBox(Math.floor(x), Math.floor(y));
}

function detectBox(startX, startY) {
    const width = dom.canvas.width;
    const height = dom.canvas.height;

    try {
        const imageData = dom.ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Simple pixel check (darkness)
        const idx = (startY * width + startX) * 4;
        if (data[idx] > 100) {
            console.log("Not a dark pixel");
            return;
        }

        // Expand
        let minX = startX, maxX = startX, minY = startY, maxY = startY;
        // Expand Left
        while (minX > 0 && data[(startY * width + (minX - 1)) * 4] < 100) minX--;
        // Expand Right
        while (maxX < width && data[(startY * width + (maxX + 1)) * 4] < 100) maxX++;
        // Expand Up
        while (minY > 0 && data[((minY - 1) * width + startX) * 4] < 100) minY--;
        // Expand Down
        while (maxY < height && data[((maxY + 1) * width + startX) * 4] < 100) maxY++;

        state.detectedBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

        drawSelection();
        setStep(2); // Auto advance to confirm state

    } catch (e) {
        console.error(e);
    }
}

function drawSelection() {
    // We can't clear/redraw canvas simply because backing is image. 
    // Easier to use the overlay div for the red box so we don't dirty the canvas state
    const box = state.detectedBox;
    const rect = dom.canvas.getBoundingClientRect(); // visible size

    // Scale from canvas pixels to CSS pixels
    const scaleX = rect.width / dom.canvas.width;
    const scaleY = rect.height / dom.canvas.height;

    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.border = '3px solid #ef4444';
    div.style.left = (dom.canvas.offsetLeft + (box.x * scaleX)) + 'px';
    div.style.top = (dom.canvas.offsetTop + (box.y * scaleY)) + 'px';
    div.style.width = (box.w * scaleX) + 'px';
    div.style.height = (box.h * scaleY) + 'px';

    dom.selectionOverlay.innerHTML = '';
    dom.selectionOverlay.appendChild(div);
}

// --- Calibration Render ---
function renderCalibration() {
    const c = state.calibration;
    const el = dom.calibrationText;
    // Set Font Calibration Default Text
    if (!c.text) { // Only set default if text is not already defined
        c.text = "jeevaction@gmail.com";
    }
    el.textContent = c.text;
    el.style.fontFamily = c.fontFamily;
    el.style.fontSize = c.fontSize + 'px';
    el.style.fontWeight = c.isBold ? 'bold' : 'normal';
}

// --- Data & Matching ---
function handleDataUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        state.excelData = XLSX.utils.sheet_to_json(sheet);
        dom.dataStatus.classList.add('active');
        // Initial Calibration text suggestion?
        if (state.excelData[0]) {
            const keys = Object.keys(state.excelData[0]);
            // Find something that looks like an email or name
            const sample = state.excelData[0][keys[0]];
            state.calibration.text = String(sample);
            dom.calibInput.value = String(sample);
            renderCalibration();
        }
    };
    reader.readAsArrayBuffer(file);
}

function checkPreloadedData() {
    console.log("checkPreloadedData called");
    console.log("preloadedExcelBase64 exists?", typeof window.preloadedExcelBase64 !== 'undefined');

    if (typeof window.preloadedExcelBase64 !== 'undefined' && window.preloadedExcelBase64) {
        console.log("Base64 data length:", window.preloadedExcelBase64.length);
        try {
            // Decode base64 to binary
            const binaryString = atob(window.preloadedExcelBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Parse with SheetJS
            const workbook = XLSX.read(bytes, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const data = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

            if (data && data.length > 0) {
                state.excelData = data;
                console.log("Preloaded Excel data loaded:", data.length, "rows");

                // Also set initial calibration text from first row
                if (data[0]) {
                    const keys = Object.keys(data[0]);
                    const sample = data[0][keys[0]];
                    state.calibration.text = String(sample);
                    if (dom.calibInput) {
                        dom.calibInput.value = String(sample);
                    }
                }
            }
        } catch (e) {
            console.error("Error loading preloaded Excel data:", e);
        }
    } else {
        console.log("No preloaded data found");
    }
}

function runMatching() {
    console.log("Run Matching called");

    // Update target box info
    if (dom.targetWidth) dom.targetWidth.value = Math.round(state.detectedBox.w);
    if (dom.targetHeight) dom.targetHeight.value = Math.round(state.detectedBox.h);

    if (!state.excelData || state.excelData.length === 0) {
        console.warn("No Excel Data");
        if (dom.matchesList) {
            dom.matchesList.innerHTML = '<div class="match-item">No Data Loaded. Please load an Excel file.</div>';
        }
        dom.resultsArea.classList.remove('hidden');
        return;
    }

    console.log("Excel data available:", state.excelData.length, "rows");

    // Hide workspace and show results area
    document.body.classList.add('results-active');
    dom.resultsArea.classList.remove('hidden');

    // Debug Layout
    const style = window.getComputedStyle(dom.resultsArea);
    console.log("Results Area Height:", style.height);
    console.log("Results Area Visibility:", style.display);
    console.log("Results Panels Height:", window.getComputedStyle(dom.resultsArea.querySelector('.results-panels')).height);

    // Create ephemeral canvas for measuring
    const mCanvas = document.createElement('canvas');
    const mCtx = mCanvas.getContext('2d');
    const c = state.calibration;
    mCtx.font = `${c.isBold ? 'bold' : 'normal'} ${c.fontSize}px ${c.fontFamily}`;

    const targetW = state.detectedBox.w;
    const tolerance = parseInt(dom.toleranceInput?.value || 10);

    const results = [];
    const seenTexts = new Set();

    // Search all columns in all rows
    state.excelData.forEach(row => {
        Object.values(row).forEach(value => {
            const txt = String(value || '').trim();
            if (!txt || txt.length < 3 || seenTexts.has(txt)) return;
            seenTexts.add(txt);

            const metrics = mCtx.measureText(txt);
            const diff = Math.abs(metrics.width - targetW);

            // More inclusive: include if within tolerance or within 50% of target width
            if (diff <= tolerance || diff < targetW * 0.5) {
                results.push({ text: txt, diff: diff, width: metrics.width });
            }
        });
    });

    results.sort((a, b) => a.diff - b.diff);
    console.log("Found", results.length, "potential matches");

    // Populate matches list
    if (dom.matchesList) {
        dom.matchesList.innerHTML = '';
        results.slice(0, 30).forEach((r, idx) => {
            const div = document.createElement('div');
            div.className = 'match-item';
            div.innerHTML = `<span>${r.text}</span>`;
            div.onclick = () => {
                // Highlight selected
                dom.matchesList.querySelectorAll('.match-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');

                // Update transpose preview
                renderTransposePreview(r.text);

                // Also update main overlay
                dom.matchOverlay.textContent = r.text;
                dom.matchOverlay.style.font = mCtx.font;
                dom.matchOverlay.style.display = 'block';

                const box = state.detectedBox;
                const rect = dom.canvas.getBoundingClientRect();
                const scaleX = rect.width / dom.canvas.width;
                const scaleY = rect.height / dom.canvas.height;

                dom.matchOverlay.style.left = (dom.canvas.offsetLeft + (box.x * scaleX)) + 'px';
                dom.matchOverlay.style.top = (dom.canvas.offsetTop + (box.y * scaleY)) + 'px';
            };
            dom.matchesList.appendChild(div);
        });

        if (results.length === 0) {
            dom.matchesList.innerHTML = '<div class="match-item">No Close Matches Found</div>';
        }
    }
}

// Render transpose preview showing the text overlaid on the document
function renderTransposePreview(text) {
    if (!dom.transposePreview || !state.image) return;

    // Clear previous
    dom.transposePreview.innerHTML = '';

    // Create a canvas for the preview
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Use a cropped region around the box for the preview
    const box = state.detectedBox;
    const padding = 50;
    const sx = Math.max(0, box.x - padding);
    const sy = Math.max(0, box.y - padding);
    const sw = Math.min(state.image.width - sx, box.w + padding * 2);
    const sh = Math.min(state.image.height - sy, box.h + padding * 2);

    canvas.width = sw;
    canvas.height = sh;

    // Draw the image crop
    ctx.drawImage(state.image, sx, sy, sw, sh, 0, 0, sw, sh);

    // Draw the text over the box position
    const c = state.calibration;
    ctx.font = `${c.isBold ? 'bold' : 'normal'} ${c.fontSize}px ${c.fontFamily}`;
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'top';

    // Adjust position relative to the crop
    const textX = box.x - sx;
    const textY = box.y - sy + (box.h - c.fontSize) / 2;

    // Draw white background for the text (to "undact")
    ctx.fillStyle = '#fff';
    ctx.fillRect(box.x - sx, box.y - sy, box.w, box.h);

    // Draw the text
    ctx.fillStyle = '#000';
    ctx.fillText(text, textX, textY);

    // Draw a highlight border around where we replaced
    ctx.strokeStyle = '#bef264';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x - sx, box.y - sy, box.w, box.h);

    dom.transposePreview.appendChild(canvas);
}

// Helper to create the result canvas
function createResultCanvas() {
    if (!state.image) {
        alert('No image loaded.');
        return null;
    }

    // Get the selected match text
    const selectedMatch = dom.matchesList?.querySelector('.match-item.selected');
    if (!selectedMatch) {
        alert('Please select a match first.');
        return null;
    }

    const text = selectedMatch.querySelector('span')?.textContent || '';

    // Create a full-size canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = state.image.width;
    canvas.height = state.image.height;

    // Draw the full image
    ctx.drawImage(state.image, 0, 0);

    // Draw white background over the redaction box
    const box = state.detectedBox;
    ctx.fillStyle = '#fff';
    ctx.fillRect(box.x, box.y, box.w, box.h);

    // Draw the text
    const c = state.calibration;
    ctx.font = `${c.isBold ? 'bold' : 'normal'} ${c.fontSize}px ${c.fontFamily}`;
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'top';
    const textY = box.y + (box.h - c.fontSize) / 2;
    ctx.fillText(text, box.x, textY);

    return canvas;
}

// Save the full document with the selected text overlaid
function saveResultAsPNG() {
    const canvas = createResultCanvas();
    if (!canvas) return;

    // Create download link
    const link = document.createElement('a');
    link.download = 'undacted-result.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Share result via native sharing
async function shareResult() {
    const canvas = createResultCanvas();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
        if (!blob) return;

        try {
            const file = new File([blob], 'undacted-result.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Undacted Result',
                    text: 'Recovered using Undacted.'
                });
            } else {
                // Fallback or just prompt save
                alert('Sharing not supported on this device. Saving instead.');
                saveResultAsPNG();
            }
        } catch (err) {
            console.error('Error sharing:', err);
            // Verify if it's user abort
            if (err.name !== 'AbortError') {
                alert('Error sharing result.');
            }
        }
    }, 'image/png');
}


// Start
init();

function toggleView(mode, savePreference = true) {
    if (mode === 'desktop') {
        const c = dom.appContainer;
        if (c) c.classList.add('desktop-view');
        if (dom.viewToggleBtn) {
            dom.viewToggleBtn.innerHTML = '<svg width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\'><rect x=\'7\' y=\'2\' width=\'10\' height=\'20\' rx=\'2\' ry=\'2\'></rect><line x1=\'12\' y1=\'18\' x2=\'12.01\' y2=\'18\'></line></svg>';
            dom.viewToggleBtn.title = 'Switch to Mobile View';
        }
        if (savePreference) localStorage.setItem('undacted_view_mode', 'desktop');

        setTimeout(() => {
            if (state.currentStep > 0 && state.detectedBox.w > 0) drawSelection();
        }, 350);

    } else {
        const c = dom.appContainer;
        if (c) c.classList.remove('desktop-view');
        if (dom.viewToggleBtn) {
            dom.viewToggleBtn.innerHTML = '<svg width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\'><rect x=\'2\' y=\'3\' width=\'20\' height=\'14\' rx=\'2\' ry=\'2\'></rect><line x1=\'8\' y1=\'21\' x2=\'16\' y2=\'21\'></line><line x1=\'12\' y1=\'17\' x2=\'12\' y2=\'21\'></line></svg>';
            dom.viewToggleBtn.title = 'Switch to Desktop View';
        }
        if (savePreference) localStorage.setItem('undacted_view_mode', 'mobile');

        setTimeout(() => {
            if (state.currentStep > 0 && state.detectedBox.w > 0) drawSelection();
        }, 350);
    }
}
