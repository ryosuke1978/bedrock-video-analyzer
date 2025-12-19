# GitHub Actions CI/CD 繧ｻ繝・ヨ繧｢繝・・謇矩・

## 噫 繧ｹ繝・ャ繝・: GitHub繝ｪ繝昴ず繝医Μ縺ｮ菴懈・

### 1.1 GitHub縺ｧ繝ｪ繝昴ず繝医Μ繧剃ｽ懈・
1. https://github.com 縺ｫ繧｢繧ｯ繧ｻ繧ｹ
2. 縲君ew repository縲阪ｒ繧ｯ繝ｪ繝・け
3. Repository name: `bedrock-video-analyzer`
4. 縲靴reate repository縲阪ｒ繧ｯ繝ｪ繝・け

### 1.2 繝ｭ繝ｼ繧ｫ繝ｫ繝ｪ繝昴ず繝医Μ縺ｮ蛻晄悄蛹・

繧ｳ繝槭Φ繝峨・繝ｭ繝ｳ繝励ヨ縺ｾ縺溘・PowerShell縺ｧ莉･荳九ｒ螳溯｡鯉ｼ・

```bash
# 繝励Ο繧ｸ繧ｧ繧ｯ繝医ョ繧｣繝ｬ繧ｯ繝医Μ縺ｫ遘ｻ蜍・
cd C:\Users\EP-2363\kiro_workspace\bedrock-video-analyzer

# Git繝ｪ繝昴ず繝医Μ繧貞・譛溷喧
git init

# 繝輔ぃ繧､繝ｫ繧偵せ繝・・繧ｸ繝ｳ繧ｰ
git add .

# 蛻晏屓繧ｳ繝溘ャ繝・
git commit -m "Initial commit: Add Bedrock Video Analyzer with CI/CD pipeline"

# 繝｡繧､繝ｳ繝悶Λ繝ｳ繝√↓螟画峩
git branch -M main

# 繝ｪ繝｢繝ｼ繝医Μ繝昴ず繝医Μ繧定ｿｽ蜉・・our-username繧貞ｮ滄圀縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ蜷阪↓螟画峩・・
git remote add origin https://github.com/your-username/bedrock-video-analyzer.git

# GitHub縺ｫ繝励ャ繧ｷ繝･
git push -u origin main
```

## 柏 繧ｹ繝・ャ繝・: GitHub Secrets縺ｮ險ｭ螳・

### 2.1 Secrets繝壹・繧ｸ縺ｫ繧｢繧ｯ繧ｻ繧ｹ
1. GitHub繝ｪ繝昴ず繝医Μ繝壹・繧ｸ繧帝幕縺・
2. 縲郡ettings縲阪ち繝悶ｒ繧ｯ繝ｪ繝・け
3. 蟾ｦ繧ｵ繧､繝峨ヰ繝ｼ縺ｮ縲郡ecrets and variables縲坂・縲窟ctions縲阪ｒ繧ｯ繝ｪ繝・け

### 2.2 AWS隱崎ｨｼ諠・ｱ繧定ｿｽ蜉
縲君ew repository secret縲阪ｒ繧ｯ繝ｪ繝・け縺励※莉･荳九ｒ霑ｽ蜉・・

**Secret 1:**
- Name: `AWS_ACCESS_KEY_ID`
- Secret: `YOUR_AWS_ACCESS_KEY_ID`

**Secret 2:**
- Name: `AWS_SECRET_ACCESS_KEY`
- Secret: `YOUR_AWS_SECRET_ACCESS_KEY`

## 訣 繧ｹ繝・ャ繝・: 迺ｰ蠅・・險ｭ螳・

### 3.1 迺ｰ蠅・ｒ菴懈・
1. 繝ｪ繝昴ず繝医Μ縺ｮ縲郡ettings縲坂・縲窪nvironments縲阪ｒ繧ｯ繝ｪ繝・け
2. 縲君ew environment縲阪ｒ繧ｯ繝ｪ繝・け
3. 莉･荳九・迺ｰ蠅・ｒ菴懈・・・

**髢狗匱迺ｰ蠅・**
- Name: `dev`
- Protection rules: 縺ｪ縺・

**繧ｹ繝・・繧ｸ繝ｳ繧ｰ迺ｰ蠅・**
- Name: `staging`
- Protection rules: Required reviewers (繧ｪ繝励す繝ｧ繝ｳ)

**譛ｬ逡ｪ迺ｰ蠅・**
- Name: `prod`
- Protection rules: Required reviewers 繧定ｨｭ螳壽耳螂ｨ

## 噫 繧ｹ繝・ャ繝・: CI/CD繝代う繝励Λ繧､繝ｳ縺ｮ繝・せ繝・

### 4.1 閾ｪ蜍輔ョ繝励Ο繧､縺ｮ繝・せ繝・
```bash
# 髢狗匱繝悶Λ繝ｳ繝√ｒ菴懈・縺励※繝・せ繝・
git checkout -b develop
git push -u origin develop

# main繝悶Λ繝ｳ繝√↓繝槭・繧ｸ縺励※譛ｬ逡ｪ繝・・繝ｭ繧､繧偵ユ繧ｹ繝・
git checkout main
git merge develop
git push origin main
```

### 4.2 謇句虚繝・・繝ｭ繧､縺ｮ繝・せ繝・
1. GitHub繝ｪ繝昴ず繝医Μ縺ｮ縲窟ctions縲阪ち繝悶ｒ髢九￥
2. 縲轡eploy Bedrock Video Analyzer縲阪Ρ繝ｼ繧ｯ繝輔Ο繝ｼ繧帝∈謚・
3. 縲軍un workflow縲阪ｒ繧ｯ繝ｪ繝・け
4. 迺ｰ蠅・ｒ驕ｸ謚橸ｼ・ev/staging/prod・・
5. 縲軍un workflow縲阪ｒ繧ｯ繝ｪ繝・け

## 投 繧ｹ繝・ャ繝・: 繝・・繝ｭ繧､邨先棡縺ｮ遒ｺ隱・

### 5.1 GitHub Actions繝ｭ繧ｰ縺ｮ遒ｺ隱・
1. 縲窟ctions縲阪ち繝悶〒繝ｯ繝ｼ繧ｯ繝輔Ο繝ｼ縺ｮ螳溯｡檎憾豕√ｒ遒ｺ隱・
2. 蜷・せ繝・ャ繝励・繝ｭ繧ｰ繧堤｢ｺ隱・
3. 繧ｨ繝ｩ繝ｼ縺後≠繧句ｴ蜷医・繝ｭ繧ｰ縺ｧ隧ｳ邏ｰ繧堤｢ｺ隱・

### 5.2 AWS繝ｪ繧ｽ繝ｼ繧ｹ縺ｮ遒ｺ隱・
```bash
# CloudFormation繧ｹ繧ｿ繝・け縺ｮ遒ｺ隱・
aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev

# API Gateway URL縺ｮ蜿門ｾ・
aws cloudformation describe-stacks \
  --stack-name bedrock-video-analyzer-dev \
  --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
  --output text
```

### 5.3 API繝・せ繝・
```bash
# Limits API繝・せ繝・
curl https://your-api-gateway-url/dev/limits

# Upload API繝・せ繝・
curl -X POST https://your-api-gateway-url/dev/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","fileSize":1000000}'
```

## 肌 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繧医￥縺ゅｋ蝠城｡後→隗｣豎ｺ譁ｹ豕・

**1. AWS隱崎ｨｼ繧ｨ繝ｩ繝ｼ**
```
Error: The security token included in the request is invalid
```
竊・GitHub Secrets縺ｮAWS隱崎ｨｼ諠・ｱ繧堤｢ｺ隱・

**2. CloudFormation繧ｨ繝ｩ繝ｼ**
```
Template format error: YAML not well-formed
```
竊・`fixed-cloudformation.yaml`縺ｮ讒区枚繧堤｢ｺ隱・

**3. Node.js繝薙Ν繝峨お繝ｩ繝ｼ**
```
npm ERR! missing script: build
```
竊・`package.json`縺ｮ繧ｹ繧ｯ繝ｪ繝励ヨ繧堤｢ｺ隱・

### 繝・ヰ繝・げ繧ｳ繝槭Φ繝・
```bash
# 繝ｭ繝ｼ繧ｫ繝ｫ縺ｧ繝・せ繝・
npm install
npm test
npm run ci:validate

# CloudFormation繝・Φ繝励Ξ繝ｼ繝域､懆ｨｼ
aws cloudformation validate-template --template-body file://fixed-cloudformation.yaml
```

## 脂 螳御ｺ・ｼ・

CI/CD繝代う繝励Λ繧､繝ｳ縺梧ｭ｣蟶ｸ縺ｫ險ｭ螳壹＆繧後∪縺励◆縲・

### 谺｡縺ｮ繧ｹ繝・ャ繝・
1. 笨・GitHub Actions縺ｧ縺ｮ閾ｪ蜍輔ョ繝励Ο繧､
2. 竢ｳ 繝輔Ο繝ｳ繝医お繝ｳ繝峨・險ｭ螳・
3. 竢ｳ 譛ｬ譬ｼ逧・↑繝・せ繝医・螳溯｣・
4. 竢ｳ 逶｣隕悶・繧｢繝ｩ繝ｼ繝医・險ｭ螳・

### 萓ｿ蛻ｩ縺ｪ繧ｳ繝槭Φ繝・
```bash
# 髢狗匱迺ｰ蠅・↓繝・・繝ｭ繧､
git push origin develop

# 譛ｬ逡ｪ迺ｰ蠅・↓繝・・繝ｭ繧､
git push origin main

# 謇句虚繝・・繝ｭ繧､
# GitHub Actions UI 縺九ｉ螳溯｡・
```

---

**豕ｨ諢・*: 螳滄圀縺ｮGitHub繝ｦ繝ｼ繧ｶ繝ｼ蜷阪↓`your-username`繧堤ｽｮ縺肴鋤縺医※縺上□縺輔＞縲
