# IAMロール事前作成手順

このドキュメントでは、IAM作成権限を持たないユーザーがVideo Analyzerをデプロイするために必要なIAMロールの事前作成手順を説明します。

## 概要

IAM管理者が事前にLambda実行ロールを作成し、そのARNをデプロイ時に指定することで、IAM作成権限なしでアプリケーションをデプロイできます。

## 必要な権限

### IAM管理者が実行する作業
- IAMロールの作成
- IAMポリシーのアタッチ

### デプロイユーザーが必要な権限
- Lambda関数の作成・更新
- S3バケットの作成・管理
- DynamoDB テーブルの作成・管理
- API Gatewayの作成・管理
- CloudWatch の作成・管理
- EventBridge の作成・管理
- SNS トピックの作成・管理

## 手順

### ステップ1: IAMポリシーの作成（IAM管理者が実行）

1. AWS Management Consoleにログイン
2. IAMサービスに移動
3. 左メニューから「ポリシー」を選択
4. 「ポリシーの作成」をクリック
5. 「JSON」タブを選択
6. `iam-policy-template.json` の内容を貼り付け
7. ポリシー名を入力: `VideoAnalyzerLambdaPolicy`
8. 「ポリシーの作成」をクリック

### ステップ2: IAMロールの作成（IAM管理者が実行）

1. IAMサービスで「ロール」を選択
2. 「ロールを作成」をクリック
3. 信頼されたエンティティタイプ: **AWSのサービス**
4. ユースケース: **Lambda**
5. 「次へ」をクリック
6. 以下のポリシーをアタッチ:
   - `VideoAnalyzerLambdaPolicy`（ステップ1で作成）
   - `AWSLambdaBasicExecutionRole`（AWS管理ポリシー）
7. ロール名を入力: `VideoAnalyzerLambdaRole`
8. 「ロールを作成」をクリック

### ステップ3: ロールARNの取得（IAM管理者が実行）

1. 作成したロール `VideoAnalyzerLambdaRole` を開く
2. 「ARN」をコピー
   - 形式: `arn:aws:iam::123456789012:role/VideoAnalyzerLambdaRole`
3. このARNをデプロイユーザーに共有

### ステップ4: デプロイ（デプロイユーザーが実行）

#### 環境変数の設定

```bash
export LAMBDA_EXECUTION_ROLE_ARN=arn:aws:iam::123456789012:role/VideoAnalyzerLambdaRole
```

#### デプロイの実行

```bash
# デプロイスクリプトに実行権限を付与
chmod +x scripts/deploy-no-iam.sh

# デプロイを実行
./scripts/deploy-no-iam.sh
```

## AWS CLIを使用したIAMロール作成（オプション）

コマンドラインでIAMロールを作成する場合：

### 1. 信頼ポリシーの作成

```bash
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
```

### 2. IAMロールの作成

```bash
aws iam create-role \
  --role-name VideoAnalyzerLambdaRole \
  --assume-role-policy-document file://trust-policy.json
```

### 3. ポリシーのアタッチ

```bash
# カスタムポリシーの作成
aws iam create-policy \
  --policy-name VideoAnalyzerLambdaPolicy \
  --policy-document file://iam-policy-template.json

# ポリシーのアタッチ
aws iam attach-role-policy \
  --role-name VideoAnalyzerLambdaRole \
  --policy-arn arn:aws:iam::123456789012:policy/VideoAnalyzerLambdaPolicy

# AWS管理ポリシーのアタッチ
aws iam attach-role-policy \
  --role-name VideoAnalyzerLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 4. ロールARNの取得

```bash
aws iam get-role \
  --role-name VideoAnalyzerLambdaRole \
  --query 'Role.Arn' \
  --output text
```

## CDKアプリケーションの更新

`bin/bedrock-video-analyzer.ts` を以下のように更新：

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VideoAnalyzerNoIamStack } from '../lib/video-analyzer-no-iam-stack';

const app = new cdk.App();

// 環境変数からIAMロールARNを取得
const lambdaExecutionRoleArn = process.env.LAMBDA_EXECUTION_ROLE_ARN;

if (!lambdaExecutionRoleArn) {
  throw new Error('LAMBDA_EXECUTION_ROLE_ARN environment variable is required');
}

new VideoAnalyzerNoIamStack(app, 'VideoAnalyzerNoIamStack', {
  lambdaExecutionRoleArn: lambdaExecutionRoleArn,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1'
  }
});
```

## トラブルシューティング

### エラー: "User is not authorized to perform: iam:CreateRole"

**原因**: IAM作成権限がない状態で通常のスタックをデプロイしようとしている

**解決策**: 
1. IAM管理者にロール作成を依頼
2. `deploy-no-iam.sh` スクリプトを使用してデプロイ

### エラー: "Role ARN is invalid"

**原因**: 指定したロールARNが存在しないか、形式が間違っている

**解決策**:
1. ロールARNの形式を確認: `arn:aws:iam::ACCOUNT:role/ROLE_NAME`
2. IAMコンソールでロールが存在することを確認

### エラー: "Access Denied when calling Bedrock"

**原因**: IAMロールにBedrock権限が不足している

**解決策**:
1. `iam-policy-template.json` の内容を確認
2. IAM管理者にポリシーの更新を依頼

## セキュリティのベストプラクティス

1. **最小権限の原則**: 必要最小限の権限のみを付与
2. **リソース制限**: ポリシーでワイルドカード（*）の使用を最小限に
3. **定期的な監査**: IAMロールの使用状況を定期的に確認
4. **タグ付け**: ロールにタグを付けて管理を容易に

## まとめ

この手順により、IAM作成権限を持たないユーザーでもVideo Analyzerアプリケーションをデプロイできます。IAM管理者とデプロイユーザーの責任を明確に分離することで、セキュリティを維持しながら効率的な運用が可能になります。