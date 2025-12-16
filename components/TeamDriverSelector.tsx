import React from 'react';
import { TEAMS, DRIVERS, TRANSLATIONS } from '../constants';
import { Team, Driver, Language } from '../types';
import { Users, ChevronRight, Check } from 'lucide-react';

interface Props {
  selectedTeam: Team | null;
  selectedDriver: Driver | null;
  onSelectTeam: (team: Team) => void;
  onSelectDriver: (driver: Driver) => void;
  lang: Language;
}

const TeamDriverSelector: React.FC<Props> = ({ selectedTeam, selectedDriver, onSelectTeam, onSelectDriver, lang }) => {
  const teamDrivers = selectedTeam ? DRIVERS.filter(d => d.teamId === selectedTeam.id) : [];
  const t = TRANSLATIONS[lang];

  // Helper to handle image errors by setting a placeholder
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, name: string) => {
      e.currentTarget.src = `https://placehold.co/100x100/1e293b/FFFFFF?text=${name.substring(0,3).toUpperCase()}`;
  };

  return (
    <div className="mb-8 bg-slate-900/50 rounded-xl border border-slate-800 p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Users className="text-blue-500" /> {t.selectTeamDriver}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Team Selection */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">{t.constructor}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {TEAMS.map((team) => (
              <button
                key={team.id}
                onClick={() => {
                    onSelectTeam(team);
                    // Reset driver if it doesn't match new team
                    if (selectedDriver && selectedDriver.teamId !== team.id) {
                        // Automatically select first driver of new team? No, let user choose.
                    }
                }}
                className={`relative p-2 rounded-lg border transition-all flex flex-col items-center gap-2 group ${
                  selectedTeam?.id === team.id
                    ? 'bg-slate-800 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden p-1 shadow-sm">
                    <img 
                        src={team.logo} 
                        alt={team.name[lang]} 
                        className="w-full h-full object-contain"
                        onError={(e) => handleImageError(e, team.name.en)}
                    />
                </div>
                <div className="text-[10px] text-center font-bold text-white leading-tight group-hover:text-blue-400 transition-colors">{team.name[lang]}</div>
                {selectedTeam?.id === team.id && (
                    <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                        <Check size={8} className="text-white"/>
                    </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Driver Selection */}
        <div>
           <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">{t.driver}</h3>
           {!selectedTeam ? (
               <div className="h-32 flex items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-600 text-sm">
                   {t.noTeam}
               </div>
           ) : (
               <div className="grid grid-cols-2 gap-4">
                   {teamDrivers.map((driver) => (
                       <button
                           key={driver.id}
                           onClick={() => onSelectDriver(driver)}
                           className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                               selectedDriver?.id === driver.id
                                 ? 'bg-slate-800 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                 : 'bg-slate-900 border-slate-800 hover:bg-slate-800'
                           }`}
                       >
                           <div className="w-12 h-12 rounded bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
                               <img 
                                   src={driver.photo} 
                                   alt={driver.name[lang]} 
                                   className="w-full h-full object-cover" 
                                   onError={(e) => handleImageError(e, driver.name.en)}
                               />
                           </div>
                           <div>
                               <div className="text-xs text-slate-500 font-mono">#{driver.number}</div>
                               <div className="font-bold text-white text-sm">{driver.name[lang]}</div>
                               <div className="flex gap-2 mt-1">
                                   <span className="text-[10px] px-1.5 py-0.5 bg-slate-950 rounded text-slate-400 border border-slate-800" title="Skill">
                                       SK: {(driver.skill * 100).toFixed(0)}
                                   </span>
                                   <span className="text-[10px] px-1.5 py-0.5 bg-slate-950 rounded text-slate-400 border border-slate-800" title="Consistency">
                                       CN: {(driver.consistency * 100).toFixed(0)}
                                   </span>
                               </div>
                           </div>
                       </button>
                   ))}
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default TeamDriverSelector;