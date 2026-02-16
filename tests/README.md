# テスト仕様

このディレクトリには、会計ソフトウェアの実装を検証するためのテストコードが含まれます。

## テストの構成

```
tests/
├── api/                    # APIテスト（HTTP経由で検証）
│   └── accounts.test.ts    # REST APIのテスト
├── mcp/                    # MCPサーバーテスト
│   └── server.test.ts      # MCPプロトコルのテスト
└── e2e/                    # E2Eテスト（ブラウザ経由で検証）
    └── accounting.spec.ts  # Web UIのテスト
```

## テストの特徴

### 技術スタック非依存

これらのテストは**実装の技術スタックに依存しません**：

- **APIテスト**: HTTPリクエストを送信してレスポンスを検証
- **MCPサーバーテスト**: JSON-RPC 2.0 over stdio で通信
- **E2Eテスト**: Playwrightでブラウザ操作をシミュレート

エージェントは**任意の技術スタック**（Python/Go/Rustなど）で実装できます。要件は以下のエンドポイントを実装することのみです。

## テスト実行方法

### 前提条件

エージェントの実装が起動している必要があります：

```bash
# エージェントの実装を起動（例）
cd src/
# エージェントが選択した技術スタックに応じたコマンド
```

### Docker環境での実行

```bash
# アプリケーションを起動
make up

# APIテスト
make test-api

# MCPサーバーテスト
make test-mcp

# E2Eテスト
make test-e2e

# すべてのテスト
make test-all
```

### ローカルでの実行

```bash
# 依存関係のインストール（テスト実行用）
npm install

# APIテスト
npm run test:api

# MCPサーバーテスト
npm run test:mcp

# E2Eテスト
npm run test:e2e

# すべてのテスト
npm run test:all
```

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `API_BASE_URL` | APIのベースURL | `http://localhost:3000` |
| `BASE_URL` | E2EテストのベースURL | `http://localhost:3000` |
| `MCP_SERVER_PATH` | MCPサーバーのパス | `./src/mcp-server/index.ts` |

## APIテスト仕様

### テスト対象エンドポイント

| カテゴリ | エンドポイント | 説明 |
|---------|---------------|------|
| 勘定科目 | `GET /api/accounts` | 一覧取得 |
| 勘定科目 | `POST /api/accounts` | 作成 |
| 勘定科目 | `GET /api/accounts/:id` | 詳細取得 |
| 勘定科目 | `PUT /api/accounts/:id` | 更新 |
| 勘定科目 | `DELETE /api/accounts/:id` | 削除 |
| 仕訳 | `GET /api/journal-entries` | 一覧取得 |
| 仕訳 | `POST /api/journal-entries` | 作成 |
| 仕訳 | `GET /api/journal-entries/:id` | 詳細取得 |
| 財務諸表 | `GET /api/reports/trial-balance` | 試算表 |
| 財務諸表 | `GET /api/reports/balance-sheet` | 貸借対照表 |
| 財務諸表 | `GET /api/reports/income-statement` | 損益計算書 |
| 残高 | `GET /api/balances/:accountId` | 残高取得 |
| 残高 | `GET /api/balances/:accountId/t-account` | T字勘定 |

### 重要なバリデーション

1. **貸借一致**: 仕訳作成時に借方合計 = 貸方合計をチェック
2. **財務諸表のバランス**:
   - 試算表: 借方合計 = 貸方合計
   - BS: 資産 = 負債 + 純資産
   - PL: 純利益 = 収益 - 費用
3. **使用中の勘定科目**: 削除不可

## MCPサーバーテスト仕様

### 必須ツール（5つ）

| ツール名 | 説明 |
|---------|------|
| `create_journal_entry` | 仕訳作成 |
| `get_account_balance` | 残高取得 |
| `list_accounts` | 勘定科目一覧 |
| `generate_balance_sheet` | 貸借対照表生成 |
| `generate_income_statement` | 損益計算書生成 |

### MCPプロトコル要件

- JSON-RPC 2.0 over stdio
- `tools/list` でツール一覧を取得可能
- 適切なエラーハンドリング

## E2Eテスト仕様

### テストシナリオ

1. **仕訳作成フロー**: UIから仕訳を作成
2. **バリデーション**: 貸借不一致時にエラー表示
3. **財務諸表閲覧**: 各レポートが正しく表示
4. **勘定科目管理**: 一覧表示、詳細表示
5. **レスポンシブデザイン**: モバイル・デスクトップ両対応

### API直接テスト

E2Eテスト内でも直接HTTPリクエストでAPIを検証します。

## 別技術スタックでの実装の場合

エージェントがPython/Go/Rustなどを選択した場合：

1. **APIテスト**: そのまま使用可能（HTTPリクエスト）
2. **MCPサーバーテスト**: 環境変数でパスを設定
3. **E2Eテスト**: そのまま使用可能（Playwrightは言語非依存）

必要に応じてテストの微調整を行ってください。

## テストデータの初期化

テスト実行前に以下の標準勘定科目が登録されている必要があります：

| コード | 名称 | タイプ |
|--------|------|--------|
| 100 | 現金 | asset |
| 400 | 売上 | revenue |
| 500 | 仕入 | expense |
| ... | （詳細は要件定義を参照） | ... |
