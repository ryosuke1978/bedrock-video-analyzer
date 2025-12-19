# CloudFormation スタック作成
Write-Host "CloudFormationスタックを作成中..." -ForegroundColor Yellow

# 既存スタック削除
aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev

# 新しいスタック作成
aws cloudformation create-stack `
    --stack-name bedrock-video-analyzer-dev `
    --template-body file://fixed-cloudformation.yaml `
    --capabilities CAPABILITY_NAMED_IAM `
    --parameters ParameterKey=Environment,ParameterValue=dev

Write-Host "スタック作成コマンドを実行しました" -ForegroundColor Green
Write-Host "AWSコンソールで進行状況を確認: https://console.aws.amazon.com/cloudformation/" -ForegroundColor Blue