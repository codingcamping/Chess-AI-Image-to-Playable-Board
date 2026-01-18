
import React, { useState, useEffect } from 'react';
import { Camera, Upload, Play, Info, CheckCircle, Loader2, RefreshCw, Cpu, Box, XCircle, AlertCircle, LayoutGrid, Sword, Shield, Zap, Sparkles, ChevronRight, Sliders, Scan, Layers } from 'lucide-react';
import ChessGame from './components/ChessGame';
import { detectChessPosition } from './services/geminiService';

type ViewState = 'home' | 'bot-selection' | 'upload' | 'play';

export interface BotConfig {
  id: string;
  name: string;
  elo: number;
  description: string;
  color: string;
  icon: React.ReactNode;
}

const BOTS: BotConfig[] = [
  { id: 'novice', name: 'Sparky', elo: 600, description: 'Aggressive but makes frequent tactical blunders.', color: 'text-blue-400', icon: <Zap className="w-8 h-8" /> },
  { id: 'intermediate', name: 'Sentinel', elo: 1500, description: 'Solid positional player with basic endgame knowledge.', color: 'text-emerald-400', icon: <Shield className="w-8 h-8" /> },
  { id: 'expert', name: 'Oracle', elo: 2800, description: 'Grandmaster-level precision and deep calculation.', color: 'text-purple-400', icon: <Cpu className="w-8 h-8" /> },
  { id: 'boss', name: 'Gemini Final Boss', elo: 4572, description: 'Super-intelligent entity. Sees 50 moves ahead.', color: 'text-amber-400', icon: <Sparkles className="w-8 h-8" /> },
];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('home');
  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
  const [customElo, setCustomElo] = useState<number>(1200);
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanningFile, setScanningFile] = useState<string>('');
  const [scanningRank, setScanningRank] = useState<number>(0);
  const [detectedFen, setDetectedFen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      let fileIdx = 0;
      let rank = 8;
      interval = setInterval(() => {
        setScanningFile(files[fileIdx]);
        setScanningRank(rank);
        rank--;
        if (rank < 1) {
          rank = 8;
          fileIdx = (fileIdx + 1) % 8;
        }
      }, 150);
    } else {
      setScanningFile('');
      setScanningRank(0);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setDetectedFen(null);
        setError(null);
        setView('upload'); // Transition to upload view immediately after file selection
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;
    setIsProcessing(true);
    setError(null);
    setDetectedFen(null);
    try {
      const base64Data = image.split(',')[1];
      const fen = await detectChessPosition(base64Data);
      setDetectedFen(fen);
    } catch (err: any) {
      setError(err.message === "NO_BOARD_FOUND" ? "Vision Core failed to detect a valid board grid. Ensure the photo is clear and taken from above." : "Unexpected analysis error.");
      setShowPopup(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const startPlaying = (bot: BotConfig) => {
    setSelectedBot(bot);
    setView('play');
  };

  const startCustomMatch = () => {
    const customBot: BotConfig = {
      id: 'custom',
      name: 'Neural Link',
      elo: customElo,
      description: `Synchronized difficulty targeting exactly ${customElo} ELO.`,
      color: 'text-sky-400',
      icon: <Sliders className="w-8 h-8" />
    };
    startPlaying(customBot);
  };

  const goHome = () => {
    setImage(null);
    setDetectedFen(null);
    setError(null);
    setSelectedBot(null);
    setView('home');
    setShowPopup(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans relative overflow-x-hidden">
      {/* Dynamic Background Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-red-500/50 rounded-[40px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="p-5 bg-red-500/10 rounded-full">
                <XCircle className="w-16 h-16 text-red-500" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Optical Error</h3>
                <p className="text-slate-400 font-medium leading-relaxed">{error}</p>
              </div>
              <button 
                onClick={() => setShowPopup(false)} 
                className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl border border-slate-700 transition-all active:scale-95"
              >
                RECALIBRATE
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div onClick={goHome} className="flex items-center gap-4 cursor-pointer group select-none transition-all active:scale-95">
            <div className="relative">
              <div className="absolute inset-0 bg-sky-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative p-2.5 bg-sky-500 rounded-xl shadow-lg shadow-sky-500/20">
                <Scan className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-white to-sky-500 bg-clip-text text-transparent">
                VISION CORE
              </h1>
              <span className="block text-[8px] font-black text-sky-500 uppercase tracking-[0.4em]">Advanced Digitization Engine</span>
            </div>
          </div>
          {view !== 'home' && (
            <button 
              onClick={goHome} 
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 rounded-full font-black text-[10px] uppercase tracking-widest border border-white/10 transition-all hover:border-sky-500/50"
            >
              System Reset
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {view === 'home' && (
          <div className="flex flex-col items-center gap-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="text-center max-w-4xl relative">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />
              <div className="inline-flex items-center gap-3 px-5 py-2 mb-8 bg-sky-500/10 border border-sky-500/20 rounded-full">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="text-sky-400 text-[10px] font-black uppercase tracking-[0.3em]">Neural Chess Engine v3.1</span>
              </div>
              <h2 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] bg-gradient-to-b from-white to-slate-600 bg-clip-text text-transparent">
                PHYSICAL BOARD. <br/><span className="text-sky-500">DIGITAL MASTER.</span>
              </h2>
              <p className="text-slate-400 text-xl md:text-2xl font-medium leading-relaxed max-w-2xl mx-auto">
                Transform any real-world chess match into a high-fidelity simulation using advanced Gemini Optical Intelligence.
              </p>
            </div>

            {/* Vision Core - The Main Highlight */}
            <div className="w-full max-w-5xl relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-[60px] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
              <div className="relative bg-slate-900/60 border border-white/10 p-2 rounded-[58px] backdrop-blur-3xl overflow-hidden shadow-2xl">
                <div className="flex flex-col lg:flex-row items-center">
                  <div className="flex-1 p-12 lg:p-16 space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-1 h-px bg-sky-500" />
                        <span className="text-sky-400 text-[10px] font-black uppercase tracking-widest">Primary Protocol</span>
                      </div>
                      <h3 className="text-5xl font-black tracking-tight">VISION ACTIVATION</h3>
                      <p className="text-slate-400 text-lg">Upload a photograph of your chessboard. Our Vision Core will map the pieces, generate a FEN sequence, and initiate a grandmaster-tier simulation.</p>
                    </div>
                    
                    <label className="flex items-center justify-center gap-4 w-full py-8 bg-white hover:bg-sky-400 text-slate-900 hover:text-white rounded-[32px] font-black text-2xl transition-all cursor-pointer shadow-xl active:scale-95 group/btn overflow-hidden relative">
                      <Camera className="w-8 h-8 group-hover/btn:scale-125 transition-transform" />
                      SELECT TARGET IMAGE
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>

                    <div className="flex flex-wrap gap-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Neural Mapping</div>
                      <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> FEN Generation</div>
                      <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> AI Adversary</div>
                    </div>
                  </div>
                  
                  <div className="w-full lg:w-1/3 bg-slate-800/40 border-l border-white/5 p-12 flex flex-col justify-center items-center text-center gap-6">
                    <div className="w-20 h-20 bg-slate-900 rounded-[24px] flex items-center justify-center border border-white/10 shadow-lg">
                      <Sword className="w-10 h-10 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-black text-xl mb-2">Match Engine</h4>
                      <p className="text-slate-500 text-sm">Prefer a standard start? Skip the vision and head straight to combat.</p>
                    </div>
                    <button 
                      onClick={() => setView('bot-selection')}
                      className="text-sky-400 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all"
                    >
                      Enter Match Engine <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'upload' && (
          <div className="flex flex-col items-center gap-12 animate-in fade-in duration-1000">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-sky-500/10 border border-sky-500/20 rounded-full">
                <Layers className="w-3 h-3 text-sky-400" />
                <span className="text-sky-400 text-[10px] font-black uppercase tracking-widest">Digitization in progress</span>
              </div>
              <h2 className="text-5xl font-black">Neural Mapping</h2>
            </div>

            <div className="w-full max-w-2xl">
              <div className="relative rounded-[40px] overflow-hidden border border-white/10 shadow-2xl bg-slate-900">
                <img src={image!} className={`w-full transition-opacity duration-1000 ${isProcessing ? 'opacity-40 grayscale' : 'opacity-100'}`} />
                
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full relative overflow-hidden">
                      {/* Scanning Line Animation */}
                      <div className="absolute inset-x-0 h-1 bg-sky-500 shadow-[0_0_20px_rgba(56,189,248,0.8)] animate-[scan_2s_infinite]" 
                           style={{ top: '0%' }} />
                      
                      <div className="absolute inset-0 flex items-center justify-center flex-col gap-6">
                        <div className="bg-slate-950/80 p-8 rounded-[32px] border border-sky-500/50 backdrop-blur-xl shadow-2xl flex flex-col items-center gap-4 scale-110">
                          <div className="text-sky-400 font-mono text-5xl font-black tracking-tighter flex items-center gap-3">
                            <Cpu className="animate-spin-slow" />
                            {scanningFile}{scanningRank}
                          </div>
                          <span className="text-[10px] text-sky-500/60 font-black uppercase tracking-[0.4em]">Indexing Coordinates</span>
                        </div>
                        <div className="flex gap-2">
                           {[...Array(3)].map((_, i) => (
                             <div key={i} className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                           ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-10">
                {!detectedFen ? (
                  <button 
                    onClick={processImage} 
                    disabled={isProcessing} 
                    className={`w-full py-6 rounded-3xl font-black text-2xl flex items-center justify-center gap-4 transition-all ${
                      isProcessing 
                      ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed' 
                      : 'bg-white text-slate-900 hover:bg-sky-400 hover:text-white shadow-2xl shadow-sky-500/20 active:scale-95'
                    }`}
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-8 h-8 animate-spin" /> MAPPING ENGINE ACTIVE</>
                    ) : (
                      <><Play className="w-8 h-8 fill-current" /> INITIATE VISION SCAN</>
                    )}
                  </button>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-bottom-8">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-[40px] flex items-center gap-6">
                      <div className="bg-emerald-500 p-4 rounded-2xl shadow-lg shadow-emerald-500/20">
                        <CheckCircle className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">Mapping Successful</p>
                        <p className="text-slate-400 font-medium">Coordinate matrix generated and verified.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setView('bot-selection')} 
                      className="w-full py-6 bg-sky-500 hover:bg-sky-400 text-white rounded-3xl font-black text-2xl shadow-2xl shadow-sky-500/30 transition-all active:scale-95 flex items-center justify-center gap-4"
                    >
                      PROCEED TO COMBAT <ChevronRight className="w-8 h-8" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'bot-selection' && (
          <div className="flex flex-col items-center gap-12 animate-in fade-in duration-1000 max-w-6xl mx-auto">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black tracking-tight">System Calibrations</h2>
              <p className="text-slate-400 text-xl font-medium">Select your adversary from the Neural Network.</p>
            </div>

            <div className="w-full bg-slate-900/40 p-10 rounded-[48px] border border-white/5 backdrop-blur-md shadow-2xl">
              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="flex-grow w-full space-y-8">
                  <div className="flex justify-between items-end">
                    <div className="space-y-2">
                      <span className="text-sky-500 text-[10px] font-black uppercase tracking-[0.3em]">Difficulty Synapse</span>
                      <h4 className="text-4xl font-black">Neural Link</h4>
                    </div>
                    <div className="text-right">
                      <span className="block text-6xl font-mono font-black text-white leading-none">{customElo}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 block">Index ELO</span>
                    </div>
                  </div>
                  <div className="relative pt-2">
                    <input 
                      type="range" 
                      min="400" 
                      max="3200" 
                      step="50"
                      value={customElo} 
                      onChange={(e) => setCustomElo(parseInt(e.target.value))}
                      className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer accent-sky-500"
                    />
                    <div className="absolute top-0 left-0 h-3 bg-sky-500 rounded-full pointer-events-none opacity-20" 
                         style={{ width: `${((customElo - 400) / 2800) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Initiate (400)</span>
                    <span>Grandmaster (3200)</span>
                  </div>
                </div>
                <button 
                  onClick={startCustomMatch}
                  className="w-full md:w-auto px-16 py-10 bg-sky-500 hover:bg-sky-400 text-white rounded-[40px] font-black text-2xl shadow-2xl shadow-sky-500/20 transition-all active:scale-95"
                >
                  START MATCH
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {BOTS.map((bot) => (
                <div 
                  key={bot.id}
                  onClick={() => startPlaying(bot)}
                  className={`group relative p-8 rounded-[40px] border border-white/5 bg-slate-900/40 cursor-pointer hover:border-sky-500/40 hover:-translate-y-2 transition-all duration-500 shadow-xl overflow-hidden backdrop-blur-sm`}
                >
                  <div className={`absolute -right-4 -bottom-4 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-700`}>{bot.icon}</div>
                  <div className="flex flex-col gap-6 h-full justify-between">
                    <div className="space-y-4">
                      <div className={`w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center ${bot.color} shadow-lg border border-white/5 group-hover:scale-110 transition-transform`}>
                        {bot.icon}
                      </div>
                      <div>
                        <h4 className="text-2xl font-black mb-1">{bot.name}</h4>
                        <span className={`text-[10px] font-mono font-black px-3 py-1 bg-slate-950 rounded-full border border-white/5 ${bot.color}`}>ELO {bot.elo}</span>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed">{bot.description}</p>
                    </div>
                    <div className="text-sky-500 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      Initialize <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'play' && selectedBot && (
          <div className="animate-in fade-in zoom-in duration-700">
            <ChessGame fen={detectedFen || undefined} bot={selectedBot} />
          </div>
        )}
      </main>

      <footer className="mt-20 border-t border-white/5 py-16 bg-[#020617]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-4 opacity-50">
            <Scan className="w-5 h-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Vision Core Engine • Advanced Optical Intelligence</p>
          </div>
          <div className="flex gap-12 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <a href="#" className="hover:text-sky-400 transition-colors">Documentation</a>
            <a href="#" className="hover:text-sky-400 transition-colors">Privacy Cloud</a>
            <a href="#" className="hover:text-sky-400 transition-colors">API Endpoint</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
