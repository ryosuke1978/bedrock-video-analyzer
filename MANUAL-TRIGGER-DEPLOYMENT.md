# 手動デプロイメント実行ガイド

## GitHub Actionsの手動実行

### 1. GitHubリポジトリにアクセス
https://github.com/ryosuke1978/bedrock-video-analyzer

### 2. Actionsタブをクリック
- リポジトリのトップページで「Actions」タブをクリック

### 3. ワークフローを選択
- 「Deploy Bedrock Video Analyzer」ワークフローを選択

### 4. 手動実行
- 「Run workflow」ボタンをクリック
- 環境を選択（通常は「dev」）
- 「Run workflow」を再度クリックして実行開始

## 実行される処理

### Phase 1: インフラストラクチャ
1. CloudFormationテンプレートの検証
2. スタックのデプロイ（作成または更新）
3. S3バケット、DynamoDB、Lambda関数、API Gatewayの作成

### Phase 2: Lambda関数コード
1. Lambda関数のパッケージ化
2. 各関数のZIPファイル作成
3. AWS Lambda関数コードの更新

### Phase 3: テスト
1. API Gatewayエンドポイントのテスト
2. 基本的な機能確認

## 実行結果の確認

### 成功時
- ✅ すべてのステップが緑色で完了
- API Gateway URLが出力される
- Lambda関数が最新コードで更新される

### 失敗時
- ❌ 失敗したステップが赤色で表示
- エラーログを確認して問題を特定
- 必要に応じて修正後に再実行

## ローカルでの確認方法

### Lambda関数の状態確認
```bash
# 関数一覧を取得
aws lambda list-functions --region ap-northeast-1 --query "Functions[?contains(FunctionName, 'bedrock-video-analyzer')]"

# 特定の関数の詳細を確認
aws lambda get-function --function-name bedrock-video-analyzer-upload-dev --region ap-northeast-1
```

### API Gatewayのテスト
```bash
# Limits APIのテスト
curl https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev/limits

# Upload APIのテスト
curl -X POST https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","fileSize":1000000}'
```

## トラブルシューティング

### よくある問題

#### 1. IAM権限エラー
- IAMロールが正しく作成されているか確認
- 必要な権限が付与されているか確認

#### 2. Lambda関数が更新されない
- パッケージ化が正常に完了しているか確認
- 関数名が正しいか確認

#### 3. API Gatewayエラー
- デプロイメントが完了しているか確認
- CORS設定が正しいか確認

### ログの確認方法
1. GitHub Actionsのログを確認
2. AWS CloudWatchログを確認
3. Lambda関数の実行ログを確認

## 緊急時の対応

### ロールバック
```bash
# 前のバージョンに戻す
aws lambda update-function-code \
  --function-name bedrock-video-analyzer-upload-dev \
  --zip-file fileb://previous-version.zip
```

### スタックの削除と再作成
```bash
# スタックを削除
aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev

# 削除完了を待機
aws cloudformation wait stack-delete-complete --stack-name bedrock-video-analyzer-dev

# 再作成（GitHub Actionsで実行）
```