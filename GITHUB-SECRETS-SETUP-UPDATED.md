# GitHub Secrets設定手順（最新版）

## 🔐 正しいGitHub Secrets設定方法

### ステップ1: リポジトリのSettingsにアクセス

1. **GitHubリポジトリを開く**
   - https://github.com/ryosuke1978/bedrock-video-analyzer

2. **デフォルトブランチを設定**
   - リポジトリページ上部の「Settings」タブをクリック
   - 左サイドバーの「General」を選択
   - 「Default branch」セクションで「clean-main」を選択
   - 「Update」をクリック

3. **Secrets and variablesを選択**
   - 左サイドバーの「Security」セクション
   - 「Secrets and variables」→「Actions」をクリック

### ステップ2: Repository Secretsを追加

**「Secrets」タブで「New repository secret」ボタンをクリックして以下を追加：**

#### AWS Access Key ID
- **Name**: `AWS_ACCESS_KEY_ID`
- **Secret**: （あなたのAWS Access Key IDを入力）
- 「Add secret」をクリック

#### AWS Secret Access Key
- **Name**: `AWS_SECRET_ACCESS_KEY`
- **Secret**: （あなたのAWS Secret Access Keyを入力）
- 「Add secret」をクリック

**⚠️ セキュリティ注意**: 
- AWS認証情報は絶対にコードやドキュメントに直接記載しないでください
- GitHub Secretsに保存された値は暗号化され、一度保存すると閲覧できません
- 必要に応じて`.env.dev`ファイルから値をコピーしてください

### ステップ3: 環境設定

1. **左サイドバーの「Environments」をクリック**

2. **以下の環境を作成：**

#### 開発環境
- **Name**: `dev`
- Protection rules: なし

#### ステージング環境
- **Name**: `staging`
- Protection rules: Required reviewers（オプション）

#### 本番環境
- **Name**: `prod`
- Protection rules: Required reviewers + Wait timer（推奨）

## ✅ 設定完了の確認

### Secretsの確認
- Repository secretsに以下が表示されることを確認：
  - ✅ `AWS_ACCESS_KEY_ID`
  - ✅ `AWS_SECRET_ACCESS_KEY`

### Environmentsの確認
- Environmentsに以下が表示されることを確認：
  - ✅ `dev`
  - ✅ `staging`
  - ✅ `prod`

## 🚀 CI/CDテストの準備完了

設定完了後、以下でCI/CDパイプラインをテストできます：

### 手動デプロイテスト
1. GitHubリポジトリの「Actions」タブを開く
2. 「Deploy Bedrock Video Analyzer」ワークフローを選択
3. 「Run workflow」をクリック
4. 環境を選択（dev/staging/prod）
5. 「Run workflow」をクリック

### 自動デプロイテスト
```bash
# 開発ブランチを作成してプッシュ
git checkout -b develop
git push -u origin develop

# メインブランチにマージして本番デプロイ
git checkout clean-main
git merge develop
git push origin clean-main
```

## 🔧 トラブルシューティング

### よくある問題

1. **Secretsが見つからない**
   - Repository secretsに正しく追加されているか確認
   - 名前が正確に一致しているか確認

2. **環境が見つからない**
   - Environmentsが正しく作成されているか確認
   - 環境名が正確に一致しているか確認

3. **権限エラー**
   - AWS認証情報が正しいか確認
   - IAM権限が適切に設定されているか確認

設定に問題がある場合は、エラーメッセージを確認して対応してください。