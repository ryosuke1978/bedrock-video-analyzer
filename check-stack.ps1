# CloudFormation繧ｹ繧ｿ繝・け迥ｶ諷狗｢ｺ隱阪せ繧ｯ繝ｪ繝励ヨ

# 迺ｰ蠅・､画焚險ｭ螳・
$env:AWS_ACCESS_KEY_ID = "YOUR_AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "ap-northeast-1"

Write-Host "CloudFormation繧ｹ繧ｿ繝・け縺ｮ迥ｶ諷九ｒ遒ｺ隱堺ｸｭ..."

# 繧ｹ繧ｿ繝・け縺ｮ迥ｶ諷九ｒ遒ｺ隱・
try {
    $stackStatus = aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].StackStatus' --output text
    Write-Host "繧ｹ繧ｿ繝・け迥ｶ諷・ $stackStatus"
    
    if ($stackStatus -eq "CREATE_COMPLETE") {
        Write-Host "笨・繧ｹ繧ｿ繝・け菴懈・縺悟ｮ御ｺ・＠縺ｾ縺励◆・・
        
        # API Gateway URL繧貞叙蠕・
        Write-Host "`nAPI Gateway URL繧貞叙蠕嶺ｸｭ..."
        $apiUrl = aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text
        Write-Host "API Gateway URL: $apiUrl"
        
        # 蜃ｺ蜉帶ュ蝣ｱ繧定｡ｨ遉ｺ
        Write-Host "`n繧ｹ繧ｿ繝・け蜃ｺ蜉帶ュ蝣ｱ:"
        aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query 'Stacks[0].Outputs' --output table
        
    } elseif ($stackStatus -eq "CREATE_IN_PROGRESS") {
        Write-Host "竢ｳ 繧ｹ繧ｿ繝・け菴懈・荳ｭ縺ｧ縺吶ゅ＠縺ｰ繧峨￥縺雁ｾ・■縺上□縺輔＞..."
    } else {
        Write-Host "笶・繧ｹ繧ｿ繝・け迥ｶ諷・ $stackStatus"
        Write-Host "繧ｹ繧ｿ繝・け繧､繝吶Φ繝医ｒ遒ｺ隱阪＠縺ｾ縺・.."
        aws cloudformation describe-stack-events --stack-name bedrock-video-analyzer-dev --max-items 10 --query 'StackEvents[*].[Timestamp,ResourceStatus,ResourceType,LogicalResourceId,ResourceStatusReason]' --output table
    }
} catch {
    Write-Host "笶・繧ｹ繧ｿ繝・け縺瑚ｦ九▽縺九ｉ縺ｪ縺・°縲√お繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆"
    Write-Host "繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ: $($_.Exception.Message)"
}
