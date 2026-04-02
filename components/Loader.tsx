import React from 'react';
import { AnalysisStep } from '../types';

interface LoaderProps {
  step: AnalysisStep;
}

const Loader: React.FC<LoaderProps> = ({ step }) => {
  
  const renderLine = (msg: string, active: boolean, done: boolean) => {
     return (
        <div className={`flex items-center gap-2 ${active ? 'opacity-100' : done ? 'opacity-50' : 'opacity-20'}`}>
            <span>{done ? '[OK]' : active ? '[>>]' : '[  ]'}</span>
            <span>{msg}</span>
            {active && <span className="animate-pulse">_</span>}
        </div>
     )
  };

  return (
    <div className="mt-8 font-['VT323'] text-xl space-y-2">
      {renderLine("INJECTING PAYLOAD STREAM...", step === AnalysisStep.INJECTING_PAYLOAD, step === AnalysisStep.BRUTEFORCING || step === AnalysisStep.ESCALATING_PRIVILEGES)}
      {renderLine("RUNNING BRUTEFORCE MATRIX...", step === AnalysisStep.BRUTEFORCING, step === AnalysisStep.ESCALATING_PRIVILEGES)}
      {renderLine("ESCALATING PRIVILEGES (ROOT_ACCESS)...", step === AnalysisStep.ESCALATING_PRIVILEGES, false)}
    </div>
  );
};

export default Loader;