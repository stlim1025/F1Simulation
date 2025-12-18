
import React from 'react';
import { CarLivery, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Palette, X, RotateCcw } from 'lucide-react';

interface Props {
  livery: CarLivery;
  onChange: (livery: CarLivery) => void;
  onReset: () => void;
  onClose: () => void;
  lang: Language;
}

// Extract ColorInput outside to prevent re-mounting on every render (Fixes focus loss bug)
const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="flex items-center justify-between p-2 bg-slate-800/80 rounded border border-slate-700 hover:border-slate-500 transition-colors">
    <span className="text-xs text-slate-300 font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-slate-500 uppercase">{value}</span>
      <input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0 hover:scale-110 transition-transform"
      />
    </div>
  </div>
);

const LiveryEditor: React.FC<Props> = ({ livery, onChange, onReset, onClose, lang }) => {
  const t = TRANSLATIONS[lang];

  const handleColorChange = (key: keyof CarLivery, value: string) => {
    onChange({ ...livery, [key]: value });
  };

  return (
    <div className="absolute top-0 left-0 bottom-0 z-30 bg-slate-900/95 backdrop-blur-md border-r border-slate-700 shadow-2xl p-4 w-72 animate-slide-in-left flex flex-col h-full">
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4 flex-none">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette size={16} className="text-purple-500" />
                {t.customizeLivery}
            </h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X size={16} />
            </button>
        </div>

        <div className="space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 flex-grow pr-1">
            <div className="space-y-2">
                <h4 className="text-[10px] uppercase text-slate-500 font-bold mt-2 mb-1 pl-1">Bodywork</h4>
                <ColorInput label={t.liveryPrimary} value={livery.primary} onChange={(v) => handleColorChange('primary', v)} />
                <ColorInput label={t.liverySecondary} value={livery.secondary} onChange={(v) => handleColorChange('secondary', v)} />
                <ColorInput label={t.liveryAccent} value={livery.accent} onChange={(v) => handleColorChange('accent', v)} />
            </div>
            
            <div className="border-t border-slate-800 my-2"></div>
            
            <div className="space-y-2">
                <h4 className="text-[10px] uppercase text-slate-500 font-bold mt-2 mb-1 pl-1">Aerodynamics</h4>
                <ColorInput label={t.liveryFWing} value={livery.frontWing} onChange={(v) => handleColorChange('frontWing', v)} />
                <ColorInput label={t.liveryRWing} value={livery.rearWing} onChange={(v) => handleColorChange('rearWing', v)} />
            </div>

            <div className="border-t border-slate-800 my-2"></div>

            <div className="space-y-2">
                <h4 className="text-[10px] uppercase text-slate-500 font-bold mt-2 mb-1 pl-1">Details</h4>
                <ColorInput label={t.liveryHalo} value={livery.halo} onChange={(v) => handleColorChange('halo', v)} />
                <ColorInput label={t.liveryHelmet} value={livery.driverHelmet} onChange={(v) => handleColorChange('driverHelmet', v)} />
                <ColorInput label={t.liveryRim} value={livery.wheelRim} onChange={(v) => handleColorChange('wheelRim', v)} />
            </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2 flex-none">
            <button 
                onClick={onReset}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-xs transition-colors border border-slate-700"
            >
                <RotateCcw size={14} /> {t.resetLivery}
            </button>
        </div>
    </div>
  );
};

export default LiveryEditor;
