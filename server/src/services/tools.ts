/**
 * Server-side tool runners (mock/demo data for Phase P0).
 * Keep outputs clearly non-authoritative.
 */

export type ToolResult = { name: string; response: Record<string, unknown> };

const TOOL_DEFS: Record<
  string,
  { description: string; input_schema: Record<string, unknown> }
> = {
  getStockPrice: {
    description: 'Get the current stock price for a ticker (demo/mock if no market API).',
    input_schema: {
      type: 'object',
      properties: {
        ticker: { type: 'string', description: 'Stock ticker e.g. AAPL' },
      },
      required: ['ticker'],
    },
  },
  legalRiskAssessor: {
    description: 'Heuristic legal risk scoring (general guidance only, not legal advice).',
    input_schema: {
      type: 'object',
      properties: {
        issueType: { type: 'string' },
        severityHint: { type: 'string' },
        facts: { type: 'object' },
        documents: { type: 'array', items: { type: 'string' } },
      },
      required: ['issueType'],
    },
  },
  complianceChecklistBuilder: {
    description: 'Build a non-jurisdictional compliance checklist (general guidance).',
    input_schema: {
      type: 'object',
      properties: {
        scenario: { type: 'string' },
        industry: { type: 'string' },
        scope: { type: 'string' },
      },
      required: ['scenario', 'scope'],
    },
  },
};

export function getToolDefinitions(toolNames: string[]) {
  return toolNames
    .filter((n) => TOOL_DEFS[n])
    .map((name) => ({
      name,
      description: TOOL_DEFS[name]!.description,
      input_schema: TOOL_DEFS[name]!.input_schema,
    }));
}

export async function executeTool(
  name: string,
  input: unknown,
): Promise<ToolResult> {
  const args = (input && typeof input === 'object' ? input : {}) as Record<
    string,
    unknown
  >;

  switch (name) {
    case 'getStockPrice': {
      const ticker = String(args.ticker || 'UNKNOWN').toUpperCase();
      const mocks: Record<string, number> = {
        GOOG: 178.34,
        GOOGL: 177.95,
        AAPL: 214.29,
        MSFT: 447.67,
        AMZN: 185.57,
      };
      const price = mocks[ticker] ?? 100 + Math.random() * 400;
      return {
        name,
        response: {
          ticker,
          price: Number(price.toFixed(2)),
          currency: 'USD',
          source: 'mock',
          note: 'Demo quote only — not live market data.',
        },
      };
    }
    case 'legalRiskAssessor': {
      const risk = 30 + Math.floor(Math.random() * 50);
      return {
        name,
        response: {
          risk_score: risk,
          issueType: args.issueType ?? 'unspecified',
          top_risks: [
            { item: 'Potential compliance gap — review required.', score: risk },
            { item: 'Documentation completeness uncertainty.', score: Math.max(20, risk - 15) },
          ],
          mitigations: [
            'Document facts and parties in writing.',
            'Consult a licensed attorney for jurisdiction-specific advice.',
          ],
          notes: 'Mock assessment only — not legal advice.',
        },
      };
    }
    case 'complianceChecklistBuilder': {
      return {
        name,
        response: {
          checklist: [
            `Define scope for: ${String(args.scenario ?? 'scenario')}`,
            `Industry context: ${String(args.industry ?? 'general')}`,
            `Scope focus: ${String(args.scope ?? 'general')}`,
            'Draft data handling and privacy policies.',
            'Establish vendor review and incident response basics.',
          ],
          assumptions: [
            'Non-jurisdictional general guidance only.',
            'Not a substitute for professional compliance counsel.',
          ],
        },
      };
    }
    default:
      return {
        name,
        response: { error: `Unknown tool: ${name}` },
      };
  }
}
