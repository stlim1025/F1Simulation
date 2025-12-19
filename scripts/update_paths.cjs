const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/constants.ts');
const targetStr = './images/';
const replaceStr = '/src/images/';

try {
    let content = fs.readFileSync(targetFile, 'utf8');
    if (content.includes(targetStr)) {
        const newContent = content.replaceAll(targetStr, replaceStr);
        fs.writeFileSync(targetFile, newContent);
        console.log(`Updated ${targetFile}`);
    } else {
        console.log(`No occurrences found in ${targetFile}`);
    }
} catch (e) {
    console.error("Error updating paths:", e);
}
