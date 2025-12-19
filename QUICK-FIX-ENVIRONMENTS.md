# 🚀 緊急修正: GitHub Environments設定

## 問題
GitHub Actionsが「Environment not found」エラーで失敗している

## 解決手順（5分で完了）

### ステップ1: GitHubリポジトリにアクセス
1. https://github.com/ryosuke1978/bedrock-video-analyzer
2. 「Settings」タブをクリック

### ステップ2: Environmentsを作成
1. 左サイドバーの「Environments」をクリック
2. 「New environment」をクリック

### ステップ3: dev環境を作成
1. Name: `dev` と入力
2. 「Configure environment」をクリック
3. 何も設定せずに「Save protection rules」をクリック

### ステップ4: staging環境を作成
1. 「New environment」をクリック
2. Name: `staging` と入力
3. 「Configure environment」をクリック
4. 「Save protection rules」をクリック

### ステップ5: prod環境を作成
1. 「New environment」をクリック
2. Name: `prod` と入力
3. 「Configure environment」をクリック
4. **重要**: 「Required reviewers」にチェックを入れる
5. 自分のユーザー名を選択
6. 「Save protection rules」をクリック

## 設定完了後
1. GitHub Actions → 失敗したワークフローを選択
2. 「Re-run all jobs」をクリック
3. ワークフローが正常実行されることを確認

## 確認方法
Settings → Environments で以下が表示されることを確認：
- ✅ dev
- ✅ staging  
- ✅ prod