
import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, AlertTriangle, ListChecks, X, Zap, Activity, ChevronDown, ChevronUp, Crosshair, TrendingUp, Shield, ArrowRight, Maximize, Minimize, Bell, BellRing, Trash2, Gauge } from 'lucide-react';
import { executeKaliCommand, getTacticalAdvice } from './services/tacticalService';
import { KaliCommandResult, AnalysisStep, CommandAlert } from './types';
import PredictionMeter from './components/PredictionMeter';
import StockChart from './components/StockChart';
import Loader from './components/Loader';
import WarlockStatus from './components/WarlockStatus';

const App: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [step, setStep] = useState<AnalysisStep>(AnalysisStep.IDLE);
  const [result, setResult] = useState<KaliCommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strategyExpanded, setStrategyExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  
  // Progress System
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Multi-Select System
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedCommands, setSelectedCommands] = useState<string[]>([]);
  
  // Chat System
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [lastAdvice, setLastAdvice] = useState<string | null>(null);
  const [ollamaModels, setOllamaModels] = useState<any[]>([]);
  const [selectedModelL, setSelectedModelL] = useState<string>('');
  const [selectedModelR, setSelectedModelR] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [ollamaStatus, setOllamaStatus] = useState<string>('INITIALIZING');
  const [isPulling, setIsPulling] = useState(false);
  const [tacticalMode, setTacticalMode] = useState<'analyze' | 'Collab' | 'debate'>('analyze');
  
  // Recent Commands System
  const [favorites, setFavorites] = useState<string[]>(['nmap -sV target', 'sqlmap -u url', 'metasploit', 'hydra -l admin', 'wireshark', 'aircrack-ng', 'john the ripper', 'burp suite', 'nikto -h target', 'gobuster dir', 'enum4linux', 'searchsploit']);

  // Pagination System
  const pageSize = 6;
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(favorites.length / pageSize);

  // Triggers System
  const [alerts, setAlerts] = useState<CommandAlert[]>([]);
  const [newAlertPrice, setNewAlertPrice] = useState('');
  const [newAlertType, setNewAlertType] = useState<'ABOVE' | 'BELOW'>('ABOVE');

  // Auto-scroll to bottom of screen when content changes
  const screenEndRef = useRef<HTMLDivElement>(null);
  
  // Real-time Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
        if (alerts.length > 0) {
            alerts.forEach(alert => {
                if (result && result.command === alert.command) {
                   const currentVal = result.activityData[result.activityData.length - 1]?.price || 0;
                   const jitter = (Math.random() - 0.5) * (currentVal * 0.02);
                   const liveVal = currentVal + jitter;
                   
                   if (alert.active) {
                      if (alert.condition === 'ABOVE' && liveVal > alert.targetThreshold) {
                          alert.active = false;
                          alertUser(alert.command, liveVal, 'threshold EXCEEDED');
                      } else if (alert.condition === 'BELOW' && liveVal < alert.targetThreshold) {
                          alert.active = false;
                          alertUser(alert.command, liveVal, 'threshold DROPPED');
                      }
                   }
                }
            });
            setAlerts([...alerts]);
        }
    }, 5000);

    return () => clearInterval(interval);
  }, [alerts, result]);

  // Fetch Ollama Models and Status
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch('/api/models');
        if (res.ok) {
          const models = await res.json();
          setOllamaModels(models);
          if (models.length > 0) {
            if (!selectedModelL) setSelectedModelL(models[0].name);
            if (!selectedModelR) setSelectedModelR(models[0].name);
            if (!selectedModel) setSelectedModel(models[0].name);
          }
        }
      } catch (err) {
        console.error("Failed to fetch Ollama models:", err);
      }
    };

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          setOllamaStatus(data.status);
        }
      } catch (err) {
        setOllamaStatus('OFFLINE');
      }
    };

    fetchModels();
    fetchStatus();

    const statusInterval = setInterval(() => {
      fetchStatus();
      if (ollamaStatus === 'ONLINE' || ollamaStatus === 'OFFLINE') {
        fetchModels();
      }
    }, 3000);

    return () => clearInterval(statusInterval);
  }, [selectedModel, ollamaStatus]);

  const handlePullModel = async () => {
    const modelToPull = prompt("Enter model name to pull (e.g., llama3):", "llama3");
    if (!modelToPull) return;

    setIsPulling(true);
    try {
      const res = await fetch('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelToPull })
      });
      if (res.ok) {
        alert(`Successfully pulled ${modelToPull}`);
      } else {
        alert(`Failed to pull ${modelToPull}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPulling(false);
    }
  };

  // Update currentPage when symbol changes to a favorite on a different page
  useEffect(() => {
    const idx = favorites.indexOf(symbol);
    if (idx !== -1) {
      setCurrentPage(Math.floor(idx / pageSize));
    }
  }, [symbol, favorites]);

  const alertUser = (cmd: string, val: number, msg: string) => {
      // Simple visual alert for the retro UI
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-[#e08031] text-[#2d1a0e] px-6 py-4 border-2 border-[#2d1a0e] font-["VT323"] text-2xl font-bold shadow-xl z-50 animate-bounce';
      notification.innerText = `>>> TRIGGER: ${cmd} ${msg} ${val.toFixed(2)}`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 4000);
  };

  useEffect(() => {
    if (screenEndRef.current) {
      screenEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [step, result, error, strategyExpanded]);

  const handleSearch = async (overrideCmd?: string, overrideModel?: string) => {
    const commandsToRun = overrideCmd || (isMultiSelectMode && selectedCommands.length > 0 ? selectedCommands.join(' && ') : symbol);
    const activeModel = overrideModel || selectedModel;

    if (!commandsToRun.trim() || step === AnalysisStep.INJECTING_PAYLOAD || step === AnalysisStep.BRUTEFORCING || step === AnalysisStep.ESCALATING_PRIVILEGES) return;

    setError(null);
    setResult(null);
    setStrategyExpanded(false);
    setStep(AnalysisStep.INJECTING_PAYLOAD);
    setProgress(0);
    setTimeRemaining(12); // Estimated 12 seconds total

    try {
      const analysisPromise = executeKaliCommand(commandsToRun, activeModel);

      const totalSteps = 3;
      const stepDuration = 4000; // 4 seconds per step
      
      // Progress Simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + (100 / (totalSteps * (stepDuration / 100)));
        });
        setTimeRemaining(prev => Math.max(0, prev - 0.1));
      }, 100);

      await new Promise(resolve => setTimeout(resolve, stepDuration));
      setStep(AnalysisStep.BRUTEFORCING);

      await new Promise(resolve => setTimeout(resolve, stepDuration));
      setStep(AnalysisStep.ESCALATING_PRIVILEGES);

      const data = await analysisPromise;
      
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      
      clearInterval(progressInterval);
      setProgress(100);
      setTimeRemaining(0);
      
      setResult(data);
      setStep(AnalysisStep.COMPLETE);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "SYSTEM ERROR: UNABLE TO EXECUTE COMMAND.");
      setStep(AnalysisStep.ERROR);
      setProgress(0);
      setTimeRemaining(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    setIsChatLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: chatInput }]
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setLastAdvice(data.message.content);
        setChatInput('');
      } else {
        const errData = await res.json();
        setLastAdvice(`ERROR: ${errData.error || 'COMMUNICATION_FAILURE'}`);
      }
    } catch (err) {
      console.error(err);
      setLastAdvice("CRITICAL_ERROR: OLLAMA_BRIDGE_OFFLINE");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handlePadClick = (preset: string, model?: string) => {
    let finalCmd = preset;
    
    // If we have a symbol that looks like a target (no spaces, not a known command)
    // and the preset has a placeholder, replace it.
    const knownCommands = ['nmap', 'sqlmap', 'metasploit', 'hydra', 'wireshark', 'aircrack', 'john', 'burp', 'nikto', 'gobuster', 'enum4linux', 'searchsploit'];
    const isTargetOnly = symbol.trim() && !symbol.includes(' ') && !knownCommands.some(c => symbol.toLowerCase().startsWith(c));
    
    if (isTargetOnly) {
      if (preset.includes('target')) {
        finalCmd = preset.replace('target', symbol.trim());
      } else if (preset.includes('url')) {
        finalCmd = preset.replace('url', symbol.trim());
      } else if (!preset.includes(' ')) {
        // If it's a single word command like 'metasploit', just append the target
        finalCmd = `${preset} ${symbol.trim()}`;
      }
    }

    if (isMultiSelectMode) {
      setSelectedCommands(prev => 
        prev.includes(finalCmd) ? prev.filter(c => c !== finalCmd) : [...prev, finalCmd]
      );
    } else {
      setSymbol(finalCmd);
      if (model) {
        setSelectedModel(model);
        handleSearch(finalCmd, model);
      }
    }
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (!isMultiSelectMode) {
      // Entering multi-select mode
      if (symbol.trim()) {
        setSelectedCommands([symbol.trim()]);
      }
    } else {
      // Exiting multi-select mode
      setSelectedCommands([]);
    }
  };

  const addAlert = () => {
     if (!result || !newAlertPrice) return;
     const price = parseFloat(newAlertPrice);
     if (isNaN(price)) return;
     
     const newAlert: CommandAlert = {
         id: Date.now().toString(),
         command: result.command,
         targetThreshold: price,
         condition: newAlertType,
         active: true
     };
     
     setAlerts(prev => [...prev, newAlert]);
     setNewAlertPrice('');
  };

  const deleteAlert = (id: string) => {
      setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const resetSystem = () => {
    setSymbol('');
    setStep(AnalysisStep.IDLE);
    setResult(null);
    setError(null);
    setStrategyExpanded(false);
    setSelectedCommands([]);
    setIsMultiSelectMode(false);
  };

  const saveToFavorites = () => {
    if (symbol.trim() && !favorites.includes(symbol.trim())) {
      setFavorites(prev => [symbol.trim(), ...prev]);
      alertUser(symbol.trim(), 0, "SAVED_TO_FAV_STORE");
    }
  };

  // Fader Logic for Pages
  const isFavorite = favorites.includes(symbol);
  const faderPosition = totalPages > 1
    ? (currentPage / (totalPages - 1)) * 80 
    : 0;

  const handleFaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    setCurrentPage(page);
  };

  return (
    <div className={`min-h-screen bg-[#121212] flex items-center justify-center select-none animate-in fade-in duration-1000 ${isFullscreen ? 'p-0' : 'p-2 md:p-8'}`}>
      
      {/* Chart Modal Overlay */}
      {showChartModal && result && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-5xl h-[80vh] bg-[#282b30] border-4 border-[#e08031] shadow-2xl flex flex-col p-4 relative">
                  <button 
                    onClick={() => setShowChartModal(false)}
                    className="absolute top-2 right-2 bg-[#e08031] text-[#2d1a0e] p-2 hover:bg-orange-400 font-bold"
                  >
                      CLOSE_VIEW [X]
                  </button>
                  <div className="text-[#e08031] font-['VT323'] text-2xl font-bold mb-2">
                      {result.command} / DETAILED_NETWORK_ANALYSIS (LOAD & ENTROPY)
                  </div>
                  <div className="flex-1 bg-[#e08031]/10 border border-[#e08031]/30 p-4">
                      <StockChart 
                        data={result.activityData} 
                        trend={result.successProbability > result.riskLevel ? 'up' : 'down'}
                        minimal={false}
                        fibonacci={result.entropy}
                      />
                  </div>
              </div>
          </div>
      )}

      {/* MAIN CHASSIS */}
      <div className={`relative w-full bg-[#282b30] shadow-2xl overflow-hidden flex flex-col ${isFullscreen ? 'max-w-none h-screen rounded-none border-0' : 'max-w-[850px] rounded-lg border border-[#3a3f45]'}`}>
        
        {/* --- TOP SECTION: LOGO & SCREEN --- */}
        <div className={`flex flex-col ${isFullscreen ? 'flex-1 h-full bg-[#e08031]' : 'p-6 pb-2 bg-gradient-to-b from-[#282b30] to-[#222529]'}`}>
          
          {/* Branding - Hidden in Fullscreen */}
          {!isFullscreen && (
            <div className="flex justify-between items-end mb-4 border-b-2 border-[#3e454d] pb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-[#8ab0a8] tracking-widest drop-shadow-md uppercase font-sans">
                THALREX SYSTEMS
              </h1>
              <div className="text-[#8ab0a8] text-xs font-mono opacity-60">MK-II ANALYZER</div>
            </div>
          )}

          {/* THE ORANGE SCREEN */}
          <div className={`relative w-full ${isFullscreen ? 'flex-1 h-full border-0' : 'aspect-[16/10] md:aspect-[16/9] rounded-sm border-4 border-[#15171a] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]'} overflow-hidden`}>
            <div className="absolute inset-0 screen-texture overflow-y-auto retro-scroll p-6 font-['VT323'] text-[#2d1a0e]">
              
              {/* Screen Content Layer */}
              <div className="min-h-full flex flex-col">
                {/* Status Header Area */}
                <div className="flex justify-between items-start border-b-2 border-[#2d1a0e]/20 pb-4 mb-4">
                  <WarlockStatus step={step} />
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm opacity-60 font-bold leading-none">SYSTEM_ACTIVE</div>
                        <div className="text-lg font-bold opacity-80 leading-none">FAV_STORE: {favorites.length}</div>
                      </div>
                      {/* Fullscreen Toggle Button */}
                      <button 
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="w-8 h-8 border border-[#2d1a0e]/40 flex items-center justify-center hover:bg-[#2d1a0e]/10 active:translate-y-0.5 transition-all rounded-sm ml-2"
                        title={isFullscreen ? "Exit Full Screen" : "Full Screen Monitor"}
                      >
                        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Display Area */}
                <div className="flex-1">
                  
                  {/* Command Input Display - Always visible */}
                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-1">
                      <div className="text-sm opacity-60 uppercase tracking-tighter">USER INPUT:</div>
                      {step !== AnalysisStep.IDLE && step !== AnalysisStep.COMPLETE && step !== AnalysisStep.ERROR && (
                        <div className="flex items-center gap-3 text-sm font-bold animate-pulse">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-[#2d1a0e]/20 rounded-full overflow-hidden border border-[#2d1a0e]/30">
                              <div 
                                className="h-full bg-[#2d1a0e] transition-all duration-300" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="border-l border-[#2d1a0e]/20 pl-3">
                            ETA: {timeRemaining.toFixed(1)}s
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      value={isMultiSelectMode ? selectedCommands.join(' && ') : symbol}
                      onChange={(e) => !isMultiSelectMode && setSymbol(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="ENTER_USER_INPUT..."
                      className="w-full bg-black border-2 border-[#2d1a0e] text-3xl md:text-4xl font-bold text-[#e08031] placeholder-[#e08031]/30 px-4 py-2 focus:outline-none font-['VT323'] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] rounded-sm tracking-wider"
                      readOnly={isMultiSelectMode || (step !== AnalysisStep.IDLE && step !== AnalysisStep.ERROR && step !== AnalysisStep.COMPLETE)}
                    />
                    
                    {/* Selected Commands Display */}
                    {isMultiSelectMode && selectedCommands.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedCommands.map((cmd, idx) => (
                          <div key={idx} className="bg-black text-[#e08031] border border-[#e08031]/30 px-2 py-1 text-sm font-bold flex items-center gap-2">
                            {cmd}
                            <button onClick={() => setSelectedCommands(prev => prev.filter(c => c !== cmd))} className="hover:text-white">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SELECT COMMANDS Section - Appears when target is entered */}
                    {symbol.trim() && (step === AnalysisStep.IDLE || step === AnalysisStep.COMPLETE) && !isMultiSelectMode && (
                      <div className="mt-4 animate-in slide-in-from-top-2 duration-300 border-t border-[#2d1a0e]/20 pt-4">
                        <div className="text-sm opacity-60 mb-2 flex justify-between items-center font-bold">
                          <span>SELECT COMMANDS:</span>
                          <span className="text-[10px] opacity-40">PAGE {currentPage + 1}/{totalPages}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {favorites.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((fav, i) => (
                            <button
                              key={i}
                              onClick={() => handlePadClick(fav)}
                              className="bg-[#2d1a0e]/5 border border-[#2d1a0e]/20 p-2 text-left hover:bg-[#2d1a0e]/15 transition-colors group relative overflow-hidden flex items-center justify-between"
                            >
                              <span className="text-xs font-bold truncate">{fav}</span>
                              <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ollama Status Indicator */}
                  <div className="mt-4 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      ollamaStatus.startsWith('ONLINE') ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 
                      ollamaStatus === 'PULLING_MODEL' || ollamaStatus === 'INITIALIZING' ? 'bg-blue-500 animate-pulse shadow-[0_0_5px_rgba(59,130,246,0.8)]' :
                      'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]'
                    }`}></div>
                    <span className="text-[10px] font-bold tracking-widest opacity-60 uppercase">OLLAMA_BRIDGE: {ollamaStatus}</span>
                    
                    <div className="ml-auto flex items-center gap-2">
                      <button 
                        onClick={handlePullModel}
                        disabled={isPulling || ollamaStatus === 'PULLING_MODEL'}
                        className="bg-[#e08031]/10 border border-[#e08031]/30 text-[#e08031] text-[10px] font-bold px-2 py-1 hover:bg-[#e08031]/20 transition-colors disabled:opacity-50"
                      >
                        {isPulling || ollamaStatus === 'PULLING_MODEL' ? 'PULLING...' : 'PULL_NEW'}
                      </button>
                    </div>
                  </div>

                  {/* Tactical Advice Display - Integrated into terminal flow */}
                  {lastAdvice && (
                    <div className="mt-4 p-4 bg-black/5 border-2 border-[#ffbf00]/30 border-l-4 border-l-[#ffbf00] animate-in fade-in slide-in-from-left-2 duration-500 relative group">
                      <button 
                        onClick={() => setLastAdvice(null)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#2d1a0e]"
                      >
                        <X size={16} />
                      </button>
                      <div className="flex items-center gap-2 mb-2 text-[#ffbf00] font-bold text-sm tracking-widest">
                        <Activity size={14} />
                        <span>TACTICAL_ADVICE_FEED_v2.5</span>
                      </div>
                      <div className="text-xl font-bold leading-tight text-[#2d1a0e]">
                        {lastAdvice}
                      </div>
                    </div>
                  )}

                  {/* Steps Loader */}
                  {(step === AnalysisStep.INJECTING_PAYLOAD || step === AnalysisStep.BRUTEFORCING || step === AnalysisStep.ESCALATING_PRIVILEGES) && (
                    <Loader step={step} />
                  )}

                  {/* Error */}
                  {step === AnalysisStep.ERROR && (
                    <div className="border-2 border-[#2d1a0e] p-4 bg-[#2d1a0e]/10">
                       <h3 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle /> ERROR</h3>
                       <p className="text-xl mt-2">{error}</p>
                       <p className="mt-4 text-sm">PRESS [RESET] TO CONTINUE</p>
                    </div>
                  )}

                  {/* Results */}
                  {step === AnalysisStep.COMPLETE && result && (
                    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
                      
                      {/* Quick Stats - Including Network Bias */}
                      <div className="grid grid-cols-3 gap-4 border-b-2 border-[#2d1a0e]/20 pb-6">
                        <div>
                          <div className="text-sm opacity-70">EXEC_STATUS</div>
                          <div className="text-2xl font-bold truncate">{result.status}</div>
                        </div>
                        <div className="text-center border-l border-r border-[#2d1a0e]/20">
                           <div className="text-sm opacity-70">NETWORK_BIAS</div>
                           <div className={`text-3xl font-bold flex items-center justify-center gap-1 ${result.networkBias === 'STEALTH' ? 'animate-pulse' : ''}`}>
                              {result.networkBias === 'STEALTH' && <Shield size={24}/>}
                              {result.networkBias === 'HIGH_TRAFFIC' && <Activity size={24}/>}
                              {result.networkBias || 'NEUTRAL'}
                           </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm opacity-70">VERDICT</div>
                          <div className="text-4xl font-bold">{result.verdict}</div>
                        </div>
                      </div>

                      {/* TRIGGERS SECTION */}
                      <div className="bg-[#2d1a0e]/5 border border-[#2d1a0e]/20 p-3">
                         <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center gap-2 font-bold opacity-80">
                                <Bell size={16} /> SYSTEM_TRIGGERS
                             </div>
                         </div>
                         
                         {/* Add New Trigger */}
                         <div className="flex gap-2 mb-3">
                             <select 
                                value={newAlertType} 
                                onChange={(e) => setNewAlertType(e.target.value as any)}
                                className="bg-transparent border border-[#2d1a0e]/40 p-1 text-sm font-['VT323'] focus:outline-none"
                             >
                                 <option value="ABOVE">ABOVE</option>
                                 <option value="BELOW">BELOW</option>
                             </select>
                             <input 
                               type="number" 
                               value={newAlertPrice}
                               onChange={(e) => setNewAlertPrice(e.target.value)}
                               placeholder="THRESHOLD..."
                               className="w-24 bg-transparent border border-[#2d1a0e]/40 p-1 text-sm font-['VT323'] focus:outline-none"
                             />
                             <button 
                               onClick={addAlert}
                               className="px-2 bg-[#2d1a0e] text-[#e08031] text-xs font-bold hover:opacity-80"
                             >
                                SET
                             </button>
                         </div>

                         {/* Active Triggers List */}
                         <div className="space-y-1">
                             {alerts.filter(a => a.command === result.command).map(alert => (
                                 <div key={alert.id} className={`flex justify-between items-center text-sm p-1 border ${alert.active ? 'border-[#2d1a0e]/20' : 'border-red-500/30 bg-red-500/10'}`}>
                                     <span className={alert.active ? '' : 'line-through opacity-50'}>
                                        {alert.condition} {alert.targetThreshold}
                                     </span>
                                     <button onClick={() => deleteAlert(alert.id)} className="opacity-50 hover:opacity-100"><Trash2 size={12} /></button>
                                 </div>
                             ))}
                             {alerts.filter(a => a.command === result.command).length === 0 && (
                                 <div className="text-xs opacity-40 italic">NO ACTIVE TRIGGERS FOR {result.command}</div>
                             )}
                         </div>
                      </div>

                      {/* Chart */}
                      <div className="h-48 w-full border border-[#2d1a0e]/30 bg-[#2d1a0e]/5 p-2 relative">
                         <StockChart 
                            data={result.activityData} 
                            trend={result.successProbability > result.riskLevel ? 'up' : 'down'} 
                            onMaximize={() => setShowChartModal(true)}
                            fibonacci={result.entropy}
                         />
                      </div>
                      {result.entropy && (
                         <div className="text-xs flex justify-between px-2 opacity-60">
                            <span>ENTROPY HIGH: {result.entropy.swingHigh}</span>
                            <span>TREND: {result.entropy.trendDirection}</span>
                            <span>ENTROPY LOW: {result.entropy.swingLow}</span>
                         </div>
                      )}

                      {/* --- TACTICAL INTERVENTION OPTIONS --- */}
                      {result.exploitVectors && result.exploitVectors.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 opacity-70 border-b border-[#2d1a0e]/20 pb-1">
                            <Crosshair size={16} />
                            <h3 className="font-bold text-lg tracking-wider">EXPLOIT_VECTOR_MAPPING</h3>
                          </div>
                          
                          <div className="grid gap-3">
                            {result.exploitVectors.map((setup, idx) => (
                              <div key={idx} className="bg-[#2d1a0e]/10 border border-[#2d1a0e]/30 p-3 hover:bg-[#2d1a0e]/20 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 text-xs font-bold uppercase ${setup.signalType === 'EXPLOIT' ? 'bg-[#2d1a0e] text-[#e08031]' : 'bg-[#e08031] text-[#2d1a0e]'}`}>
                                      {setup.signalType}
                                    </span>
                                    <span className="font-bold uppercase">{setup.scenario}</span>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 text-sm mb-2 font-mono">
                                  <div>
                                    <div className="opacity-50 text-[10px]">ENTRY POINT</div>
                                    <div className="font-bold">{setup.entryZone}</div>
                                  </div>
                                  <div>
                                    <div className="opacity-50 text-[10px]">FAILSAFE</div>
                                    <div className="font-bold text-red-800/70">{setup.stopLoss}</div>
                                  </div>
                                  <div>
                                    <div className="opacity-50 text-[10px]">TARGET</div>
                                    <div className="font-bold">{setup.targetPrice}</div>
                                  </div>
                                </div>
                                
                                <div className="text-xs opacity-80 leading-tight border-t border-[#2d1a0e]/10 pt-2">
                                  <span className="font-bold opacity-100">SIMULATION: </span> {setup.description}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* --- STRATEGIC LOGIC CORE --- */}
                      <div className="bg-black p-4 border-2 border-[#2d1a0e] shadow-[inset_0_0_10px_rgba(224,128,49,0.2)] relative overflow-hidden transition-all duration-300">
                        {/* Scanline effect for the black box */}
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(224,128,49,0.03)_50%,transparent_50%)] bg-[length:4px_4px]"></div>
                        
                        <h3 className="text-[#e08031] font-bold text-lg border-b border-[#e08031]/30 pb-1 mb-3 flex items-center gap-2">
                           <Activity size={16} /> TACTICAL_LOGIC_CORE
                        </h3>
                        
                        {/* Logic Text with Expand/Collapse */}
                        <div className="relative mb-6">
                          <div 
                            className={`text-[#e08031] font-mono leading-relaxed opacity-90 overflow-hidden transition-all duration-500 ${strategyExpanded ? 'max-h-[1000px]' : 'max-h-[80px] mask-gradient-bottom'}`}
                            style={!strategyExpanded ? { maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' } : {}}
                          >
                             <span className="text-lg block whitespace-pre-wrap">{result.strategyAnalysis || "Logic analysis data unavailable."}</span>
                             {result.entropy && (
                                <div className="mt-4 pt-4 border-t border-[#e08031]/30">
                                   <strong className="text-white block mb-1">ENTROPY ASSESSMENT:</strong>
                                   <span className="text-[#d97706]">{result.entropy.assessment} ({result.entropy.currentLevel})</span>
                                </div>
                             )}
                          </div>
                          
                          <button 
                            onClick={() => setStrategyExpanded(!strategyExpanded)}
                            className="w-full flex items-center justify-center gap-2 py-1 mt-2 text-xs font-bold text-[#e08031] hover:bg-[#e08031]/10 border border-[#e08031]/30 rounded uppercase tracking-widest transition-colors cursor-pointer z-10 relative"
                          >
                            {strategyExpanded ? (
                              <>COLLAPSE_DATA <ChevronUp size={12}/></>
                            ) : (
                              <>REVEAL_FULL_LOGIC <ChevronDown size={12}/></>
                            )}
                          </button>
                        </div>

                        {/* Mini Charts: AI vs LIVE */}
                        <div className="grid grid-cols-2 gap-4">
                           {/* Chart 1: Live Data (Recent) */}
                           <div>
                              <div className="text-xs text-[#e08031]/60 mb-1 font-bold tracking-wider">LIVE_SYSTEM_FEED</div>
                              <div className="h-20 border border-[#e08031]/30 bg-[#e08031]/5 relative">
                                 {/* Just showing the last half of the chart data to simulate "Recent Live Action" */}
                                 <StockChart 
                                    data={result.activityData.slice(-7)} 
                                    trend="up" 
                                    minimal={true} 
                                 />
                              </div>
                           </div>

                           {/* Chart 2: AI Prediction */}
                           <div>
                              <div className="text-xs text-[#e08031]/60 mb-1 font-bold tracking-wider">AI_ATTACK_PATH</div>
                              <div className="h-20 border border-[#e08031]/30 bg-[#e08031]/5 relative">
                                 <StockChart 
                                    data={result.projectedPath && result.projectedPath.length > 0 ? result.projectedPath : []} 
                                    trend={result.successProbability > 50 ? 'up' : 'down'} 
                                    minimal={true} 
                                 />
                              </div>
                           </div>
                        </div>
                      </div>

                      {/* Confidence Meters */}
                      <div className="grid grid-cols-2 gap-4">
                        <PredictionMeter type="SUCCESS" percentage={result.successProbability} />
                        <PredictionMeter type="RISK" percentage={result.riskLevel} />
                      </div>

                      {/* Algorithmic Signals */}
                      {result.vulnerabilities && result.vulnerabilities.length > 0 && (
                        <div className="bg-[#2d1a0e]/10 border border-[#2d1a0e]/30 p-3">
                           <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase opacity-80">
                             <Zap size={16} /> DETECTED_VULNERABILITIES (24h)
                           </h3>
                           <div className="flex flex-wrap gap-2">
                             {result.vulnerabilities.map((pat, idx) => (
                               <span key={idx} className="px-2 py-1 bg-[#2d1a0e] text-[#e08031] text-sm uppercase tracking-wider font-bold">
                                 {pat}
                               </span>
                             ))}
                             {result.vulnerabilities.length === 0 && <span className="opacity-50 text-sm">NO VULNERABILITIES DETECTED</span>}
                           </div>
                        </div>
                      )}

                      {/* Text Analysis */}
                      <div className="space-y-4">
                         <div className="border-l-4 border-[#2d1a0e] pl-3">
                            <h3 className="font-bold text-xl uppercase">Terminal Output</h3>
                            <pre className="text-lg leading-tight opacity-90 whitespace-pre-wrap font-mono bg-[#2d1a0e]/5 p-2 border border-[#2d1a0e]/20">{result.output}</pre>
                         </div>
                      </div>
                      
                      {/* Grounding Links */}
                      {result.groundingUrls && result.groundingUrls.length > 0 && (
                        <div className="pt-4 border-t border-[#2d1a0e]/20">
                           <h4 className="text-sm uppercase mb-2 opacity-70">DATA_SOURCES:</h4>
                           <ul className="space-y-1 text-sm">
                              {result.groundingUrls.map((u, i) => (
                                <li key={i} className="truncate">
                                  <a href={u.uri} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                                    [{i+1}] {u.title} <ExternalLink size={12}/>
                                  </a>
                                </li>
                              ))}
                           </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Tactical Chat Input - Moved into Screen */}
                  <div className="mt-auto pt-6 border-t-2 border-[#2d1a0e]/20">
                    <div className="text-sm opacity-60 uppercase tracking-tighter mb-1 font-bold">TACTICAL_QUERY:</div>
                    <div className="w-full border-2 border-[#2d1a0e] bg-black shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden flex items-center px-4 py-2 gap-3 group focus-within:border-[#2d1a0e] transition-colors">
                      <Zap size={20} className={`${isChatLoading ? 'text-[#e08031] animate-pulse' : 'text-[#2d1a0e]/40 group-focus-within:text-[#e08031]'} transition-colors`} />
                      <input 
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                        placeholder={isChatLoading ? "ANALYZING..." : "ENTER_TACTICAL_QUERY..."}
                        className="bg-transparent border-none outline-none text-2xl w-full placeholder-[#e08031]/20 font-bold uppercase tracking-wider text-[#e08031] font-['VT323']"
                        disabled={isChatLoading}
                      />
                      {isChatLoading ? (
                        <div className="w-4 h-4 rounded-full bg-[#e08031] animate-ping"></div>
                      ) : (
                        <button 
                          onClick={handleChatSubmit}
                          className="text-xs font-bold bg-[#2d1a0e] text-[#e08031] px-3 py-1 rounded-sm hover:bg-[#2d1a0e]/80 active:translate-y-0.5 transition-all uppercase"
                        >
                          SEND
                        </button>
                      )}
                    </div>
                  </div>
                  <div ref={screenEndRef} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- MIDDLE: SPEAKER GRILLE - HIDDEN IN FULLSCREEN --- */}
        {!isFullscreen && (
          <div className="h-12 w-full grille-pattern relative border-t border-b border-black/40">
             {/* Decorative Screw Heads */}
             <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#111] border border-[#333] shadow-sm"></div>
             <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#111] border border-[#333] shadow-sm"></div>
          </div>
        )}

        {/* --- BOTTOM: CONTROL DECK - HIDDEN IN FULLSCREEN --- */}
        {!isFullscreen && (
          <div className="p-8 bg-[#282b30] flex flex-col gap-8 relative">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
               {/* Left Zone: Tactical Pads & Mode Dial */}
               <div className="md:col-span-5 flex items-center justify-between gap-4">
                  {/* Left Pad Unit */}
                  <div className="flex flex-col items-center gap-2">
                    {/* Model Select Window (Orange Screen Style) */}
                    <div className="w-20 h-8 screen-texture border-2 border-[#2d1a0e]/40 rounded-sm flex items-center justify-center relative shadow-inner">
                      <select 
                        value={selectedModelL}
                        onChange={(e) => {
                          setSelectedModelL(e.target.value);
                          setSelectedModel(e.target.value);
                        }}
                        className="bg-transparent border-none outline-none w-full h-full text-[10px] font-['VT323'] text-[#2d1a0e] font-black text-center appearance-none cursor-pointer px-1"
                      >
                        {ollamaModels.length > 0 ? (
                          ollamaModels.map((m) => (
                            <option key={m.name} value={m.name} className="bg-[#e08031] text-[#2d1a0e]">{m.name.toUpperCase()}</option>
                          ))
                        ) : (
                          <option value="">OFFLINE</option>
                        )}
                      </select>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown size={8} className="text-[#2d1a0e]" />
                      </div>
                    </div>
                    
                    {/* Left Blue Pad (25% size) */}
                    <button 
                      onClick={() => handlePadClick("SCAN_NETWORK", selectedModelL)}
                      className="w-16 h-16 bg-blue-600 hover:bg-blue-500 border-2 border-blue-400 rounded-md shadow-[0_4px_0_#1e40af] active:shadow-none active:translate-y-1 transition-all flex flex-col items-center justify-center gap-1 text-white font-black text-[10px] tracking-tighter uppercase"
                    >
                      <Activity size={16} />
                      PAD_L
                    </button>
                  </div>

                  {/* Tactical Mode Dial */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex justify-between w-32 px-1 text-[8px] font-bold text-gray-500 tracking-tighter uppercase">
                      <span className={tacticalMode === 'analyze' ? 'text-blue-400' : ''}>ANALYZE</span>
                      <span className={tacticalMode === 'Collab' ? 'text-blue-400' : ''}>COLLAB</span>
                      <span className={tacticalMode === 'debate' ? 'text-blue-400' : ''}>DEBATE</span>
                    </div>
                    
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      {/* Perimeter Lines (Tick Marks) */}
                      <div className="absolute inset-0 pointer-events-none">
                        {[...Array(12)].map((_, i) => (
                          <div 
                            key={i}
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-gray-600/40 origin-[center_48px]"
                            style={{ transform: `translateX(-50%) rotate(${i * 30}deg)` }}
                          ></div>
                        ))}
                      </div>

                      {/* The Knob Body */}
                      <button 
                        onClick={() => {
                          const modes: ('analyze' | 'Collab' | 'debate')[] = ['analyze', 'Collab', 'debate'];
                          const nextIndex = (modes.indexOf(tacticalMode) + 1) % modes.length;
                          setTacticalMode(modes[nextIndex]);
                        }}
                        className="w-20 h-20 rounded-full bg-[#e0e0e0] knob-shadow relative transform transition-transform active:scale-95 flex items-center justify-center"
                      >
                        {/* Dial Pointer (Pill style like RESET) */}
                        <div 
                          className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-6 bg-[#333] rounded-full transition-transform duration-300 origin-[center_32px]"
                          style={{ 
                            transform: `translateX(-50%) rotate(${tacticalMode === 'analyze' ? -45 : tacticalMode === 'Collab' ? 0 : 45}deg)` 
                          }}
                        ></div>
                        
                        {/* Center Cap Detail */}
                        <div className="w-4 h-4 rounded-full bg-[#ccc] border border-[#bbb] shadow-inner"></div>
                      </button>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">MODE_DIAL</span>
                  </div>

                  {/* Right Pad Unit */}
                  <div className="flex flex-col items-center gap-2">
                    {/* Model Select Window (Orange Screen Style) */}
                    <div className="w-20 h-8 screen-texture border-2 border-[#2d1a0e]/40 rounded-sm flex items-center justify-center relative shadow-inner">
                      <select 
                        value={selectedModelR}
                        onChange={(e) => {
                          setSelectedModelR(e.target.value);
                          setSelectedModel(e.target.value);
                        }}
                        className="bg-transparent border-none outline-none w-full h-full text-[10px] font-['VT323'] text-[#2d1a0e] font-black text-center appearance-none cursor-pointer px-1"
                      >
                        {ollamaModels.length > 0 ? (
                          ollamaModels.map((m) => (
                            <option key={m.name} value={m.name} className="bg-[#e08031] text-[#2d1a0e]">{m.name.toUpperCase()}</option>
                          ))
                        ) : (
                          <option value="">OFFLINE</option>
                        )}
                      </select>
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown size={8} className="text-[#2d1a0e]" />
                      </div>
                    </div>

                    {/* Right Blue Pad (25% size) */}
                    <button 
                      onClick={() => handlePadClick("EXPLOIT_TARGET", selectedModelR)}
                      className="w-16 h-16 bg-blue-600 hover:bg-blue-500 border-2 border-blue-400 rounded-md shadow-[0_4px_0_#1e40af] active:shadow-none active:translate-y-1 transition-all flex flex-col items-center justify-center gap-1 text-white font-black text-[10px] tracking-tighter uppercase"
                    >
                      <Zap size={16} />
                      PAD_R
                    </button>
                  </div>
               </div>

            {/* Right Zone: Knobs & Main Buttons */}
            <div className="md:col-span-7 flex items-end justify-end gap-6 pl-6 border-l border-[#333]">
               
               {/* Knobs Group */}
               <div className="flex gap-4 mb-2">
                  {/* Models Knob (Green) */}
                  <div className="flex flex-col items-center gap-2">
                     <div className="text-[10px] text-gray-400 font-bold">MODELS</div>
                     <button 
                       onClick={() => handlePullModel()} 
                       className="w-14 h-14 rounded-full bg-[#4ade80] knob-shadow relative transform transition-transform active:scale-95 border-2 border-green-600/30"
                     >
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-4 bg-[#1a2e1a] rounded-full"></div>
                     </button>
                  </div>

                  {/* Save Knob (Yellow) */}
                  <div className="flex flex-col items-center gap-2">
                     <div className="text-[10px] text-gray-400 font-bold">SAVE</div>
                     <button 
                       onClick={saveToFavorites} 
                       className="w-14 h-14 rounded-full bg-[#facc15] knob-shadow relative transform transition-transform active:scale-95 border-2 border-yellow-600/30"
                     >
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-4 bg-[#2e2a1a] rounded-full"></div>
                     </button>
                  </div>

                  {/* Reset Knob (White) */}
                  <div className="flex flex-col items-center gap-2">
                     <div className="text-[10px] text-gray-400 font-bold">RESET</div>
                     <button onClick={resetSystem} className="w-14 h-14 rounded-full bg-[#e0e0e0] knob-shadow relative transform transition-transform active:scale-95">
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-4 bg-[#333] rounded-full"></div>
                     </button>
                  </div>
               </div>

               {/* Rectangular Buttons - Updated Layout */}
               <div className="flex flex-col gap-2 min-w-[160px]">
                  {/* Active Agent Display */}
                  <div className="text-[9px] text-gray-500 font-bold tracking-widest uppercase text-right px-1">
                    ACTIVE_AGENT: <span className="text-orange-500">{selectedModel || 'NONE'}</span>
                  </div>
                  {/* Analyze Button - Full Width */}
                  <button 
                    onClick={() => handleSearch()}
                    className={`h-14 ${step === AnalysisStep.INJECTING_PAYLOAD || step === AnalysisStep.BRUTEFORCING ? 'bg-orange-500/80 animate-pulse' : 'bg-[#ea5827] hover:bg-[#ff6b3d]'} rounded-md shadow-[0_4px_0_#9e3310] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center text-sm font-bold text-[#521c0b] border-t border-[#ff8a63] tracking-wider uppercase`}
                  >
                    {step === AnalysisStep.IDLE || step === AnalysisStep.COMPLETE || step === AnalysisStep.ERROR ? 'EXECUTE' : 'RUNNING...'}
                  </button>
               </div>

               {/* Swing Bracket Graphic */}
               <div className="hidden md:block h-16 w-8 border-r-2 border-b-2 border-gray-600/30 rounded-br-xl mb-4"></div>
            </div>
          </div>
        </div>
      )}

        {/* LEDs - HIDDEN IN FULLSCREEN */}
        {!isFullscreen && (
          <div className="absolute bottom-4 right-20 flex gap-4">
             <div className={`w-2 h-2 rounded-full ${step === AnalysisStep.INJECTING_PAYLOAD ? 'bg-orange-500 shadow-[0_0_8px_orange]' : 'bg-[#333]'}`}></div>
             <div className={`w-2 h-2 rounded-full ${step === AnalysisStep.COMPLETE ? 'bg-orange-500 shadow-[0_0_8px_orange]' : 'bg-[#333]'}`}></div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;
