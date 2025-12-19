# CloudFormation繝・・繝ｭ繧､謇矩・

## 迴ｾ蝨ｨ縺ｮ迥ｶ豕・

### 螳御ｺ・＠縺滉ｽ懈･ｭ
笨・S3繝舌こ繝・ヨ菴懈・: `bedrock-video-analyzer-dev-252689085095`
笨・CloudFormation繝・Φ繝励Ξ繝ｼ繝井ｽ懈・: `simple-cloudformation.yaml`
笨・CloudFormation繧ｹ繧ｿ繝・け菴懈・繧ｳ繝槭Φ繝牙ｮ溯｡・

### CloudFormation繧ｹ繧ｿ繝・け縺ｮ蜀・ｮｹ
- **繧ｹ繧ｿ繝・け蜷・*: bedrock-video-analyzer-dev
- **繝ｪ繧ｽ繝ｼ繧ｹ**:
  - S3繝舌こ繝・ヨ (蜍慕判菫晏ｭ倡畑)
  - DynamoDB繝・・繝悶Ν x2 (VideoAnalysis, QueryHistory)
  - IAM繝ｭ繝ｼ繝ｫ (Lambda螳溯｡檎畑)
  - Lambda髢｢謨ｰ x2 (Upload, Limits) - 繧､繝ｳ繝ｩ繧､繝ｳ繧ｳ繝ｼ繝・
  - API Gateway (REST API)
  - API Gateway繧ｨ繝ｳ繝峨・繧､繝ｳ繝・(/upload, /limits)

## 谺｡縺ｮ繧ｹ繝・ャ繝・

### 1. 繧ｹ繧ｿ繝・け菴懈・迥ｶ豕√・遒ｺ隱・

```powershell
$env:AWS_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION="ap-northeast-1"

# 繧ｹ繧ｿ繝・け縺ｮ迥ｶ諷九ｒ遒ｺ隱・
aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].StackStatus' --output text

# 繧ｹ繧ｿ繝・け縺ｮ蜃ｺ蜉帙ｒ遒ｺ隱・
aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].Outputs' --output table
```

### 2. API Gateway URL縺ｮ蜿門ｾ・

```powershell
aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text
```

### 3. API縺ｮ繝・せ繝・

```powershell
# Limits API繧偵ユ繧ｹ繝・
$apiUrl = aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text
curl "$apiUrl/limits"
```

## 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繧ｹ繧ｿ繝・け菴懈・縺悟､ｱ謨励＠縺溷ｴ蜷・

```powershell
# 繧ｹ繧ｿ繝・け繧､繝吶Φ繝医ｒ遒ｺ隱・
aws cloudformation describe-stack-events --stack-name bedrock-video-analyzer-dev --max-items 20

# 繧ｹ繧ｿ繝・け繧貞炎髯､縺励※蜀堺ｽ懈・
aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev
aws cloudformation wait stack-delete-complete --stack-name bedrock-video-analyzer-dev

# 蜀堺ｽ懈・
aws cloudformation create-stack `
  --stack-name bedrock-video-analyzer-dev `
  --template-body file://simple-cloudformation.yaml `
  --capabilities CAPABILITY_NAMED_IAM
```

### Lambda髢｢謨ｰ縺ｮ繧ｳ繝ｼ繝画峩譁ｰ

迴ｾ蝨ｨ縲´ambda髢｢謨ｰ縺ｯ繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ繧ｳ繝ｼ繝峨〒蜍穂ｽ懊＠縺ｦ縺・∪縺吶・
螳滄圀縺ｮ繧ｳ繝ｼ繝峨↓譖ｴ譁ｰ縺吶ｋ縺ｫ縺ｯ:

```powershell
# Lambda髢｢謨ｰ縺ｮ繧ｳ繝ｼ繝峨ｒ譖ｴ譁ｰ
aws lambda update-function-code `
  --function-name bedrock-video-analyzer-upload-dev `
  --zip-file fileb://upload.zip
```

## 繝・・繝ｭ繧､螳御ｺ・ｾ後・遒ｺ隱堺ｺ矩・

1. 笨・S3繝舌こ繝・ヨ縺御ｽ懈・縺輔ｌ縺ｦ縺・ｋ
2. 竢ｳ DynamoDB繝・・繝悶Ν縺御ｽ懈・縺輔ｌ縺ｦ縺・ｋ
3. 竢ｳ Lambda髢｢謨ｰ縺御ｽ懈・縺輔ｌ縺ｦ縺・ｋ
4. 竢ｳ API Gateway縺御ｽ懈・縺輔ｌ縺ｦ縺・ｋ
5. 竢ｳ API Gateway繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′蜍穂ｽ懊＠縺ｦ縺・ｋ

## 迺ｰ蠅・ュ蝣ｱ

- **AWS Account ID**: 252689085095
- **AWS Region**: ap-northeast-1
- **Environment**: dev
- **Stack Name**: bedrock-video-analyzer-dev
