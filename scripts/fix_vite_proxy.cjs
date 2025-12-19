const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../vite.config.ts');

try {
    let content = fs.readFileSync(targetFile, 'utf8');

    if (!content.includes("'/api/posts'")) {
        const searchString = "'/api/jsonBlob': {";
        const replacementString = "'/api/posts': {\n          target: 'http://localhost:3001',\n          changeOrigin: true,\n          secure: false,\n        },\n        '/api/jsonBlob': {";

        if (content.includes(searchString)) {
            content = content.replace(searchString, replacementString);
            fs.writeFileSync(targetFile, content);
            console.log('Successfully updated vite.config.ts with /api/posts proxy');
        } else {
            console.log('Could not find insertion point in vite.config.ts');
        }
    } else {
        console.log('Proxy for /api/posts already exists in vite.config.ts');
    }
} catch (error) {
    console.error('Error updating vite.config.ts:', error);
}
