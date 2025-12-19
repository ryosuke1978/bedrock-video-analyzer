#!/bin/bash

# 環境変数を使用したデプロイスクリプト（Linux/Mac版）

set -e

# 使用方法の表示
show_usage() {
    echo "使用方法: $0 <environment> [options]"
    echo ""
    echo "環境:"
    echo "  development  開発環境"
    echo "  staging      ステージング環境"
    echo "  production   本番環境"
    echo "  no-iam       IAM作成権限不要版"
    echo ""
    echo "オプション:"
    echo "  --stack-name <name>  スタック名を指定"
    echo "  --skip-build         Lambda関数のビルドをスキップ"
    echo "  --help              このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0 development"
    echo "  $0 production --stack-name MyVideoAnalyzer"
    echo "  $0 no-iam --skip-build"
}

# パラメータの解析
ENVIRONMENT=""
STACK_NAME=""
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        development|staging|production|no-iam)
            ENVIRONMENT="$1"
            shift
            ;;
        --stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            echo "❌ 不明なオプション: $1"
            show_usage
            exit 1
            ;;
    esac
done

# 環境が指定されていない場合
if [[ -z "$ENVIRONMENT" ]]; then
    echo "❌ 環境を指定してください"
    show_usage
    exit 1
fi

echo "🚀 Video Analyzer デプロイを開始します..."
echo "🌍 環境: $ENVIRONMENT"

# 環境変数の読み込み
echo "📋 環境変数を読み込んでいます..."
node scripts/load-env.js "$ENVIRONMENT"

# 環境に応じた.envファイルを読み込み
case $ENVIRONMENT in
    "development")
        ENV_FILE=".env.dev"
        ;;
    "staging")
        ENV_FILE=".env.staging"
        ;;
    "production")
        ENV_FILE=".env.prod"
        ;;
    "no-iam")
        ENV_FILE=".env.no-iam"
        ;;
    *)
        ENV_FILE=".env"
        ;;
esac

if [[ -f "$ENV_FILE" ]]; then
    echo "📄 $ENV_FILE を読み込んでいます..."
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo "⚠️  $ENV_FILE が見つかりません。${ENV_FILE}.example をコピーして作成してください。"
fi

# Lambda関数のビルド（スキップオプションがない場合）
if [[ "$SKIP_BUILD" != true ]]; then
    echo "🔨 Lambda関数をビルドしています..."
    cd lambda
    npm install
    npm run build
    cd ..
fi

# スタック名の決定
if [[ -z "$STACK_NAME" ]]; then
    case $ENVIRONMENT in
        "development")
            STACK_NAME="VideoAnalyzerDevStack"
            ;;
        "staging")
            STACK_NAME="VideoAnalyzerStagingStack"
            ;;
        "production")
            STACK_NAME="VideoAnalyzerProdStack"
            ;;
        "no-iam")
            STACK_NAME="VideoAnalyzerNoIamStack"
            ;;
        *)
            STACK_NAME="VideoAnalyzerStack"
            ;;
    esac
fi

# 環境に応じた環境変数設定
case $ENVIRONMENT in
    "production")
        export DEPLOY_PROD="true"
        echo "🏭 本番環境としてデプロイします"
        ;;
    "staging")
        export DEPLOY_STAGING="true"
        echo "🧪 ステージング環境としてデプロイします"
        ;;
    "no-iam")
        export DEPLOY_NO_IAM="true"
        echo "🔒 IAM作成権限不要版としてデプロイします"
        if [[ -z "$LAMBDA_EXECUTION_ROLE_ARN" ]]; then
            echo "❌ LAMBDA_EXECUTION_ROLE_ARN が設定されていません"
            exit 1
        fi
        echo "📋 使用するIAMロール: $LAMBDA_EXECUTION_ROLE_ARN"
        ;;
    "development")
        echo "🛠️  開発環境としてデプロイします"
        ;;
esac

# AWS認証情報の確認
if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
    echo "❌ AWS認証情報が設定されていません"
    echo "AWS_ACCESS_KEY_ID と AWS_SECRET_ACCESS_KEY を設定してください"
    exit 1
fi

echo "🔑 AWS認証情報: ${AWS_ACCESS_KEY_ID:0:4}****"
echo "📍 リージョン: ${AWS_DEFAULT_REGION:-ap-northeast-1}"
echo "🏢 アカウント: $CDK_DEFAULT_ACCOUNT"

# CDKデプロイ
echo "☁️ CDKスタック '$STACK_NAME' をデプロイしています..."
npx cdk deploy "$STACK_NAME" --require-approval never

echo "✅ デプロイが完了しました！"
echo ""
echo "📊 次のステップ:"
echo "1. API Gateway URLを確認してフロントエンドを設定"
echo "2. CloudWatchダッシュボードで監視を開始"
echo "3. 必要に応じてSNSトピックにメール通知を設定"