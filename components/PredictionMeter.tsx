import React, { useEffect, useState } from 'react';

interface PredictionMeterProps {
  type: 'SUCCESS' | 'RISK';
  percentage: number;
}

const PredictionMeter: React.FC<PredictionMeterProps> = ({ type, percentage }) => {
  const [blocks, setBlocks] = useState(0);

  useEffect(() => {
    // 10 blocks total
    const targetBlocks = Math.round((percentage / 100) * 10);
    const timer = setTimeout(() => {
      setBlocks(targetBlocks);
    }, 200);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="w-full font-['VT323']">
      <div className="flex justify-between items-end mb-0 leading-none">
        <span className="text-lg font-bold opacity-80">{type}</span>
        <span className="text-xl font-bold">{percentage}%</span>
      </div>
      <div className="flex gap-1 mt-1">
        {[...Array(10)].map((_, i) => (
            <div 
                key={i} 
                className={`h-4 flex-1 border border-[#2d1a0e]/20 ${i < blocks ? 'bg-[#2d1a0e]' : 'bg-transparent'}`}
            ></div>
        ))}
      </div>
    </div>
  );
};

export default PredictionMeter;