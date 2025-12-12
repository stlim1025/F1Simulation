import React from 'react';
import { TrackData } from '../types';
import { Map, Flag } from 'lucide-react';

interface Props {
  tracks: TrackData[];
  selectedTrack: TrackData;
  onSelect: (track: TrackData) => void;
}

const TrackSelector: React.FC<Props> = ({ tracks, selectedTrack, onSelect }) => {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Map className="text-green-500" /> 서킷 선택
      </h2>
      <div className="relative group">
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {tracks.map((track) => {
              const isSelected = selectedTrack.id === track.id;
              return (
                  <button
                      key={track.id}
                      onClick={() => onSelect(track)}
                      className={`flex-none w-72 relative overflow-hidden text-left p-4 rounded-xl border transition-all duration-300 snap-center ${
                          isSelected
                          ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-[1.02]'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                      }`}
                  >
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate max-w-[80%]">{track.country}</span>
                          {isSelected && <Flag size={16} className="text-green-500 animate-pulse flex-none" />}
                      </div>
                      <h3 className="text-lg font-bold text-white leading-tight mb-2 truncate">{track.name}</h3>
                      
                      <div className="flex gap-2 mb-3">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                              DF: {track.characteristics.downforce}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                              속도: {track.characteristics.speed}
                          </span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 h-8">{track.description}</p>
                  </button>
              )
          })}
        </div>
        {/* Gradient Fade for scroll indication */}
        <div className="absolute top-0 right-0 h-full w-12 bg-gradient-to-l from-[#0f172a] to-transparent pointer-events-none group-hover:from-slate-900/0 transition-all" />
      </div>
    </div>
  );
};

export default TrackSelector;