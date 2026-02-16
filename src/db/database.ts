// In-memory database for Accounting Software
import { v4 as uuidv4 } from 'uuid';
import type { Account, JournalEntry, JournalLine, AccountType } from '../api/types.js';

// Initial standard accounts data
const STANDARD_ACCOUNTS = [
  // Assets
  { id: uuidv4(), code: '100', name: '現金', type: 'asset' as AccountType, category: '流動資産' },
  { id: uuidv4(), code: '101', name: '預金', type: 'asset' as AccountType, category: '流動資産' },
  { id: uuidv4(), code: '110', name: '売掛金', type: 'asset' as AccountType, category: '流動資産' },
  { id: uuidv4(), code: '120', name: '商品', type: 'asset' as AccountType, category: '流動資産' },
  { id: uuidv4(), code: '150', name: '備品', type: 'asset' as AccountType, category: '固定資産' },
  { id: uuidv4(), code: '160', name: '建物', type: 'asset' as AccountType, category: '固定資産' },
  // Liabilities
  { id: uuidv4(), code: '200', name: '買掛金', type: 'liability' as AccountType, category: '流動負債' },
  { id: uuidv4(), code: '210', name: '未払金', type: 'liability' as AccountType, category: '流動負債' },
  { id: uuidv4(), code: '250', name: '借入金', type: 'liability' as AccountType, category: '固定負債' },
  // Equity
  { id: uuidv4(), code: '300', name: '資本金', type: 'equity' as AccountType, category: '資本金' },
  { id: uuidv4(), code: '310', name: '利益剰余金', type: 'equity' as AccountType, category: '剰余金' },
  // Revenue
  { id: uuidv4(), code: '400', name: '売上', type: 'revenue' as AccountType, category: '売上高' },
  { id: uuidv4(), code: '410', name: '雑収入', type: 'revenue' as AccountType, category: '営業外収益' },
  // Expenses
  { id: uuidv4(), code: '500', name: '仕入', type: 'expense' as AccountType, category: '売上原価' },
  { id: uuidv4(), code: '510', name: '給料', type: 'expense' as AccountType, category: '販売費及び一般管理費' },
  { id: uuidv4(), code: '520', name: '広告宣伝費', type: 'expense' as AccountType, category: '販売費及び一般管理費' },
  { id: uuidv4(), code: '530', name: '旅費交通費', type: 'expense' as AccountType, category: '販売費及び一般管理費' },
  { id: uuidv4(), code: '540', name: '消耗品費', type: 'expense' as AccountType, category: '販売費及び一般管理費' },
  { id: uuidv4(), code: '550', name: '減価償却費', type: 'expense' as AccountType, category: '販売費及び一般管理費' },
];

export class Database {
  private accounts: Account[] = [];
  private journalEntries: JournalEntry[] = [];

  constructor() {
    // Initialize with standard accounts
    const now = new Date();
    this.accounts = STANDARD_ACCOUNTS.map((acc) => ({
      ...acc,
      parentId: null,
      createdAt: now,
      updatedAt: now,
    }));
  }

  // Account methods
  getAccounts(type?: string): Account[] {
    if (type) {
      return this.accounts.filter((acc) => acc.type === type);
    }
    return [...this.accounts];
  }

  getAccountById(id: string): Account | undefined {
    return this.accounts.find((acc) => acc.id === id);
  }

  getAccountByCode(code: string): Account | undefined {
    return this.accounts.find((acc) => acc.code === code);
  }

  createAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Account {
    const now = new Date();
    const newAccount: Account = {
      ...account,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    this.accounts.push(newAccount);
    return newAccount;
  }

  updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'createdAt'>>): Account | null {
    const index = this.accounts.findIndex((acc) => acc.id === id);
    if (index === -1) return null;

    this.accounts[index] = {
      ...this.accounts[index],
      ...updates,
      updatedAt: new Date(),
    };
    return this.accounts[index];
  }

  deleteAccount(id: string): boolean {
    // Check if account is used in journal entries
    const isUsed = this.journalEntries.some((entry) =>
      entry.lines.some((line) => line.accountId === id)
    );
    if (isUsed) return false;

    const index = this.accounts.findIndex((acc) => acc.id === id);
    if (index === -1) return false;

    this.accounts.splice(index, 1);
    return true;
  }

  // Journal Entry methods
  getJournalEntries(startDate?: string, endDate?: string): JournalEntry[] {
    let entries = [...this.journalEntries];

    if (startDate) {
      entries = entries.filter((entry) => entry.date >= startDate);
    }
    if (endDate) {
      entries = entries.filter((entry) => entry.date <= endDate);
    }

    return entries;
  }

  getJournalEntryById(id: string): JournalEntry | undefined {
    return this.journalEntries.find((entry) => entry.id === id);
  }

  createJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'lines'>, lines: Omit<JournalLine, 'id'>[]): JournalEntry {
    const now = new Date();
    const newEntry: JournalEntry = {
      ...entry,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      lines: lines.map((line) => ({
        ...line,
        id: uuidv4(),
        journalEntryId: uuidv4(), // Will be set correctly below
      })),
    };

    // Set journalEntryId for lines
    newEntry.lines = newEntry.lines.map((line) => ({
      ...line,
      journalEntryId: newEntry.id,
    }));

    // Add account names to lines
    newEntry.lines = newEntry.lines.map((line) => {
      const account = this.getAccountById(line.accountId);
      return {
        ...line,
        accountName: account?.name,
      };
    });

    this.journalEntries.push(newEntry);
    return newEntry;
  }

  updateJournalEntry(id: string, updates: Partial<Omit<JournalEntry, 'id' | 'createdAt' | 'lines'>>): JournalEntry | null {
    const index = this.journalEntries.findIndex((entry) => entry.id === id);
    if (index === -1) return null;

    this.journalEntries[index] = {
      ...this.journalEntries[index],
      ...updates,
      updatedAt: new Date(),
    };
    return this.journalEntries[index];
  }

  deleteJournalEntry(id: string): boolean {
    const index = this.journalEntries.findIndex((entry) => entry.id === id);
    if (index === -1) return false;

    this.journalEntries.splice(index, 1);
    return true;
  }

  // Financial calculations
  getAccountBalance(accountId: string, asOfDate?: string): number {
    const account = this.getAccountById(accountId);
    if (!account) return 0;

    let entries = this.journalEntries;
    if (asOfDate) {
      entries = entries.filter((entry) => entry.date <= asOfDate);
    }

    let balance = 0;
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.accountId === accountId) {
          if (account.type === 'asset' || account.type === 'expense') {
            balance += line.debitAmount - line.creditAmount;
          } else {
            balance += line.creditAmount - line.debitAmount;
          }
        }
      }
    }

    return balance;
  }

  getTrialBalance(asOfDate?: string): { totalDebit: number; totalCredit: number } {
    let entries = this.journalEntries;
    if (asOfDate) {
      entries = entries.filter((entry) => entry.date <= asOfDate);
    }

    const debitAmounts = new Map<string, number>();
    const creditAmounts = new Map<string, number>();

    // Initialize all accounts
    for (const account of this.accounts) {
      debitAmounts.set(account.id, 0);
      creditAmounts.set(account.id, 0);
    }

    // Calculate debit and credit amounts
    for (const entry of entries) {
      for (const line of entry.lines) {
        const currentDebit = debitAmounts.get(line.accountId) || 0;
        const currentCredit = creditAmounts.get(line.accountId) || 0;
        debitAmounts.set(line.accountId, currentDebit + line.debitAmount);
        creditAmounts.set(line.accountId, currentCredit + line.creditAmount);
      }
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of this.accounts) {
      const debit = debitAmounts.get(account.id) || 0;
      const credit = creditAmounts.get(account.id) || 0;
      totalDebit += debit;
      totalCredit += credit;
    }

    return { totalDebit, totalCredit };
  }

  getBalanceSheet(asOfDate?: string) {
    let entries = this.journalEntries;
    if (asOfDate) {
      entries = entries.filter((entry) => entry.date <= asOfDate);
    }

    const balances = new Map<string, number>();

    // Initialize all accounts
    for (const account of this.accounts) {
      balances.set(account.id, 0);
    }

    // Calculate balances
    for (const entry of entries) {
      for (const line of entry.lines) {
        const current = balances.get(line.accountId) || 0;
        balances.set(line.accountId, current + line.debitAmount - line.creditAmount);
      }
    }

    let assets = 0;
    let liabilities = 0;
    let equity = 0;

    for (const account of this.accounts) {
      const balance = balances.get(account.id) || 0;
      if (account.type === 'asset') {
        assets += balance;
      } else if (account.type === 'liability') {
        liabilities -= balance; // liability has credit balance
      } else if (account.type === 'equity') {
        equity -= balance; // equity has credit balance
      } else if (account.type === 'revenue') {
        equity -= balance; // revenue increases equity
      } else if (account.type === 'expense') {
        equity += balance; // expense decreases equity
      }
    }

    return {
      assets: { total: assets },
      liabilities: { total: liabilities },
      equity: { total: equity },
    };
  }

  getIncomeStatement(startDate: string, endDate: string) {
    const entries = this.journalEntries.filter(
      (entry) => entry.date >= startDate && entry.date <= endDate
    );

    let revenue = 0;
    let expenses = 0;

    for (const entry of entries) {
      for (const line of entry.lines) {
        const account = this.getAccountById(line.accountId);
        if (!account) continue;

        const amount = line.debitAmount - line.creditAmount;
        if (account.type === 'revenue') {
          revenue += -amount; // Revenue is credit balance
        } else if (account.type === 'expense') {
          expenses += amount; // Expense is debit balance
        }
      }
    }

    return {
      revenue: { total: revenue },
      expenses: { total: expenses },
      netIncome: revenue - expenses,
    };
  }

  getTAccountEntries(accountId: string, asOfDate?: string) {
    const account = this.getAccountById(accountId);
    if (!account) return null;

    let entries = this.journalEntries;
    if (asOfDate) {
      entries = entries.filter((entry) => entry.date <= asOfDate);
    }

    const tAccountEntries: Array<{
      date: string;
      description: string;
      journalEntryId: string;
      debit: number;
      credit: number;
    }> = [];

    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.accountId === accountId) {
          tAccountEntries.push({
            date: entry.date,
            description: entry.description,
            journalEntryId: entry.id,
            debit: line.debitAmount,
            credit: line.creditAmount,
          });
        }
      }
    }

    // Sort by date
    tAccountEntries.sort((a, b) => a.date.localeCompare(b.date));

    return { account, entries: tAccountEntries };
  }
}

// Singleton instance
export const db = new Database();

// Reset database to initial state (for testing)
export function resetDatabase(): void {
  const now = new Date();
  db.accounts = STANDARD_ACCOUNTS.map((acc) => ({
    ...acc,
    parentId: null,
    createdAt: now,
    updatedAt: now,
  }));
  db.journalEntries = [];
}
