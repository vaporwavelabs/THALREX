import React from 'react';
import { Activity, Radio, Zap, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { AnalysisStep } from '../types';

interface WarlockStatusProps {
  step: AnalysisStep;
}

const WarlockStatus: React.FC<WarlockStatusProps> = ({ step }) => {
  
  const getStatusData = () => {
    switch (step) {
      case AnalysisStep.IDLE:
        return { 
          label: 'SYSTEM_READY', 
          sub: 'WAITING FOR INPUT', 
          icon: Radio,
          animate: false,
          spin: false
        };
      case AnalysisStep.INJECTING_PAYLOAD:
        return { 
          label: 'PAYLOAD_LINK', 
          sub: 'INJECTING SIGNAL', 
          icon: Activity,
          animate: true,
          spin: false
        };
      case AnalysisStep.BRUTEFORCING:
        return { 
          label: 'BRUTEFORCING', 
          sub: 'ANALYZING MATRIX', 
          icon: Loader2,
          animate: true,
          spin: true
        };
      case AnalysisStep.ESCALATING_PRIVILEGES:
        return { 
          label: 'ESCALATION', 
          sub: 'PRIVILEGE_GAIN', 
          icon: Zap,
          animate: true,
          spin: false
        };
      case AnalysisStep.COMPLETE:
        return { 
          label: 'COMPLETE', 
          sub: 'RESULTS READY', 
          icon: CheckCircle,
          animate: false,
          spin: false
        };
      case AnalysisStep.ERROR:
        return { 
          label: 'SYS_ERROR', 
          sub: 'MALFUNCTION', 
          icon: AlertTriangle,
          animate: false,
          spin: false
        };
      default:
        return { 
          label: 'UNKNOWN', 
          sub: '---', 
          icon: Radio,
          animate: false,
          spin: false
        };
    }
  };

  const { label, icon: Icon, animate, spin } = getStatusData();

  return (
    <div className="flex items-center gap-3 font-['VT323'] text-[#2d1a0e]">
      {/* Icon Box */}
      <div className={`w-10 h-10 border-2 border-[#2d1a0e] flex items-center justify-center bg-[#2d1a0e]/10 shadow-sm ${step === AnalysisStep.ERROR ? 'animate-pulse' : ''}`}>
        <Icon 
          size={20} 
          className={`${spin ? 'animate-spin' : ''} ${animate && !spin ? 'animate-pulse' : ''}`} 
        />
      </div>
      
      {/* Text Info */}
      <div className="leading-none">
        <div className="text-sm font-bold opacity-60 tracking-wider">STATUS:</div>
        <div className="text-xl font-bold tracking-widest uppercase">{label}</div>
      </div>
    </div>
  );
};

export default WarlockStatus;