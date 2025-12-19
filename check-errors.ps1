# CloudFormation繧ｨ繝ｩ繝ｼ遒ｺ隱阪せ繧ｯ繝ｪ繝励ヨ

# 迺ｰ蠅・､画焚險ｭ螳・
$env:AWS_ACCESS_KEY_ID = "YOUR_AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "ap-northeast-1"

Write-Host "CloudFormation繧ｹ繧ｿ繝・け縺ｮ繧ｨ繝ｩ繝ｼ繧堤｢ｺ隱堺ｸｭ..."

# 繧ｹ繧ｿ繝・け繧､繝吶Φ繝医ｒ遒ｺ隱搾ｼ亥､ｱ謨励＠縺溘Μ繧ｽ繝ｼ繧ｹ繧堤音螳夲ｼ・
Write-Host "=== 繧ｹ繧ｿ繝・け繧､繝吶Φ繝茨ｼ域怙譁ｰ20莉ｶ・・=="
aws cloudformation describe-stack-events --stack-name bedrock-video-analyzer-dev --max-items 20 --query 'StackEvents[*].[Timestamp,ResourceStatus,ResourceType,LogicalResourceId,ResourceStatusReason]' --output table

Write-Host "`n=== 螟ｱ謨励＠縺溘Μ繧ｽ繝ｼ繧ｹ縺ｮ隧ｳ邏ｰ ==="
aws cloudformation describe-stack-events --stack-name bedrock-video-analyzer-dev --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[ResourceType,LogicalResourceId,ResourceStatusReason]' --output table

# 譌｢蟄倥・繧ｹ繧ｿ繝・け繧貞炎髯､
Write-Host "`n譌｢蟄倥・繧ｹ繧ｿ繝・け繧貞炎髯､荳ｭ..."
aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev

Write-Host "繧ｹ繧ｿ繝・け蜑企勁螳御ｺ・ｒ蠕・ｩ滉ｸｭ..."
aws cloudformation wait stack-delete-complete --stack-name bedrock-video-analyzer-dev

Write-Host "笨・繧ｹ繧ｿ繝・け蜑企勁縺悟ｮ御ｺ・＠縺ｾ縺励◆"
