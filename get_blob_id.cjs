const https = require('https');
const fs = require('fs');

const data = JSON.stringify([]);

const options = {
    hostname: 'jsonblob.com',
    port: 443,
    path: '/api/jsonBlob',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);
    const loc = res.headers.location;
    console.log('Location:', loc);
    if (loc) {
        fs.writeFileSync('new_blob_id.txt', loc);
        console.log('Wrote to new_blob_id.txt');
    }
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
