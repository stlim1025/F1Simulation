
// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: function (key) { return this.store[key] || null; },
    setItem: function (key, value) { this.store[key] = value.toString(); },
    clear: function () { this.store = {}; }
};
global.localStorage = localStorageMock;

// Mock Response for fetch if not available (not needed if using node 18+)
// But we should use the real fetch to test integration

// Copy paste the service code directly to test it in isolation without TS compilation headers
const API_ENDPOINT = 'https://jsonblob.com/api/jsonBlob/019b3082-e9ad-7228-ba1d-62c4a779c9c9';

const PaddockService = {
    async getRooms() {
        try {
            console.log("Fetching rooms...");
            const response = await fetch(API_ENDPOINT, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) throw new Error("서버 응답 오류: " + response.status);
            const data = await response.json();
            console.log("Fetched rooms count:", Array.isArray(data) ? data.length : "Not array");
            return Array.isArray(data) ? data : [];
        } catch (e) {
            console.error("패독 서버 접속 실패:", e);
            return [];
        }
    },

    async updateAllRooms(rooms) {
        try {
            console.log("Updating rooms...", rooms.length);
            const now = Date.now();
            const activeRooms = rooms.filter(r => now - r.createdAt < 7200000);

            const response = await fetch(API_ENDPOINT, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(activeRooms)
            });

            console.log("Update response:", response.status);
            return response.ok;
        } catch (e) {
            console.error("서버 동기화 실패:", e);
            return false;
        }
    },

    async syncRoom(room) {
        console.log("Syncing room:", room.id);
        const rooms = await this.getRooms();
        const index = rooms.findIndex(r => r.id === room.id);

        let updatedRooms;
        if (index > -1) {
            updatedRooms = rooms.map(r => r.id === room.id ? room : r);
        } else {
            updatedRooms = [room, ...rooms];
        }

        return await this.updateAllRooms(updatedRooms);
    }
};

async function testFlow() {
    // 1. Get initial rooms
    const initialRooms = await PaddockService.getRooms();
    console.log("Initial rooms:", initialRooms);

    // 2. Create a test room
    const testRoom = {
        id: "test-room-" + Date.now(),
        name: "Automated Test Room",
        createdAt: Date.now(),
        players: []
    };

    const success = await PaddockService.syncRoom(testRoom);
    console.log("Room creation success:", success);

    if (success) {
        // 3. Verify it exists
        const newRooms = await PaddockService.getRooms();
        const found = newRooms.find(r => r.id === testRoom.id);
        console.log("Room found on server:", !!found);
    }
}

testFlow();
