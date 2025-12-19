# GitHub Environments設定手順

## 🌍 Environmentsの作成

GitHub Actionsワークフローが正常に動作するには、以下の環境を作成する必要があります。

### 設定手順

1. **GitHubリポジトリにアクセス**
   - https://github.com/ryosuke1978/bedrock-video-analyzer

2. **Settingsタブをクリック**
   - リポジトリページ上部の「Settings」タブ

3. **Environmentsを選択**
   - 左サイドバーの「Environments」をクリック

4. **環境を作成**
   - 「New environment」ボタンをクリック

### 作成する環境

#### 1. 開発環境 (dev)
- **Name**: `dev`
- **Protection rules**: なし
- **Environment secrets**: なし（Repository secretsを使用）
- **用途**: 開発・テスト用の環境

**作成手順**:
1. 「New environment」をクリック
2. Name欄に「dev」と入力
3. 「Configure environment」をクリック
4. Protection rulesは設定せずに保存

#### 2. ステージング環境 (staging)
- **Name**: `staging`
- **Protection rules**: オプション
  - Required reviewers: 設定可能（推奨）
  - Wait timer: 設定可能
- **用途**: 本番前の最終確認環境

**作成手順**:
1. 「New environment」をクリック
2. Name欄に「staging」と入力
3. 「Configure environment」をクリック
4. 必要に応じてProtection rulesを設定
5. 保存

#### 3. 本番環境 (prod)
- **Name**: `prod`
- **Protection rules**: **必須**
  - ✅ Required reviewers: 1人以上設定（強く推奨）
  - ✅ Wait timer: 5-10分設定（オプション）
- **用途**: 本番環境

**作成手順**:
1. 「New environment」をクリック
2. Name欄に「prod」と入力
3. 「Configure environment」をクリック
4. **Required reviewers**を設定:
   - 「Required reviewers」にチェック
   - レビュアーを選択（自分自身でもOK）
5. オプション: **Wait timer**を設定（例: 5分）
6. 保存

## ✅ 設定完了の確認

Environmentsページで以下が表示されることを確認：
- ✅ dev
- ✅ staging
- ✅ prod

## 🚀 設定後の動作

### 自動デプロイ
- **developブランチ**へのプッシュ → **dev環境**に自動デプロイ
- **clean-mainブランチ**へのプッシュ → **prod環境**にデプロイ（レビュー承認が必要）

### 手動デプロイ
1. Actions → Deploy Bedrock Video Analyzer
2. Run workflow → 環境を選択 → Run workflow

## 🔧 トラブルシューティング

### エラー: "Environment not found"
**原因**: 環境が作成されていない
**解決**: 上記手順に従って環境を作成

### エラー: "Waiting for approval"
**原因**: prod環境でRequired reviewersが設定されている
**解決**: GitHubでデプロイを承認する

### エラー: "AWS credentials not found"
**原因**: Repository secretsが設定されていない
**解決**: Settings → Secrets and variables → Actions でAWS認証情報を設定
