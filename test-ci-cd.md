# CI/CDパイプラインテスト手順

## 🚀 自動デプロイテスト

### 開発環境デプロイテスト

```bash
# 開発ブランチを作成
git checkout -b develop

# 小さな変更を加える（テスト用）
echo "# CI/CDテスト" >> TEST-DEPLOY.md
git add TEST-DEPLOY.md
git commit -m "test: CI/CDパイプラインテスト"

# GitHubにプッシュ（自動的にdev環境にデプロイされる）
git push -u origin develop
```

### 本番環境デプロイテスト

```bash
# clean-mainブランチに戻る
git checkout clean-main

# developブランチをマージ
git merge develop

# 本番環境にプッシュ（自動的にprod環境にデプロイされる）
git push origin clean-main
```

## 📊 デプロイ結果の確認

### GitHub Actionsでの確認
1. GitHubリポジトリの「Actions」タブを開く
2. 実行中/完了したワークフローを確認
3. ログを確認してエラーがないかチェック

### AWS環境での確認
デプロイ完了後、以下のリソースが作成されることを確認：

#### CloudFormationスタック
```bash
aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev
```

#### API Gatewayエンドポイント
```bash
# Limitsエンドポイントのテスト
curl https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev/limits

# Uploadエンドポイントのテスト
curl -X POST https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/dev/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","fileSize":1000000}'
```

#### S3バケット
```bash
aws s3 ls | grep bedrock-video-analyzer-dev
```

#### DynamoDBテーブル
```bash
aws dynamodb list-tables | grep VideoAnalysis-dev
```

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. AWS認証エラー
```
Error: The security token included in the request is invalid
```
**解決方法**: GitHub Secretsの値を確認し、正しいAWS認証情報が設定されているかチェック

#### 2. CloudFormation権限エラー
```
Error: User is not authorized to perform: cloudformation:CreateStack
```
**解決方法**: IAMユーザーにCloudFormation権限が付与されているか確認

#### 3. Lambda関数デプロイエラー
```
Error: The role defined for the function cannot be assumed by Lambda
```
**解決方法**: IAMロールの信頼関係が正しく設定されているか確認

#### 4. API Gateway CORS エラー
```
Error: CORS policy: No 'Access-Control-Allow-Origin' header
```
**解決方法**: CloudFormationテンプレートのCORS設定を確認

## 📈 成功指標

以下が確認できればCI/CDパイプラインは正常に動作しています：

- ✅ GitHub Actionsワークフローが正常完了
- ✅ CloudFormationスタックが作成/更新される
- ✅ Lambda関数が正常にデプロイされる
- ✅ API Gatewayエンドポイントが応答する
- ✅ S3バケットとDynamoDBテーブルが作成される

## 🎯 次のステップ

CI/CDパイプラインが正常に動作することを確認したら：

1. **フロントエンド開発**: 動画アップロード機能の実装
2. **Lambda関数拡張**: Bedrock統合とビデオ解析機能
3. **モニタリング設定**: CloudWatch Logs/Metricsの設定
4. **セキュリティ強化**: WAF、VPC、暗号化の設定