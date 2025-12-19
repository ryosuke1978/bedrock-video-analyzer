# 環境変数設定ガイド

このガイドでは、Video Analyzerプロジェクトの環境変数設定とデプロイ方法について説明します。

## 🔐 セキュリティ重要事項

- **絶対にAWSアクセスキーをGitにコミットしないでください**
- `.env*` ファイルは `.gitignore` に含まれており、Gitで追跡されません
- 本番環境では IAM ロールの使用を強く推奨します

## 📁 ファイル構成

```
bedrock-video-analyzer/
├── .env.example          # 全環境共通のテンプレート
├── .env.dev.example      # 開発環境用テンプレート
├── .env.dev              # 開発環境用設定（作成が必要）
├── .env.staging          # ステージング環境用設定（作成が必要）
├── .env.prod             # 本番環境用設定（作成が必要）
├── .env.no-iam           # IAM作成権限不要版設定（作成が必要）
└── scripts/
    ├── load-env.js       # 環境変数読み込みスクリプト
    ├── deploy-with-env.sh # Linux/Mac用デプロイスクリプト
    └── deploy-with-env.ps1 # Windows用デプロイスクリプト
```

## 🚀 セットアップ手順

### ステップ1: 依存関係のインストール

```bash
npm install
```

### ステップ2: 環境設定ファイルの作成

#### 開発環境用

```bash
# テンプレートをコピー
cp .env.dev.example .env.dev

# エディタで編集
code .env.dev  # VS Code
# または
notepad .env.dev  # Windows
```

#### 本番環境用

```bash
# テンプレートをコピー
cp .env.example .env.prod

# エディタで編集
code .env.prod
```

#### IAM作成権限不要版

```bash
# テンプレートをコピー
cp .env.example .env.no-iam

# エディタで編集
code .env.no-iam
```

### ステップ3: AWS認証情報の設定

各 `.env` ファイルで以下を設定：

```bash
# AWS認証情報
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=ap-northeast-1

# CDK設定
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=ap-northeast-1
```

## 🌍 環境別デプロイ

### Windows (PowerShell)

```powershell
# 開発環境
.\scripts\deploy-with-env.ps1 development

# ステージング環境
.\scripts\deploy-with-env.ps1 staging

# 本番環境
.\scripts\deploy-with-env.ps1 production

# IAM作成権限不要版
.\scripts\deploy-with-env.ps1 no-iam

# オプション付きデプロイ
.\scripts\deploy-with-env.ps1 production -StackName "MyVideoAnalyzer" -SkipBuild
```

### Linux/Mac (Bash)

```bash
# 実行権限を付与
chmod +x scripts/deploy-with-env.sh

# 開発環境
./scripts/deploy-with-env.sh development

# ステージング環境
./scripts/deploy-with-env.sh staging

# 本番環境
./scripts/deploy-with-env.sh production

# IAM作成権限不要版
./scripts/deploy-with-env.sh no-iam

# オプション付きデプロイ
./scripts/deploy-with-env.sh production --stack-name "MyVideoAnalyzer" --skip-build
```

### NPMスクリプト経由

```bash
# 開発環境
npm run deploy:env:dev

# ステージング環境
npm run deploy:env:staging

# 本番環境
npm run deploy:env:prod

# IAM作成権限不要版
npm run deploy:env:no-iam
```

## 🔧 環境変数の詳細

### 必須設定

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `AWS_ACCESS_KEY_ID` | AWSアクセスキーID | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットアクセスキー | `...` |
| `CDK_DEFAULT_ACCOUNT` | AWSアカウントID | `123456789012` |
| `AWS_DEFAULT_REGION` | AWSリージョン | `ap-northeast-1` |

### デプロイ制御

| 変数名 | 説明 | 値 |
|--------|------|-----|
| `DEPLOY_PROD` | 本番環境デプロイフラグ | `true/false` |
| `DEPLOY_STAGING` | ステージング環境デプロイフラグ | `true/false` |
| `DEPLOY_NO_IAM` | IAM作成権限不要版フラグ | `true/false` |

### IAM作成権限不要版（`DEPLOY_NO_IAM=true`の場合）

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `LAMBDA_EXECUTION_ROLE_ARN` | 事前作成されたLambda実行ロールのARN | `arn:aws:iam::123456789012:role/VideoAnalyzerLambdaRole` |

### 本番環境設定（`DEPLOY_PROD=true`の場合）

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `PROD_DOMAIN_NAME` | 本番環境ドメイン名 | `video-analyzer.example.com` |
| `PROD_CERTIFICATE_ARN` | SSL証明書ARN | `arn:aws:acm:...` |
| `PROD_HOSTED_ZONE_ID` | Route53ホストゾーンID | `Z1234567890ABC` |
| `PROD_ALERT_EMAIL` | アラート通知メールアドレス | `admin@example.com` |
| `PROD_BUDGET_LIMIT` | 予算制限（USD） | `100` |

## 🛠️ 開発時のベストプラクティス

### 1. 環境の分離

```bash
# 開発環境で作業
./scripts/deploy-with-env.sh development

# 本番環境は慎重に
./scripts/deploy-with-env.sh production
```

### 2. 環境変数の確認

```bash
# 環境変数の読み込みテスト
npm run load-env development
```

### 3. ビルドのスキップ

```bash
# Lambda関数が変更されていない場合
./scripts/deploy-with-env.sh development --skip-build
```

## 🔍 トラブルシューティング

### エラー: "環境変数ファイルが見つかりません"

**原因**: `.env.dev` などのファイルが作成されていない

**解決策**:
```bash
cp .env.dev.example .env.dev
# ファイルを編集して適切な値を設定
```

### エラー: "AWS認証情報が設定されていません"

**原因**: `AWS_ACCESS_KEY_ID` または `AWS_SECRET_ACCESS_KEY` が未設定

**解決策**:
1. `.env` ファイルで認証情報を設定
2. AWS CLIで `aws configure` を実行
3. IAM ロールを使用する場合は適切に設定

### エラー: "LAMBDA_EXECUTION_ROLE_ARN が必要です"

**原因**: IAM作成権限不要版で必要なロールARNが未設定

**解決策**:
1. `IAM-SETUP.md` を参照してIAMロールを作成
2. `.env.no-iam` ファイルで `LAMBDA_EXECUTION_ROLE_ARN` を設定

### エラー: "CDKデプロイに失敗しました"

**原因**: 権限不足、リソース制限、設定ミスなど

**解決策**:
1. AWS認証情報と権限を確認
2. CDKのブートストラップを実行: `npx cdk bootstrap`
3. エラーメッセージを確認して対応

## 🔒 セキュリティのベストプラクティス

### 1. アクセスキーの管理

- **開発環境**: 個人用アクセスキーを使用
- **本番環境**: IAM ロールを使用（推奨）
- **定期的なローテーション**: アクセスキーを定期的に更新

### 2. 権限の最小化

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "dynamodb:*",
        "lambda:*",
        "apigateway:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

### 3. 環境の分離

- 開発、ステージング、本番で異なるAWSアカウントを使用
- 環境ごとに異なる認証情報を使用
- 本番環境へのアクセスを制限

## 📚 関連ドキュメント

- [IAM-SETUP.md](./IAM-SETUP.md) - IAM作成権限不要版の設定
- [PRODUCTION.md](./PRODUCTION.md) - 本番環境デプロイガイド
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)