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

const estate_planning_checklist = async (args: any): Promise<any> => {
    console.log("Executing mock estate_planning_checklist with args:", args);
    return {
        steps: [
            "Inventory all assets (real estate, bank accounts, investments, personal property).",
            "List all debts and liabilities.",
            "Choose beneficiaries and contingent beneficiaries.",
            "Select an executor for your will and a trustee for any trusts.",
            "Nominate guardians for any minor children.",
        ],
        document_recommendations: [
            "Last Will and Testament",
            "Revocable Living Trust (to avoid probate)",
            "Durable Power of Attorney for Finances",
            "Advance Health Care Directive (Living Will)",
        ],
        coordination_notes: [
            "Ensure beneficiary designations on retirement accounts and life insurance match your will/trust.",
            "Consider how jointly owned property will pass to the survivor.",
            `Review with an estate planning attorney in ${args.jurisdiction_hint || 'your state'}.`,
        ],
    };
};

const probate_complexity_estimator = async (args: { has_will: boolean, asset_titling: string[], estate_value_estimate: number, jurisdiction_hint: string }): Promise<any> => {
    console.log("Executing mock probate_complexity_estimator with args:", args);
    let complexity = "Medium";
    const risk_factors = [];
    if (!args.has_will) {
        complexity = "High";
        risk_factors.push("Intestacy (no will) can lead to state-controlled asset distribution and family disputes.");
    }
    if (args.asset_titling.includes("individual")) {
        risk_factors.push("Individually titled assets are likely subject to probate.");
    }
    if (args.estate_value_estimate > 100000) {
         risk_factors.push("Higher value estates may have more complex probate procedures or tax implications.");
    }
    if (args.asset_titling.every(t => t === 'in_trust' || t === 'joint_tenancy')) {
        complexity = "Low";
    }

    return {
        complexity,
        risk_factors,
        suggested_next_steps: [
            "Consult a probate attorney to understand the specific process in " + (args.jurisdiction_hint || "your state") + ".",
            "Create a comprehensive list of all assets and their titling.",
            "Gather all relevant documents, including the will, death certificate, and financial statements.",
        ],
    };
};

const jurisdiction_state_law_lookup = async (args: { state: string, topic: string, focus_points: string[] }): Promise<any> => {
    console.log("Executing mock jurisdiction_state_law_lookup with args:", args);
    return {
        summary: `This is a mock summary of ${args.topic} laws in ${args.state}. Official statutes should be consulted for legal decisions.`,
        key_rules: [
            `For topic '${args.topic}', ${args.state} generally requires specific formalities.`,
            ...args.focus_points.map(fp => `Regarding '${fp}', the typical (mock) rule is to have two disinterested witnesses.`)
        ],
        citations: [
            { title: `Official Code of ${args.state} Annotated § 12-345`, url: `https://example.com/law/${args.state.toLowerCase()}/12-345` }
        ],
        last_checked: new Date().toISOString(),
    };
};

const retirement_readiness_calculator = async (args: { current_age: number, retire_age: number, current_savings: number, annual_contribution: number, expected_return: number, inflation: number, income_need_pct: number }): Promise<any> => {
    console.log("Executing mock retirement_readiness_calculator with args:", args);
    // Simplified future value calculation
    const yearsToGrow = args.retire_age - args.current_age;
    let futureValue = args.current_savings * Math.pow(1 + args.expected_return, yearsToGrow);
    // This is a simplified annuity calculation
    for (let i = 0; i < yearsToGrow; i++) {
        futureValue += args.annual_contribution * Math.pow(1 + args.expected_return, i);
    }
    
    // A very rough estimate of needs vs. what's available
    const readinessScore = Math.min(100, Math.floor((futureValue / 1000000) * 50)); // Cap at 100
    const shortfall = Math.max(0, (1000000 - futureValue));

    return {
        readiness_score: readinessScore,
        shortfall_estimate: parseFloat(shortfall.toFixed(2)),
        notes: [
            `Projected portfolio value at age ${args.retire_age} is approximately $${futureValue.toLocaleString(undefined, {maximumFractionDigits: 0})}.`,
            "This is a high-level estimate and does not account for taxes or market volatility.",
        ],
    };
};

const withdrawal_policy_designer = async (args: { portfolio_value: number, risk_profile: string, income_floor: number, ceiling_pct: number, floor_pct: number }): Promise<any> => {
    console.log("Executing mock withdrawal_policy_designer with args:", args);
    const initialWithdrawal = args.portfolio_value * ((args.ceiling_pct + args.floor_pct) / 2);
    return {
        policy: {
            name: "Guardrail Withdrawal Strategy (Mock)",
            initial_withdrawal_rate: `${((args.ceiling_pct + args.floor_pct) / 2) * 100}%`,
            initial_annual_withdrawal: `$${initialWithdrawal.toLocaleString()}`,
            upper_guardrail: `${args.ceiling_pct * 100}%`,
            lower_guardrail: `${args.floor_pct * 100}%`,
        },
        triggers: [
            "If market performance pushes withdrawal rate above upper guardrail, consider reducing withdrawal.",
            "If market performance pushes withdrawal rate below lower guardrail, consider increasing withdrawal or reallocating.",
            "Re-evaluate annually or after significant market changes.",
        ],
        backtest_notes: [
            "This mock policy is based on established financial principles but has not been backtested with real data.",
        ],
    };
};

const jurisdiction_retirement_lookup = async (args: { state: string, topic: string, focus_points: string[] }): Promise<any> => {
    console.log("Executing mock jurisdiction_retirement_lookup with args:", args);
     return {
        summary: `Mock lookup for ${args.topic} in ${args.state}.`,
        key_rules: [
            `State income tax on Social Security in ${args.state} is generally not applicable (mock rule).`,
            `Public pension exclusions in ${args.state} have specific eligibility requirements.`,
            ...args.focus_points.map(fp => `For '${fp}', ${args.state} has specific guidelines that should be reviewed.`)
        ],
        citations: [
            { title: `${args.state} Department of Revenue - Retirement Income`, url: `https://example.com/revenue/${args.state.toLowerCase()}/retirement` }
        ],
        last_checked: new Date().toISOString(),
    };
};

const character_profile_builder = async (args: any): Promise<any> => {
    console.log("Executing mock character_profile_builder with args:", args);
    return {
        profile_matrix: {
            core_traits: ["Resourceful", "Determined", (args.character_seed?.occupation || "Mysterious")],
            flaws: ["Overly cautious", "Stubborn"],
            motivations: ["Uncover the truth", "Protect their family"],
        },
        overview: `A mock overview for a ${args.role} in a ${args.genre} story. This character, seeded as ${JSON.stringify(args.character_seed)}, is defined by their core traits and flaws.`,
        strengths: ["Analytical mind", "Strong moral compass"],
        gaps: ["Needs a more detailed backstory", "Lacks a clear internal conflict"],
    };
};

const character_arc_planner = async (args: any): Promise<any> => {
    console.log("Executing mock character_arc_planner with args:", args);
    return {
        arc_outline: {
            setup: "Character is introduced in their ordinary world, showcasing their primary flaw.",
            inciting_incident: "An external event forces the character to act, setting the story in motion.",
            midpoint: "Character shifts from reactive to proactive, fully committing to their goal.",
            climax: "The final confrontation where the character's growth is tested.",
            resolution: "The new normal, showing the character's transformation.",
        },
        beat_alignment_notes: ["Ensure the midpoint event directly challenges the character's core flaw."],
        risks: ["The current arc is too predictable; consider a subversion of the " + (args.target_arc_type || "hero's journey") + "."],
    };
};

const consistency_checker = async (args: any): Promise<any> => {
    console.log("Executing mock consistency_checker with args:", args);
    return {
        flags: [
            { excerpt: args.excerpts[0], issue: "Dialogue seems too formal for a character with an 'informal' trait.", location: "Chapter 2" },
        ],
        suggested_fixes: ["Rewrite dialogue using more colloquial language."],
        confidence: 0.85,
    };
};

const archetype_suggester = async (args: any): Promise<any> => {
    console.log("Executing mock archetype_suggester with args:", args);
    return {
        archetype_options: ["The Mentor", "The Rebel", "The Caregiver"],
        subversion_hooks: ["A Mentor who gives flawed advice", "A Rebel fighting for a conservative cause"],
    };
};

const sensitivity_bias_scanner = async (args: any): Promise<any> => {
    console.log("Executing mock sensitivity_bias_scanner with args:", args);
    return {
        concerns: [
            { item: "Character description relies on a common physical stereotype.", suggestion: "Focus on personality and actions rather than appearance." }
        ],
        alternatives: ["Describe their mannerisms or a unique skill instead."],
        references: [{ title: "Writing With Color - Guide to Describing Skin Tone", url: "https://writingwithcolor.tumblr.com/" }],
    };
};

const voice_calibrator = async (args: any): Promise<any> => {
    console.log("Executing mock voice_calibrator with args:", args);
    return {
        revised_lines: args.sample_lines.map((line: string) => `(Revised for '${args.voice_targets[0]}' voice): "${line}"`),
        voice_notes: ["Use shorter sentences to convey urgency.", "Incorporate domain-specific slang to show expertise."],
    };
};


// A map of available tools
const availableTools: { [key: string]: (args: any) => Promise<any> } = {
  'getStockPrice': getStockPrice,
  'legalRiskAssessor': legalRiskAssessor,
  'complianceChecklistBuilder': complianceChecklistBuilder,
  'estate_planning_checklist': estate_planning_checklist,
  'probate_complexity_estimator': probate_complexity_estimator,
  'jurisdiction_state_law_lookup': jurisdiction_state_law_lookup,
  'retirement_readiness_calculator': retirement_readiness_calculator,
  'withdrawal_policy_designer': withdrawal_policy_designer,
  'jurisdiction_retirement_lookup': jurisdiction_retirement_lookup,
  'character_profile_builder': character_profile_builder,
  'character_arc_planner': character_arc_planner,
  'consistency_checker': consistency_checker,
  'archetype_suggester': archetype_suggester,
  'sensitivity_bias_scanner': sensitivity_bias_scanner,
  'voice_calibrator': voice_calibrator,
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