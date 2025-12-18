const API_ENDPOINT = 'https://api.jsonbin.io/v3/b/67b66718e41b4d34e4963595';
const MASTER_KEY = '$2a$10$wKSTiG7W/7u8R6R6m2o6O.y8s.TzL8U6m2o6O.y8s.TzL8U6m2o6O';

async function testConnection() {
    console.log("Testing connection to:", API_ENDPOINT);
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'GET',
            headers: {
                'X-Master-Key': MASTER_KEY,
                'X-Bin-Meta': 'false'
            }
        });

        console.log("Status:", response.status);
        console.log("StatusText:", response.statusText);
        if (response.ok) {
            const data = await response.json();
            console.log("Data received:", JSON.stringify(data).substring(0, 100) + "...");
        } else {
            console.log("Response body:", await response.text());
        }
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

testConnection();
