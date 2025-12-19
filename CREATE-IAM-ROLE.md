# IAMロール手動作成手順

## 🔐 必要なIAMロールの作成

CI/CDパイプラインを実行する前に、以下のIAMロールを手動で作成する必要があります。

### 1. IAMロールの作成

**AWS IAMコンソールで以下の手順を実行してください：**

#### ステップ1: ロールの作成
1. **AWS IAMコンソール**にアクセス
2. **「ロール」**をクリック
3. **「ロールを作成」**をクリック

#### ステップ2: 信頼されたエンティティの選択
1. **「AWSサービス」**を選択
2. **「Lambda」**を選択
3. **「次へ」**をクリック

#### ステップ3: 権限ポリシーの追加
以下のポリシーを追加してください：

**管理ポリシー**:
- `AWSLambdaBasicExecutionRole`

**カスタムポリシー**:
「ポリシーを作成」をクリックして以下のJSONを貼り付け：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:GetObjectVersion",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::bedrock-video-analyzer-*",
                "arn:aws:s3:::bedrock-video-analyzer-*/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": [
                "arn:aws:dynamodb:ap-northeast-1:252689085095:table/VideoAnalysis-*",
                "arn:aws:dynamodb:ap-northeast-1:252689085095:table/QueryHistory-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": [
                "arn:aws:bedrock:ap-northeast-1::foundation-model/twelvelabs.pegasus-1-2"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:ap-northeast-1:252689085095:*"
            ]
        }
    ]
}
```

#### ステップ4: ロール名の設定
- **ロール名**: `BedrockVideoAnalyzer-Lambda-Role`
- **説明**: `Lambda execution role for Bedrock Video Analyzer`

#### ステップ5: ロールの作成完了
「ロールを作成」をクリックして完了

### 2. ロールARNの確認

作成したロールのARNを確認してください：
```
arn:aws:iam::252689085095:role/BedrockVideoAnalyzer-Lambda-Role
```

### 3. CloudFormationテンプレートでの使用

作成したロールARNは、CloudFormationテンプレートの`LambdaExecutionRoleArn`パラメータで使用されます。

## 🚀 デプロイの実行

IAMロールの作成が完了したら、CI/CDパイプラインを実行してください：

1. **GitHub Actions**でワークフローを実行
2. **CloudFormation**が事前作成されたIAMロールを使用
3. **Lambda関数**が正常にデプロイされる

## 🔧 トラブルシューティング

### よくある問題

1. **ロールが見つからない**
   - ロール名が正確に一致しているか確認
   - リージョンが正しいか確認

2. **権限不足エラー**
   - 上記のカスタムポリシーが正しく追加されているか確認
   - リソースARNが正しいか確認

3. **Bedrock権限エラー**
   - Bedrockサービスが有効になっているか確認
   - Pegasus 1.2モデルへのアクセス権限があるか確認

## 📋 確認事項

デプロイ前に以下を確認してください：

- ✅ IAMロール `BedrockVideoAnalyzer-Lambda-Role` が作成済み
- ✅ 必要な権限ポリシーが追加済み
- ✅ ロールARNが正しく設定済み
- ✅ Bedrockサービスが有効
- ✅ 必要なAWSリージョン（ap-northeast-1）でリソースが利用可能