// Type definitions for Accounting Software

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  category: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  accountName?: string;
  debitAmount: number;
  creditAmount: number;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  lines: JournalLine[];
  createdAt: Date;
  updatedAt: Date;
  isClosed?: boolean;
}

export interface BalanceSheet {
  assets: { total: number };
  liabilities: { total: number };
  equity: { total: number };
}

export interface IncomeStatement {
  revenue: { total: number };
  expenses: { total: number };
  netIncome: number;
}

export interface TrialBalance {
  totalDebit: number;
  totalCredit: number;
}

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  balance: number;
  asOfDate: string;
}

export interface TAccountEntry {
  date: string;
  description: string;
  journalEntryId?: string;
  debit: number;
  credit: number;
}

export interface TAccount {
  account: {
    id: string;
    code: string;
    name: string;
    type: AccountType;
  };
  asOfDate: string;
  entries: TAccountEntry[];
  totalDebit: number;
  totalCredit: number;
  balance: number;
}
