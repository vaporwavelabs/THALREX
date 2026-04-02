
import React, { useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  ReferenceArea,
  Label
} from 'recharts';
import { Maximize2, BarChart2, TrendingUp, Layers } from 'lucide-react';
import { ChartPoint, EntropyAnalysis } from '../types';

interface StockChartProps {
  data: ChartPoint[];
  trend: 'up' | 'down';
  minimal?: boolean;
  onMaximize?: () => void;
  fibonacci?: EntropyAnalysis;
}

const CandleShape = (props: any) => {
  const { x, y, width, height, low, high, open, close } = props;
  const isUp = close > open;
  const color = isUp ? '#22c55e' : '#ef4444'; // Green or Red
  const ratio = Math.abs(height / (high - low));

  // If we don't have OHLC data (pure line chart data), fallback
  if (open === undefined || close === undefined) return null;

  return (
    <g stroke={color} fill={color} strokeWidth="2">
      {/* Wick */}
      <line x1={x + width / 2} y1={y} x2={x + width / 2} y2={y + height} />
      {/* Body */}
      <rect
        x={x}
        y={isUp ? y + (high - close) * ratio : y + (high - open) * ratio}
        width={width}
        height={Math.max(2, Math.abs(open - close) * ratio)}
        fill={color}
      />
    </g>
  );
};

const StockChart: React.FC<StockChartProps> = ({ data, trend, minimal = false, onMaximize, fibonacci }) => {
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [showFibs, setShowFibs] = useState(true);

  // Theme colors derived from the retro screen design
  const strokeColor = minimal ? '#e08031' : '#2d1a0e';
  const fillColor = minimal ? '#e08031' : '#2d1a0e';
  const tickColor = minimal ? '#e08031' : '#2d1a0e';
  
  // VWAP Line Color (Cyan/Light Blue to stand out against Orange/Black)
  const vwapColor = '#00f0ff'; 

  // Prepare data for Candle chart (min/max for domain)
  const minValue = Math.min(...data.map(d => d.low || d.price));
  const maxValue = Math.max(...data.map(d => d.high || d.price));
  const domainPadding = (maxValue - minValue) * 0.1;

  // If data doesn't have OHLC, force line chart
  const hasOHLC = data.some(d => d.open !== undefined);
  const effectiveType = hasOHLC ? chartType : 'line';

  // --- FIBONACCI CALCULATION ---
  // If fibonacci data is passed, we calculate the levels
  let fibLevels: { val: number, label: string, color: string }[] = [];
  let goldenZone = null;

  if (fibonacci && !minimal && showFibs) {
    const { swingHigh, swingLow, trendDirection } = fibonacci;
    const diff = swingHigh - swingLow;
    
    // UPTREND: Pullback is measured from High down to Low.
    // 0% Retracement = High
    // 100% Retracement = Low
    // Level = High - (Diff * ratio)
    
    // DOWNTREND: Pullback is measured from Low up to High.
    // 0% Retracement = Low
    // 100% Retracement = High
    // Level = Low + (Diff * ratio)

    const calcLevel = (ratio: number) => {
        if (trendDirection === 'UPTREND') {
            return swingHigh - (diff * ratio);
        } else {
            return swingLow + (diff * ratio);
        }
    };

    fibLevels = [
        { val: swingHigh, label: 'HIGH', color: '#666' },
        { val: swingLow, label: 'LOW', color: '#666' },
        { val: calcLevel(0.382), label: '0.382', color: '#888' },
        { val: calcLevel(0.5), label: '0.50', color: '#2d1a0e' },
        { val: calcLevel(0.618), label: '0.618', color: '#d97706' }, // Gold color for Golden Ratio
    ];

    goldenZone = {
        y1: calcLevel(0.5),
        y2: calcLevel(0.618)
    };
  }

  return (
    <div className="relative w-full h-full group">
      
      {/* Controls Overlay (Only for non-minimal) */}
      {!minimal && (
        <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           {fibonacci && (
             <button 
               onClick={() => setShowFibs(!showFibs)}
               className={`p-1 rounded border transition-colors ${showFibs ? 'bg-[#d97706]/20 border-[#d97706] text-[#d97706]' : 'bg-[#2d1a0e]/10 border-[#2d1a0e]/30 text-[#2d1a0e]'}`}
               title="Toggle Fibonacci Overlay"
             >
               <Layers size={16} />
             </button>
           )}
           {hasOHLC && (
             <button 
               onClick={() => setChartType(prev => prev === 'line' ? 'candle' : 'line')}
               className="p-1 bg-[#2d1a0e]/10 hover:bg-[#2d1a0e]/20 rounded border border-[#2d1a0e]/30 text-[#2d1a0e]"
               title="Toggle Chart Type"
             >
               {effectiveType === 'line' ? <BarChart2 size={16} /> : <TrendingUp size={16} />}
             </button>
           )}
           {onMaximize && (
             <button 
                onClick={onMaximize}
                className="p-1 bg-[#2d1a0e]/10 hover:bg-[#2d1a0e]/20 rounded border border-[#2d1a0e]/30 text-[#2d1a0e]"
                title="Maximize Chart"
             >
                <Maximize2 size={16} />
             </button>
           )}
        </div>
      )}

      {/* Legend for VWAP (Non-minimal only) */}
      {!minimal && data.some(d => d.vwap) && (
         <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
            <div className="flex items-center gap-1">
               <div className="w-3 h-1 bg-[#00f0ff]"></div>
               <span className="text-[10px] font-['VT323'] text-[#2d1a0e] font-bold">NET_LOAD</span>
            </div>
            {showFibs && fibonacci && (
              <div className="flex items-center gap-1">
                 <div className="w-3 h-3 bg-[#d97706]/30 border border-[#d97706]"></div>
                 <span className="text-[10px] font-['VT323'] text-[#d97706] font-bold">VULN_ZONE</span>
              </div>
            )}
         </div>
      )}

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
            data={data}
            margin={{
              top: minimal ? 5 : 10,
              right: minimal ? 5 : 40, // More margin for Fib labels
              left: 0,
              bottom: 0,
            }}
          >
            {!minimal && <CartesianGrid strokeDasharray="3 3" stroke="#2d1a0e" strokeOpacity={0.1} vertical={false} />}
            
            <XAxis 
              dataKey="date" 
              tick={{fill: tickColor, fontSize: minimal ? 10 : 12, fontFamily: 'VT323', opacity: 0.7}}
              tickLine={false}
              axisLine={false}
              hide={minimal}
              tickFormatter={(val) => {
                 const parts = val.split('-');
                 return parts.length > 1 ? `${parts[1]}/${parts[2]}` : val;
              }}
            />
            
            <YAxis 
              hide={true} 
              domain={[minValue - domainPadding, maxValue + domainPadding]} 
            />
            
            {!minimal && (
              <Tooltip
               cursor={{fill: 'transparent'}}
               content={({ active, payload, label }) => {
                 if (active && payload && payload.length) {
                   const d = payload[0].payload;
                   return (
                     <div className="bg-[#e08031] border-2 border-[#2d1a0e] p-2 shadow-[4px_4px_0px_rgba(45,26,14,0.2)] font-['VT323'] text-[#2d1a0e]">
                       <p className="font-bold mb-1 border-b border-[#2d1a0e]/20">{label}</p>
                       {d.open && (
                         <>
                           <div className="grid grid-cols-2 gap-x-4 text-xs">
                             <span>OPEN: {d.open}</span>
                             <span>HIGH: {d.high}</span>
                             <span>LOW:  {d.low}</span>
                             <span>CLOSE:{d.close}</span>
                           </div>
                         </>
                       )}
                       {!d.open && <p>PRICE: {d.price}</p>}
                       {d.vwap && <p className="text-[#004a55] font-bold mt-1">VWAP: {d.vwap}</p>}
                     </div>
                   );
                 }
                 return null;
               }}
              />
            )}

            {/* GOLDEN ZONE HIGHLIGHT */}
            {!minimal && showFibs && goldenZone && (
                <ReferenceArea 
                    {...({
                        y1: goldenZone.y1,
                        y2: goldenZone.y2,
                        fill: "#d97706",
                        fillOpacity: 0.15
                    } as any)}
                />
            )}

            {/* FIBONACCI LEVELS */}
            {!minimal && showFibs && fibLevels.map((fib, idx) => (
                <ReferenceLine 
                    key={idx} 
                    y={fib.val} 
                    stroke={fib.color} 
                    strokeDasharray="3 3" 
                    strokeOpacity={0.5}
                    label={{
                        value: fib.label, 
                        position: 'right', 
                        fill: fib.color, 
                        fontSize: 10,
                        fontFamily: 'VT323'
                    }}
                />
            ))}

            {/* Render Area/Line if in Line mode */}
            {effectiveType === 'line' && (
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={strokeColor} 
                strokeWidth={minimal ? 1 : 2}
                fill={fillColor} 
                fillOpacity={0.15} 
                isAnimationActive={true}
              />
            )}

            {/* Render Custom Candles if in Candle mode */}
            {effectiveType === 'candle' && (
               <Bar 
                 dataKey="high" 
                 shape={(props: any) => (
                   <CandleShape 
                     {...props} 
                     low={props.payload.low} 
                     high={props.payload.high} 
                     open={props.payload.open} 
                     close={props.payload.close} 
                   />
                 )} 
                 isAnimationActive={false}
               />
            )}

            {/* VWAP Line Layer */}
            <Line 
              type="monotone" 
              dataKey="vwap" 
              stroke={vwapColor} 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 4, stroke: vwapColor, strokeWidth: 2, fill: '#fff' }}
              strokeDasharray={minimal ? "0" : "4 2"}
              isAnimationActive={true}
            />

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
