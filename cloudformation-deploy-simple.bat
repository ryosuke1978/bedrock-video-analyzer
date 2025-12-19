@echo off
echo === CloudFormation 繝・・繝ｭ繧､・医す繝ｳ繝励Ν迚茨ｼ・==

REM 迺ｰ蠅・､画焚險ｭ螳・
set AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
set AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
set AWS_DEFAULT_REGION=ap-northeast-1

echo CloudFormation繧ｹ繧ｿ繝・け繧剃ｽ懈・荳ｭ...

REM CloudFormation繧ｹ繧ｿ繝・け菴懈・
aws cloudformation create-stack --stack-name bedrock-video-analyzer-dev --template-body file://fixed-cloudformation.yaml --capabilities CAPABILITY_NAMED_IAM --parameters ParameterKey=Environment,ParameterValue=dev

echo.
echo 繧ｹ繧ｿ繝・け菴懈・繧ｳ繝槭Φ繝峨ｒ螳溯｡後＠縺ｾ縺励◆
echo AWS繧ｳ繝ｳ繧ｽ繝ｼ繝ｫ縺ｧ騾ｲ陦檎憾豕√ｒ遒ｺ隱阪〒縺阪∪縺・
echo https://console.aws.amazon.com/cloudformation/
echo.
echo 螳御ｺ・∪縺ｧ5-10蛻・ｨ句ｺｦ縺九°繧翫∪縺・
pause
