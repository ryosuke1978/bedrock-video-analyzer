# Bedrock Video Analyzer

Amazon Bedrock TwelveLabs Pegasus 1.2を使用した動画解析デモWebアプリケーション

## 🚀 CI/CD Pipeline Status

![Deploy Status](https://github.com/your-username/bedrock-video-analyzer/workflows/Deploy%20Bedrock%20Video%20Analyzer/badge.svg)

## 📋 概要

このプロジェクトは、Amazon BedrockのTwelveLabs Pegasus 1.2モデルを使用して動画を解析し、質問応答機能を提供するWebアプリケーションです。

## 🏗️ アーキテクチャ

- **フロントエンド**: HTML5 + Vanilla JavaScript
- **バックエンド**: AWS Lambda (Node.js 18.x)
- **データベース**: Amazon DynamoDB
- **ストレージ**: Amazon S3
- **API**: Amazon API Gateway
- **AI/ML**: Amazon Bedrock (TwelveLabs Pegasus 1.2)

## 🛠️ 開発環境セットアップ

### 前提条件

- Node.js 18.x以上
- AWS CLI
- AWS CDK CLI
- Git

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/your-username/bedrock-video-analyzer.git
cd bedrock-video-analyzer

# 依存関係をインストール
npm install
cd lambda && npm install && cd ..

# 環境変数を設定
cp .env.example .env.dev
# .env.devファイルを編集してAWS認証情報を設定
```

### ローカル開発

```bash
# TypeScriptコンパイル
npm run build

# テスト実行
npm test

# CDKスタックをデプロイ
npm run deploy:dev
```

## 🚀 CI/CDパイプライン

### GitHub Actions

このプロジェクトはGitHub Actionsを使用した自動CI/CDパイプラインを提供します。

#### 自動デプロイ

- **main**ブランチ → 本番環境 (prod)
- **develop**ブランチ → 開発環境 (dev)
- **Pull Request** → 開発環境でテスト

#### 手動デプロイ

1. GitHubリポジトリの「Actions」タブを開く
2. 「Deploy Bedrock Video Analyzer」ワークフローを選択
3. 「Run workflow」をクリック
4. 環境を選択して実行

### 環境設定

GitHub Secretsに以下を設定してください：

```
AWS_ACCESS_KEY_ID: your-aws-access-key
AWS_SECRET_ACCESS_KEY: your-aws-secret-key
```

## 📁 プロジェクト構造

```
bedrock-video-analyzer/
├── .github/workflows/          # GitHub Actionsワークフロー
├── lambda/                     # Lambda関数ソースコード
│   ├── src/                   # TypeScriptソース
│   ├── dist/                  # コンパイル済みJavaScript
│   └── package.json           # Lambda依存関係
├── frontend/                   # フロントエンドファイル
├── lib/                       # CDKスタック定義
├── scripts/                   # デプロイスクリプト
├── fixed-cloudformation.yaml  # CloudFormationテンプレート
├── buildspec.yml              # CodeBuild設定
└── package.json               # プロジェクト設定
```

## 🧪 テスト

```bash
# 全テスト実行
npm run ci:test

# 単体テスト
npm test

# Lambda関数テスト
cd lambda && npm test

# CloudFormationテンプレート検証
npm run ci:validate
```

## 🌍 環境

### 開発環境 (dev)
- **API URL**: https://api-dev.example.com
- **S3 Bucket**: bedrock-video-analyzer-dev-{account-id}

### 本番環境 (prod)
- **API URL**: https://api.example.com
- **S3 Bucket**: bedrock-video-analyzer-prod-{account-id}

## 📚 API エンドポイント

### GET /limits
システムの制限値を取得

```bash
curl https://your-api-url/dev/limits
```

### POST /upload
動画アップロード用のプリサインドURLを取得

```bash
curl -X POST https://your-api-url/dev/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"video.mp4","fileSize":10000000}'
```

## 🔧 設定

### 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `AWS_REGION` | AWSリージョン | `ap-northeast-1` |
| `NODE_ENV` | 実行環境 | `development` |
| `MAX_FILE_SIZE_BYTES` | 最大ファイルサイズ | `104857600` (100MB) |

## 🚨 トラブルシューティング

### よくある問題

1. **デプロイエラー**
   ```bash
   # CloudFormationテンプレートを検証
   npm run ci:validate
   
   # ローカルでテスト
   npm run ci:test
   ```

2. **Lambda関数エラー**
   ```bash
   # ログを確認
   aws logs describe-log-streams --log-group-name /aws/lambda/bedrock-video-analyzer-upload-dev
   ```

3. **API Gateway エラー**
   ```bash
   # APIをテスト
   curl -v https://your-api-url/dev/limits
   ```

## 📖 ドキュメント

- [CI/CD設定ガイド](CI-CD-SETUP.md)
- [CloudFormationデプロイ手順](CLOUDFORMATION-DEPLOY.md)
- [開発ガイド](DEVELOPMENT.md)
- [本番環境設定](PRODUCTION.md)

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🆘 サポート

問題や質問がある場合は、GitHubのIssuesを作成してください。

---

**注意**: このプロジェクトはデモ目的で作成されています。本番環境で使用する場合は、適切なセキュリティ設定とモニタリングを実装してください。