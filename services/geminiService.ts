
import { GoogleGenAI } from "@google/genai";
import { KaliCommandResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const executeKaliCommand = async (command: string): Promise<KaliCommandResult> => {
  const modelId = "gemini-2.5-flash"; 

  const prompt = `
    You are an advanced cybersecurity AI integrated into a Kali Linux terminal simulation.
    
    Target Command: ${command}

    Perform the following Multi-Step Process:
    
    STEP 1: COMMAND ANALYSIS
    - Analyze the intent of the Kali Linux command. 
    - Identify potential targets (IPs, domains, local files).
    
    STEP 2: NETWORK & ENTROPY SIMULATION
    - Simulate the network environment and system entropy levels during command execution.
    - LOGIC:
      * High entropy suggests complex encryption or randomized payloads.
      * Network load increases during scanning or brute-force operations.
    
    STEP 3: VULNERABILITY & EXPLOIT MAPPING
    - Identify common vulnerabilities associated with the services being targeted by this command.
    - Map potential exploit vectors (e.g., Buffer Overflow, SQLi, RCE).
    
    STEP 4: EXECUTION SIMULATION
    - Mentally run 1,000 simulation scenarios of this command against a hardened target.
    - Calculate Success Probability and Risk Level (Detection Risk).
    
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
    - "activityData" must contain exactly 14 historical data points representing recent system activity.
    - "projectedPath" must contain 5 FUTURE projected activity points.
    - Ensure "entropy.swingHigh" and "swingLow" are actual numbers from the simulation range.
  `;

  let attempt = 0;
  const maxAttempts = 5;

  while (attempt < maxAttempts) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.3, 
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");

      let jsonString = text.trim();
      
      if (jsonString.startsWith("```json")) {
          jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonString.startsWith("```")) {
          jsonString = jsonString.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const firstOpen = jsonString.indexOf("{");
      const lastClose = jsonString.lastIndexOf("}");
      if (firstOpen !== -1 && lastClose !== -1) {
          jsonString = jsonString.substring(firstOpen, lastClose + 1);
      }

      let parsedData;
      try {
        parsedData = JSON.parse(jsonString);
      } catch (e) {
        console.error("JSON Parse Error. Raw text:", text);
        throw new Error("Failed to parse command results.");
      }
      
      const groundingUrls: Array<{ title: string; uri: string }> = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) {
            groundingUrls.push({ title: chunk.web.title, uri: chunk.web.uri });
          }
        });
      }

      return {
        ...parsedData,
        groundingUrls,
      };

    } catch (error: any) {
      attempt++;
      console.error(`Attempt ${attempt} failed:`, error);

      let isQuotaError = false;
      if (error.status === 429 || error.status === 'RESOURCE_EXHAUSTED') isQuotaError = true;
      if (error.message && (
        error.message.includes('429') || 
        error.message.includes('quota') || 
        error.message.includes('RESOURCE_EXHAUSTED')
      )) isQuotaError = true;

      if (error.error) {
        if (error.error.code === 429 || error.error.status === 'RESOURCE_EXHAUSTED') isQuotaError = true;
      }

      if (isQuotaError) {
        if (attempt >= maxAttempts) {
           throw new Error("Server Traffic High (Rate Limit). Please wait 60s and try again.");
        }
        const waitTime = Math.pow(2, attempt) * 2000; 
        await delay(waitTime);
        continue;
      }

      throw new Error(error.message || "Failed to execute command simulation.");
    }
  }

  throw new Error("Service unavailable.");
};

export const getTacticalAdvice = async (query: string): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  const prompt = `
    You are a tactical AI assistant integrated into a Kali Linux terminal simulation.
    The user is asking for advice, information, or help with cybersecurity tasks.
    
    User Query: ${query}
    
    Provide a concise, professional, and technical response in the style of a high-end security terminal.
    Keep it under 100 words. Use technical terminology where appropriate.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return response.text || "NO_DATA_RECEIVED";
  } catch (error: any) {
    console.error("Chat Error:", error);
    return "SYSTEM_ERROR: ADVICE_UNAVAILABLE";
  }
};
