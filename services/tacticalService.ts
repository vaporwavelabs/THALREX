
import { KaliCommandResult } from "../types";

export const executeKaliCommand = async (command: string, model: string = "llama3"): Promise<KaliCommandResult> => {
  const prompt = `
    You are an advanced cybersecurity AI integrated into a Kali Linux terminal simulation.
    
    Target Command: ${command}

    Perform the following Multi-Step Process:
    1. COMMAND ANALYSIS
    2. NETWORK & ENTROPY SIMULATION
    3. VULNERABILITY & EXPLOIT MAPPING
    4. EXECUTION SIMULATION
    
    OUTPUT FORMAT:
    You must output a valid JSON object. Do not use Markdown formatting or code blocks.
    {
      "command": "${command}",
      "status": "string (e.g. ROOT_ACCESS_GRANTED, ACCESS_DENIED, SCAN_COMPLETE)",
      "successProbability": number (0-100),
      "riskLevel": number (0-100),
      "output": "string (Simulated terminal output with realistic Kali Linux formatting)",
      "simulationDetails": "string (Explanation of the attack simulations)",
      "strategyAnalysis": "string (Detailed tactical logic. MUST explicitly mention network bias and entropy correlation)",
      "verdict": "string (e.g. EXPLOITABLE, SECURE, VULNERABLE)",
      "vulnerabilities": ["string array of detected vulnerabilities e.g. 'CVE-2023-1234', 'Weak SSH Config'"],
      "networkBias": "HIGH_TRAFFIC" | "STEALTH" | "NEUTRAL",
      "entropy": {
         "swingHigh": number,
         "swingLow": number,
         "trendDirection": "UPTREND" | "DOWNTREND", 
         "currentLevel": "string (e.g. 'High Randomness Detected')",
         "assessment": "string (Short assessment of entropy status)"
      },
      "exploitVectors": [
         {
            "scenario": "string (e.g., 'Credential Stuffing')",
            "signalType": "EXPLOIT" | "PATCH" | "MONITOR",
            "entryZone": "string",
            "stopLoss": "string",
            "targetPrice": "string",
            "description": "string (Must include: 'Simulated Success Rate: X%')"
         }
      ],
      "activityData": [
        { 
          "date": "T-minus X", 
          "price": number (entropy level), 
          "vwap": number (network load)
        } 
      ],
      "projectedPath": [
        { "date": "T-plus X", "price": number }
      ]
    }
    Note: 
    - "activityData" must contain exactly 14 historical data points.
    - "projectedPath" must contain 5 FUTURE projected activity points.
  `;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) throw new Error("Ollama communication failure");
    const data = await res.json();
    const text = data.message.content;

    let jsonString = text.trim();
    if (jsonString.includes("```json")) {
        jsonString = jsonString.split("```json")[1].split("```")[0].trim();
    } else if (jsonString.includes("```")) {
        jsonString = jsonString.split("```")[1].split("```")[0].trim();
    }

    const firstOpen = jsonString.indexOf("{");
    const lastClose = jsonString.lastIndexOf("}");
    if (firstOpen !== -1 && lastClose !== -1) {
        jsonString = jsonString.substring(firstOpen, lastClose + 1);
    }

    return JSON.parse(jsonString);
  } catch (error: any) {
    console.error("Ollama Command Error:", error);
    throw new Error("Failed to execute command simulation via Ollama.");
  }
};

export const getTacticalAdvice = async (query: string, model: string = "llama3"): Promise<string> => {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: query }]
      })
    });

    if (!res.ok) throw new Error("Ollama communication failure");
    const data = await res.json();
    return data.message.content;
  } catch (error: any) {
    console.error("Ollama Chat Error:", error);
    return "SYSTEM_ERROR: OLLAMA_ADVICE_UNAVAILABLE";
  }
};
