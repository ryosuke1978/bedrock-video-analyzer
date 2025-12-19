@echo off
cls
echo ========================================
echo CloudFormation クイックデプロイ
echo ========================================
echo.

REM 環境変数設定
set AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
set AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
set AWS_DEFAULT_REGION=ap-northeast-1

echo [1/4] 環境変数設定完了
echo Region: %AWS_DEFAULT_REGION%
echo.

REM 既存スタック削除
echo [2/4] 既存スタックを削除中...
aws cloudformation delete-stack --stack-name bedrock-video-analyzer-dev 2>nul
timeout /t 3 /nobreak >nul
echo 既存スタック削除完了
echo.

REM 新しいスタック作成
echo [3/4] CloudFormationスタックを作成中...
aws cloudformation create-stack ^
    --stack-name bedrock-video-analyzer-dev ^
    --template-body file://fixed-cloudformation.yaml ^
    --capabilities CAPABILITY_NAMED_IAM ^
    --parameters ParameterKey=Environment,ParameterValue=dev

if %errorlevel% equ 0 (
    echo スタック作成コマンド実行成功
    echo.
    echo [4/4] スタック作成が開始されました
    echo.
    echo ========================================
    echo 次のステップ
    echo ========================================
    echo.
    echo 1. AWSコンソールで進行状況を確認:
    echo    https://console.aws.amazon.com/cloudformation/
    echo.
    echo 2. 完了まで5-10分程度かかります
    echo.
    echo 3. 完了後、以下のコマンドでAPI URLを取得:
    echo    aws cloudformation describe-stacks --stack-name bedrock-video-analyzer-dev --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text
    echo.
) else (
    echo エラー: スタック作成に失敗しました
    echo テンプレートファイルを確認してください
)

echo.
pause