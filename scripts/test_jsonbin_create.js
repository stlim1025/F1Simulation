const MASTER_KEY = '$2a$10$wKSTiG7W/7u8R6R6m2o6O.y8s.TzL8U6m2o6O.y8s.TzL8U6m2o6O';

async function createBin() {
    console.log("Attempting to create new bin on JSONBin...");
    try {
        const response = await fetch('https://api.jsonbin.io/v3/b', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': MASTER_KEY,
                'X-Bin-Name': 'F1 Paddock Storage',
                'X-Bin-Private': 'false'
            },
            body: JSON.stringify({ rooms: [] }) // Start with object
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Bin created successfully!");
            console.log("Bin ID:", data.metadata.id);
            console.log("Full response:", JSON.stringify(data, null, 2));
        } else {
            console.log("Failed to create bin.");
            console.log("Status:", response.status);
            console.log("Response:", await response.text());
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

createBin();
