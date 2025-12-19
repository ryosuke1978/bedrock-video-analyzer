# CloudFormation 繝・・繝ｭ繧､謇矩・ｼ域婿豕・: 蛻･繧ｿ繝ｼ繝溘リ繝ｫ菴ｿ逕ｨ・・

PowerShell縺ｮ蜃ｺ蜉帛撫鬘後ｒ蝗樣∩縺吶ｋ縺溘ａ縲∝挨縺ｮ繧ｿ繝ｼ繝溘リ繝ｫ繧剃ｽｿ逕ｨ縺励※AWS CLI縺ｧ繝・・繝ｭ繧､縺励∪縺吶・

## 貅門ｙ縺輔ｌ縺溘ヵ繧｡繧､繝ｫ

笨・`fixed-cloudformation.yaml` - 菫ｮ豁｣縺輔ｌ縺櫃loudFormation繝・Φ繝励Ξ繝ｼ繝・
笨・`deploy-cmd.bat` - 繧ｳ繝槭Φ繝峨・繝ｭ繝ｳ繝励ヨ逕ｨ繝・・繝ｭ繧､繧ｹ繧ｯ繝ｪ繝励ヨ
笨・`deploy-bash.sh` - Git Bash逕ｨ繝・・繝ｭ繧､繧ｹ繧ｯ繝ｪ繝励ヨ

## 螳溯｡梧婿豕・

### 繧ｪ繝励す繝ｧ繝ｳ1: 繧ｳ繝槭Φ繝峨・繝ｭ繝ｳ繝励ヨ・・md・峨ｒ菴ｿ逕ｨ

1. **繧ｳ繝槭Φ繝峨・繝ｭ繝ｳ繝励ヨ繧帝幕縺・*
   - `Win + R` 竊・`cmd` 竊・Enter

2. **繝励Ο繧ｸ繧ｧ繧ｯ繝医ョ繧｣繝ｬ繧ｯ繝医Μ縺ｫ遘ｻ蜍・*
   ```cmd
   cd C:\Users\EP-2363\kiro_workspace\bedrock-video-analyzer
   ```

3. **繝・・繝ｭ繧､繧ｹ繧ｯ繝ｪ繝励ヨ繧貞ｮ溯｡・*
   ```cmd
   deploy-cmd.bat
   ```

### 繧ｪ繝励す繝ｧ繝ｳ2: Git Bash繧剃ｽｿ逕ｨ

1. **Git Bash繧帝幕縺・*
   - 繧ｹ繧ｿ繝ｼ繝医Γ繝九Η繝ｼ縺九ｉ縲隈it Bash縲阪ｒ讀懃ｴ｢縺励※襍ｷ蜍・

2. **繝励Ο繧ｸ繧ｧ繧ｯ繝医ョ繧｣繝ｬ繧ｯ繝医Μ縺ｫ遘ｻ蜍・*
   ```bash
   cd /c/Users/EP-2363/kiro_workspace/bedrock-video-analyzer
   ```

3. **繝・・繝ｭ繧､繧ｹ繧ｯ繝ｪ繝励ヨ繧貞ｮ溯｡・*
   ```bash
   bash deploy-bash.sh
   ```

### 繧ｪ繝励す繝ｧ繝ｳ3: 謇句虚縺ｧAWS CLI繧ｳ繝槭Φ繝峨ｒ螳溯｡・

繧ｳ繝槭Φ繝峨・繝ｭ繝ｳ繝励ヨ縺ｾ縺溘・Git Bash縺ｧ莉･荳九ｒ鬆・ｬ｡螳溯｡鯉ｼ・

```bash
# 迺ｰ蠅・､画焚險ｭ螳・
set AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
set AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
set AWS_DEFAULT_REGION=ap-northeast-1

# 縺ｾ縺溘・ Git Bash縺ｮ蝣ｴ蜷・
export AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=ap-northeast-1

# 譌｢蟄倥せ繧ｿ繝・け蜑企勁・医お繝ｩ繝ｼ縺ｯ辟｡隕厄ｼ・
aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev

# 譁ｰ縺励＞繧ｹ繧ｿ繝・け菴懈・
aws cloudformation create-stack \
    --stack-name bedrock-video-analyzer-dev \
    --template-body file://fixed-cloudformation.yaml \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameters ParameterKey=Environment,ParameterValue=dev

# 菴懈・螳御ｺ・ｒ蠕・ｩ・
aws cloudformation wait stack-create-complete --stack-name bedrock-video-analyzer-dev

# API Gateway URL蜿門ｾ・
aws cloudformation describe-stacks \
    --stack-name bedrock-video-analyzer-dev \
    --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
    --output text
```

## 螳溯｡梧凾縺ｮ豬√ｌ

1. **迺ｰ蠅・､画焚險ｭ螳・* - AWS隱崎ｨｼ諠・ｱ繧定ｨｭ螳・
2. **譌｢蟄倥せ繧ｿ繝・け蜑企勁** - 驥崎､・ｒ驕ｿ縺代ｋ縺溘ａ譌｢蟄倥せ繧ｿ繝・け繧貞炎髯､
3. **譁ｰ縺励＞繧ｹ繧ｿ繝・け菴懈・** - CloudFormation繝・Φ繝励Ξ繝ｼ繝医°繧峨Μ繧ｽ繝ｼ繧ｹ菴懈・
4. **菴懈・螳御ｺ・ｾ・ｩ・* - 5-10蛻・ｨ句ｺｦ蠕・ｩ・
5. **邨先棡遒ｺ隱・* - API Gateway URL縺ｨ繝ｪ繧ｽ繝ｼ繧ｹ諠・ｱ繧定｡ｨ遉ｺ
6. **API繝・せ繝・* - 菴懈・縺輔ｌ縺溘お繝ｳ繝峨・繧､繝ｳ繝医ｒ繝・せ繝・

## 菴懈・縺輔ｌ繧九Μ繧ｽ繝ｼ繧ｹ

- **S3繝舌こ繝・ヨ**: `bedrock-video-analyzer-dev-252689085095`
- **DynamoDB繝・・繝悶Ν**: 
  - `VideoAnalysis-dev`
  - `QueryHistory-dev`
- **Lambda髢｢謨ｰ**:
  - `bedrock-video-analyzer-upload-dev`
  - `bedrock-video-analyzer-limits-dev`
- **API Gateway**: `bedrock-video-analyzer-api-dev`
- **IAM繝ｭ繝ｼ繝ｫ**: `BedrockVideoAnalyzer-Lambda-dev-252689085095`

## 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繧医￥縺ゅｋ繧ｨ繝ｩ繝ｼ

1. **繝・Φ繝励Ξ繝ｼ繝医ヵ繧｡繧､繝ｫ縺瑚ｦ九▽縺九ｉ縺ｪ縺・*
   ```
   Error parsing parameter '--template-body': Unable to load paramfile
   ```
   竊・豁｣縺励＞繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ縺・ｋ縺薙→繧堤｢ｺ隱・

2. **IAM繝ｭ繝ｼ繝ｫ蜷阪・驥崎､・*
   ```
   Role already exists
   ```
   竊・譌｢蟄倥せ繧ｿ繝・け繧貞炎髯､縺励※縺九ｉ蜀榊ｮ溯｡・

3. **讓ｩ髯蝉ｸ崎ｶｳ**
   ```
   Access Denied
   ```
   竊・AWS隱崎ｨｼ諠・ｱ繧堤｢ｺ隱・

### 繧ｨ繝ｩ繝ｼ遒ｺ隱肴婿豕・

```bash
# 繧ｹ繧ｿ繝・け繧､繝吶Φ繝医ｒ遒ｺ隱・
aws cloudformation describe-stack-events \
    --stack-name bedrock-video-analyzer-dev \
    --max-items 20

# 螟ｱ謨励＠縺溘Μ繧ｽ繝ｼ繧ｹ縺ｮ縺ｿ遒ｺ隱・
aws cloudformation describe-stack-events \
    --stack-name bedrock-video-analyzer-dev \
    --query "StackEvents[?ResourceStatus=='CREATE_FAILED']"
```

## 谺｡縺ｮ繧ｹ繝・ャ繝・

繝・・繝ｭ繧､螳御ｺ・ｾ鯉ｼ・

1. **API Gateway URL繧偵Γ繝｢** - 繝輔Ο繝ｳ繝医お繝ｳ繝芽ｨｭ螳壹〒菴ｿ逕ｨ
2. **繧ｨ繝ｳ繝峨・繧､繝ｳ繝医ユ繧ｹ繝・* - `/limits`縺ｨ`/upload`繧偵ユ繧ｹ繝・
3. **Lambda髢｢謨ｰ譖ｴ譁ｰ** - 繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ縺九ｉ螳溯｣・さ繝ｼ繝峨↓譖ｴ譁ｰ
4. **繝輔Ο繝ｳ繝医お繝ｳ繝芽ｨｭ螳・* - API URL繧定ｨｭ螳壹ヵ繧｡繧､繝ｫ縺ｫ霑ｽ蜉

## 螳溯｡梧耳螂ｨ

**繧ｳ繝槭Φ繝峨・繝ｭ繝ｳ繝励ヨ・・md・峨〒縺ｮ螳溯｡後ｒ謗ｨ螂ｨ縺励∪縺・*縲８indows縺ｮ讓呎ｺ悶ち繝ｼ繝溘リ繝ｫ縺ｧ譛繧ょｮ牙ｮ壹＠縺ｦ蜍穂ｽ懊＠縺ｾ縺吶・

```cmd
cd C:\Users\EP-2363\kiro_workspace\bedrock-video-analyzer
deploy-cmd.bat
```
