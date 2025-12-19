#!/bin/bash

# CI/CD用CloudFormationデプロイスクリプト

set -e  # エラー時に停止

# 環境変数の設定
ENVIRONMENT=${ENVIRONMENT:-dev}
STACK_NAME="bedrock-video-analyzer-$ENVIRONMENT"
TEMPLATE_FILE="fixed-cloudformation.yaml"

echo "========================================="
echo "CI/CD CloudFormation デプロイ"
echo "========================================="
echo "Environment: $ENVIRONMENT"
echo "Stack Name: $STACK_NAME"
echo "Template: $TEMPLATE_FILE"
echo "AWS Region: ${AWS_DEFAULT_REGION:-ap-northeast-1}"
echo "========================================="

# CloudFormationテンプレートの検証
echo "Validating CloudFormation template..."
aws cloudformation validate-template --template-body file://$TEMPLATE_FILE

# スタックの存在確認
echo "Checking if stack exists..."
if aws cloudformation describe-stacks --stack-name $STACK_NAME >/dev/null 2>&1; then
    STACK_EXISTS=true
    echo "Stack $STACK_NAME exists"
else
    STACK_EXISTS=false
    echo "Stack $STACK_NAME does not exist"
fi

# スタックのデプロイ
if [ "$STACK_EXISTS" = true ]; then
    echo "Updating existing stack..."
    
    # 変更セットを作成
    CHANGESET_NAME="changeset-$(date +%Y%m%d-%H%M%S)"
    
    aws cloudformation create-change-set \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --capabilities CAPABILITY_NAMED_IAM \
        --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
        --change-set-name $CHANGESET_NAME
    
    echo "Waiting for change set to be created..."
    aws cloudformation wait change-set-create-complete \
        --stack-name $STACK_NAME \
        --change-set-name $CHANGESET_NAME
    
    # 変更セットの内容を表示
    echo "Change set contents:"
    aws cloudformation describe-change-set \
        --stack-name $STACK_NAME \
        --change-set-name $CHANGESET_NAME \
        --query 'Changes[*].[Action,ResourceChange.LogicalResourceId,ResourceChange.ResourceType]' \
        --output table
    
    # 変更セットを実行
    echo "Executing change set..."
    aws cloudformation execute-change-set \
        --stack-name $STACK_NAME \
        --change-set-name $CHANGESET_NAME
    
    echo "Waiting for stack update to complete..."
    aws cloudformation wait stack-update-complete --stack-name $STACK_NAME
    
    if [ $? -eq 0 ]; then
        echo "✅ Stack update completed successfully"
    else
        echo "❌ Stack update failed"
        exit 1
    fi
else
    echo "Creating new stack..."
    
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --capabilities CAPABILITY_NAMED_IAM \
        --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
        --tags Key=Environment,Value=$ENVIRONMENT Key=Project,Value=BedrockVideoAnalyzer
    
    echo "Waiting for stack creation to complete..."
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME
    
    if [ $? -eq 0 ]; then
        echo "✅ Stack creation completed successfully"
    else
        echo "❌ Stack creation failed"
        exit 1
    fi
fi

# スタック出力の取得
echo "Getting stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs' \
    --output json)

API_URL=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="ApiGatewayUrl") | .OutputValue')
BUCKET_NAME=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="VideoBucketName") | .OutputValue')
TABLE_NAME=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="VideoAnalysisTableName") | .OutputValue')

echo "========================================="
echo "Deployment Results"
echo "========================================="
echo "Environment: $ENVIRONMENT"
echo "API Gateway URL: $API_URL"
echo "S3 Bucket: $BUCKET_NAME"
echo "DynamoDB Table: $TABLE_NAME"
echo "========================================="

# 環境変数をファイルに出力（後続のステップで使用）
if [ -n "$GITHUB_ENV" ]; then
    echo "API_GATEWAY_URL=$API_URL" >> $GITHUB_ENV
    echo "S3_BUCKET_NAME=$BUCKET_NAME" >> $GITHUB_ENV
    echo "DYNAMODB_TABLE_NAME=$TABLE_NAME" >> $GITHUB_ENV
fi

# APIテスト
if [ -n "$API_URL" ] && [ "$API_URL" != "null" ]; then
    echo "Testing deployed APIs..."
    
    # Limits APIテスト
    echo "Testing Limits API..."
    if curl -f -s "$API_URL/limits" > /dev/null; then
        echo "✅ Limits API test passed"
    else
        echo "❌ Limits API test failed"
        exit 1
    fi
    
    # Upload APIテスト
    echo "Testing Upload API..."
    if curl -f -s -X POST "$API_URL/upload" \
        -H "Content-Type: application/json" \
        -d '{"fileName":"test.mp4","fileSize":1000000}' > /dev/null; then
        echo "✅ Upload API test passed"
    else
        echo "❌ Upload API test failed"
        exit 1
    fi
    
    echo "✅ All API tests passed"
else
    echo "⚠️  API URL not found, skipping API tests"
fi

echo "========================================="
echo "✅ CI/CD Deployment completed successfully"
echo "========================================="