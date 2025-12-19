const https = require('https');

const BLOB_ID = '019b3082-e9ad-7228-ba1d-62c4a779c9c9';
const options = {
    hostname: 'jsonblob.com',
    port: 443,
    path: `/api/jsonBlob/${BLOB_ID}`,
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

// Write empty array to reset
req.write(JSON.stringify([]));
req.end();
