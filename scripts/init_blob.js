
async function initBlob() {
    try {
        const createRes = await fetch('https://jsonblob.com/api/jsonBlob', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify([]) // Initialize with empty array
        });

        let blobUrl = createRes.headers.get('Location');

        if (blobUrl) {
            if (blobUrl.startsWith('/')) {
                blobUrl = 'https://jsonblob.com' + blobUrl;
            }
            console.log("MASTER_BLOB_URL=" + blobUrl);
        } else {
            console.error("Failed to create blob");
        }
    } catch (e) {
        console.error(e);
    }
}
initBlob();
