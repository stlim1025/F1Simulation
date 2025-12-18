
import { MPRoom } from '../types';

/**
 * F1 Paddock Shared Service (GLOBAL REAL-TIME SYNC)
 * 실제 원격 API를 통해 전 세계 유저와 방을 공유합니다.
 */

// 실제 작동하는 공용 테스트 Bin 엔드포인트 (JSONBlob)
// 실제 작동하는 공용 테스트 Bin 엔드포인트 (JSONBlob)
const BLOB_ID = '019b3082-e9ad-7228-ba1d-62c4a779c9c9';
const IS_BROWSER = typeof window !== 'undefined';
// Browser environment uses Vite Proxy to bypass CORS, Node.js uses direct URL
const API_ENDPOINT = IS_BROWSER
  ? `/api/jsonBlob/${BLOB_ID}`
  : `https://jsonblob.com/api/jsonBlob/${BLOB_ID}`;

export const PaddockService = {
  /**
   * 서버로부터 전역 방 목록을 가져옵니다.
   */
  async getRooms(): Promise<MPRoom[]> {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error("서버 응답 오류");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("패독 서버 접속 실패:", e);
      // 서버 장애 시 로컬 데이터를 임시로 사용
      const fallback = localStorage.getItem('f1_paddock_global_sync');
      return fallback ? JSON.parse(fallback) : [];
    }
  },

  /**
   * 서버의 전체 데이터를 업데이트합니다.
   */
  async updateAllRooms(rooms: MPRoom[]): Promise<boolean> {
    try {
      // 2시간 이상 경과한 오래된 방은 서버 청소 시뮬레이션
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

      if (response.ok) {
        localStorage.setItem('f1_paddock_global_sync', JSON.stringify(activeRooms));
      }
      return response.ok;
    } catch (e) {
      console.error("서버 동기화 실패:", e);
      return false;
    }
  },

  /**
   * 특정 방을 동기화합니다.
   */
  async syncRoom(room: MPRoom): Promise<boolean> {
    const rooms = await this.getRooms();
    const index = rooms.findIndex(r => r.id === room.id);

    let updatedRooms;
    if (index > -1) {
      updatedRooms = rooms.map(r => r.id === room.id ? room : r);
    } else {
      updatedRooms = [room, ...rooms];
    }

    return await this.updateAllRooms(updatedRooms);
  },

  /**
   * 방을 제거합니다.
   */
  async deleteRoom(roomId: string): Promise<void> {
    const rooms = await this.getRooms();
    const filtered = rooms.filter(r => r.id !== roomId);
    await this.updateAllRooms(filtered);
  }
};
