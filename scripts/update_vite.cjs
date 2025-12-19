const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../vite.config.ts');

try {
    let content = fs.readFileSync(targetFile, 'utf8');

    if (!content.includes('/api/posts')) {
        const targetStr = `'https://jsonblob.com',
          changeOrigin: true,
          secure: false,
        }`;

        const replaceStr = `'https://jsonblob.com',
          changeOrigin: true,
          secure: false,
        },
        '/api/posts': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        }`;

        content = content.replace(targetStr, replaceStr);
        fs.writeFileSync(targetFile, content);
        console.log('Updated vite.config.ts with proxy');
    } else {
        console.log('Proxy already exists');
    }
} catch (e) {
    console.error(e);
}
