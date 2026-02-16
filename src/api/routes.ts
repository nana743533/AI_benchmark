// API Routes for Accounting Software
import { Router } from 'express';
import { db, resetDatabase } from '../db/database.js';

const router = Router();

// ===== Account Management =====

router.get('/accounts', (req, res) => {
  const type = req.query.type as string | undefined;
  const accounts = db.getAccounts(type);
  res.json({ data: accounts });
});

router.post('/accounts', (req, res) => {
  const { code, name, type, category, parentId } = req.body;

  // Validation
  if (!code || !name || !type || !category) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check for duplicate code
  const existingAccount = db.getAccountByCode(code);
  if (existingAccount) {
    return res.status(400).json({ error: 'Account code already exists' });
  }

  const account = db.createAccount({ code, name, type, category, parentId });
  res.status(201).json({ data: account });
});

router.get('/accounts/:id', (req, res) => {
  const account = db.getAccountById(req.params.id);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  res.json({ data: account });
});

router.put('/accounts/:id', (req, res) => {
  const { name, category } = req.body;
  const account = db.updateAccount(req.params.id, { name, category });
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  res.json({ data: account });
});

router.delete('/accounts/:id', (req, res) => {
  const deleted = db.deleteAccount(req.params.id);
  if (!deleted) {
    return res.status(400).json({ error: 'Cannot delete account: not found or in use' });
  }
  res.status(204).send();
});

// ===== Journal Entry Management =====

router.get('/journal-entries', (req, res) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const entries = db.getJournalEntries(startDate, endDate);
  res.json({ data: entries });
});

router.post('/journal-entries', (req, res) => {
  const { date, description, lines } = req.body;

  // Validation
  if (!date || !description || !lines || !Array.isArray(lines)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (lines.length < 2) {
    return res.status(400).json({ error: 'Journal entry must have at least 2 lines' });
  }

  // Check if all accounts exist
  for (const line of lines) {
    const account = db.getAccountById(line.accountId);
    if (!account) {
      return res.status(400).json({ error: `Account not found: ${line.accountId}` });
    }
  }

  // Check balance (debit = credit)
  const totalDebit = lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return res.status(400).json({ error: 'Debits and credits must be equal' });
  }

  // Check each line has only debit or credit
  for (const line of lines) {
    if ((line.debitAmount || 0) > 0 && (line.creditAmount || 0) > 0) {
      return res.status(400).json({ error: 'Each line must have either debit or credit, not both' });
    }
  }

  const entry = db.createJournalEntry({ date, description }, lines);
  res.status(201).json({ data: entry });
});

router.get('/journal-entries/:id', (req, res) => {
  const entry = db.getJournalEntryById(req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Journal entry not found' });
  }
  res.json({ data: entry });
});

router.put('/journal-entries/:id', (req, res) => {
  const { date, description } = req.body;
  const entry = db.updateJournalEntry(req.params.id, { date, description });
  if (!entry) {
    return res.status(404).json({ error: 'Journal entry not found' });
  }
  res.json({ data: entry });
});

router.delete('/journal-entries/:id', (req, res) => {
  const deleted = db.deleteJournalEntry(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Journal entry not found' });
  }
  res.status(204).send();
});

// ===== Financial Reports =====

router.get('/reports/trial-balance', (req, res) => {
  const asOfDate = req.query.asOfDate as string | undefined;
  const trialBalance = db.getTrialBalance(asOfDate);
  res.json({ data: trialBalance });
});

router.get('/reports/balance-sheet', (req, res) => {
  const asOfDate = req.query.asOfDate as string | undefined;
  const balanceSheet = db.getBalanceSheet(asOfDate);
  res.json({ data: balanceSheet });
});

router.get('/reports/income-statement', (req, res) => {
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  const incomeStatement = db.getIncomeStatement(startDate, endDate);
  res.json({ data: incomeStatement });
});

// ===== Account Balances =====

router.get('/balances/:accountId', (req, res) => {
  const account = db.getAccountById(req.params.accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const asOfDate = req.query.asOfDate as string | undefined;
  const balance = db.getAccountBalance(req.params.accountId, asOfDate);

  res.json({
    data: {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      balance,
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
    },
  });
});

router.get('/balances/:accountId/t-account', (req, res) => {
  const asOfDate = req.query.asOfDate as string | undefined;
  const tAccountData = db.getTAccountEntries(req.params.accountId, asOfDate);

  if (!tAccountData) {
    return res.status(404).json({ error: 'Account not found' });
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of tAccountData.entries) {
    totalDebit += entry.debit;
    totalCredit += entry.credit;
  }

  const balance = tAccountData.account.type === 'asset' || tAccountData.account.type === 'expense'
    ? totalDebit - totalCredit
    : totalCredit - totalDebit;

  res.json({
    data: {
      account: {
        id: tAccountData.account.id,
        code: tAccountData.account.code,
        name: tAccountData.account.name,
        type: tAccountData.account.type,
      },
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      entries: tAccountData.entries,
      totalDebit,
      totalCredit,
      balance,
    },
  });
});

// ===== Test Reset Endpoint =====

// Reset database to initial state (only in test mode)
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === undefined) {
  router.post('/test/reset', (_req, res) => {
    resetDatabase();
    res.json({ message: 'Database reset to initial state' });
  });
}

export default router;
