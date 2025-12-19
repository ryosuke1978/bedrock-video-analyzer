# 手動デプロイ手順

PowerShellの出力に問題があるため、手動でCloudFormationスタックをデプロイします。

## 方法1: AWSコンソールを使用

### 1. AWSマネジメントコンソールにログイン
- URL: https://console.aws.amazon.com/
- アクセスキー: YOUR_AWS_ACCESS_KEY_ID
- シークレットキー: YOUR_AWS_SECRET_ACCESS_KEY
- リージョン: ap-northeast-1 (東京)

### 2. CloudFormationサービスに移動
1. AWSコンソールで「CloudFormation」を検索
2. CloudFormationサービスを開く

### 3. スタックを作成
1. 「スタックの作成」→「新しいリソースを使用（標準）」をクリック
2. テンプレートの準備: 「テンプレートの準備完了」を選択
3. テンプレートの指定: 「テンプレートファイルのアップロード」を選択
4. 「ファイルの選択」で `fixed-cloudformation.yaml` をアップロード
5. 「次へ」をクリック

### 4. スタックの詳細を指定
- **スタック名**: `bedrock-video-analyzer-dev`
- **Environment**: `dev`（デフォルト値）
- 「次へ」をクリック

### 5. スタックオプションの設定
- デフォルト設定のまま「次へ」をクリック

### 6. 確認とデプロイ
1. 設定内容を確認
2. 「AWS CloudFormation によって IAM リソースが作成される場合があることを承認します」にチェック
3. 「スタックの作成」をクリック

### 7. デプロイ完了の確認
- スタックの状態が「CREATE_COMPLETE」になるまで待機（約5-10分）
- 「出力」タブでAPI Gateway URLを確認

## 方法2: AWS CLI（環境変数設定後）

PowerShellが正常に動作する場合は以下のコマンドを実行：

```powershell
# 環境変数設定
$env:AWS_ACCESS_KEY_ID = "YOUR_AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "ap-northeast-1"

# スタック作成
aws cloudformation create-stack `
    --stack-name bedrock-video-analyzer-dev `
    --template-body file://fixed-cloudformation.yaml `
    --capabilities CAPABILITY_NAMED_IAM `
    --parameters ParameterKey=Environment,ParameterValue=dev

# 作成完了を待機
aws cloudformation wait stack-create-complete --stack-name bedrock-video-analyzer-dev

# API Gateway URL取得
aws cloudformation describe-stacks `
    --stack-name bedrock-video-analyzer-dev `
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' `
    --output text
```

## デプロイ後の確認

### 作成されるリソース
1. **S3バケット**: `bedrock-video-analyzer-dev-252689085095`
2. **DynamoDBテーブル**: 
   - `VideoAnalysis-dev`
   - `QueryHistory-dev`
3. **Lambda関数**:
   - `bedrock-video-analyzer-upload-dev`
   - `bedrock-video-analyzer-limits-dev`
4. **API Gateway**: `bedrock-video-analyzer-api-dev`
5. **IAMロール**: `BedrockVideoAnalyzer-Lambda-dev-252689085095`

### APIテスト
デプロイ完了後、以下のエンドポイントをテスト：

```bash
# Limits API
curl https://[API-GATEWAY-URL]/dev/limits

# Upload API（POST）
curl -X POST https://[API-GATEWAY-URL]/dev/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","fileSize":1000000}'
```

## トラブルシューティング

### よくあるエラー
1. **IAMロール名の重複**: 既存のスタックを削除してから再作成
2. **S3バケット名の重複**: バケット名にタイムスタンプを追加
3. **権限不足**: IAM権限を確認

### エラー確認方法
1. CloudFormationコンソールの「イベント」タブを確認
2. 失敗したリソースの詳細を確認
3. 必要に応じてスタックを削除して再作成

## 次のステップ
1. ✅ CloudFormationスタック作成
2. ⏳ API Gateway URLの取得
3. ⏳ APIエンドポイントのテスト
4. ⏳ フロントエンドの設定
5. ⏳ Lambda関数の実装コード更新