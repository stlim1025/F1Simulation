const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../vite.config.ts');

try {
    let content = fs.readFileSync(targetFile, 'utf8');

    if (content.includes('http://localhost:3001')) {
        content = content.replace('http://localhost:3001', 'http://13.238.218.144:3001');
        fs.writeFileSync(targetFile, content);
        console.log('Updated vite.config.ts proxy to remote IP');
    } else {
        console.log('Target string localhost:3001 not found');
    }
} catch (e) {
    console.error(e);
}
