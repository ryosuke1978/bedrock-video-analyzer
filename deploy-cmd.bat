@echo off
echo === Bedrock Video Analyzer CloudFormation 繝・・繝ｭ繧､ ===
echo.

REM 迺ｰ蠅・､画焚險ｭ螳・
set AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
set AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
set AWS_DEFAULT_REGION=ap-northeast-1

echo 迺ｰ蠅・､画焚繧定ｨｭ螳壹＠縺ｾ縺励◆
echo AWS_ACCESS_KEY_ID: %AWS_ACCESS_KEY_ID%
echo AWS_DEFAULT_REGION: %AWS_DEFAULT_REGION%
echo.

REM 譌｢蟄倥・繧ｹ繧ｿ繝・け繧貞炎髯､・医お繝ｩ繝ｼ縺ｯ辟｡隕厄ｼ・
echo 譌｢蟄倥・繧ｹ繧ｿ繝・け繧堤｢ｺ隱阪・蜑企勁荳ｭ...
aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev 2>nul
if %errorlevel% equ 0 (
    echo 譌｢蟄倥せ繧ｿ繝・け縺ｮ蜑企勁繧帝幕蟋九＠縺ｾ縺励◆
    echo 蜑企勁螳御ｺ・ｒ蠕・ｩ滉ｸｭ...
    aws cloudformation wait stack-delete-complete --stack-name bedrock-video-analyzer-dev
    echo 譌｢蟄倥せ繧ｿ繝・け蜑企勁螳御ｺ・
) else (
    echo 譌｢蟄倥せ繧ｿ繝・け縺ｯ隕九▽縺九ｊ縺ｾ縺帙ｓ縺ｧ縺励◆
)
echo.

REM 譁ｰ縺励＞繧ｹ繧ｿ繝・け繧剃ｽ懈・
echo 譁ｰ縺励＞CloudFormation繧ｹ繧ｿ繝・け繧剃ｽ懈・荳ｭ...
aws cloudformation create-stack ^
    --stack-name bedrock-video-analyzer-dev ^
    --template-body file://fixed-cloudformation.yaml ^
    --capabilities CAPABILITY_NAMED_IAM ^
    --parameters ParameterKey=Environment,ParameterValue=dev

if %errorlevel% neq 0 (
    echo 繧ｨ繝ｩ繝ｼ: 繧ｹ繧ｿ繝・け菴懈・繧ｳ繝槭Φ繝峨′螟ｱ謨励＠縺ｾ縺励◆
    echo CloudFormation繝・Φ繝励Ξ繝ｼ繝医ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞
    pause
    exit /b 1
)

echo 繧ｹ繧ｿ繝・け菴懈・繧ｳ繝槭Φ繝峨ｒ螳溯｡後＠縺ｾ縺励◆
echo.
echo 繧ｹ繧ｿ繝・け菴懈・螳御ｺ・ｒ蠕・ｩ滉ｸｭ・・-10蛻・ｨ句ｺｦ縺九°繧翫∪縺呻ｼ・..
echo 騾ｲ陦檎憾豕√・AWS繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ縺ｧ繧ら｢ｺ隱阪〒縺阪∪縺・ https://console.aws.amazon.com/cloudformation/
echo.

aws cloudformation wait stack-create-complete --stack-name bedrock-video-analyzer-dev

if %errorlevel% neq 0 (
    echo.
    echo 繧ｨ繝ｩ繝ｼ: 繧ｹ繧ｿ繝・け菴懈・縺悟､ｱ謨励∪縺溘・繧ｿ繧､繝繧｢繧ｦ繝医＠縺ｾ縺励◆
    echo 隧ｳ邏ｰ縺ｪ繧ｨ繝ｩ繝ｼ諠・ｱ繧堤｢ｺ隱阪＠縺ｾ縺・..
    echo.
    aws cloudformation describe-stack-events --stack-name bedrock-video-analyzer-dev --max-items 10 --query "StackEvents[?ResourceStatus=='CREATE_FAILED'].[Timestamp,ResourceType,LogicalResourceId,ResourceStatusReason]" --output table
    pause
    exit /b 1
)

echo.
echo === 繝・・繝ｭ繧､螳御ｺ・===
echo 繧ｹ繧ｿ繝・け菴懈・縺梧ｭ｣蟶ｸ縺ｫ螳御ｺ・＠縺ｾ縺励◆・・
echo.

REM API Gateway URL繧貞叙蠕・
echo API Gateway URL繧貞叙蠕嶺ｸｭ...
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query "Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue" --output text') do set API_URL=%%i

if defined API_URL (
    echo API Gateway URL: %API_URL%
) else (
    echo 隴ｦ蜻・ API Gateway URL縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆
)
echo.

REM 繧ｹ繧ｿ繝・け蜃ｺ蜉帶ュ蝣ｱ繧定｡ｨ遉ｺ
echo === 菴懈・縺輔ｌ縺溘Μ繧ｽ繝ｼ繧ｹ ===
aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query "Stacks[0].Outputs" --output table
echo.

REM API繝・せ繝・
if defined API_URL (
    echo === API繝・せ繝・===
    echo Limits API繧偵ユ繧ｹ繝井ｸｭ...
    echo URL: %API_URL%/limits
    curl -s "%API_URL%/limits"
    echo.
    echo.
    echo Upload API・・OST・峨・繝・せ繝・
    echo URL: %API_URL%/upload
    curl -X POST "%API_URL%/upload" -H "Content-Type: application/json" -d "{\"fileName\":\"test.mp4\",\"fileSize\":1000000}"
    echo.
)

echo.
echo === 繝・・繝ｭ繧､螳御ｺ・===
echo 莉･荳九・繝ｪ繧ｽ繝ｼ繧ｹ縺御ｽ懈・縺輔ｌ縺ｾ縺励◆:
echo - S3繝舌こ繝・ヨ: bedrock-video-analyzer-dev-252689085095
echo - DynamoDB繝・・繝悶Ν: VideoAnalysis-dev, QueryHistory-dev  
echo - Lambda髢｢謨ｰ: bedrock-video-analyzer-upload-dev, bedrock-video-analyzer-limits-dev
echo - API Gateway: bedrock-video-analyzer-api-dev
echo - IAM繝ｭ繝ｼ繝ｫ: BedrockVideoAnalyzer-Lambda-dev-252689085095
echo.
if defined API_URL (
    echo API Gateway URL: %API_URL%
    echo.
    echo 谺｡縺ｮ繧ｹ繝・ャ繝・
    echo 1. 繝輔Ο繝ｳ繝医お繝ｳ繝峨〒API URL繧定ｨｭ螳・
    echo 2. Lambda髢｢謨ｰ縺ｮ螳溯｣・さ繝ｼ繝峨ｒ譖ｴ譁ｰ
    echo 3. 譛ｬ譬ｼ逧・↑繝・せ繝医ｒ螳溯｡・
)
echo.
pause
