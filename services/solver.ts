
import { HandHistory } from '../types';

export interface SolverRequest {
  pot: number;
  board: string[]; // e.g., ["Ah", "Ks", "2d"]
  heroCard1: string;
  heroCard2: string;
  villainRange?: string; // Optional range string
  heroPosition: string;
  villainPosition: string;
  stackSize: number;
  actions: string[]; // List of previous actions
}

export interface SolverSolution {
  strategy: {
    check: number;
    fold: number;
    call: number;
    betSmall: number;
    betBig: number;
    allIn: number;
  };
  ev: number;
  bestAction: string;
  rangeGrid?: Record<string, number>; // e.g., "AA": 1.0, "AKs": 0.5
}

// NOTE: This service is designed to connect to a hypothetical "Checkmath Poker API"
// or a similar GTO solver REST API.
// Since the actual API documentation is not available, this uses a placeholder endpoint.
//
// API_URL should be set in your environment variables.
const API_URL = process.env.SOLVER_API_URL || "https://api.checkmath-poker.com/v1";
const API_KEY = process.env.SOLVER_API_KEY || "";

export const solveSpot = async (request: SolverRequest): Promise<SolverSolution> => {
  // Mock mode if no API key is present (for development)
  if (!API_KEY) {
    console.warn("Solver API Key missing. Returning mock solution.");
    return mockSolve(request);
  }

  try {
    const response = await fetch(`${API_URL}/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Solver API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Solver Request Failed:", error);
    throw error;
  }
};

// --- Mock Implementation for Development ---
const mockSolve = (req: SolverRequest): Promise<SolverSolution> => {
  return new Promise((resolve) => {
    setTimeout(() => {
        // Simple heuristic for mock data
        const isStrong = req.heroCard1.includes('A') || req.heroCard1.includes('K') || req.heroCard1 === req.heroCard2;

        resolve({
            strategy: {
                check: isStrong ? 0.2 : 0.6,
                fold: isStrong ? 0.0 : 0.4,
                call: 0.0,
                betSmall: isStrong ? 0.3 : 0.0,
                betBig: isStrong ? 0.4 : 0.0,
                allIn: isStrong ? 0.1 : 0.0
            },
            ev: isStrong ? 12.5 : -2.5,
            bestAction: isStrong ? 'betBig' : 'check',
            rangeGrid: generateMockGrid(isStrong)
        });
    }, 800);
  });
};

const generateMockGrid = (biasStrong: boolean): Record<string, number> => {
    const grid: Record<string, number> = {};
    const ranks = "AKQJT98765432";
    const suits = ["s", "o"]; // s=suited, o=offsuit (or pairs)

    for (let i = 0; i < 13; i++) {
        for (let j = 0; j < 13; j++) {
            const r1 = ranks[i];
            const r2 = ranks[j];
            let hand = "";
            if (i < j) hand = r1 + r2 + "s";
            else if (i > j) hand = r2 + r1 + "o";
            else hand = r1 + r2;

            // Random freq based on bias
            let freq = Math.random();
            if (biasStrong && (r1 === 'A' || r1 === 'K' || i === j)) freq += 0.5;
            grid[hand] = Math.min(1, Math.max(0, freq));
        }
    }
    return grid;
};
