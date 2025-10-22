import { ToolCallResponse } from '../types';

// Mock function to simulate fetching a stock price
const getStockPrice = async (args: { ticker: string }): Promise<{ price: number }> => {
  console.log(`Fetching stock price for: ${args.ticker}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Return mock data
  const mockPrices: { [key: string]: number } = {
    "GOOG": 178.34,
    "GOOGL": 177.95,
    "AAPL": 214.29,
    "MSFT": 447.67,
    "AMZN": 185.57,
  };

  const price = mockPrices[args.ticker.toUpperCase()] || Math.floor(Math.random() * 1000) + 100;
  
  return { price };
};

// A map of available tools
const availableTools: { [key: string]: (args: any) => Promise<any> } = {
  'getStockPrice': getStockPrice,
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
