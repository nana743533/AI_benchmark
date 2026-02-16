/**
 * API Tests for Accounting Software
 *
 * These tests use HTTP requests to verify the REST API implementation.
 * Technology stack agnostic - tests via HTTP endpoints.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  lines: JournalLine[];
  createdAt: string;
  updatedAt: string;
}

interface JournalLine {
  id: string;
  accountId: string;
  accountName?: string;
  debitAmount: number;
  creditAmount: number;
}

let testAccountId: string;
let testJournalEntryId: string;

// Reset database before all tests
beforeAll(async () => {
  await fetch(`${API_BASE_URL}/api/test/reset`, { method: 'POST' });
});

describe('Account Management API', () => {
  describe('GET /api/accounts - List accounts', () => {
    it('should return list of accounts', async () => {
      const response = await fetch(`${API_BASE_URL}/api/accounts`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('should filter accounts by type', async () => {
      const response = await fetch(`${API_BASE_URL}/api/accounts?type=asset`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      data.data.forEach((account: Account) => {
        expect(account.type).toBe('asset');
      });
    });
  });

  describe('POST /api/accounts - Create account', () => {
    it('should create a new account with valid data', async () => {
      const newAccount = {
        code: '999',
        name: 'テスト勘定科目',
        type: 'asset' as const,
        category: 'テスト分類'
      };

      const response = await fetch(`${API_BASE_URL}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount)
      });

      if (response.status === 201 || response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('id');
        expect(data.data.code).toBe(newAccount.code);
        expect(data.data.name).toBe(newAccount.name);
        testAccountId = data.data.id;
      } else {
        throw new Error(`Failed to create account: ${response.status}`);
      }
    });

    it('should reject duplicate code', async () => {
      const duplicateAccount = {
        code: '100', // Existing code
        name: '重複コード',
        type: 'asset' as const,
        category: 'テスト'
      };

      const response = await fetch(`${API_BASE_URL}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateAccount)
      });

      expect(response.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const invalidAccount = {
        code: '998'
        // Missing name, type, category
      };

      const response = await fetch(`${API_BASE_URL}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidAccount)
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/accounts/:id - Get account details', () => {
    it('should return account details for valid ID', async () => {
      // First, get an account ID from the list
      const listResponse = await fetch(`${API_BASE_URL}/api/accounts`);
      const listData = await listResponse.json();
      const accountId = listData.data[0].id;

      const response = await fetch(`${API_BASE_URL}/api/accounts/${accountId}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data.id).toBe(accountId);
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await fetch(`${API_BASE_URL}/api/accounts/non-existent-id`);
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/accounts/:id - Update account', () => {
    it('should update account name', async () => {
      // Get an account to update
      const listResponse = await fetch(`${API_BASE_URL}/api/accounts`);
      const listData = await listResponse.json();
      const account = listData.data.find((a: Account) => a.code === '999');

      if (!account) {
        // Skip if test account doesn't exist
        return;
      }

      const updateData = {
        name: '更新後のテスト勘定科目'
      };

      const response = await fetch(`${API_BASE_URL}/api/accounts/${account.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.name).toBe(updateData.name);
    });
  });

  describe('DELETE /api/accounts/:id - Delete account', () => {
    it('should delete unused account', async () => {
      if (!testAccountId) {
        // Create a test account first
        const newAccount = {
          code: '998',
          name: '削除テスト',
          type: 'asset' as const,
          category: 'テスト'
        };

        const createResponse = await fetch(`${API_BASE_URL}/api/accounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAccount)
        });

        if (createResponse.status !== 201 && createResponse.status !== 200) {
          return; // Skip if creation failed
        }

        const createData = await createResponse.json();
        testAccountId = createData.data.id;
      }

      const response = await fetch(`${API_BASE_URL}/api/accounts/${testAccountId}`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(204);
    });

    it('should reject deletion of used account', async () => {
      // First, create a journal entry to make an account "used"
      const accountsResponse = await fetch(`${API_BASE_URL}/api/accounts`);
      const accountsData = await accountsResponse.json();

      // Use first available asset account (e.g., 101 '預金')
      const debitAccount = accountsData.data.find((a: Account) => a.type === 'asset');
      const creditAccount = accountsData.data.find((a: Account) => a.type === 'revenue');

      if (!debitAccount || !creditAccount) {
        return; // Skip if required accounts not found
      }

      // Create a journal entry first
      await fetch(`${API_BASE_URL}/api/journal-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: '2024-01-15',
          description: 'テスト用仕訳',
          lines: [
            {
              accountId: debitAccount.id,
              debitAmount: 1000,
              creditAmount: 0
            },
            {
              accountId: creditAccount.id,
              debitAmount: 0,
              creditAmount: 1000
            }
          ]
        })
      });

      // Now try to delete the used account
      const cashAccount = debitAccount;

      if (!cashAccount) {
        return; // Skip if account not found
      }

      const response = await fetch(`${API_BASE_URL}/api/accounts/${cashAccount.id}`, {
        method: 'DELETE'
      });

      expect(response.status).toBe(400);
    });
  });
});

describe('Journal Entry API', () => {
  describe('POST /api/journal-entries - Create journal entry', () => {
    it('should create entry with balanced debits and credits', async () => {
      // Get account IDs first
      const accountsResponse = await fetch(`${API_BASE_URL}/api/accounts`);
      const accountsData = await accountsResponse.json();
      const cashAccount = accountsData.data.find((a: Account) => a.type === 'asset') || accountsData.data.find((a: Account) => a.code === '101');
      const salesAccount = accountsData.data.find((a: Account) => a.type === 'revenue') || accountsData.data.find((a: Account) => a.code === '400');

      if (!cashAccount || !salesAccount) {
        throw new Error('Required accounts not found');
      }

      const journalEntry = {
        date: '2024-01-15',
        description: 'テスト仕訳: 売上',
        lines: [
          {
            accountId: cashAccount.id,
            debitAmount: 10000,
            creditAmount: 0
          },
          {
            accountId: salesAccount.id,
            debitAmount: 0,
            creditAmount: 10000
          }
        ]
      };

      const response = await fetch(`${API_BASE_URL}/api/journal-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journalEntry)
      });

      if (response.status === 201 || response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('data');
        expect(data.data).toHaveProperty('id');
        testJournalEntryId = data.data.id;
      } else {
        const error = await response.text();
        throw new Error(`Failed to create journal entry: ${response.status} - ${error}`);
      }
    });

    it('should reject unbalanced entry', async () => {
      const accountsResponse = await fetch(`${API_BASE_URL}/api/accounts`);
      const accountsData = await accountsResponse.json();
      const cashAccount = accountsData.data.find((a: Account) => a.code === '100');
      const salesAccount = accountsData.data.find((a: Account) => a.code === '400');

      if (!cashAccount || !salesAccount) {
        return; // Skip if accounts not found
      }

      const unbalancedEntry = {
        date: '2024-01-15',
        description: '貸借不一致のテスト',
        lines: [
          {
            accountId: cashAccount.id,
            debitAmount: 10000,
            creditAmount: 0
          },
          {
            accountId: salesAccount.id,
            debitAmount: 0,
            creditAmount: 9000 // Unbalanced!
          }
        ]
      };

      const response = await fetch(`${API_BASE_URL}/api/journal-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unbalancedEntry)
      });

      expect(response.status).toBe(400);
    });

    it('should reject entry with only one line', async () => {
      const accountsResponse = await fetch(`${API_BASE_URL}/api/accounts`);
      const accountsData = await accountsResponse.json();
      const cashAccount = accountsData.data.find((a: Account) => a.code === '100');

      if (!cashAccount) {
        return; // Skip if account not found
      }

      const singleLineEntry = {
        date: '2024-01-15',
        description: '1行のみの仕訳',
        lines: [
          {
            accountId: cashAccount.id,
            debitAmount: 10000,
            creditAmount: 0
          }
        ]
      };

      const response = await fetch(`${API_BASE_URL}/api/journal-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(singleLineEntry)
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/journal-entries - List journal entries', () => {
    it('should return list of journal entries', async () => {
      const response = await fetch(`${API_BASE_URL}/api/journal-entries`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter by date range', async () => {
      const response = await fetch(`${API_BASE_URL}/api/journal-entries?startDate=2024-01-01&endDate=2024-12-31`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('GET /api/journal-entries/:id - Get journal entry details', () => {
    it('should return journal entry details', async () => {
      if (!testJournalEntryId) {
        return; // Skip if no test entry exists
      }

      const response = await fetch(`${API_BASE_URL}/api/journal-entries/${testJournalEntryId}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data.id).toBe(testJournalEntryId);
      expect(data.data.lines).toBeDefined();
      expect(Array.isArray(data.data.lines)).toBe(true);
    });
  });
});

describe('Financial Reports API', () => {
  describe('GET /api/reports/trial-balance', () => {
    it('should return trial balance with matching debits and credits', async () => {
      const response = await fetch(`${API_BASE_URL}/api/reports/trial-balance`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('totalDebit');
      expect(data.data).toHaveProperty('totalCredit');
      expect(data.data.totalDebit).toBe(data.data.totalCredit);
    });
  });

  describe('GET /api/reports/balance-sheet', () => {
    it('should return balance sheet that balances', async () => {
      const response = await fetch(`${API_BASE_URL}/api/reports/balance-sheet`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('assets');
      expect(data.data).toHaveProperty('liabilities');
      expect(data.data).toHaveProperty('equity');

      const assets = data.data.assets?.total || 0;
      const liabilities = data.data.liabilities?.total || 0;
      const equity = data.data.equity?.total || 0;

      expect(assets).toBeCloseTo(liabilities + equity, 2);
    });
  });

  describe('GET /api/reports/income-statement', () => {
    it('should return income statement', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/reports/income-statement?startDate=2024-01-01&endDate=2024-12-31`
      );
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('revenue');
      expect(data.data).toHaveProperty('expenses');
      expect(data.data).toHaveProperty('netIncome');

      const revenue = data.data.revenue?.total || 0;
      const expenses = data.data.expenses?.total || 0;
      const netIncome = data.data.netIncome || 0;

      expect(netIncome).toBeCloseTo(revenue - expenses, 2);
    });
  });
});

describe('Account Balance API', () => {
  describe('GET /api/balances/:accountId', () => {
    it('should return account balance', async () => {
      // Get cash account
      const accountsResponse = await fetch(`${API_BASE_URL}/api/accounts`);
      const accountsData = await accountsResponse.json();
      const cashAccount = accountsData.data.find((a: Account) => a.code === '100');

      if (!cashAccount) {
        return; // Skip if account not found
      }

      const response = await fetch(`${API_BASE_URL}/api/balances/${cashAccount.id}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('balance');
      expect(typeof data.data.balance).toBe('number');
    });
  });

  describe('GET /api/balances/:accountId/t-account', () => {
    it('should return T-account format', async () => {
      // Get cash account
      const accountsResponse = await fetch(`${API_BASE_URL}/api/accounts`);
      const accountsData = await accountsResponse.json();
      const cashAccount = accountsData.data.find((a: Account) => a.code === '100');

      if (!cashAccount) {
        return; // Skip if account not found
      }

      const response = await fetch(`${API_BASE_URL}/api/balances/${cashAccount.id}/t-account`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('entries');
      expect(data.data).toHaveProperty('totalDebit');
      expect(data.data).toHaveProperty('totalCredit');
      expect(data.data).toHaveProperty('balance');
      expect(Array.isArray(data.data.entries)).toBe(true);
    });
  });
});
