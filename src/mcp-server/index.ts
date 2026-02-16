// MCP Server for Accounting Software
// Implements Model Context Protocol for AI agent integration
import { db, resetDatabase } from '../db/database.js';

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

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// MCP Tools definition
const TOOLS: Tool[] = [
  {
    name: 'create_journal_entry',
    description: 'Create a new journal entry with balanced debits and credits. Each line must specify either debitAmount or creditAmount (not both). The total debits must equal total credits.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Journal entry date in YYYY-MM-DD format'
        },
        description: {
          type: 'string',
          description: 'Description of the transaction'
        },
        lines: {
          type: 'array',
          description: 'Array of journal entry lines (minimum 2 lines)',
          items: {
            type: 'object',
            properties: {
              accountCode: {
                type: 'string',
                description: 'Account code (e.g., "100" for Cash, "400" for Sales)'
              },
              debitAmount: {
                type: 'number',
                description: 'Debit amount (set to 0 if using creditAmount)'
              },
              creditAmount: {
                type: 'number',
                description: 'Credit amount (set to 0 if using debitAmount)'
              }
            },
            required: ['accountCode', 'debitAmount', 'creditAmount']
          }
        }
      },
      required: ['date', 'description', 'lines']
    }
  },
  {
    name: 'get_account_balance',
    description: 'Get the current balance for a specific account. Returns the account details and its balance as of the specified date.',
    inputSchema: {
      type: 'object',
      properties: {
        accountCode: {
          type: 'string',
          description: 'Account code (e.g., "100" for Cash)'
        },
        asOfDate: {
          type: 'string',
          description: 'Date to calculate balance as of (YYYY-MM-DD format). Optional, defaults to current date.'
        }
      },
      required: ['accountCode']
    }
  },
  {
    name: 'list_accounts',
    description: 'List all accounts or filter by account type. Returns account codes, names, and types.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Filter by account type: "asset", "liability", "equity", "revenue", or "expense". Optional.',
          enum: ['asset', 'liability', 'equity', 'revenue', 'expense']
        }
      }
    }
  },
  {
    name: 'generate_balance_sheet',
    description: 'Generate a balance sheet (financial statement showing assets, liabilities, and equity) as of a specific date.',
    inputSchema: {
      type: 'object',
      properties: {
        asOfDate: {
          type: 'string',
          description: 'Date to generate balance sheet as of (YYYY-MM-DD format). Optional.'
        }
      }
    }
  },
  {
    name: 'generate_income_statement',
    description: 'Generate an income statement (profit and loss statement) for a specific period showing revenue, expenses, and net income.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date of the period (YYYY-MM-DD format)'
        },
        endDate: {
          type: 'string',
          description: 'End date of the period (YYYY-MM-DD format)'
        }
      },
      required: ['startDate', 'endDate']
    }
  }
];

// Tool implementations
function createJournalEntry(params: any): any {
  const { date, description, lines } = params;

  // Validation
  if (!date || !description || !lines || !Array.isArray(lines)) {
    return {
      success: false,
      error: 'Missing required fields: date, description, lines'
    };
  }

  if (lines.length < 2) {
    return {
      success: false,
      error: 'Journal entry must have at least 2 lines'
    };
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return {
      success: false,
      error: 'Invalid date format. Use YYYY-MM-DD'
    };
  }

  // Find accounts by code
  const entryLines = [];
  for (const line of lines) {
    const account = db.getAccountByCode(line.accountCode);
    if (!account) {
      return {
        success: false,
        error: `Account not found: ${line.accountCode}`
      };
    }
    entryLines.push({
      accountId: account.id,
      debitAmount: line.debitAmount || 0,
      creditAmount: line.creditAmount || 0
    });
  }

  // Check balance
  const totalDebit = entryLines.reduce((sum, line) => sum + line.debitAmount, 0);
  const totalCredit = entryLines.reduce((sum, line) => sum + line.creditAmount, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return {
      success: false,
      error: `Debits (${totalDebit}) and credits (${totalCredit}) must be equal`
    };
  }

  // Check each line has only debit or credit
  for (const line of entryLines) {
    if (line.debitAmount > 0 && line.creditAmount > 0) {
      return {
        success: false,
        error: 'Each line must have either debit or credit, not both'
      };
    }
  }

  // Create journal entry
  try {
    const entry = db.createJournalEntry({ date, description }, entryLines);
    return {
      success: true,
      journalEntry: {
        id: entry.id,
        date: entry.date,
        description: entry.description,
        lines: entry.lines.map(line => ({
          accountCode: db.getAccountById(line.accountId)?.code,
          accountName: line.accountName,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount
        }))
      }
    };
  } catch (e: any) {
    return {
      success: false,
      error: e.message || 'Failed to create journal entry'
    };
  }
}

function getAccountBalance(params: any): any {
  const { accountCode, asOfDate } = params;

  if (!accountCode) {
    return {
      success: false,
      error: 'accountCode is required'
    };
  }

  const account = db.getAccountByCode(accountCode);
  if (!account) {
    return {
      success: false,
      error: `Account not found: ${accountCode}`
    };
  }

  const balance = db.getAccountBalance(account.id, asOfDate);

  return {
    success: true,
    accountCode: account.code,
    accountName: account.name,
    accountType: account.type,
    balance,
    asOfDate: asOfDate || new Date().toISOString().split('T')[0]
  };
}

function listAccounts(params: any): any {
  const { type } = params;

  const accounts = db.getAccounts(type);

  return {
    success: true,
    accounts: accounts.map(acc => ({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      category: acc.category
    }))
  };
}

function generateBalanceSheet(params: any): any {
  const { asOfDate } = params;

  // Validate date format if provided
  if (asOfDate) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(asOfDate)) {
      return {
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      };
    }
  }

  const balanceSheet = db.getBalanceSheet(asOfDate);

  return {
    success: true,
    asOfDate: asOfDate || new Date().toISOString().split('T')[0],
    balanceSheet
  };
}

function generateIncomeStatement(params: any): any {
  const { startDate, endDate } = params;

  if (!startDate || !endDate) {
    return {
      success: false,
      error: 'startDate and endDate are required'
    };
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return {
      success: false,
      error: 'Invalid date format. Use YYYY-MM-DD'
    };
  }

  const incomeStatement = db.getIncomeStatement(startDate, endDate);

  return {
    success: true,
    period: { startDate, endDate },
    incomeStatement
  };
}

// Handle incoming requests
function handleRequest(request: JSONRPCRequest): JSONRPCResponse {
  const response: JSONRPCResponse = {
    jsonrpc: '2.0',
    id: request.id
  };

  try {
    switch (request.method) {
      case 'initialize':
        response.result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'accounting-mcp-server',
            version: '1.0.0'
          }
        };
        break;

      case 'tools/list':
        response.result = {
          tools: TOOLS
        };
        break;

      case 'tools/call':
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'create_journal_entry':
            response.result = createJournalEntry(args);
            break;
          case 'get_account_balance':
            response.result = getAccountBalance(args);
            break;
          case 'list_accounts':
            response.result = listAccounts(args);
            break;
          case 'generate_balance_sheet':
            response.result = generateBalanceSheet(args);
            break;
          case 'generate_income_statement':
            response.result = generateIncomeStatement(args);
            break;
          default:
            response.error = {
              code: -32601,
              message: `Method not found: ${name}`
            };
        }
        break;

      case 'test/reset':
        // Hidden endpoint for testing
        resetDatabase();
        response.result = { message: 'Database reset' };
        break;

      default:
        response.error = {
          code: -32601,
          message: `Method not found: ${request.method}`
        };
    }
  } catch (e: any) {
    response.error = {
      code: -32603,
      message: 'Internal error',
      data: e.message
    };
  }

  return response;
}

// Main server loop (stdio communication)
async function main() {
  let buffer = '';

  process.stdin.setEncoding('utf-8');

  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;

    // Process complete lines (JSON-RPC messages are line-delimited)
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim() === '') continue;

      try {
        const request: JSONRPCRequest = JSON.parse(line);
        const response = handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (e) {
        const errorResponse: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error'
          }
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    }
  });

  process.stdin.on('end', () => {
    // Graceful shutdown
    process.exit(0);
  });

  // Keep process alive
  process.on('SIGINT', () => {
    process.exit(0);
  });
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { handleRequest, TOOLS };
