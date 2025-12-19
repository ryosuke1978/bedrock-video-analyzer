# デプロイ成功確認手順

## 🎯 デプロイ完了後の確認項目

### 1. CloudFormationスタックの確認

```bash
# スタックの状態確認
aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev

# スタックの出力値確認
aws cloudformation describe-stacks \
  --stack-name bedrock-video-analyzer-dev \
  --query "Stacks[0].Outputs"
```

### 2. API Gateway URLの取得

```bash
# API Gateway URLを取得
API_URL=$(aws cloudformation describe-stacks \
  --stack-name bedrock-video-analyzer-dev \
  --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
  --output text)

echo "API Gateway URL: $API_URL"
```

### 3. API エンドポイントのテスト

```bash
# Limits APIのテスト
curl -v "$API_URL/limits"

# Upload APIのテスト
curl -v -X POST "$API_URL/upload" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","fileSize":1000000}'
```

### 4. 作成されたリソースの確認

#### S3バケット
```bash
# S3バケットの確認
aws s3 ls | grep bedrock-video-analyzer-dev
```

#### DynamoDBテーブル
```bash
# DynamoDBテーブルの確認
aws dynamodb list-tables | grep VideoAnalysis-dev
aws dynamodb list-tables | grep QueryHistory-dev
```

#### Lambda関数
```bash
# Lambda関数の確認
aws lambda list-functions | grep bedrock-video-analyzer
```

## ✅ 成功の指標

以下が確認できればデプロイ成功です：

1. **CloudFormationスタック**: `CREATE_COMPLETE` 状態
2. **API Gateway**: 200レスポンスを返す
3. **S3バケット**: 作成済み
4. **DynamoDBテーブル**: 2つのテーブルが作成済み
5. **Lambda関数**: 2つの関数が作成済み

## 🚨 トラブルシューティング

### API Gatewayが404を返す場合
- デプロイメントが正しく作成されているか確認
- ステージ名が正しいか確認

### Lambda関数が実行されない場合
- IAMロールの権限を確認
- Lambda関数のログをCloudWatchで確認

### CORS エラーが発生する場合
- API GatewayのCORS設定を確認
- OPTIONSメソッドが正しく設定されているか確認

## 🎉 次のステップ

デプロイが成功したら：

1. **フロントエンド開発**: HTML/JavaScriptでUIを作成
2. **Bedrock統合**: 実際の動画解析機能を実装
3. **テスト環境**: 開発用のテストデータを準備
4. **監視設定**: CloudWatch Logs/Metricsの設定