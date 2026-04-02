
export interface ChartPoint {
  date: string;
  price: number; // Repurposed as "Activity Level" or "Entropy"
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  vwap?: number; // Repurposed as "Network Load"
}

export interface CommandAlert {
  id: string;
  command: string;
  targetThreshold: number;
  condition: 'ABOVE' | 'BELOW';
  active: boolean;
}

export interface ExploitVector {
  scenario: string; // e.g. "Buffer Overflow", "SQL Injection"
  signalType: 'EXPLOIT' | 'PATCH' | 'MONITOR';
  entryZone: string; // e.g. "Port 80", "User Input"
  stopLoss: string; // e.g. "Firewall Trigger"
  targetPrice: string; // e.g. "Root Access"
  description: string; // Details of the exploit simulation
}

export interface EntropyAnalysis {
  swingHigh: number;
  swingLow: number;
  trendDirection: 'UPTREND' | 'DOWNTREND'; 
  currentLevel: string; 
  assessment: string; // AI commentary on the entropy level
}

export interface KaliCommandResult {
  command: string;
  status: string; // e.g. "ROOT_ACCESS_GRANTED", "ACCESS_DENIED"
  successProbability: number; // 0-100
  riskLevel: number; // 0-100
  output: string; // Simulated terminal output
  simulationDetails: string;
  strategyAnalysis: string; // Detailed tactical logic
  verdict: string; // "EXPLOITABLE", "SECURE", "VULNERABLE", etc.
  vulnerabilities: string[]; // List of detected vulnerabilities
  networkBias: 'HIGH_TRAFFIC' | 'STEALTH' | 'NEUTRAL'; 
  entropy?: EntropyAnalysis; 
  exploitVectors: ExploitVector[]; 
  activityData: ChartPoint[];
  projectedPath: ChartPoint[]; 
  groundingUrls: Array<{ title: string; uri: string }>;
}

export enum AnalysisStep {
  IDLE = 'IDLE',
  INJECTING_PAYLOAD = 'INJECTING_PAYLOAD', // Step 1
  BRUTEFORCING = 'BRUTEFORCING', // Step 2
  ESCALATING_PRIVILEGES = 'ESCALATING_PRIVILEGES', // Step 3
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}
