const fs = require('fs');
const path = require('path');

const excelPath = path.join(__dirname, 'final_cleaned_emails.xlsx');
const outputPath = path.join(__dirname, 'data.js');

try {
    if (!fs.existsSync(excelPath)) {
        console.error('Excel file not found:', excelPath);
        process.exit(1);
    }

    const data = fs.readFileSync(excelPath, 'base64');
    const content = `window.preloadedExcelBase64 = '${data}';`;

    fs.writeFileSync(outputPath, content);
    console.log('Successfully generated data.js');
} catch (error) {
    console.error('Error generating data.js:', error);
    process.exit(1);
}
