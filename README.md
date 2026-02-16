# AI Coding Agent Benchmark - Accounting Software

コーディングエージェントの性能を評価するためのベンチマーク課題です。会計ソフトウェアの実装を通じて、エージェントの**要件理解能力**、**実装能力**、**テスト品質**を評価します。

## 評価基準

エージェントは以下の3種類のテストすべてに合格する必要があります：

| テスト種類 | 説明 |
|-----------|------|
| **APIテスト** | REST APIの機能とエラーハンドリングを検証 |
| **MCPサーバーテスト** | Model Context Protocol準拠のサーバー機能を検証 |
| **E2Eテスト** | Web UIからのユーザー操作を検証 |

## ソフトウェア概要

### 対象機能：会計ソフトウェア

複式簿記に基づく会計ソフトウェアを実装します。

#### 主な機能

1. **勘定科目マスター管理** - 標準勘定科目のプリセット、追加・編集・削除
2. **仕訳管理** - 複式簿記に基づく仕訳入力、一覧、検索、編集、削除
3. **財務諸表** - 貸借対照表（BS）、損益計算書（PL）、試算表
4. **期間管理** - 会計年度の設定、期間の締め処理
5. **残高管理** - 各勘定科目の残高照会、T字勘定の表示

### 技術スタック（自由選択）

エージェントは**任意の技術スタック**を選択できます。

| カテゴリ | 選択肢（例） |
|---------|------------|
| 言語 | TypeScript, Python, Go, Rust, Java |
| APIテスト | Vitest, Jest, Pytest, go test |
| E2Eテスト | Playwright, Cypress, Selenium |
| MCPサーバー | @modelcontextprotocol/sdk, 自前実装 |
| データベース | SQLite, PostgreSQL, MySQL |
| フレームワーク | Express, FastAPI, Gin, Actix |

**要件**：Docker環境で動作すること

## プロジェクト構成

```
AI_benchmark/
├── README.md                          # プロジェクト概要（このファイル）
├── Makefile                           # テスト実行コマンド
├── Dockerfile                         # テスト環境用Dockerイメージ
├── docker-compose.yml                 # Dockerサービス定義
│
├── requirements/                      # 要件定義
│   ├── index.md                       # 要件概要
│   ├── 01-functional-requirements.md  # 機能要件
│   ├── 02-api-specification.md        # REST API仕様
│   ├── 03-mcp-server-specification.md # MCPサーバー仕様
│   ├── 04-data-model.md               # データモデル
│   └── 05-test-scenarios.md           # テストシナリオ
│
├── benchmark/                         # ベンチマーク関連
│   ├── template.md                    # 結果報告テンプレート
│   └── scoring-rubric.md              # 採点基準
│
├── tests/                             # テストコード（仕様）
│   ├── api/                           # APIテスト仕様
│   ├── mcp/                           # MCPサーバーテスト仕様
│   └── e2e/                           # E2Eテスト仕様
│
└── src/                               # エージェントが実装する領域（自由）
```

## Docker環境でのテスト実行

```bash
# Dockerイメージのビルド
make build

# コンテナの起動
make up

# APIテスト
make test-api

# MCPサーバーテスト
make test-mcp

# E2Eテスト
make test-e2e

# すべてのテスト
make test-all

# コンテナの停止・削除
make down
```

### Makefileコマンド一覧

| コマンド | 説明 |
|---------|------|
| `make build` | Dockerイメージをビルド |
| `make up` | コンテナを起動 |
| `make down` | コンテナを停止・削除 |
| `make test-api` | APIテスト実行 |
| `make test-mcp` | MCPサーバーテスト実行 |
| `make test-e2e` | E2Eテスト実行 |
| `make test-all` | すべてのテスト実行 |
| `make logs` | コンテナログ表示 |
| `make shell` | コンテナ内でシェル起動 |

## エージェントへのタスク

`requirements/` ディレクトリの要件定義を読み、以下の実装を行ってください：

1. REST APIの実装
2. MCPサーバーの実装
3. Web UIの実装（E2Eテスト用）
4. データベーススキーマの実装

実装完了後、`make test-all` ですべてのテストが通過することを確認してください。

## 要件定義ドキュメント

詳細な要件は以下のドキュメントを参照してください：

- [要件概要](requirements/index.md)
- [機能要件](requirements/01-functional-requirements.md)
- [API仕様](requirements/02-api-specification.md)
- [MCPサーバー仕様](requirements/03-mcp-server-specification.md)
- [データモデル](requirements/04-data-model.md)
- [テストシナリオ](requirements/05-test-scenarios.md)

## ベンチマーク結果

実装完了後、[ベンチマークテンプレート](benchmark/template.md)を使用して結果を記録してください。

採点基準は[こちら](benchmark/scoring-rubric.md)を参照してください。

## ライセンス

MIT License
