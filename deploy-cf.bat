@echo off
echo === CloudFormation 繝・・繝ｭ繧､髢句ｧ・===

REM 迺ｰ蠅・､画焚險ｭ螳・
set AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
set AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
set AWS_DEFAULT_REGION=ap-northeast-1

echo 譌｢蟄倥・繧ｹ繧ｿ繝・け繧貞炎髯､荳ｭ...
aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev 2>nul
echo 繧ｹ繧ｿ繝・け蜑企勁螳御ｺ・ｒ蠕・ｩ滉ｸｭ...
aws cloudformation wait stack-delete-complete --stack-name bedrock-video-analyzer-dev 2>nul

echo.
echo 譁ｰ縺励＞繧ｹ繧ｿ繝・け繧剃ｽ懈・荳ｭ...
aws cloudformation create-stack ^
    --stack-name bedrock-video-analyzer-dev ^
    --template-body file://fixed-cloudformation.yaml ^
    --capabilities CAPABILITY_NAMED_IAM ^
    --parameters ParameterKey=Environment,ParameterValue=dev

if %errorlevel% neq 0 (
    echo 繧ｨ繝ｩ繝ｼ: 繧ｹ繧ｿ繝・け菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆
    pause
    exit /b 1
)

echo 繧ｹ繧ｿ繝・け菴懈・繧ｳ繝槭Φ繝峨ｒ螳溯｡後＠縺ｾ縺励◆
echo 繧ｹ繧ｿ繝・け菴懈・螳御ｺ・ｒ蠕・ｩ滉ｸｭ・域焚蛻・°縺九ｊ縺ｾ縺呻ｼ・..
aws cloudformation wait stack-create-complete --stack-name bedrock-video-analyzer-dev

if %errorlevel% neq 0 (
    echo 繧ｨ繝ｩ繝ｼ: 繧ｹ繧ｿ繝・け菴懈・縺後ち繧､繝繧｢繧ｦ繝医∪縺溘・螟ｱ謨励＠縺ｾ縺励◆
    echo 繧ｹ繧ｿ繝・け繧､繝吶Φ繝医ｒ遒ｺ隱阪＠縺ｾ縺・..
    aws cloudformation describe-stack-events --stack-name bedrock-video-analyzer-dev --max-items 10
    pause
    exit /b 1
)

echo.
echo === 繝・・繝ｭ繧､螳御ｺ・===
echo API Gateway URL繧貞叙蠕嶺ｸｭ...
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query "Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue" --output text') do set API_URL=%%i
echo API Gateway URL: %API_URL%

echo.
echo 繧ｹ繧ｿ繝・け蜃ｺ蜉帶ュ蝣ｱ:
aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query "Stacks[0].Outputs" --output table

echo.
echo === API繝・せ繝・===
echo Limits API繧偵ユ繧ｹ繝井ｸｭ...
curl -s "%API_URL%/limits"

echo.
echo 繝・・繝ｭ繧､縺悟ｮ御ｺ・＠縺ｾ縺励◆・・
pause
