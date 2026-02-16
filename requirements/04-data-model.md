# データモデル

## 概要

このドキュメントは会計ソフトウェアのデータモデルを定義します。言語・技術スタックに依存しない仕様です。

---

## エンティティ定義

### 1. Account（勘定科目）

勘定科目マスターのデータモデルです。

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| id | string(UUID) | ○ | 自動生成 | 一意識別子 |
| code | string | ○ | - | 科目コード（例: 100, 200...） |
| name | string | ○ | - | 科目名 |
| type | enum | ○ | - | 科目タイプ |
| category | string | ○ | - | 分類（例: 流動資産, 固定資産...） |
| parentId | string(UUID) | - | null | 親科目ID（階層構造の場合） |
| createdAt | datetime | ○ | 現在日時 | 作成日時 |
| updatedAt | datetime | ○ | 現在日時 | 更新日時 |

**type の列挙値:**
| 値 | 説明 | 正常残高 |
|----|------|---------|
| `asset` | 資産 | 借方 |
| `liability` | 負債 | 貸方 |
| `equity` | 純資産 | 貸方 |
| `revenue` | 収益 | 貸方 |
| `expense` | 費用 | 借方 |

**制約:**
- `code` は一意である必要がある
- `type` は上記の列挙値のみ

---

### 2. JournalEntry（仕訳）

仕訳ヘッダーのデータモデルです。

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| id | string(UUID) | ○ | 自動生成 | 一意識別子 |
| date | date | ○ | - | 仕訳日付 |
| description | string | ○ | - | 摘要 |
| lines | array | ○ | - | 仕訳明細行（2行以上必須） |
| createdAt | datetime | ○ | 現在日時 | 作成日時 |
| updatedAt | datetime | ○ | 現在日時 | 更新日時 |
| isClosed | boolean | ○ | false | 締め処理済みフラグ |

**制約:**
- `lines` は2行以上必須
- 仕訳全体で借方合計 = 貸方合計

---

### 3. JournalLine（仕訳明細）

仕訳明細行のデータモデルです。

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| id | string(UUID) | ○ | 自動生成 | 一意識別子 |
| journalEntryId | string(UUID) | ○ | - | 親仕訳のID |
| accountId | string(UUID) | ○ | - | 勘定科目のID |
| debitAmount | decimal | ○ | 0 | 借方金額 |
| creditAmount | decimal | ○ | 0 | 貸方金額 |
| createdAt | datetime | ○ | 現在日時 | 作成日時 |

**制約:**
- `debitAmount` と `creditAmount` のどちらかは0である必要がある
- 両方が0または両方が正の値は不可

---

### 4. FiscalYear（会計年度）

会計年度のデータモデルです。

| フィールド | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| id | string(UUID) | ○ | 自動生成 | 一意識別子 |
| name | string | ○ | - | 年度名称（例: 2024年度） |
| startDate | date | ○ | - | 開始日 |
| endDate | date | ○ | - | 終了日 |
| isClosed | boolean | ○ | false | 締め処理済みフラグ |
| createdAt | datetime | ○ | 現在日時 | 作成日時 |

**制約:**
- `endDate` > `startDate`

---

## 関連性（Relationships）

```
Account (1) ──────< (N) JournalLine

JournalEntry (1) ──────< (N) JournalLine

FiscalYear (1) ──────< (N) JournalEntry
```

---

## データベーススキーマ例

### SQL（リレーショナルデータベース）

```sql
-- 勘定科目
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    category VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES accounts(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 仕訳
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    description VARCHAR(500) NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 仕訳明細
CREATE TABLE journal_lines (
    id UUID PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    debit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    credit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (credit_amount > 0 AND debit_amount = 0)
    )
);

-- 会計年度
CREATE TABLE fiscal_years (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date > start_date)
);

-- 複合ユニーク制約（同一仕訳内で同一勘定科目を禁止する場合）
CREATE UNIQUE INDEX idx_journal_lines_unique_account
ON journal_lines (journal_entry_id, account_id);
```

---

## 制約のまとめ

### ビジネスルール制約

1. **複式簿記の原則**
   - 仕訳は2行以上の明細を持つ
   - 借方合計 = 貸方合計

2. **勘定科目の制約**
   - コードは一意
   - 仕訳で使用中の科目は削除不可

3. **期間の制約**
   - 締め処理済み期間の仕訳は変更不可

### データ整合性制約

| 制約 | 説明 |
|------|------|
| 主キー制約 | 各エンティティの一意性 |
| 外部キー制約 | 関連性の整合性 |
| NOT NULL制約 | 必須フィールド |
| CHECK制約 | 列挙値、範囲チェック |
| 一意性制約 | コードの一意性 |

---

## 初期データ

### 標準勘定科目プリセット

実装時には以下の標準勘定科目を初期データとして登録してください：

#### 資産（Assets）
```sql
INSERT INTO accounts (id, code, name, type, category) VALUES
('uuid-1', '100', '現金', 'asset', '流動資産'),
('uuid-2', '101', '預金', 'asset', '流動資産'),
('uuid-3', '110', '売掛金', 'asset', '流動資産'),
('uuid-4', '120', '商品', 'asset', '流動資産'),
('uuid-5', '150', '備品', 'asset', '固定資産'),
('uuid-6', '160', '建物', 'asset', '固定資産');
```

#### 負債（Liabilities）
```sql
INSERT INTO accounts (id, code, name, type, category) VALUES
('uuid-7', '200', '買掛金', 'liability', '流動負債'),
('uuid-8', '210', '未払金', 'liability', '流動負債'),
('uuid-9', '250', '借入金', 'liability', '固定負債');
```

#### 純資産（Equity）
```sql
INSERT INTO accounts (id, code, name, type, category) VALUES
('uuid-10', '300', '資本金', 'equity', '資本金'),
('uuid-11', '310', '利益剰余金', 'equity', '剰余金');
```

#### 収益（Revenue）
```sql
INSERT INTO accounts (id, code, name, type, category) VALUES
('uuid-12', '400', '売上', 'revenue', '売上高'),
('uuid-13', '410', '雑収入', 'revenue', '営業外収益');
```

#### 費用（Expenses）
```sql
INSERT INTO accounts (id, code, name, type, category) VALUES
('uuid-14', '500', '仕入', 'expense', '売上原価'),
('uuid-15', '510', '給料', 'expense', '販売費及び一般管理費'),
('uuid-16', '520', '広告宣伝費', 'expense', '販売費及び一般管理費'),
('uuid-17', '530', '旅費交通費', 'expense', '販売費及び一般管理費'),
('uuid-18', '540', '消耗品費', 'expense', '販売費及び一般管理費'),
('uuid-19', '550', '減価償却費', 'expense', '販売費及び一般管理費');
```
