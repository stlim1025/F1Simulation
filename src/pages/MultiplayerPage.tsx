import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CarSetup, CarLivery, Language, MPRoom, MPPlayer, Team, TrackData } from '../types';
import { TRANSLATIONS, TRACKS } from '../constants';
import { Users, Plus, Play, LogIn, UserCircle, UserMinus, Shield, ArrowLeft, RotateCw, Wifi, WifiOff, Crown, Map as MapIcon, X, CheckCircle2, Trophy, MessageSquare, CloudRain, Sun, Flag, Timer } from 'lucide-react';
import CarVisualizer from '../components/CarVisualizer';
import RaceCanvas from '../components/RaceCanvas';
import TrackSelector from '../components/TrackSelector';
import { socket } from '../services/socket';

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

  // Lobby State
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const [isSelectingTrack, setIsSelectingTrack] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  // const [creationLaps, setCreationLaps] = useState(3); // Removed from here

  // Chat State
  const [chatMessages, setChatMessages] = useState<{ nickname: string, teamId?: string, content: string, time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (instant = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth'
      });
    }
  };

  useEffect(() => {
    // 페이지 마운트 또는 뷰 전환 시 최상단으로 스크롤 (로비 점프 방지)
    if (!currentRoom) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentRoom]);

  // Handle Refresh/Close: Clear session strictly on browser unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentRoom) {
        socket.emit('leaveRoom', { roomId: currentRoom.id });
      }
      localStorage.removeItem('f1_current_room_id');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentRoom]);

  useEffect(() => {
    // 메시지가 많아질 때만 실시간 스크롤 시도
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  useEffect(() => {
    socket.connect();

    const attemptRecovery = () => {
      const savedRoomId = localStorage.getItem('f1_current_room_id');
      if (savedRoomId && nickname) {
        const player = { nickname, setup, livery, team };
        socket.emit('rejoinRoom', { roomId: savedRoomId, player });
      } else {
        socket.emit('getLobby');
      }
    };

    socket.on('connect_error', () => {
      setIsConnected(false);
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
      localStorage.setItem('f1_current_room_id', room.id); // 세션 저장
      console.log(`[Session] Restored room ${room.id}`);
    });

    socket.on('roomUpdate', (room) => {
      // guard: only update if we are still supposed to be in this room
      setCurrentRoom(prev => {
        if (!prev || prev.id !== room.id) return prev;
        return room;
      });
      const me = room.players.find((p: any) => p.id === socket.id);
      if (me) {
        setMyPlayerId(socket.id!);
      }
    });

    socket.on('raceStarted', (room) => {
      setCurrentRoom(prev => {
        if (!prev || prev.id !== room.id) return prev;
        return room;
      });
    });

    socket.on('chat:message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('chat:history', (history) => {
      setChatMessages(history);
    });

    socket.on('error', (msg) => {
      alert(`Error: ${msg}`);
    });

    socket.on('kicked', () => {
      alert(lang === 'ko' ? '방장에 의해 강퇴되었습니다.' : 'You were kicked by the host.');
      setCurrentRoom(null);
      setChatMessages([]);
      localStorage.removeItem('f1_current_room_id'); // Clear session
      window.scrollTo({ top: 0, behavior: 'instant' });
    });

    // 모든 리스너 등록 후 복구 시도
    if (socket.connected) {
      setIsConnected(true);
      setMyPlayerId(socket.id!);
      attemptRecovery();
    }

    socket.on('connect', () => {
      setIsConnected(true);
      setMyPlayerId(socket.id!);
      attemptRecovery();
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('lobbyUpdate');
      socket.off('roomJoined');
      socket.off('roomUpdate');
      socket.off('raceStarted');
      socket.off('chat:message');
      socket.off('chat:history');
      socket.off('error');
      socket.off('kicked');
    };
  }, []);

  useEffect(() => {
    if (currentRoom && socket.connected) {
      socket.emit('updateSetup', { roomId: currentRoom.id, setup, livery });
    }
  }, [setup, livery, currentRoom?.id]);

  const handleSetNickname = () => {
    if (nickname.trim()) {
      localStorage.setItem('f1_nickname', nickname);
      setIsNickSet(true);
    }
  };

  const resetNickname = () => {
    setIsNickSet(false);
  };

  const createRoom = () => {
    if (!nickname) return;
    const player = { nickname, setup, livery, team };
    socket.emit('createRoom', { name: `${nickname}'s Paddock`, trackId: TRACKS[0].id, player, totalLaps: 3 }); // Default 3
  };

  const joinRoom = (roomId: string) => {
    if (!nickname) return;
    const player = { nickname, setup, livery, team };
    socket.emit('joinRoom', { roomId, player });
  };

  const leaveRoom = () => {
    if (currentRoom) {
      socket.emit('leaveRoom', { roomId: currentRoom.id });
    }
    setCurrentRoom(null);
    setChatMessages([]); // 채팅 내역 초기화
    localStorage.removeItem('f1_current_room_id'); // 세션 삭제
    window.scrollTo({ top: 0, behavior: 'instant' });
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

  const changeTrack = (trackId: string) => {
    if (!currentRoom) return;
    socket.emit('room:changeTrack', { roomId: currentRoom.id, trackId });
    setIsSelectingTrack(false);
  };

  const changeLaps = (laps: number) => {
    if (!currentRoom) return;
    socket.emit('room:changeLaps', { roomId: currentRoom.id, laps });
  };

  const changeWeather = (weather: 'sunny' | 'rainy') => {
    if (!currentRoom) return;
    socket.emit('room:changeWeather', { roomId: currentRoom.id, weather });
  };

  const changeQualifying = (enabled: boolean) => {
    if (!currentRoom) return;
    socket.emit('room:toggleQualifying', { roomId: currentRoom.id, enabled });
  };

  const sendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !currentRoom) return;

    socket.emit('chat:send', {
      roomId: currentRoom.id,
      nickname,
      teamId: team?.id,
      content: chatInput
    });
    setChatInput('');
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
            onKeyDown={(e) => e.key === 'Enter' && handleSetNickname()}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-lg font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          >
            {t.enterPaddock}
          </button>
        </div>
      </div>
    );
  }

  // --- RACING VIEW ---
  if (currentRoom && (currentRoom.status === 'racing' || currentRoom.status === 'countdown' || currentRoom.status === 'qualifying')) {
    const me = currentRoom.players.find((p: any) => p.id === socket.id);
    if (!me) return <div className="p-20 text-white">Connecting to race...</div>;

    return (
      <div className="fixed inset-0 z-[150] bg-slate-950 overflow-hidden">
        <RaceCanvas
          room={currentRoom}
          me={me}
          socket={socket}
          onLeave={leaveRoom}
          weather={currentRoom.weather}
        />
      </div>
    );
  }

  // --- RESULTS VIEW ---
  if (currentRoom && currentRoom.status === 'finished') {
    const sortedPlayers = [...currentRoom.players].sort((a, b) => (a.finishTime || 999) - (b.finishTime || 999));

    return (
      <div className="max-w-4xl mx-auto mt-10 animate-fade-in px-4">
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-yellow-500 to-green-500" />

          <div className="flex flex-col items-center mb-10 text-center">
            <Trophy size={64} className="text-yellow-500 mb-4 animate-bounce" />
            <h2 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter">Grand Prix Results</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest mt-2">{TRACKS.find(t => t.id === currentRoom.trackId)?.name[lang]}</p>
          </div>

          <div className="space-y-4 mb-10">
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between p-4 md:p-6 rounded-2xl border-2 transition-all ${i === 0 ? 'bg-yellow-500/10 border-yellow-500 shadow-lg shadow-yellow-500/20' : 'bg-slate-950 border-slate-800'}`}>
                <div className="flex items-center gap-4 md:gap-6">
                  <span className={`text-xl md:text-2xl font-black italic ${i === 0 ? 'text-yellow-500' : 'text-slate-600'}`}>P{i + 1}</span>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 border-slate-700 overflow-hidden" style={{ backgroundColor: p.team?.color }}>
                    {p.team ? <img src={`/src/images/teams/${p.team.id}.png`} className="w-6 h-6 md:w-8 md:h-8 object-contain" /> : <UserCircle size={24} />}
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-white uppercase truncate max-w-[120px] md:max-w-none">{p.nickname}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{p.team?.name[lang] || 'Independent'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg md:text-xl font-mono font-black text-white">{p.finishTime ? `${p.finishTime}s` : 'DNF'}</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{i === 0 ? 'WINNER' : `+${(p.finishTime - sortedPlayers[0].finishTime).toFixed(3)}s`}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {currentRoom.hostId === socket.id ? (
              <button
                onClick={() => socket.emit('room:reset', { roomId: currentRoom.id })}
                className="bg-red-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl active:scale-95 text-sm"
              >
                {lang === 'ko' ? '대기실로 돌아가기' : 'Back to Paddock'}
              </button>
            ) : (
              <div className="bg-slate-800/50 text-slate-400 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-center text-sm border border-slate-700 animate-pulse">
                {lang === 'ko' ? '방장이 메인 로비로 이동시키길 기다리는 중...' : 'Waiting for host to return to paddock...'}
              </div>
            )}
            <button
              onClick={leaveRoom}
              className="bg-slate-800 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-700 transition-all shadow-xl active:scale-95 text-sm"
            >
              {lang === 'ko' ? '방 나가기' : 'Exit Room'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ROOM VIEW ---
  if (currentRoom) {
    const track = TRACKS.find(tr => tr.id === currentRoom.trackId) || TRACKS[0];
    const isHost = currentRoom.hostId === socket.id;
    const me = currentRoom.players.find((p: any) => p.id === socket.id);

    return (
      <div className="animate-fade-in space-y-4">
        {/* COMPACT ROOM HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm gap-4">
          <div className="flex items-center gap-3">
            <button onClick={leaveRoom} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full border border-slate-700">
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white italic">{currentRoom.name}</h2>
                {isHost && <Crown size={18} className="text-yellow-500" />}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">
                  {track.name[lang]} | {currentRoom.players.length}/4 {lang === 'ko' ? '명의 드라이버' : 'DRIVERS'} | {currentRoom.totalLaps} LAPS
                </p>
                {/* Host Controls Inline */}
                {/* Host Controls */}
                {isHost && (
                  <>
                    <button
                      onClick={() => setIsSelectingTrack(true)}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 px-2.5 py-1 rounded-full border border-slate-700 transition-all text-[10px] font-black uppercase"
                    >
                      <MapIcon size={12} />
                      {t.changeTrack}
                    </button>
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-full border border-slate-700">
                      {[1, 3, 5, 10].map(l => (
                        <button
                          key={l}
                          onClick={() => changeLaps(l)}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-all ${currentRoom.totalLaps === l ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-full border border-slate-700">
                      <button
                        onClick={() => changeWeather('sunny')}
                        className={`p-1 px-2 rounded-full transition-all flex items-center gap-1 ${currentRoom.weather === 'sunny' ? 'bg-yellow-500 text-black' : 'text-slate-400 hover:text-white'}`}
                        title="Sunny"
                      >
                        <Sun size={12} />
                        <span className="text-[9px] font-black uppercase">Sun</span>
                      </button>
                      <button
                        onClick={() => changeWeather('rainy')}
                        className={`p-1 px-2 rounded-full transition-all flex items-center gap-1 ${currentRoom.weather === 'rainy' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        title="Rainy"
                      >
                        <CloudRain size={12} />
                        <span className="text-[9px] font-black uppercase">Rain</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-full border border-slate-700">
                      <button
                        onClick={() => changeQualifying(!currentRoom.isQualifyingEnabled)}
                        className={`p-1 px-3 rounded-full transition-all flex items-center gap-2 ${currentRoom.isQualifyingEnabled ? 'bg-orange-600 text-white shadow-[0_0_10px_rgba(234,88,12,0.4)]' : 'text-slate-400 hover:text-white'}`}
                        title="Qualifying"
                      >
                        <Timer size={12} />
                        <span className="text-[9px] font-black uppercase">Qualy {currentRoom.isQualifyingEnabled ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Non-Host View */}
                {!isHost && (
                  <div className="flex items-center gap-2 ml-2">
                    <div className={`px-2 py-1 rounded flex items-center gap-1.5 border text-[9px] font-black uppercase ${currentRoom.weather === 'rainy' ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-yellow-900/30 text-yellow-500 border-yellow-800'}`}>
                      {currentRoom.weather === 'rainy' ? <CloudRain size={10} /> : <Sun size={10} />}
                      {currentRoom.weather === 'rainy' ? 'Rainy' : 'Sunny'}
                    </div>
                    {currentRoom.isQualifyingEnabled && (
                      <div className="px-2 py-1 rounded flex items-center gap-1.5 border bg-orange-900/30 text-orange-500 border-orange-800 text-[9px] font-black uppercase">
                        <Timer size={10} />
                        Qualifying Enabled
                      </div>
                    )}
                  </div>
                )}
              </div>
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
              <CheckCircle2 size={18} /> {me?.isReady ? (lang === 'ko' ? '준비 완료!' : 'READY!') : (lang === 'ko' ? '준비 대기' : 'NOT READY')}
            </button>

            {isHost && (
              <button
                disabled={!currentRoom.players.every((p: any) => p.isReady)}
                onClick={startRace}
                className={`flex-1 md:flex-none px-8 py-3 rounded-lg font-black uppercase flex items-center justify-center gap-2 transition-all ${currentRoom.players.every((p: any) => p.isReady)
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
              >
                <Play size={18} fill="currentColor" /> {t.startRace}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-20">



          {/* PLAYER GRID SECTION */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 h-fit">
            {Array.from({ length: 4 }).map((_, idx) => {
              const player = currentRoom.players[idx];
              const isMe = player?.id === socket.id;
              const isHostCard = player?.id === currentRoom.hostId;

              return (
                <div key={idx} className={`h-[420px] rounded-3xl border-2 transition-all relative overflow-hidden ${player ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-slate-950/50 border-slate-800 border-dashed flex flex-col items-center justify-center'}`}>
                  {player ? (
                    <>
                      <CarVisualizer setup={player.setup} livery={player.livery} lang={lang} track={track} />
                      <div className="absolute top-5 left-5 right-5 flex justify-between items-start pointer-events-none">
                        <div className="flex flex-col gap-2 pointer-events-auto">
                          <div className="flex items-center gap-2 bg-black/80 px-4 py-2 rounded-full border border-slate-700 backdrop-blur-md">
                            <div className={`w-2 h-2 rounded-full ${player.isReady ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]'}`} />
                            <span className="text-xs font-black text-white uppercase tracking-tighter">
                              {player.nickname} {isMe && `(${t.you})`}
                            </span>
                            {isHost && player.id !== socket.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(lang === 'ko' ? `${player.nickname}님을 강퇴하시겠습니까?` : `Kick ${player.nickname}?`)) {
                                    socket.emit('room:kick', { roomId: currentRoom.id, targetId: player.id });
                                  }
                                }}
                                className="ml-2 text-red-500 hover:text-red-400 transition-colors border-l border-slate-700 pl-2 flex items-center gap-1"
                                title="Kick Player"
                              >
                                <X size={14} />
                                <span className="text-[9px] font-black">KICK</span>
                              </button>
                            )}
                          </div>
                          {player.team && (
                            <div className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur-md flex items-center gap-2 w-fit">
                              <img src={`/src/images/teams/${player.team.id}.png`} className="w-4 h-4 object-contain" alt="" />
                              <span className="text-[10px] font-bold text-slate-400">{player.team.name[lang]}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 items-end pointer-events-auto">
                          {isHostCard && (
                            <div className="bg-yellow-500 text-black text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-lg w-fit">
                              {t.host}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-slate-900/50 p-10 rounded-full mb-4 border border-slate-800">
                        <Users size={40} className="text-slate-800" />
                      </div>
                      <span className="text-slate-700 font-black uppercase text-[10px] tracking-[0.3em]">{t.waiting}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* CHAT SECTION (Restored Position, Adjusted Height) */}
          <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl flex flex-col h-[60vh] lg:h-[calc(100vh-280px)] min-h-[400px] shadow-2xl lg:sticky lg:top-24">
            <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-red-500" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">{t.paddockChat}</span>
              </div>
              <span className="text-[9px] text-slate-500 font-bold uppercase">{chatMessages.length} {t.messages}</span>
            </div>

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
            >
              {chatMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-slate-600 text-[9px] font-black uppercase tracking-tighter italic text-center px-4">{t.noMessages || 'No messages yet. Say hello!'}</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-3 animate-slide-in-right">
                    {msg.teamId ? (
                      <div className="w-6 h-6 rounded-full border border-slate-700 flex items-center justify-center bg-slate-800 overflow-hidden flex-none mt-1">
                        <img src={`/src/images/teams/${msg.teamId}.png`} className="w-4 h-4 object-contain" alt="" />
                      </div>
                    ) : (
                      <UserCircle size={20} className="text-slate-600 mt-1 flex-none" />
                    )}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-white">{msg.nickname}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm text-slate-300 font-medium leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={sendChatMessage} className="p-4 bg-slate-950/50 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t.messagePlaceholder || "메시지..."}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:border-red-500 outline-none"
              />
              <button type="submit" className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-xl transition-all active:scale-95">
                <LogIn size={16} />
              </button>
            </form>
          </div>
        </div>

        {isSelectingTrack && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl bg-black/60 animate-fade-in">
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl w-full max-w-5xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up relative">
              <button onClick={() => setIsSelectingTrack(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white p-2 bg-slate-800 rounded-full border border-slate-700 z-10">
                <X size={20} />
              </button>
              <div className="p-8 pb-12 overflow-x-hidden">
                <TrackSelector tracks={TRACKS} selectedTrack={track} lang={lang} variant="grid" onSelect={(selected) => changeTrack(selected.id)} />
              </div>
            </div>
          </div>
        )}
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
          <button onClick={() => socket.emit('getLobby')} className="p-4 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700"><RotateCw size={20} /></button>

          <button onClick={createRoom} className="flex-1 md:flex-none bg-white hover:bg-slate-200 text-slate-900 px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-2xl active:scale-95">
            <Plus size={18} /> {t.createRoom}
          </button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-3xl">
          <WifiOff size={64} className="text-slate-700 mb-6" />
          <p className="text-slate-400 font-black uppercase text-sm tracking-widest">활성화된 패독이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {rooms.map(room => (
            <div key={room.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-7 hover:border-red-500/50 transition-all group relative overflow-hidden flex flex-col h-full shadow-lg">
              <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col gap-1.5">
                  <span className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-[0.2em] w-fit">RACE ROOM</span>
                  <div className="flex gap-1">
                    <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${room.weather === 'rainy' ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-yellow-900/30 text-yellow-500 border-yellow-800'}`}>
                      {room.weather === 'rainy' ? 'RAIN' : 'SUN'}
                    </div>
                    {room.isQualifyingEnabled && (
                      <div className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase border bg-orange-900/30 text-orange-500 border-orange-800">
                        QUALY
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-white text-lg font-black font-mono leading-none">{room.players.length}/4</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-2 italic truncate group-hover:text-red-500 transition-colors uppercase">{room.name}</h3>
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-8 border-l-2 border-red-500 pl-3">
                {TRACKS.find(tr => tr.id === room.trackId)?.name[lang] || room.trackId}
              </p>
              <div className="flex -space-x-3 mb-10 mt-auto">
                {room.players.map((p: any, i: number) => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-slate-900 flex items-center justify-center text-xs font-black text-white shadow-xl overflow-hidden relative" style={{ backgroundColor: p.team?.color || '#334155' }}>
                    {p.team ? <img src={`/src/images/teams/${p.team.id}.png`} className="w-7 h-7 object-contain" alt="" /> : p.nickname[0].toUpperCase()}
                  </div>
                ))}
              </div>
              <button
                onClick={() => joinRoom(room.id)}
                disabled={room.status !== 'lobby'}
                className={`w-full py-5 rounded-2xl text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${room.status === 'lobby'
                  ? 'bg-slate-800 group-hover:bg-red-600'
                  : room.status === 'racing' || room.status === 'countdown'
                    ? 'bg-yellow-600/50 cursor-not-allowed text-yellow-200'
                    : 'bg-slate-800/50 cursor-not-allowed text-slate-500'
                  }`}
              >
                {room.status === 'lobby' ? (
                  <>
                    <LogIn size={18} /> {t.joinRoom}
                  </>
                ) : room.status === 'racing' || room.status === 'countdown' ? (
                  <>
                    <Play size={18} /> RACING...
                  </>
                ) : (
                  <>
                    <Flag size={18} /> FINISHED
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiplayerPage;
