# MCPサーバー仕様

## 概要

このドキュメントは会計ソフトウェアのMCP（Model Context Protocol）サーバー仕様を定義します。

MCPサーバーは、LLM（大規模言語モデル）から会計ソフトウェアの機能を呼び出すためのインターフェースを提供します。

## MCPプロトコル準拠

MCPサーバーは以下の仕様に準拠する必要があります：

- **通信方式**: JSON-RPC 2.0 over stdio
- **仕様**: [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-11-25)

## 必須ツール（5つ）

MCPサーバーは以下の5つのツールを実装する必要があります。

### 1. create_journal_entry

新しい仕訳を作成します。

**ツール定義:**
```json
{
  "name": "create_journal_entry",
  "description": "新しい仕訳を作成します。複式簿記に基づき、借方と貸方の合計が一致する必要があります。",
  "inputSchema": {
    "type": "object",
    "properties": {
      "date": {
        "type": "string",
        "description": "仕訳日付 (YYYY-MM-DD形式)",
        "format": "date"
      },
      "description": {
        "type": "string",
        "description": "仕訳の摘要"
      },
      "lines": {
        "type": "array",
        "description": "仕訳明細行（2行以上必須）",
        "minItems": 2,
        "items": {
          "type": "object",
          "properties": {
            "accountCode": {
              "type": "string",
              "description": "勘定科目コード（例: 100, 400）"
            },
            "debitAmount": {
              "type": "number",
              "description": "借方金額",
              "minimum": 0
            },
            "creditAmount": {
              "type": "number",
              "description": "貸方金額",
              "minimum": 0
            }
          },
          "required": ["accountCode"]
        }
      }
    },
    "required": ["date", "description", "lines"]
  }
}
```

**レスポンス例:**
```json
{
  "success": true,
  "journalEntry": {
    "id": "uuid",
    "date": "2024-01-15",
    "description": "商品仕入",
    "lines": [
      {
        "id": "uuid",
        "accountCode": "500",
        "accountName": "仕入",
        "debitAmount": 10000,
        "creditAmount": 0
      },
      {
        "id": "uuid",
        "accountCode": "100",
        "accountName": "現金",
        "debitAmount": 0,
        "creditAmount": 10000
      }
    ]
  }
}
```

**エラーケース:**
- 貸借不一致: `409 Conflict`
- 存在しない勘定科目: `404 Not Found`

---

### 2. get_account_balance

指定された勘定科目の残高を取得します。

**ツール定義:**
```json
{
  "name": "get_account_balance",
  "description": "指定された勘定科目の残高を取得します。",
  "inputSchema": {
    "type": "object",
    "properties": {
      "accountCode": {
        "type": "string",
        "description": "勘定科目コード（例: 100, 400）"
      },
      "asOfDate": {
        "type": "string",
        "description": "基準日 (YYYY-MM-DD形式、省略時は今日)",
        "format": "date"
      }
    },
    "required": ["accountCode"]
  }
}
```

**レスポンス例:**
```json
{
  "accountCode": "100",
  "accountName": "現金",
  "accountType": "asset",
  "balance": 150000,
  "asOfDate": "2024-03-31"
}
```

---

### 3. list_accounts

勘定科目の一覧を取得します。

**ツール定義:**
```json
{
  "name": "list_accounts",
  "description": "勘定科目の一覧を取得します。タイプやカテゴリでフィルタリングできます。",
  "inputSchema": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "description": "科目タイプでフィルタ (asset, liability, equity, revenue, expense)",
        "enum": ["asset", "liability", "equity", "revenue", "expense"]
      },
      "category": {
        "type": "string",
        "description": "カテゴリでフィルタ（部分一致）"
      }
    }
  }
}
```

**レスポンス例:**
```json
{
  "accounts": [
    {
      "code": "100",
      "name": "現金",
      "type": "asset",
      "category": "流動資産"
    },
    {
      "code": "101",
      "name": "預金",
      "type": "asset",
      "category": "流動資産"
    }
  ]
}
```

---

### 4. generate_balance_sheet

貸借対照表を生成します。

**ツール定義:**
```json
{
  "name": "generate_balance_sheet",
  "description": "指定した日時点での貸借対照表を生成します。",
  "inputSchema": {
    "type": "object",
    "properties": {
      "asOfDate": {
        "type": "string",
        "description": "基準日 (YYYY-MM-DD形式、省略時は今日)",
        "format": "date"
      }
    }
  }
}
```

**レスポンス例:**
```json
{
  "asOfDate": "2024-03-31",
  "balanceSheet": {
    "assets": {
      "total": 430000
    },
    "liabilities": {
      "total": 140000
    },
    "equity": {
      "total": 290000
    },
    "verified": true
  },
  "summary": "資産合計: 430,000円 / 負債・純資産合計: 430,000円 (バランスOK)"
}
```

---

### 5. generate_income_statement

損益計算書を生成します。

**ツール定義:**
```json
{
  "name": "generate_income_statement",
  "description": "指定した期間の損益計算書を生成します。",
  "inputSchema": {
    "type": "object",
    "properties": {
      "startDate": {
        "type": "string",
        "description": "開始日 (YYYY-MM-DD形式)",
        "format": "date"
      },
      "endDate": {
        "type": "string",
        "description": "終了日 (YYYY-MM-DD形式)",
        "format": "date"
      }
    },
    "required": ["startDate", "endDate"]
  }
}
```

**レスポンス例:**
```json
{
  "period": {
    "startDate": "2024-04-01",
    "endDate": "2025-03-31"
  },
  "incomeStatement": {
    "revenue": {
      "total": 505000
    },
    "expenses": {
      "total": 435000
    },
    "netIncome": 70000
  },
  "summary": "当期純利益: 70,000円"
}
```

---

## サーバー要件

### 1. ツール一覧の取得

`tools/list` メソッドで上記5つのツールが一覧表示される必要があります。

### 2. エラーハンドリング

各ツールは適切なエラーメッセージを返す必要があります：

| エラー種類 | 対応 |
|-----------|------|
| バリデーションエラー | 入力値の問題を説明 |
| 存在しないリソース | 該当する勘定科目が見つからない |
| 貸借不一致 | 仕訳の借方・貸方が一致しない |

### 3. 入力バリデーション

各ツールは以下をバリデーションする必要があります：

- 必須パラメータの存在チェック
- データ型のチェック
- 値の範囲チェック（金額は0以上など）
- 日付形式のチェック

## 実装のヒント

### 参考SDK

- **TypeScript/JavaScript**: `@modelcontextprotocol/sdk`
- **Python**: 公式SDKまたは自前実装
- **その他**: JSON-RPC 2.0ライブラリを使用

### テスト方法

```bash
# MCPサーバーを起動
# （実装に依存）

# ツール一覧取得
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | ./mcp-server

# ツール実行
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_accounts","arguments":{}},"id":2}' | ./mcp-server
```

## MCPプロトコル準拠チェックリスト

- [ ] `tools/list` で5つのツールが返される
- [ ] 各ツールの `inputSchema` が正しく定義されている
- [ ] JSON-RPC 2.0 over stdio で通信できる
- [ ] エラー時に適切なエラーレスポンスを返す
- [ ] 各ツールが仕様通りに動作する
