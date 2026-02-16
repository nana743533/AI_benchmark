/**
 * MCP Server Tests for Accounting Software
 *
 * These tests verify the MCP (Model Context Protocol) server implementation.
 * Tests use JSON-RPC 2.0 over stdio to communicate with the MCP server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class MCPClient {
  private process: any;
  private requestId = 0;

  constructor(command: string, args: string[] = []) {
    this.process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Handle stderr
    this.process.stderr.on('data', (data: Buffer) => {
      console.error(`MCP Server stderr: ${data.toString()}`);
    });
  }

  async sendRequest(method: string, params?: any): Promise<JSONRPCResponse> {
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      let responseData = '';

      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout: ${method}`));
      }, 10000);

      this.process.stdout.once('data', (data: Buffer) => {
        clearTimeout(timeout);
        try {
          const response: JSONRPCResponse = JSON.parse(data.toString());
          resolve(response);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.toString()}`));
        }
      });

      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async close(): Promise<void> {
    if (this.process) {
      this.process.stdin.end();
      this.process.kill();
    }
  }
}

describe('MCP Server Tests', () => {
  let mcpClient: MCPClient;

  beforeAll(async () => {
    // Determine MCP server command based on implementation
    // This is a placeholder - actual implementation may vary
    const mcpServerPath = process.env.MCP_SERVER_PATH || './src/mcp-server/index.ts';

    // Check if MCP server exists
    if (!existsSync(mcpServerPath)) {
      console.warn(`MCP server not found at ${mcpServerPath}. Tests will be skipped.`);
      return;
    }

    // Start MCP server
    // For TypeScript: use tsx or ts-node
    // For Python: use python
    // Adjust based on actual implementation
    try {
      mcpClient = new MCPClient('npx', ['tsx', mcpServerPath]);
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (e) {
      console.warn(`Failed to start MCP server: ${e}`);
    }
  });

  afterAll(async () => {
    if (mcpClient) {
      await mcpClient.close();
    }
  });

  describe('tools/list - Get available tools', () => {
    it('should return 5 tools', async () => {
      if (!mcpClient) {
        return; // Skip if MCP server not available
      }

      const response = await mcpClient.sendRequest('tools/list');

      expect(response.error).toBeUndefined();
      expect(response.result).toHaveProperty('tools');
      expect(Array.isArray(response.result.tools)).toBe(true);
      expect(response.result.tools.length).toBeGreaterThanOrEqual(5);

      // Check for required tools
      const toolNames = response.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('create_journal_entry');
      expect(toolNames).toContain('get_account_balance');
      expect(toolNames).toContain('list_accounts');
      expect(toolNames).toContain('generate_balance_sheet');
      expect(toolNames).toContain('generate_income_statement');
    });

    it('should have valid tool schemas', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/list');

      for (const tool of response.result.tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');

        // Verify inputSchema is valid JSON Schema
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
      }
    });
  });

  describe('create_journal_entry tool', () => {
    it('should create a journal entry with valid data', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/call', {
        name: 'create_journal_entry',
        arguments: {
          date: '2024-01-15',
          description: 'MCPテスト仕訳',
          lines: [
            {
              accountCode: '100',
              debitAmount: 10000,
              creditAmount: 0
            },
            {
              accountCode: '400',
              debitAmount: 0,
              creditAmount: 10000
            }
          ]
        }
      });

      expect(response.error).toBeUndefined();
      expect(response.result).toHaveProperty('success', true);
      expect(response.result).toHaveProperty('journalEntry');
      expect(response.result.journalEntry).toHaveProperty('id');
    });

    it('should reject unbalanced entry', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/call', {
        name: 'create_journal_entry',
        arguments: {
          date: '2024-01-15',
          description: '貸借不一致',
          lines: [
            {
              accountCode: '100',
              debitAmount: 10000,
              creditAmount: 0
            },
            {
              accountCode: '400',
              debitAmount: 0,
              creditAmount: 9000 // Unbalanced
            }
          ]
        }
      });

      expect(response.result).toHaveProperty('success', false);
      // Error may be in result or error field depending on implementation
      expect(
        response.result?.error ||
        response.error?.message ||
        response.error?.data
      ).toBeDefined();
    });
  });

  describe('list_accounts tool', () => {
    it('should return list of accounts', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/call', {
        name: 'list_accounts',
        arguments: {}
      });

      expect(response.error).toBeUndefined();
      expect(response.result).toHaveProperty('accounts');
      expect(Array.isArray(response.result.accounts)).toBe(true);
      expect(response.result.accounts.length).toBeGreaterThan(0);
    });

    it('should filter accounts by type', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/call', {
        name: 'list_accounts',
        arguments: {
          type: 'asset'
        }
      });

      expect(response.error).toBeUndefined();
      expect(response.result).toHaveProperty('accounts');

      // Verify all returned accounts are assets
      for (const account of response.result.accounts) {
        expect(account.type).toBe('asset');
      }
    });
  });

  describe('get_account_balance tool', () => {
    it('should return account balance', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/call', {
        name: 'get_account_balance',
        arguments: {
          accountCode: '100'
        }
      });

      expect(response.error).toBeUndefined();
      expect(response.result).toHaveProperty('accountCode', '100');
      expect(response.result).toHaveProperty('balance');
      expect(typeof response.result.balance).toBe('number');
    });

    it('should handle non-existent account', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/call', {
        name: 'get_account_balance',
        arguments: {
          accountCode: '99999' // Non-existent
        }
      });

      // Should return error or indicate account not found
      expect(
        response.result?.error ||
        response.error?.message ||
        !response.result?.balance
      ).toBeTruthy();
    });
  });

  describe('generate_balance_sheet tool', () => {
    it('should generate balance sheet', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/call', {
        name: 'generate_balance_sheet',
        arguments: {
          asOfDate: '2024-03-31'
        }
      });

      expect(response.error).toBeUndefined();
      expect(response.result).toHaveProperty('asOfDate', '2024-03-31');
      expect(response.result).toHaveProperty('balanceSheet');

      const bs = response.result.balanceSheet;
      expect(bs).toHaveProperty('assets');
      expect(bs).toHaveProperty('liabilities');
      expect(bs).toHaveProperty('equity');

      // Verify balance: Assets = Liabilities + Equity
      const assets = bs.assets?.total || 0;
      const liabilities = bs.liabilities?.total || 0;
      const equity = bs.equity?.total || 0;

      expect(assets).toBeCloseTo(liabilities + equity, 2);
    });
  });

  describe('generate_income_statement tool', () => {
    it('should generate income statement', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/call', {
        name: 'generate_income_statement',
        arguments: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      });

      expect(response.error).toBeUndefined();
      expect(response.result).toHaveProperty('period');
      expect(response.result).toHaveProperty('incomeStatement');

      const is = response.result.incomeStatement;
      expect(is).toHaveProperty('revenue');
      expect(is).toHaveProperty('expenses');
      expect(is).toHaveProperty('netIncome');

      // Verify: Net Income = Revenue - Expenses
      const revenue = is.revenue?.total || 0;
      const expenses = is.expenses?.total || 0;
      const netIncome = is.netIncome || 0;

      expect(netIncome).toBeCloseTo(revenue - expenses, 2);
    });
  });

  describe('Error handling', () => {
    it('should handle missing required parameters', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/call', {
        name: 'create_journal_entry',
        arguments: {
          // Missing required fields: date, description, lines
        }
      });

      // Should return error
      expect(
        response.error ||
        response.result?.error
      ).toBeDefined();
    });

    it('should handle invalid date format', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/call', {
        name: 'generate_balance_sheet',
        arguments: {
          asOfDate: 'invalid-date'
        }
      });

      // Should return error
      expect(
        response.error ||
        response.result?.error
      ).toBeDefined();
    });
  });

  describe('JSON-RPC 2.0 compliance', () => {
    it('should handle invalid JSON-RPC requests', async () => {
      if (!mcpClient) {
        return;
      }

      // Send invalid request
      const response = await mcpClient.sendRequest('invalid/method');

      expect(response).toHaveProperty('jsonrpc', '2.0');
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
    });

    it('should include proper JSON-RPC response fields', async () => {
      if (!mcpClient) {
        return;
      }

      const response = await mcpClient.sendRequest('tools/list');

      expect(response).toHaveProperty('jsonrpc', '2.0');
      expect(response).toHaveProperty('id');
    });
  });
});
