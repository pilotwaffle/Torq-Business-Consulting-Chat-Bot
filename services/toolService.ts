import { ToolCallResponse } from '../types';

// Function to get live stock data.
const getStockPrice = async (args: { ticker: string }): Promise<{ price: number; currency: string; change: number; dayHigh: number; dayLow: number }> => {
  const ticker = args.ticker.toUpperCase();
  // IMPORTANT: A real application would use a server-side proxy to store and use the API key securely.
  // The API key should be stored in an environment variable (e.g., process.env.FINNHUB_API_KEY).
  // This client-side example is for demonstration purposes only.
  const API_KEY = ''; // Add your Finnhub API key here for live data.
  
  if (!API_KEY) {
      console.warn('Finnhub API key not provided. Returning mock data for demonstration.');
      const mockPrices: { [key: string]: number } = {
        "GOOG": 178.34, "GOOGL": 177.95, "AAPL": 214.29, "MSFT": 447.67, "AMZN": 185.57,
      };
      const price = mockPrices[ticker] || (Math.random() * 1000) + 100;
      return { 
        price: parseFloat(price.toFixed(2)), 
        currency: 'USD', 
        change: parseFloat((Math.random() * 10 - 5).toFixed(2)),
        dayHigh: parseFloat((price * 1.02).toFixed(2)),
        dayLow: parseFloat((price * 0.98).toFixed(2)),
      };
  }

  const url = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    const data = await response.json();
    if (data.c === 0 && data.h === 0) { // Finnhub returns 0s for unknown tickers
        throw new Error(`Ticker symbol "${ticker}" not found or no data available.`);
    }

    return {
        price: data.c,      // Current price
        currency: 'USD',    // Assume USD
        change: data.d,     // Change
        dayHigh: data.h,    // Day high
        dayLow: data.l,     // Day low
    };
  } catch (error) {
    console.error(`Error fetching stock price for ${ticker}:`, error);
    throw error; // Re-throw to be caught by executeTool
  }
};

const legalRiskAssessor = async (args: { issueType: string, severityHint: string, facts: object, documents: string[] }): Promise<any> => {
    console.log("Executing mock legalRiskAssessor with args:", args);
    const riskScore = 30 + Math.floor(Math.random() * 50); // Random score between 30 and 80
    return {
        risk_score: riskScore,
        top_risks: [
            { item: "Potential for IP infringement based on feature description.", score: 75 },
            { item: "Data privacy concerns under GDPR if handling EU user data.", score: 68 },
        ],
        mitigations: [
            "Conduct a thorough patent and trademark search.",
            "Consult with a data privacy expert to ensure GDPR compliance.",
            "Draft clear and transparent Terms of Service.",
        ],
        notes: "This is a mock assessment and does not constitute legal advice."
    };
};

const complianceChecklistBuilder = async (args: { scenario: string, industry: string, scope: string }): Promise<any> => {
    console.log("Executing mock complianceChecklistBuilder with args:", args);
    return {
        checklist: [
            `Initial setup for ${args.scenario} in the ${args.industry} industry.`,
            "Define clear data handling and privacy policies.",
            "Establish a vendor security review process.",
            "Implement an incident response plan.",
            "Schedule regular employee training on compliance topics.",
        ],
        assumptions: [
            "This checklist is non-jurisdictional and for general guidance only.",
            "The scope is limited to " + args.scope + ".",
        ]
    };
};


// A map of available tools
const availableTools: { [key: string]: (args: any) => Promise<any> } = {
  'getStockPrice': getStockPrice,
  'legalRiskAssessor': legalRiskAssessor,
  'complianceChecklistBuilder': complianceChecklistBuilder,
};

// Executor function that calls the appropriate tool
export const executeTool = async (
    toolName: string,
    toolArgs: any
): Promise<ToolCallResponse> => {
  const toolFunction = availableTools[toolName];
  if (!toolFunction) {
    return {
        name: toolName,
        response: { error: `Tool "${toolName}" not found.` },
    }
  }

  try {
    const result = await toolFunction(toolArgs);
    return {
      name: toolName,
      response: result,
    };
  } catch (error: any) {
    return {
      name: toolName,
      response: { error: `Error executing tool: ${error.message}` },
    };
  }
};