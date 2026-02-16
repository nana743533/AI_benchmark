# REST API 仕様

## 概要

このドキュメントは会計ソフトウェアのREST APIエンドポイントを定義します。技術スタックに依存しない仕様です。

## 共通仕様

### ベースURL
- 開発環境: `http://localhost:3000`
- テスト環境: Dockerコンテナ内

### リクエストヘッダー
```
Content-Type: application/json
Accept: application/json
```

### レスポンス形式
```json
{
  "data": { /* レスポンスデータ */ },
  "error": null | { /* エラー情報 */ }
}
```

### エラーレスポンス
| ステータス | 説明 |
|-----------|------|
| 400 | バリデーションエラー |
| 404 | リソースが見つからない |
| 500 | サーバーエラー |

---

## APIエンドポイント

### 1. 勘定科目（Accounts）

#### 1.1 勘定科目一覧取得
```http
GET /api/accounts
```

**クエリパラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| type | string | - | フィルタ: asset, liability, equity, revenue, expense |
| category | string | - | フィルタ: 分類名（部分一致） |

**レスポンス:**
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "100",
      "name": "現金",
      "type": "asset",
      "category": "流動資産",
      "parentId": null,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 1.2 勘定科目作成
```http
POST /api/accounts
```

**リクエスト:**
```json
{
  "code": "100",
  "name": "現金",
  "type": "asset",
  "category": "流動資産",
  "parentId": null
}
```

**バリデーション:**
- code: 必須、一意
- name: 必須、1文字以上
- type: 必須、有効な値

**レスポンス:** 201 Created
```json
{
  "data": {
    "id": "uuid",
    "code": "100",
    "name": "現金",
    "type": "asset",
    "category": "流動資産",
    "parentId": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 1.3 勘定科目詳細取得
```http
GET /api/accounts/:id
```

**レスポンス:**
```json
{
  "data": {
    "id": "uuid",
    "code": "100",
    "name": "現金",
    "type": "asset",
    "category": "流動資産",
    "parentId": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 1.4 勘定科目更新
```http
PUT /api/accounts/:id
```

**リクエスト:**
```json
{
  "name": "現金預金",
  "category": "流動資産"
}
```

**制約:** codeフィールドは変更不可

**レスポンス:**
```json
{
  "data": {
    "id": "uuid",
    "code": "100",
    "name": "現金預金",
    "type": "asset",
    "category": "流動資産",
    "parentId": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T15:30:00Z"
  }
}
```

#### 1.5 勘定科目削除
```http
DELETE /api/accounts/:id
```

**制約:** 仕訳で使用中の科目は削除不可

**レスポンス:** 204 No Content

---

### 2. 仕訳（Journal Entries）

#### 2.1 仕訳一覧取得
```http
GET /api/journal-entries
```

**クエリパラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| startDate | date | - | 開始日 (YYYY-MM-DD) |
| endDate | date | - | 終了日 (YYYY-MM-DD) |
| accountId | string | - | 勘定科目IDでフィルタ |

**レスポンス:**
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2024-01-15",
      "description": "商品仕入",
      "lines": [
        {
          "id": "uuid",
          "accountId": "uuid",
          "accountName": "仕入",
          "debitAmount": 10000,
          "creditAmount": 0
        },
        {
          "id": "uuid",
          "accountId": "uuid",
          "accountName": "現金",
          "debitAmount": 0,
          "creditAmount": 10000
        }
      ],
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

#### 2.2 仕訳作成
```http
POST /api/journal-entries
```

**リクエスト:**
```json
{
  "date": "2024-01-15",
  "description": "商品仕入",
  "lines": [
    {
      "accountId": "uuid",
      "debitAmount": 10000,
      "creditAmount": 0
    },
    {
      "accountId": "uuid",
      "debitAmount": 0,
      "creditAmount": 10000
    }
  ]
}
```

**バリデーション:**
- date: 必須、有効な日付
- description: 必須
- lines: 必須、2行以上
- 各line: accountId必須、debitAmountとcreditAmountのどちらかは0

**貸借一致チェック:** 借方合計 = 貸方合計

**レスポンス:** 201 Created

#### 2.3 仕訳詳細取得
```http
GET /api/journal-entries/:id
```

**レスポンス:**
```json
{
  "data": {
    "id": "uuid",
    "date": "2024-01-15",
    "description": "商品仕入",
    "lines": [
      {
        "id": "uuid",
        "accountId": "uuid",
        "accountName": "仕入",
        "debitAmount": 10000,
        "creditAmount": 0
      },
      {
        "id": "uuid",
        "accountId": "uuid",
        "accountName": "現金",
        "debitAmount": 0,
        "creditAmount": 10000
      }
    ],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

#### 2.4 仕訳更新
```http
PUT /api/journal-entries/:id
```

**リクエスト:**
```json
{
  "date": "2024-01-16",
  "description": "商品仕入（修正）",
  "lines": [
    {
      "accountId": "uuid",
      "debitAmount": 12000,
      "creditAmount": 0
    },
    {
      "accountId": "uuid",
      "debitAmount": 0,
      "creditAmount": 12000
    }
  ]
}
```

**制約:** 締め処理済み期間の仕訳は変更不可

**レスポンス:**
```json
{
  "data": {
    "id": "uuid",
    "date": "2024-01-16",
    "description": "商品仕入（修正）",
    "lines": [...],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

#### 2.5 仕訳削除
```http
DELETE /api/journal-entries/:id
```

**制約:** 締め処理済み期間の仕訳は削除不可

**レスポンス:** 204 No Content

---

### 3. 財務諸表（Reports）

#### 3.1 貸借対照表
```http
GET /api/reports/balance-sheet?asOfDate=2024-03-31
```

**クエリパラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| asOfDate | date | - | 基準日（デフォルト: 今日） |

**レスポンス:**
```json
{
  "data": {
    "asOfDate": "2024-03-31",
    "assets": {
      "current": {
        "cash": 100000,
        "accountsReceivable": 50000,
        "inventory": 30000,
        "total": 180000
      },
      "fixed": {
        "equipment": 50000,
        "building": 200000,
        "total": 250000
      },
      "total": 430000
    },
    "liabilities": {
      "current": {
        "accountsPayable": 30000,
        "accruedExpenses": 10000,
        "total": 40000
      },
      "fixed": {
        "loans": 100000,
        "total": 100000
      },
      "total": 140000
    },
    "equity": {
      "capital": 200000,
      "retainedEarnings": 90000,
      "total": 290000
    },
    "liabilitiesAndEquityTotal": 430000
  }
}
```

**バリデーション:** assets.total = liabilities.total + equity.total

#### 3.2 損益計算書
```http
GET /api/reports/income-statement?startDate=2024-04-01&endDate=2025-03-31
```

**クエリパラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| startDate | date | - | 開始日 |
| endDate | date | - | 終了日 |

**レスポンス:**
```json
{
  "data": {
    "period": {
      "startDate": "2024-04-01",
      "endDate": "2025-03-31"
    },
    "revenue": {
      "sales": 500000,
      "otherIncome": 5000,
      "total": 505000
    },
    "expenses": {
      "costOfGoodsSold": 300000,
      "salaries": 100000,
      "advertising": 20000,
      "depreciation": 15000,
      "total": 435000
    },
    "netIncome": 70000
  }
}
```

**バリデーション:** netIncome = revenue.total - expenses.total

#### 3.3 試算表
```http
GET /api/reports/trial-balance?asOfDate=2024-03-31
```

**クエリパラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| asOfDate | date | - | 基準日（デフォルト: 今日） |

**レスポンス:**
```json
{
  "data": {
    "asOfDate": "2024-03-31",
    "accounts": [
      {
        "id": "uuid",
        "code": "100",
        "name": "現金",
        "debitBalance": 100000,
        "creditBalance": 0
      },
      {
        "id": "uuid",
        "code": "400",
        "name": "売上",
        "debitBalance": 0,
        "creditBalance": 500000
      }
    ],
    "totalDebit": 1000000,
    "totalCredit": 1000000
  }
}
```

**バリデーション:** totalDebit = totalCredit

---

### 4. 残高（Balances）

#### 4.1 勘定科目残高取得
```http
GET /api/balances/:accountId?asOfDate=2024-03-31
```

**クエリパラメータ:**
| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| asOfDate | date | - | 基準日（デフォルト: 今日） |

**レスポンス:**
```json
{
  "data": {
    "accountId": "uuid",
    "accountCode": "100",
    "accountName": "現金",
    "accountType": "asset",
    "balance": 100000,
    "asOfDate": "2024-03-31"
  }
}
```

#### 4.2 T字勘定取得
```http
GET /api/balances/:accountId/t-account?asOfDate=2024-03-31
```

**レスポンス:**
```json
{
  "data": {
    "account": {
      "id": "uuid",
      "code": "100",
      "name": "現金",
      "type": "asset"
    },
    "asOfDate": "2024-03-31",
    "entries": [
      {
        "date": "2024-01-01",
        "description": "前期繰越",
        "journalEntryId": null,
        "debit": 50000,
        "credit": 0
      },
      {
        "date": "2024-02-15",
        "description": "売上",
        "journalEntryId": "uuid",
        "debit": 100000,
        "credit": 0
      },
      {
        "date": "2024-03-01",
        "description": "仕入",
        "journalEntryId": "uuid",
        "debit": 0,
        "credit": 50000
      }
    ],
    "totalDebit": 150000,
    "totalCredit": 50000,
    "balance": 100000
  }
}
```
