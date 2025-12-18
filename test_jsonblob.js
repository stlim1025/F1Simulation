
async function testJsonBlob() {
    console.log("Testing JSONBlob...");

    // 1. Create a new blob
    try {
        console.log("Creating new blob...");
        const createRes = await fetch('https://jsonblob.com/api/jsonBlob', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify([{ message: "Initial Data" }])
        });

        if (!createRes.ok) {
            console.error("Failed to create blob:", createRes.status, await createRes.text());
            return;
        }

        // Location header contains the URL
        let blobUrl = createRes.headers.get('Location');
        console.log("Blob created at (raw):", blobUrl);

        if (!blobUrl) {
            console.error("No Location header returned");
            return;
        }

        if (blobUrl.startsWith('/')) {
            blobUrl = 'https://jsonblob.com' + blobUrl;
        }
        console.log("Blob URL (absolute):", blobUrl);
        const fs = require('fs');
        fs.writeFileSync('blob_id.txt', blobUrl);

        // 2. Read the blob
        console.log("Reading blob...");
        const readRes = await fetch(blobUrl, {
            headers: { 'Accept': 'application/json' }
        });
        const data = await readRes.json();
        console.log("Data read:", data);

        // 3. Update the blob
        console.log("Updating blob...");
        const updateRes = await fetch(blobUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify([{ message: "Updated Data", timestamp: Date.now() }])
        });

        if (updateRes.ok) {
            console.log("Update successful");
            // 4. Verify update
            const verifyRes = await fetch(blobUrl);
            console.log("Verified Data:", await verifyRes.json());
        } else {
            console.error("Update failed:", updateRes.status);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

testJsonBlob();
