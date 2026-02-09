# UNDACTED

**Undacted** is a forensic tool designed to analyze redacted documents. By reconstructing the underlying text based on font metrics and box dimensions, it helps identify potential matches for redacted information.

## 🚀 Features

- **Document Upload**: Support for Images (JPG, PNG) and PDF files.
- **Redaction Detection**: Interactive canvas to select and measure redaction boxes.
- **AI-Powered Analysis**: Uses **Google Gemini AI** to automatically analyze and identify font family and size from the document.
- **Font Calibration**: Fine-tune font settings (Family, Size, Weight) to match the document's typography.
- **Data Matching**: Upload an Excel (`.xlsx`) or CSV file containing potential candidates (e.g., email lists, names). The tool filters and checks which candidates fit the redaction box dimensions.
- **Visual Reconstruction**: Live preview of the "undacted" text overlaid on the original document.
- **Privacy First**: All processing happens client-side (except for the optional AI font analysis which sends a generic crop to Gemini).

## 🛠️ Usage

1. **Upload Document**: Drag & drop or select the redacted document.
2. **Select Redaction**: Click on the black redacted box in the viewer to auto-detect its bounds.
3. **AI Analysis (Optional)**: If you have a Gemini API key configured, the tool will attempt to automatically detect the specific font and size used in the document.
4. **Calibration**: Manually adjust the font settings to ensure the text rendering matches the document's style.
5. **Load Data**: Upload a dataset (Excel/CSV) containing possible values for the redacted text.
6. **Analyze**: The tool calculates the width of each candidate string using the calibrated font and checks if it fits within the redaction box (within a configurable tolerance).
7. **Results**: View a list of potential matches and see a visual reconstruction.

## 📦 Setup & Installation

This is a static web application. You do not need a backend server to run it.

1. **Clone the repository**:

    ```bash
    git clone https://github.com/undacted/undacted.git
    cd undacted
    ```

2. **Run Locally**:
    You can open `index.html` directly in your browser, or serve it with a lightweight server:

    ```bash
    # using python
    python -m http.server 8000
    
    # using npm (if you have serve installed)
    npx serve .
    ```

3. **Configuration**:
    - To use the AI features, click the **Settings** (gear icon) in the app and enter your Google Gemini API Key.

## 🔧 Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **PDF Processing**: [PDF.js](https://mozilla.github.io/pdf.js/)
- **Data Parsing**: [SheetJS (xlsx)](https://sheetjs.com/)
- **AI Integration**: Google Gemini API

## ⚠️ Disclaimer

This tool is intended for legitimate forensic analysis and educational purposes. It relies on metric estimation and does not "decrypt" pixelated or redacted data. Always verify results with corroborating evidence.

## 📄 License

[MIT License](LICENSE)
