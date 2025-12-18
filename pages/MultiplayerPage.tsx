
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CarSetup, CarLivery, Language, MPRoom, MPPlayer, Team, TrackData } from '../types';
import { TRANSLATIONS, TRACKS } from '../constants';
import { PaddockService } from '../services/paddockService';
import { Users, Plus, Play, LogIn, UserCircle, Shield, ArrowLeft, RotateCw, Wifi, WifiOff, Crown, Map as MapIcon, X } from 'lucide-react';
import CarVisualizer from '../components/CarVisualizer';

interface Props {
  setup: CarSetup;
  livery: CarLivery;
  lang: Language;
  team: Team | null;
}

const MultiplayerPage: React.FC<Props> = ({ setup, livery, lang, team }) => {
  const t = TRANSLATIONS[lang];
  const [nickname, setNickname] = useState(localStorage.getItem('f1_nickname') || '');
  const [isNickSet, setIsNickSet] = useState(!!nickname);
  const [rooms, setRooms] = useState<MPRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<MPRoom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [isSelectingTrack, setIsSelectingTrack] = useState(false);
  const [myPlayerId] = useState(() => {
    const savedId = localStorage.getItem('f1_driver_id');
    if (savedId) return savedId;
    const newId = 'driver-' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('f1_driver_id', newId);
    return newId;
  });

  const pollInterval = useRef<number | null>(null);

  // 로비 및 현재 방 상태 새로고침
  const refreshLobby = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const globalRooms = await PaddockService.getRooms();
      setRooms(globalRooms);
      setIsServerOnline(true);

      // 참여 중인 방이 있다면 최신 서버 데이터로 업데이트
      if (currentRoom) {
        const updated = globalRooms.find(r => r.id === currentRoom.id);
        if (updated) {
          setCurrentRoom(updated);
        } else {
          // 방장이 방을 닫았거나 만료된 경우
          setCurrentRoom(null);
        }
      }
    } catch (e) {
      setIsServerOnline(false);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [currentRoom]);

  // 실시간 동기화: 5초마다 서버 확인
  useEffect(() => {
    refreshLobby();
    pollInterval.current = window.setInterval(() => {
      refreshLobby(true);
    }, 5000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [refreshLobby]);

  const handleSetNickname = () => {
    if (nickname.trim()) {
      localStorage.setItem('f1_nickname', nickname);
      setIsNickSet(true);
    }
  };

  const createRoom = async () => {
    setIsLoading(true);
    const newRoom: MPRoom = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${nickname}의 레이스 패독`,
      trackId: TRACKS[0].id,
      hostId: myPlayerId,
      players: [{ id: myPlayerId, nickname, livery, setup, team: team || undefined, isReady: true }],
      status: 'lobby',
      createdAt: Date.now()
    };

    const success = await PaddockService.syncRoom(newRoom);
    if (success) {
      setCurrentRoom(newRoom);
    } else {
      alert("글로벌 서버 등록에 실패했습니다. 네트워크를 확인하세요.");
    }
    setIsLoading(false);
  };

  const joinRoom = async (room: MPRoom) => {
    if (room.players.length >= 4) return alert(t.roomFull);

    // 이미 참여 중인지 확인
    if (room.players.some(p => p.id === myPlayerId)) {
      setCurrentRoom(room);
      return;
    }

    const updatedRoom: MPRoom = {
      ...room,
      players: [...room.players, { id: myPlayerId, nickname, livery, setup, team: team || undefined, isReady: false }]
    };

    setIsLoading(true);
    const success = await PaddockService.syncRoom(updatedRoom);
    if (success) {
      setCurrentRoom(updatedRoom);
    } else {
      alert("방 입장에 실패했습니다.");
    }
    setIsLoading(false);
  };

  const leaveRoom = async () => {
    if (currentRoom) {
      setIsLoading(true);
      if (currentRoom.hostId === myPlayerId) {
        // 방장이 나가면 방 폭파
        await PaddockService.deleteRoom(currentRoom.id);
      } else {
        // 일반 유저는 본인만 삭제
        const updatedRoom = {
          ...currentRoom,
          players: currentRoom.players.filter(p => p.id !== myPlayerId)
        };
        await PaddockService.syncRoom(updatedRoom);
      }
    }
    setCurrentRoom(null);
    refreshLobby();
  };

  const changeTrack = async (newTrackId: string) => {
    if (!currentRoom || currentRoom.hostId !== myPlayerId) return;

    const updatedRoom: MPRoom = { ...currentRoom, trackId: newTrackId };
    // UI 즉시 반영
    setCurrentRoom(updatedRoom);
    setIsSelectingTrack(false);
    // 서버 동기화
    await PaddockService.syncRoom(updatedRoom);
  };

  if (!isNickSet) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="bg-red-600/20 p-4 rounded-full border border-red-500/50">
            <UserCircle size={48} className="text-red-500" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-white text-center mb-2 uppercase italic">{t.setupIdentity}</h2>
        <p className="text-slate-500 text-center text-sm mb-8">{t.nicknameHint}</p>
        <div className="space-y-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임 입력..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white font-bold focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
            maxLength={12}
          />
          <button
            onClick={handleSetNickname}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-lg font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          >
            {t.enterPaddock}
          </button>
        </div>
      </div>
    );
  }

  if (currentRoom) {
    const track = TRACKS.find(tr => tr.id === currentRoom.trackId) || TRACKS[0];
    const isHost = currentRoom.hostId === myPlayerId;

    return (
      <div className="animate-fade-in space-y-6">
        {/* Track Selection Modal */}
        {isSelectingTrack && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">{t.selectNewTrack}</h3>
                <button onClick={() => setIsSelectingTrack(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                {TRACKS.map(tr => (
                  <button
                    key={tr.id}
                    onClick={() => changeTrack(tr.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all group ${tr.id === currentRoom.trackId ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    <div className="text-[10px] font-bold opacity-60 uppercase mb-1">{tr.country[lang]}</div>
                    <div className="text-sm font-black group-hover:text-white transition-colors">{tr.name[lang]}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm gap-4">
          <div className="flex items-center gap-4">
            <button onClick={leaveRoom} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2.5 rounded-full border border-slate-700">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white italic">{currentRoom.name}</h2>
                {isHost && <Crown size={18} className="text-yellow-500" />}
              </div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mt-1">
                {track.name[lang]} | {currentRoom.players.length}/4 명 접속됨
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {isHost && (
              <button
                onClick={() => setIsSelectingTrack(true)}
                className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 border border-slate-700"
              >
                <MapIcon size={14} /> {t.changeTrack}
              </button>
            )}
            <button
              disabled={!isHost}
              className={`flex-1 md:flex-none px-8 py-3 rounded-lg font-black uppercase flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] ${isHost ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
            >
              <Play size={18} fill="currentColor" /> {t.startRace}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => {
            const player = currentRoom.players[idx];
            const isMe = player?.id === myPlayerId;
            const isHostCard = player?.id === currentRoom.hostId;

            return (
              <div key={idx} className={`h-[420px] rounded-3xl border-2 transition-all relative overflow-hidden ${player ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-slate-950/50 border-slate-800 border-dashed flex flex-col items-center justify-center'}`}>
                {player ? (
                  <>
                    <CarVisualizer setup={player.setup} livery={player.livery} lang={lang} track={track} />
                    <div className="absolute top-5 left-5 right-5 flex justify-between items-start pointer-events-none">
                      <div className="flex items-center gap-2 bg-black/80 px-4 py-2 rounded-full border border-slate-700 backdrop-blur-md">
                        <div className={`w-2 h-2 rounded-full ${player.isReady ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]'}`} />
                        <span className="text-xs font-black text-white uppercase tracking-tighter">
                          {player.nickname} {isMe && `(${t.you})`}
                        </span>
                      </div>
                      {isHostCard && (
                        <div className="bg-yellow-500 text-black text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-lg">
                          {t.host}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-slate-900/50 p-8 rounded-full mb-4 border border-slate-800">
                      <Users size={48} className="text-slate-800" />
                    </div>
                    <span className="text-slate-700 font-black uppercase text-[10px] tracking-[0.3em]">{t.waiting}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in mb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <Users className="text-red-600" size={36} /> {t.lobby}
            </h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${isServerOnline ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isServerOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {isServerOnline ? t.serverOnline : t.serverOffline}
            </div>
          </div>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] border-l-2 border-red-600 pl-3">
            드라이버: {nickname} | 글로벌 패독 네트워크 V3.1
          </p>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <button
            onClick={() => refreshLobby()}
            disabled={isLoading}
            className={`p-4 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-700 ${isLoading ? 'animate-spin text-red-500' : ''}`}
            title={t.refresh}
          >
            <RotateCw size={20} />
          </button>
          <button
            onClick={createRoom}
            className="flex-1 md:flex-none bg-white hover:bg-slate-200 text-slate-900 px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-2xl active:scale-95"
          >
            <Plus size={18} /> {t.createRoom}
          </button>
        </div>
      </div>

      {rooms.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl animate-pulse-slow">
          <div className="bg-slate-800/50 p-10 rounded-full mb-6 border border-slate-700">
            <WifiOff size={64} className="text-slate-700" />
          </div>
          <p className="text-slate-400 font-black uppercase text-sm tracking-widest mb-2">
            활성화된 패독이 없습니다
          </p>
          <p className="text-slate-600 text-xs text-center max-w-xs font-medium">
            첫 번째 패독 세션을 열어 전 세계 엔지니어들과 연결해보세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.map(room => (
            <div key={room.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-7 hover:border-red-500/50 transition-all group relative overflow-hidden flex flex-col h-full shadow-lg hover:shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Shield size={140} />
              </div>
              <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col gap-1">
                  <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-[0.2em] shadow-[0_0_10px_rgba(220,38,38,0.5)] w-fit">글로벌 패독</span>
                  <span className="text-[9px] text-slate-600 font-mono tracking-tighter uppercase">{new Date(room.createdAt).toLocaleTimeString()} 생성됨</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-white text-lg font-black font-mono leading-none">{room.players.length}/4</span>
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">DRIVERS</span>
                </div>
              </div>

              <h3 className="text-2xl font-black text-white mb-2 italic truncate group-hover:text-red-500 transition-colors">{room.name}</h3>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-8 border-l-2 border-red-500 pl-3">
                {TRACKS.find(t => t.id === room.trackId)?.name[lang] || room.trackId}
              </p>

              <div className="flex -space-x-3 mb-10 mt-auto">
                {room.players.map((p, i) => (
                  <div
                    key={i}
                    className="w-12 h-12 rounded-full bg-slate-800 border-4 border-slate-900 flex items-center justify-center text-xs font-black text-white shadow-xl overflow-hidden relative group/avatar"
                    title={p.nickname}
                    style={{ backgroundColor: p.team?.color || '#334155' }}
                  >
                    {p.team ? (
                      <img src={p.team.logo} className="w-7 h-7 object-contain" alt="logo" />
                    ) : p.nickname[0].toUpperCase()}
                    {room.hostId === p.id && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5 border-2 border-slate-900">
                        <Crown size={8} className="text-black" />
                      </div>
                    )}
                  </div>
                ))}
                {Array.from({ length: 4 - room.players.length }).map((_, i) => (
                  <div key={i} className="w-12 h-12 rounded-full bg-slate-950 border-4 border-slate-900 border-dashed flex items-center justify-center text-slate-800">
                    <Users size={14} />
                  </div>
                ))}
              </div>

              <button
                onClick={() => joinRoom(room)}
                className="w-full bg-slate-800 group-hover:bg-red-600 py-5 rounded-2xl text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all group-hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transform group-hover:-translate-y-1"
              >
                <LogIn size={18} /> {t.joinRoom}
              </button>
            </div>
          ))}
        </div>
      )}

      {isLoading && rooms.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 bg-slate-900/50 border border-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Connectivity Helper */}
      <div className="mt-12 p-4 bg-slate-900/30 rounded-xl border border-slate-800 text-center">
        <p className="text-[10px] text-slate-600 font-medium uppercase tracking-[0.2em]">
          <Wifi size={10} className="inline mr-1 text-green-500" />
          Telemetry Shared via Global Stratos Network V3.1 - End-to-End Encrypted
        </p>
      </div>
    </div>
  );
};

export default MultiplayerPage;
