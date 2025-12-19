# GitHub Secrets設定手頁E

## 🔐 AWS認証惁E��の設宁E

### 1. Secretsペ�Eジにアクセス
1. GitHubリポジトリペ�Eジを開ぁE
2. 「Settings」タブをクリチE��
3. 左サイドバーの「Secrets and variables」�E「Actions」をクリチE��

### 2. Repository Secretsを追加
「New repository secret」をクリチE��して以下を頁E��追加�E�E

#### Secret 1: AWS Access Key ID
- **Name**: `AWS_ACCESS_KEY_ID`
- **Secret**: `YOUR_AWS_ACCESS_KEY_ID`
- 「Add secret」をクリチE��

#### Secret 2: AWS Secret Access Key
- **Name**: `AWS_SECRET_ACCESS_KEY`
- **Secret**: `YOUR_AWS_SECRET_ACCESS_KEY`
- 「Add secret」をクリチE��

### 3. 設定完亁E�E確誁E
- Secrets一覧に以下が表示されることを確認！E
  - ✁E`AWS_ACCESS_KEY_ID`
  - ✁E`AWS_SECRET_ACCESS_KEY`

## 🌍 環墁E��宁E

### 1. 環墁E�Eージにアクセス
1. リポジトリの「Settings」タブを開く
2. 左サイドバーの「Environments」をクリチE��

### 2. 環墁E��作�E
「New environment」をクリチE��して以下を頁E��作�E�E�E

#### 開発環墁E
- **Name**: `dev`
- **Protection rules**: なし（開発環墁E�Eため�E�E
- 「Configure environment」をクリチE��

#### スチE�Eジング環墁E
- **Name**: `staging`
- **Protection rules**: 
  - ☑︁ERequired reviewers (推奨)
  - Reviewers: 自刁E�Eアカウントを追加
- 「Configure environment」をクリチE��

#### 本番環墁E
- **Name**: `prod`
- **Protection rules**: 
  - ☑︁ERequired reviewers (忁E��E
  - ☑︁EWait timer: 5 minutes (推奨)
  - Reviewers: 自刁E�Eアカウントを追加
- 「Configure environment」をクリチE��

### 3. 設定完亁E�E確誁E
- Environments一覧に以下が表示されることを確認！E
  - ✁E`dev`
  - ✁E`staging`
  - ✁E`prod`

## ✁E設定完亁E��ェチE��リスチE

- [ ] GitHubリポジトリを作�E
- [ ] ローカルからGitHubにプッシュ
- [ ] AWS_ACCESS_KEY_ID Secretを追加
- [ ] AWS_SECRET_ACCESS_KEY Secretを追加
- [ ] dev環墁E��作�E
- [ ] staging環墁E��作�E
- [ ] prod環墁E��作�E

すべて完亁E��たら、CI/CDパイプラインのチE��トに進みます�
