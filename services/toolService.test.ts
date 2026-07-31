import { describe, it, expect } from 'vitest';
import { executeTool } from '../services/toolService';

describe('toolService', () => {
  describe('executeTool', () => {
    it('returns error for unknown tool', async () => {
      const result = await executeTool('nonexistent_tool', {});
      expect(result.name).toBe('nonexistent_tool');
      expect(result.response).toHaveProperty('error');
      expect(result.response.error).toContain('not found');
    });

    it('executes getStockPrice with mock data', async () => {
      const result = await executeTool('getStockPrice', { ticker: 'GOOG' });
      expect(result.name).toBe('getStockPrice');
      expect(result.response).toHaveProperty('price');
      expect(result.response).toHaveProperty('currency', 'USD');
      expect(typeof result.response.price).toBe('number');
    });

    it('executes legalRiskAssessor', async () => {
      const result = await executeTool('legalRiskAssessor', {
        issueType: 'Contract Dispute',
        severityHint: 'high',
        facts: { parties: 2 },
        documents: ['contract.pdf'],
      });
      expect(result.response).toHaveProperty('risk_score');
      expect(result.response).toHaveProperty('top_risks');
      expect(result.response).toHaveProperty('mitigations');
      expect(result.response.risk_score).toBeGreaterThanOrEqual(30);
      expect(result.response.risk_score).toBeLessThanOrEqual(80);
    });

    it('executes complianceChecklistBuilder', async () => {
      const result = await executeTool('complianceChecklistBuilder', {
        scenario: 'Hiring',
        industry: 'Healthcare',
        scope: 'Data Privacy',
      });
      expect(result.response).toHaveProperty('checklist');
      expect(result.response.checklist).toHaveLength(5);
    });

    it('executes estate_planning_checklist', async () => {
      const result = await executeTool('estate_planning_checklist', {
        family_structure: { marital_status: 'married', children: 2 },
        assets_overview: { real_estate: true },
        goals: ['avoid probate'],
      });
      expect(result.response).toHaveProperty('steps');
      expect(result.response).toHaveProperty('document_recommendations');
    });

    it('executes retirement_readiness_calculator', async () => {
      const result = await executeTool('retirement_readiness_calculator', {
        current_age: 30,
        retire_age: 65,
        current_savings: 100000,
        annual_contribution: 20000,
        expected_return: 0.07,
        inflation: 0.03,
        income_need_pct: 0.8,
      });
      expect(result.response).toHaveProperty('readiness_score');
      expect(result.response).toHaveProperty('shortfall_estimate');
      expect(typeof result.response.readiness_score).toBe('number');
    });

    it('executes character_profile_builder', async () => {
      const result = await executeTool('character_profile_builder', {
        genre: 'sci-fi',
        role: 'protagonist',
        character_seed: { occupation: 'pilot' },
        story_context: { setting: 'Mars colony' },
      });
      expect(result.response).toHaveProperty('profile_matrix');
      expect(result.response).toHaveProperty('overview');
    });

    it('executes probate_complexity_estimator for intestate case', async () => {
      const result = await executeTool('probate_complexity_estimator', {
        has_will: false,
        asset_titling: ['individual'],
        estate_value_estimate: 200000,
        jurisdiction_hint: 'Texas',
      });
      expect(result.response.complexity).toBe('High');
      expect(result.response.risk_factors.length).toBeGreaterThan(0);
    });

    it('executes probate_complexity_estimator for fully trust-held case', async () => {
      const result = await executeTool('probate_complexity_estimator', {
        has_will: true,
        asset_titling: ['in_trust', 'joint_tenancy'],
        estate_value_estimate: 50000,
      });
      expect(result.response.complexity).toBe('Low');
    });
  });
});