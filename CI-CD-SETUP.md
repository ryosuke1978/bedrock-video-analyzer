# CI/CD繝代う繝励Λ繧､繝ｳ險ｭ螳壹ぎ繧､繝・

## 讎りｦ・

Bedrock Video Analyzer繝励Ο繧ｸ繧ｧ繧ｯ繝医・CI/CD繝代う繝励Λ繧､繝ｳ繧定ｨｭ螳壹☆繧九◆繧√・繧ｬ繧､繝峨〒縺吶・itHub Actions縺ｨAWS CodePipeline縺ｮ荳｡譁ｹ繧偵し繝昴・繝医＠縺ｦ縺・∪縺吶・

## 菴懈・縺輔ｌ縺溘ヵ繧｡繧､繝ｫ

笨・`.github/workflows/deploy.yml` - GitHub Actions繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼ
笨・`codepipeline-template.yaml` - AWS CodePipeline繝・Φ繝励Ξ繝ｼ繝・
笨・`buildspec.yml` - CodeBuild險ｭ螳・
笨・`scripts/ci-deploy.sh` - CI/CD逕ｨ繝・・繝ｭ繧､繧ｹ繧ｯ繝ｪ繝励ヨ

## GitHub Actions險ｭ螳・

### 1. GitHub繝ｪ繝昴ず繝医Μ縺ｮ貅門ｙ

```bash
# 繝ｪ繝昴ず繝医Μ繧貞・譛溷喧・医∪縺縺ｮ蝣ｴ蜷茨ｼ・
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/bedrock-video-analyzer.git
git push -u origin main
```

### 2. GitHub Secrets縺ｮ險ｭ螳・

GitHub繝ｪ繝昴ず繝医Μ縺ｮ Settings > Secrets and variables > Actions 縺ｧ莉･荳九ｒ險ｭ螳夲ｼ・

```
AWS_ACCESS_KEY_ID: YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY: YOUR_AWS_SECRET_ACCESS_KEY
```

### 3. 迺ｰ蠅・・險ｭ螳・

Settings > Environments 縺ｧ莉･荳九・迺ｰ蠅・ｒ菴懈・・・
- `dev` - 髢狗匱迺ｰ蠅・
- `staging` - 繧ｹ繝・・繧ｸ繝ｳ繧ｰ迺ｰ蠅・ 
- `prod` - 譛ｬ逡ｪ迺ｰ蠅・

### 4. 繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼ縺ｮ螳溯｡・

- **閾ｪ蜍募ｮ溯｡・*: `main`繝悶Λ繝ｳ繝√∈縺ｮpush縺ｧ譛ｬ逡ｪ繝・・繝ｭ繧､
- **謇句虚螳溯｡・*: Actions 繧ｿ繝悶°繧峨轡eploy Bedrock Video Analyzer縲阪ｒ驕ｸ謚・
- **繝励Ν繝ｪ繧ｯ繧ｨ繧ｹ繝・*: PR縺ｧ髢狗匱迺ｰ蠅・∈縺ｮ繝・・繝ｭ繧､繧偵ユ繧ｹ繝・

## AWS CodePipeline險ｭ螳・

### 1. CodePipeline繧ｹ繧ｿ繝・け縺ｮ繝・・繝ｭ繧､

```bash
# GitHub Personal Access Token繧貞叙蠕・
# https://github.com/settings/tokens

# CodePipeline繧ｹ繧ｿ繝・け繧剃ｽ懈・
aws cloudformation create-stack \
    --stack-name bedrock-video-analyzer-pipeline \
    --template-body file://codepipeline-template.yaml \
    --capabilities CAPABILITY_IAM \
    --parameters \
        ParameterKey=GitHubOwner,ParameterValue=your-github-username \
        ParameterKey=GitHubRepo,ParameterValue=bedrock-video-analyzer \
        ParameterKey=GitHubBranch,ParameterValue=main \
        ParameterKey=GitHubToken,ParameterValue=your-github-token
```

### 2. 繝代う繝励Λ繧､繝ｳ縺ｮ遒ｺ隱・

```bash
# 繝代う繝励Λ繧､繝ｳ縺ｮ迥ｶ諷九ｒ遒ｺ隱・
aws codepipeline get-pipeline-state --name bedrock-video-analyzer-pipeline

# 繝薙Ν繝峨Ο繧ｰ繧堤｢ｺ隱・
aws logs describe-log-groups --log-group-name-prefix /aws/codebuild/bedrock-video-analyzer
```

## 迺ｰ蠅・挨繝・・繝ｭ繧､

### 繝悶Λ繝ｳ繝∵姶逡･

- `main` 竊・譛ｬ逡ｪ迺ｰ蠅・(`prod`)
- `staging` 竊・繧ｹ繝・・繧ｸ繝ｳ繧ｰ迺ｰ蠅・(`staging`)  
- `develop` 竊・髢狗匱迺ｰ蠅・(`dev`)

### 謇句虚繝・・繝ｭ繧､

```bash
# 髢狗匱迺ｰ蠅・
ENVIRONMENT=dev bash scripts/ci-deploy.sh

# 繧ｹ繝・・繧ｸ繝ｳ繧ｰ迺ｰ蠅・
ENVIRONMENT=staging bash scripts/ci-deploy.sh

# 譛ｬ逡ｪ迺ｰ蠅・
ENVIRONMENT=prod bash scripts/ci-deploy.sh
```

## CI/CD繝代う繝励Λ繧､繝ｳ縺ｮ豬√ｌ

### 1. 繧ｽ繝ｼ繧ｹ繧ｹ繝・・繧ｸ
- GitHub縺九ｉ繧ｽ繝ｼ繧ｹ繧ｳ繝ｼ繝峨ｒ蜿門ｾ・
- 螟画峩讀懃衍縺ｧ繝代う繝励Λ繧､繝ｳ繧定・蜍募ｮ溯｡・

### 2. 繝薙Ν繝峨せ繝・・繧ｸ
- Node.js萓晏ｭ倬未菫ゅ・繧､繝ｳ繧ｹ繝医・繝ｫ
- TypeScript繧ｳ繝ｳ繝代う繝ｫ
- 蜊倅ｽ薙ユ繧ｹ繝医・螳溯｡・
- CloudFormation繝・Φ繝励Ξ繝ｼ繝医・讀懆ｨｼ

### 3. 繝・・繝ｭ繧､繧ｹ繝・・繧ｸ
- CloudFormation繧ｹ繧ｿ繝・け縺ｮ繝・・繝ｭ繧､
- Lambda髢｢謨ｰ縺ｮ繧ｳ繝ｼ繝画峩譁ｰ
- API繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・繝・せ繝・

### 4. 繝・せ繝医せ繝・・繧ｸ
- 繝・・繝ｭ繧､縺輔ｌ縺蘗PI縺ｮ蜍穂ｽ懃｢ｺ隱・
- 邨ｱ蜷医ユ繧ｹ繝医・螳溯｡・

## 逶｣隕悶→繝ｭ繧ｰ

### CloudWatch Logs
```bash
# CodeBuild繝ｭ繧ｰ繧堤｢ｺ隱・
aws logs describe-log-streams \
    --log-group-name /aws/codebuild/bedrock-video-analyzer-build

# Lambda髢｢謨ｰ繝ｭ繧ｰ繧堤｢ｺ隱・
aws logs describe-log-streams \
    --log-group-name /aws/lambda/bedrock-video-analyzer-upload-dev
```

### CloudFormation繧､繝吶Φ繝・
```bash
# 繧ｹ繧ｿ繝・け繧､繝吶Φ繝医ｒ遒ｺ隱・
aws cloudformation describe-stack-events \
    --stack-name bedrock-video-analyzer-dev \
    --max-items 20
```

## 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繧医￥縺ゅｋ蝠城｡・

1. **IAM讓ｩ髯蝉ｸ崎ｶｳ**
   ```
   User: arn:aws:iam::xxx:user/xxx is not authorized to perform: cloudformation:CreateStack
   ```
   竊・IAM讓ｩ髯舌ｒ遒ｺ隱阪・霑ｽ蜉

2. **CloudFormation繝・Φ繝励Ξ繝ｼ繝医お繝ｩ繝ｼ**
   ```
   Template format error: YAML not well-formed
   ```
   竊・繝・Φ繝励Ξ繝ｼ繝医・讒区枚繧堤｢ｺ隱・

3. **Lambda髢｢謨ｰ縺ｮ繝薙Ν繝峨お繝ｩ繝ｼ**
   ```
   npm ERR! missing script: build
   ```
   竊・`lambda/package.json`縺ｮ繧ｹ繧ｯ繝ｪ繝励ヨ繧堤｢ｺ隱・

### 繝・ヰ繝・げ譁ｹ豕・

```bash
# 繝ｭ繝ｼ繧ｫ繝ｫ縺ｧ繝薙Ν繝峨ユ繧ｹ繝・
npm install
npm test
cd lambda && npm run build

# CloudFormation繝・Φ繝励Ξ繝ｼ繝域､懆ｨｼ
aws cloudformation validate-template --template-body file://fixed-cloudformation.yaml

# 繧ｹ繧ｿ繝・け蜑企勁・亥ｿ・ｦ√↓蠢懊§縺ｦ・・
aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev
```

## 繧ｻ繧ｭ繝･繝ｪ繝・ぅ閠・・莠矩・

### 1. 隱崎ｨｼ諠・ｱ縺ｮ邂｡逅・
- GitHub Secrets縺ｾ縺溘・AWS Systems Manager Parameter Store繧剃ｽｿ逕ｨ
- IAM繝ｭ繝ｼ繝ｫ繝吶・繧ｹ縺ｮ隱崎ｨｼ繧呈耳螂ｨ・域悽逡ｪ迺ｰ蠅・ｼ・

### 2. 譛蟆乗ｨｩ髯舌・蜴溷援
- CI/CD逕ｨIAM繝ｭ繝ｼ繝ｫ縺ｯ蠢・ｦ∵怙蟆城剞縺ｮ讓ｩ髯舌・縺ｿ莉倅ｸ・
- 迺ｰ蠅・挨縺ｫ繝ｭ繝ｼ繝ｫ繧貞・髮｢

### 3. 逶｣譟ｻ繝ｭ繧ｰ
- CloudTrail縺ｧAPI蜻ｼ縺ｳ蜃ｺ縺励ｒ險倬鹸
- CloudWatch Logs縺ｧ繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繝ｭ繧ｰ繧堤屮隕・

## 谺｡縺ｮ繧ｹ繝・ャ繝・

1. 笨・CI/CD繝代う繝励Λ繧､繝ｳ縺ｮ險ｭ螳・
2. 竢ｳ 譛ｬ逡ｪ迺ｰ蠅・∈縺ｮ繝・・繝ｭ繧､
3. 竢ｳ 逶｣隕悶・繧｢繝ｩ繝ｼ繝医・險ｭ螳・
4. 竢ｳ 閾ｪ蜍輔ユ繧ｹ繝医・諡｡蜈・
5. 竢ｳ 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繧ｹ繧ｭ繝｣繝ｳ縺ｮ霑ｽ蜉

## 蜿り・Μ繝ｳ繧ｯ

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS CodePipeline User Guide](https://docs.aws.amazon.com/codepipeline/)
- [AWS CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)
- [AWS CodeBuild User Guide](https://docs.aws.amazon.com/codebuild/)
