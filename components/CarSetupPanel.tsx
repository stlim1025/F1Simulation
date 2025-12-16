import React from 'react';
import { CarSetup, TireCompound, Language } from '../types';
import { Wind, Activity, Disc, Zap, Play, RotateCcw, Settings, Gauge, ArrowUpDown, Info } from 'lucide-react';
import { SETUP_DESCRIPTIONS, TRANSLATIONS, TIRE_COMPOUNDS_LABELS } from '../constants';

interface Props {
  setup: CarSetup;
  onChange: (newSetup: CarSetup) => void;
  onRun: () => void;
  isSimulating: boolean;
  lang: Language;
}

const CarSetupPanel: React.FC<Props> = ({ setup, onChange, onRun, isSimulating, lang }) => {
  const t = TRANSLATIONS[lang];

  // Helper to safely get the translated label using type assertion or checking existence
  // Since we added these keys to TRANSLATIONS in constants.ts, we can access them.
  // Ideally, we would update the Translation type, but for now we cast to any or just access.
  const getLabel = (key: string) => {
      return (t as any)[key] || key;
  }

  const handleChange = (key: keyof CarSetup, value: any) => {
    onChange({ ...setup, [key]: value });
  };

  const SliderControl = ({ labelKey, prop, min, max, unit, step = 1, icon: Icon, color = "text-red-500" }: any) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1 text-slate-300">
        <div className="flex items-center gap-2 relative group">
            <Icon size={14} className={color} />
            <span className="text-xs font-medium cursor-help border-b border-dotted border-slate-600">
                {getLabel(labelKey)}
            </span>
            <div className="ml-1">
                <Info size={12} className="text-slate-500 hover:text-slate-300 transition-colors" />
            </div>
            {/* Tooltip */}
            <div className="absolute left-0 bottom-full mb-2 w-48 sm:w-56 p-2 bg-slate-950 border border-slate-700 text-slate-200 text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {SETUP_DESCRIPTIONS[prop as keyof CarSetup][lang]}
                <div className="absolute bottom-[-4px] left-4 w-2 h-2 bg-slate-950 border-r border-b border-slate-700 transform rotate-45"></div>
            </div>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 min-w-[30px] text-center">
          {setup[prop as keyof CarSetup]} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={setup[prop as keyof CarSetup]}
        onChange={(e) => handleChange(prop as keyof CarSetup, Number(e.target.value))}
        className="w-full cursor-pointer focus:outline-none"
      />
    </div>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg flex flex-col lg:h-full h-auto">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 rounded-t-xl sticky top-0 z-10 backdrop-blur-md">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="text-yellow-500" size={20} /> {t.garage}
          </h2>
      </div>

      <div className="p-4 space-y-6 flex-grow lg:overflow-y-auto overflow-visible scrollbar-thin scrollbar-thumb-slate-700">
        {/* Aerodynamics */}
        <section>
          <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3 border-b border-slate-800 pb-1 flex items-center gap-1">
             <Wind size={12}/> {t.aero}
          </h3>
          <div className="grid grid-cols-2 gap-4">
             <SliderControl labelKey="fWing" prop="frontWing" min={0} max={50} unit="" icon={ArrowUpDown} />
             <SliderControl labelKey="rWing" prop="rearWing" min={0} max={50} unit="" icon={ArrowUpDown} />
          </div>
        </section>

        {/* Differential (previously Transmission) */}
        <section>
          <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3 border-b border-slate-800 pb-1 flex items-center gap-1">
             <Settings size={12}/> {t.trans}
          </h3>
          <SliderControl labelKey="onThrottle" prop="onThrottleDiff" min={50} max={100} unit="%" icon={Activity} color="text-orange-500"/>
          <SliderControl labelKey="offThrottle" prop="offThrottleDiff" min={50} max={100} unit="%" icon={Activity} color="text-orange-500"/>
        </section>

        {/* Suspension Geometry & Physics */}
        <section>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3 border-b border-slate-800 pb-1 flex items-center gap-1">
                <Activity size={12}/> {t.susp}
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <SliderControl labelKey="fSusp" prop="frontSuspension" min={1} max={41} unit="" icon={ArrowUpDown} />
                <SliderControl labelKey="rSusp" prop="rearSuspension" min={1} max={41} unit="" icon={ArrowUpDown} />
                <SliderControl labelKey="fArb" prop="frontAntiRollBar" min={1} max={21} unit="" icon={ArrowUpDown} />
                <SliderControl labelKey="rArb" prop="rearAntiRollBar" min={1} max={21} unit="" icon={ArrowUpDown} />
                <SliderControl labelKey="fHeight" prop="frontRideHeight" min={20} max={50} unit="mm" icon={ArrowUpDown} />
                <SliderControl labelKey="rHeight" prop="rearRideHeight" min={20} max={50} unit="mm" icon={ArrowUpDown} />
            </div>
        </section>

        {/* Brakes */}
        <section>
             <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3 border-b border-slate-800 pb-1 flex items-center gap-1">
                <Disc size={12}/> {t.brakes}
             </h3>
             <SliderControl labelKey="pressure" prop="brakePressure" min={80} max={100} unit="%" icon={Disc} />
             <SliderControl labelKey="bias" prop="brakeBias" min={50} max={70} unit="%" icon={Disc} />
        </section>

        {/* Tires */}
        <section>
             <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3 border-b border-slate-800 pb-1 flex items-center gap-1">
                <Gauge size={12}/> {t.tires}
             </h3>
             <div className="grid grid-cols-2 gap-4">
                 <SliderControl labelKey="fPsi" prop="frontTirePressure" min={21.0} max={25.0} step={0.1} unit="psi" icon={Gauge} color="text-yellow-500"/>
                 <SliderControl labelKey="rPsi" prop="rearTirePressure" min={19.0} max={23.0} step={0.1} unit="psi" icon={Gauge} color="text-yellow-500"/>
             </div>
             
             <div className="mt-3">
                <label className="text-xs font-medium text-slate-300 mb-2 block flex items-center gap-2 group relative w-fit">
                    <Disc size={14} className="text-white"/> {t.compound}
                    <div className="ml-1"><Info size={12} className="text-slate-500 hover:text-slate-300" /></div>
                     <div className="absolute left-0 bottom-full mb-2 w-48 sm:w-56 p-2 bg-slate-950 border border-slate-700 text-slate-200 text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {SETUP_DESCRIPTIONS['tireCompound'][lang]}
                    </div>
                </label>
                <div className="grid grid-cols-4 gap-1">
                    {Object.values(TireCompound).map((compound) => (
                        <button
                            key={compound}
                            onClick={() => handleChange('tireCompound', compound)}
                            className={`py-2 px-1 rounded text-[10px] font-bold border transition-all ${
                                setup.tireCompound === compound
                                    ? 'bg-slate-800 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                           {TIRE_COMPOUNDS_LABELS[lang][compound]}
                        </button>
                    ))}
                </div>
             </div>
        </section>
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/30 rounded-b-xl">
        <button
            onClick={onRun}
            disabled={isSimulating}
            className={`w-full py-3 rounded-lg font-bold text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] ${
                isSimulating 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]'
            }`}
        >
            {isSimulating ? (
                <>
                    <RotateCcw className="animate-spin" size={18} /> {t.running}
                </>
            ) : (
                <>
                    <Play fill="currentColor" size={18} /> {t.runSim}
                </>
            )}
        </button>
      </div>
    </div>
  );
};

export default CarSetupPanel;