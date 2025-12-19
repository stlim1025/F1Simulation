import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CarSetup, CarLivery, Language, MPRoom, MPPlayer, Team, TrackData } from '../types';
import { TRANSLATIONS, TRACKS } from '../constants';
import { Users, Plus, Play, LogIn, UserCircle, Shield, ArrowLeft, RotateCw, Wifi, WifiOff, Crown, Map as MapIcon, X, CheckCircle2, Trophy } from 'lucide-react';
import CarVisualizer from '../components/CarVisualizer';
import RaceCanvas from '../components/RaceCanvas';
import { io, Socket } from 'socket.io-client';

interface Props {
  setup: CarSetup;
  livery: CarLivery;
  lang: Language;
  team: Team | null;
}

// Initialize Socket outside component to prevent reconnects
const SOCKET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : `http://${window.location.hostname}:3001`;

const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
});

const MultiplayerPage: React.FC<Props> = ({ setup, livery, lang, team }) => {
  const t = TRANSLATIONS[lang];
  const [nickname, setNickname] = useState(localStorage.getItem('f1_nickname') || '');
  const [isNickSet, setIsNickSet] = useState(!!nickname);

  // Lobby State
  const [rooms, setRooms] = useState<any[]>([]); // Using 'any' briefly to match server object structure if differs
  const [currentRoom, setCurrentRoom] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [isSelectingTrack, setIsSelectingTrack] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string>('');

  useEffect(() => {
    // Socket Sync
    socket.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      setMyPlayerId(socket.id!);
      socket.emit('getLobby');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setCurrentRoom(null);
    });

    socket.on('lobbyUpdate', (updatedRooms) => {
      setRooms(updatedRooms);
    });

    socket.on('roomJoined', (room) => {
      setCurrentRoom(room);
    });

    socket.on('roomUpdate', (room) => {
      setCurrentRoom(room);
    });

    socket.on('raceStarted', (room) => {
      // Handle Race Start Transition
      setCurrentRoom(room);
      alert("RACE STARTING! (Implementation coming next)");
    });

    socket.on('error', (msg) => {
      alert(`Error: ${msg}`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('lobbyUpdate');
      socket.off('roomJoined');
      socket.off('roomUpdate');
      socket.off('raceStarted');
      socket.off('error');
      socket.disconnect();
    };
  }, []);

  // Update Setup/Livery dynamically if room is active
  useEffect(() => {
    if (currentRoom && socket.connected) {
      socket.emit('updateSetup', { roomId: currentRoom.id, setup, livery });
    }
  }, [setup, livery]);


  const handleSetNickname = () => {
    if (nickname.trim()) {
      localStorage.setItem('f1_nickname', nickname);
      setIsNickSet(true);
      if (socket.connected) {
        // In a real app, we'd emit an update to the server here too
      }
    }
  };

  const resetNickname = () => {
    setIsNickSet(false);
  };

  // ... rest of logic

  const createRoom = () => {
    if (!nickname) return;
    const player = { nickname, setup, livery, team };
    socket.emit('createRoom', { name: `${nickname}'s Paddock`, trackId: TRACKS[0].id, player });
  };

  const joinRoom = (roomId: string) => {
    if (!nickname) return;
    const player = { nickname, setup, livery, team };
    socket.emit('joinRoom', { roomId, player });
  };

  const leaveRoom = () => {
    socket.emit('leaveRoom');
    setCurrentRoom(null);
  };

  const toggleReady = () => {
    if (!currentRoom) return;
    const me = currentRoom.players.find((p: any) => p.id === socket.id);
    if (me) {
      socket.emit('updateReady', { roomId: currentRoom.id, isReady: !me.isReady });
    }
  };

  const startRace = () => {
    if (!currentRoom) return;
    socket.emit('startRace', { roomId: currentRoom.id });
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

  // --- RACING VIEW ---
  if (currentRoom && currentRoom.status === 'racing') {
    const me = currentRoom.players.find((p: any) => p.id === socket.id);
    if (!me) return <div>Error: Player not found in race</div>;

    return (
      <RaceCanvas
        room={currentRoom}
        me={me}
        socket={socket}
        onLeave={leaveRoom}
      />
    );
  }

  // --- ROOM VIEW ---
  if (currentRoom) {
    const track = TRACKS.find(tr => tr.id === currentRoom.trackId) || TRACKS[0];
    const isHost = currentRoom.hostId === socket.id;
    const me = currentRoom.players.find((p: any) => p.id === socket.id);

    return (
      <div className="animate-fade-in space-y-6">
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
                {track.name[lang]} | {currentRoom.players.length}/4 DRIVERS
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={toggleReady}
              className={`flex-1 md:flex-none px-6 py-3 rounded-lg font-black uppercase flex items-center justify-center gap-2 transition-all border transform active:scale-95 ${me?.isReady
                ? 'bg-green-500/10 text-green-500 border-green-500 hover:bg-green-500 hover:text-white'
                : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-white hover:text-white'
                }`}
            >
              <CheckCircle2 size={18} /> {me?.isReady ? 'READY!' : 'NOT READY'}
            </button>

            {isHost && (
              <button
                disabled={!currentRoom.players.every((p: any) => p.isReady)} // 모든 플레이어가 레디해야 활성화
                onClick={startRace}
                className={`flex-1 md:flex-none px-8 py-3 rounded-lg font-black uppercase flex items-center justify-center gap-2 transition-all ${currentRoom.players.every((p: any) => p.isReady)
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
              >
                <Play size={18} fill="currentColor" /> {t.startRace}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {Array.from({ length: 4 }).map((_, idx) => {
            const player = currentRoom.players[idx];
            const isMe = player?.id === socket.id;
            const isHostCard = player?.id === currentRoom.hostId;

            return (
              <div key={idx} className={`h-[400px] rounded-3xl border-2 transition-all relative overflow-hidden ${player ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-slate-950/50 border-slate-800 border-dashed flex flex-col items-center justify-center'}`}>
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

  // --- RESULTS VIEW ---
  if (currentRoom && currentRoom.status === 'finished') {
    const sortedPlayers = [...currentRoom.players].sort((a, b) => (a.finishTime || 999) - (b.finishTime || 999));

    return (
      <div className="max-w-4xl mx-auto mt-10 animate-fade-in">
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-10 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-yellow-500 to-green-500" />

          <div className="flex flex-col items-center mb-10">
            <Trophy size={64} className="text-yellow-500 mb-4 animate-bounce" />
            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Grand Prix Results</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest mt-2">{TRACKS.find(t => t.id === currentRoom.trackId)?.name[lang]}</p>
          </div>

          <div className="space-y-4 mb-10">
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${i === 0 ? 'bg-yellow-500/10 border-yellow-500 shadow-lg shadow-yellow-500/20' : 'bg-slate-950 border-slate-800'}`}>
                <div className="flex items-center gap-6">
                  <span className={`text-2xl font-black italic ${i === 0 ? 'text-yellow-500' : 'text-slate-600'}`}>P{i + 1}</span>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-slate-700" style={{ backgroundColor: p.team?.color }}>
                    {p.team ? <img src={p.team.logo} className="w-8 h-8 object-contain" /> : <UserCircle size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white uppercase">{p.nickname}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{p.team?.name[lang] || 'Independent'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-mono font-black text-white">{p.finishTime ? `${p.finishTime}s` : 'DNF'}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{i === 0 ? 'WINNER' : `+${(p.finishTime - sortedPlayers[0].finishTime).toFixed(3)}s`}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={leaveRoom}
              className="bg-white text-black px-10 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl active:scale-95"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- LOBBY VIEW ---
  return (
    <div className="max-w-6xl mx-auto animate-fade-in mb-20 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
              <Users className="text-red-600" size={36} /> {t.lobby}
            </h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${isConnected ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {isConnected ? "ONLINE" : "OFFLINE"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] border-l-2 border-red-600 pl-3">
              드라이버: {nickname}
            </p>
            <button onClick={resetNickname} className="text-[9px] text-slate-400 hover:text-white underline font-black uppercase tracking-tighter">
              [CHANGE]
            </button>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <button
            onClick={() => socket.emit('getLobby')}
            className="p-4 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-700"
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

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl animate-pulse-slow">
          <div className="bg-slate-800/50 p-10 rounded-full mb-6 border border-slate-700">
            <WifiOff size={64} className="text-slate-700" />
          </div>
          <p className="text-slate-400 font-black uppercase text-sm tracking-widest mb-2">
            활성화된 패독이 없습니다
          </p>
          <p className="text-slate-600 text-xs text-center max-w-xs font-medium">
            Make the first room and wait for challengers!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {rooms.map(room => (
            <div key={room.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-7 hover:border-red-500/50 transition-all group relative overflow-hidden flex flex-col h-full shadow-lg hover:shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Shield size={140} />
              </div>
              <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col gap-1">
                  <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-[0.2em] shadow-[0_0_10px_rgba(220,38,38,0.5)] w-fit">RACE ROOM</span>
                  <span className="text-[9px] text-slate-600 font-mono tracking-tighter uppercase">{new Date(room.createdAt).toLocaleTimeString()} 생성됨</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-white text-lg font-black font-mono leading-none">{room.players.length}/4</span>
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">DRIVERS</span>
                </div>
              </div>

              <h3 className="text-2xl font-black text-white mb-2 italic truncate group-hover:text-red-500 transition-colors">{room.name}</h3>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-8 border-l-2 border-red-500 pl-3">
                {/* Track ID might be string initially if not synced perfectly, handle gracefully */}
                {room.trackId}
              </p>

              <div className="flex -space-x-3 mb-10 mt-auto">
                {room.players.map((p: any, i: number) => (
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
              </div>

              <button
                onClick={() => joinRoom(room.id)}
                className="w-full bg-slate-800 group-hover:bg-red-600 py-5 rounded-2xl text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all group-hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transform group-hover:-translate-y-1"
              >
                <LogIn size={18} /> {t.joinRoom}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiplayerPage;
