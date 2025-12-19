# 開発環境セットアップガイド

## 前提条件

- Node.js 18.x以上
- AWS CLI設定済み
- AWS CDK CLI (`npm install -g aws-cdk`)
- 適切なAWS権限（S3、DynamoDB、Lambda、API Gateway、Bedrock）

## セットアップ手順

### 1. 依存関係のインストール

```bash
# ルートディレクトリの依存関係
npm install

# Lambda関数の依存関係
cd lambda
npm install
cd ..
```

### 2. プロジェクトのビルド

```bash
# Lambda関数のビルド
cd lambda
npm run build
cd ..

# CDKプロジェクトのビルド
npm run build
```

### 3. CDKブートストラップ（初回のみ）

```bash
npm run bootstrap
```

### 4. 開発環境のデプロイ

```bash
npm run deploy
```

## 開発コマンド

### ビルドとウォッチ

```bash
# CDKプロジェクトのウォッチモード
npm run watch

# Lambda関数のウォッチモード
cd lambda && npm run watch
```

### テスト

```bash
# CDKスタックのテスト
npm test

# Lambda関数のテスト（将来実装）
cd lambda && npm test
```

### CDK操作

```bash
# CloudFormationテンプレート生成
npm run synth

# 差分確認
npm run cdk diff

# デプロイ
npm run deploy

# スタック削除
npm run destroy
```

## フロントエンド開発

1. デプロイ完了後、出力されたAPI Gateway URLを確認
2. `frontend/app.js`の`apiBaseUrl`を実際のURLに更新
3. `frontend/index.html`をブラウザで開いて動作確認

## 環境変数

以下の環境変数を設定することで動作をカスタマイズできます：

- `CDK_DEFAULT_ACCOUNT`: AWSアカウントID
- `CDK_DEFAULT_REGION`: デプロイ先リージョン（デフォルト: ap-northeast-1）
- `DEPLOY_PROD`: 本番環境スタックのデプロイ（true/false）

## トラブルシューティング

### CDKデプロイエラー

1. AWS認証情報が正しく設定されているか確認
2. 必要なAWS権限があるか確認
3. リージョンでBedrockサービスが利用可能か確認

### Lambda関数エラー

1. CloudWatch Logsでエラーログを確認
2. 環境変数が正しく設定されているか確認
3. IAMロールの権限を確認

### フロントエンドエラー

1. ブラウザの開発者ツールでネットワークエラーを確認
2. API Gateway URLが正しく設定されているか確認
3. CORSエラーの場合、API Gatewayの設定を確認

## ファイル構造

```
bedrock-video-analyzer/
├── bin/                    # CDKアプリケーションエントリーポイント
├── lib/                    # CDKスタック定義
├── lambda/                 # Lambda関数ソースコード
│   ├── src/               # TypeScriptソース
│   └── dist/              # ビルド済みJavaScript
├── frontend/              # フロントエンドファイル
├── test/                  # テストファイル
├── cdk.json              # CDK設定
├── package.json          # プロジェクト設定
└── tsconfig.json         # TypeScript設定
```

## 次のステップ

1. 実際のBedrock Pegasus 1.2 APIの実装
2. エラーハンドリングの強化
3. セキュリティ設定の追加
4. 監視・ログ設定の追加
5. CI/CDパイプラインの構築