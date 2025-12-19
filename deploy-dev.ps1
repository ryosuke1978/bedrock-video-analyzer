# 髢狗匱迺ｰ蠅・ョ繝励Ο繧､繧ｹ繧ｯ繝ｪ繝励ヨ

# 迺ｰ蠅・､画焚險ｭ螳・
$env:AWS_ACCESS_KEY_ID = "YOUR_AWS_ACCESS_KEY_ID"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_AWS_SECRET_ACCESS_KEY"
$env:AWS_DEFAULT_REGION = "ap-northeast-1"
$env:CDK_DEFAULT_ACCOUNT = "252689085095"
$env:CDK_DEFAULT_REGION = "ap-northeast-1"

# Node.js隴ｦ蜻翫ｒ辟｡蜉ｹ蛹・
$env:JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION = "true"

Write-Host "迺ｰ蠅・､画焚繧定ｨｭ螳壹＠縺ｾ縺励◆"
Write-Host "AWS Account: $env:CDK_DEFAULT_ACCOUNT"
Write-Host "AWS Region: $env:CDK_DEFAULT_REGION"

# CDK繝・・繝ｭ繧､螳溯｡・
Write-Host "CDK繝・・繝ｭ繧､繧帝幕蟋九＠縺ｾ縺・.."
npx cdk deploy VideoAnalyzerDevStack --require-approval never

if ($LASTEXITCODE -eq 0) {
    Write-Host "繝・・繝ｭ繧､縺梧ｭ｣蟶ｸ縺ｫ螳御ｺ・＠縺ｾ縺励◆・・
} else {
    Write-Host "繝・・繝ｭ繧､縺ｧ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲らｵゆｺ・さ繝ｼ繝・ $LASTEXITCODE"
    exit $LASTEXITCODE
}
