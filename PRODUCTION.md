# 本番環境デプロイガイド

このドキュメントでは、Bedrock Video Analyzerの本番環境へのデプロイ手順を説明します。

## 前提条件

### 必要なツール
- Node.js 18.x以上
- AWS CLI v2
- AWS CDK v2
- 適切なAWS権限を持つIAMユーザー/ロール

### AWS権限
以下のサービスに対する権限が必要です：
- Amazon S3
- Amazon DynamoDB
- AWS Lambda
- Amazon API Gateway
- Amazon CloudWatch
- Amazon SNS
- AWS WAF v2
- Amazon Bedrock
- AWS IAM（ロール作成用）

## 環境設定

### 1. 環境変数の設定

`.env.prod.example`をコピーして`.env.prod`を作成し、適切な値を設定してください：

```bash
cp .env.prod.example .env.prod
```

必須設定項目：
- `PROD_ALERT_EMAIL`: アラート通知用メールアドレス
- `PROD_BUDGET_LIMIT`: 日次予算制限（USD）

オプション設定項目：
- `PROD_DOMAIN_NAME`: カスタムドメイン名
- `PROD_CERTIFICATE_ARN`: SSL証明書ARN
- `PROD_HOSTED_ZONE_ID`: Route 53ホストゾーンID

### 2. AWS認証情報の設定

```bash
aws configure --profile production
```

または環境変数で設定：
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=ap-northeast-1
```

## デプロイ手順

### 1. 依存関係のインストール

```bash
# ルートディレクトリ
npm install

# Lambda関数
cd lambda
npm install
cd ..
```

### 2. 本番環境デプロイ

```bash
# 環境変数を読み込み
source .env.prod

# デプロイスクリプトを実行
./scripts/deploy-prod.sh [profile] [region]
```

例：
```bash
./scripts/deploy-prod.sh production ap-northeast-1
```

### 3. デプロイ後の確認

デプロイが完了すると、以下の情報が出力されます：
- API Gateway URL
- CloudWatch Dashboard URL
- S3バケット名
- DynamoDBテーブル名
- SNSトピックARN

## 本番環境の特徴

### セキュリティ
- **WAF v2**: レート制限、共通攻撃パターンの防御
- **KMS暗号化**: S3とDynamoDBの暗号化
- **IAM最小権限**: 必要最小限の権限のみ付与
- **VPC**: Lambda関数のVPC配置（オプション）

### 可用性・信頼性
- **削除保護**: S3バケットとDynamoDBテーブル
- **バックアップ**: DynamoDB自動バックアップ
- **バージョニング**: S3オブジェクトバージョニング
- **Point-in-Time Recovery**: DynamoDB PITR

### 監視・アラート
- **CloudWatch Dashboard**: システム全体の監視
- **CloudWatch Alarms**: 異常検知とアラート
- **SNS通知**: メールアラート
- **詳細ログ**: 1年間保持

### パフォーマンス
- **API Gateway キャッシュ**: レスポンス高速化
- **Lambda予約同時実行数**: 安定したパフォーマンス
- **DynamoDB On-Demand**: 自動スケーリング
- **S3 Intelligent Tiering**: コスト最適化

### コスト管理
- **日次予算監視**: 設定した予算の監視
- **ライフサイクルポリシー**: 古いファイルの自動削除
- **リソース最適化**: 使用量に応じた自動調整

## 運用管理

### 監視

#### CloudWatch Dashboard
```
https://ap-northeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#dashboards:
```

主要メトリクス：
- API レスポンス時間・エラー率
- Lambda 実行時間・エラー率
- DynamoDB 読み書き容量・スロットリング
- S3 ストレージ使用量
- 日次コスト

#### アラート設定
以下の条件でアラートが発生します：
- API エラー率 > 5%
- Lambda エラー率 > 5%
- DynamoDB スロットリング発生
- 日次コスト > 予算の80%

### ログ管理

#### CloudWatch Logs
- 保持期間: 1年
- ログレベル: INFO以上
- 構造化ログ: JSON形式

#### ログ確認方法
```bash
# API Gateway ログ
aws logs describe-log-groups --log-group-name-prefix "/aws/apigateway/VideoAnalyzer"

# Lambda ログ
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/VideoAnalyzer"
```

### バックアップ・復旧

#### DynamoDB
- 自動バックアップ: 有効
- Point-in-Time Recovery: 有効
- 保持期間: 35日

#### S3
- バージョニング: 有効
- Cross-Region Replication: 設定可能
- MFA Delete: 設定可能

### スケーリング

#### 自動スケーリング
- DynamoDB: On-Demand（自動）
- Lambda: 予約同時実行数設定済み
- API Gateway: 自動

#### 手動スケーリング
必要に応じて以下を調整：
- Lambda メモリサイズ・タイムアウト
- Lambda 予約同時実行数
- API Gateway スロットリング設定

## トラブルシューティング

### よくある問題

#### 1. デプロイエラー
```bash
# CDK Bootstrap確認
npx cdk bootstrap --profile production

# 権限確認
aws sts get-caller-identity --profile production
```

#### 2. Lambda関数エラー
```bash
# ログ確認
aws logs tail /aws/lambda/VideoAnalyzer-UploadProdHandler --follow

# 環境変数確認
aws lambda get-function-configuration --function-name VideoAnalyzer-UploadProdHandler
```

#### 3. API Gateway エラー
```bash
# API Gateway ログ確認
aws logs tail /aws/apigateway/VideoAnalyzer --follow

# WAF ブロック確認
aws wafv2 get-sampled-requests --web-acl-arn <WebACL-ARN> --rule-metric-name RateLimitRule
```

#### 4. DynamoDB エラー
```bash
# テーブル状態確認
aws dynamodb describe-table --table-name VideoAnalysis-Prod-VideoAnalyzerProdStack

# スロットリング確認
aws cloudwatch get-metric-statistics --namespace AWS/DynamoDB --metric-name ThrottledRequests
```

### 緊急時対応

#### サービス停止
```bash
# API Gateway無効化
aws apigateway update-stage --rest-api-id <API-ID> --stage-name prod --patch-ops op=replace,path=/throttle/rateLimit,value=0

# Lambda関数無効化
aws lambda put-function-concurrency --function-name <FUNCTION-NAME> --reserved-concurrent-executions 0
```

#### ロールバック
```bash
# 前のバージョンにロールバック
npx cdk deploy VideoAnalyzerProdStack --profile production --rollback
```

## セキュリティ

### 定期的なセキュリティチェック

#### 1. IAM権限監査
```bash
# 使用されていない権限の確認
aws iam generate-service-last-accessed-details --arn <ROLE-ARN>
```

#### 2. WAF ログ分析
```bash
# ブロックされたリクエストの確認
aws wafv2 get-sampled-requests --web-acl-arn <WebACL-ARN>
```

#### 3. VPC Flow Logs（VPC使用時）
```bash
# 異常なトラフィックの確認
aws ec2 describe-flow-logs
```

### セキュリティベストプラクティス

1. **定期的なパスワード・キーローテーション**
2. **最小権限の原則の適用**
3. **セキュリティパッチの適用**
4. **監査ログの定期確認**
5. **侵入検知システムの導入**

## コスト最適化

### コスト監視

#### 日次コストレポート
- CloudWatch メトリクス: `VideoAnalyzer/Cost/TotalDailyCost`
- アラート: 予算の80%・95%で通知

#### 月次コスト分析
```bash
# Cost Explorer API使用
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY
```

### コスト削減施策

1. **S3 Intelligent Tiering**: 自動的に最適なストレージクラスに移行
2. **Lambda 最適化**: メモリサイズとタイムアウトの調整
3. **DynamoDB On-Demand**: 使用量に応じた課金
4. **CloudWatch ログ保持期間**: 必要に応じて短縮
5. **未使用リソースの削除**: 定期的なクリーンアップ

## 削除手順

⚠️ **警告**: 本番環境の削除は慎重に行ってください。

### 1. データバックアップ
```bash
# DynamoDB バックアップ
aws dynamodb create-backup --table-name VideoAnalysis-Prod-VideoAnalyzerProdStack --backup-name final-backup

# S3 データ確認
aws s3 ls s3://video-analyzer-prod-<account>-<region>/ --recursive
```

### 2. 削除実行
```bash
./scripts/destroy-prod.sh [profile] [region]
```

### 3. 手動削除が必要なリソース
- 削除保護が有効なS3バケット
- 削除保護が有効なDynamoDBテーブル
- Route 53 レコード（カスタムドメイン使用時）
- CloudWatch ログ（保持期間経過後）

## サポート

### ドキュメント
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [TwelveLabs Pegasus Documentation](https://docs.twelvelabs.io/)

### 問い合わせ
技術的な問題や質問については、開発チームまでお問い合わせください。

### 緊急連絡先
- 本番環境障害: [緊急連絡先]
- セキュリティインシデント: [セキュリティチーム連絡先]