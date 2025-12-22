#!/bin/bash

# Lambda関数パッケージ化スクリプト
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LAMBDA_DIR="$PROJECT_ROOT/lambda"
DIST_DIR="$PROJECT_ROOT/dist"

echo "🚀 Lambda関数のパッケージ化を開始します..."

# ディストリビューションディレクトリを作成
mkdir -p "$DIST_DIR"

# 既存のzipファイルを削除
rm -f "$DIST_DIR"/*.zip

# Lambda関数のリスト
FUNCTIONS=("upload" "analysis" "query" "status" "limits")

# 各Lambda関数をパッケージ化
for FUNCTION in "${FUNCTIONS[@]}"; do
    echo "📦 $FUNCTION 関数をパッケージ化中..."
    
    # 一時ディレクトリを作成
    TEMP_DIR=$(mktemp -d)
    
    # Lambda関数のソースコードをコピー
    if [ -f "$LAMBDA_DIR/src/$FUNCTION.js" ]; then
        cp "$LAMBDA_DIR/src/$FUNCTION.js" "$TEMP_DIR/"
        echo "✅ $FUNCTION.js をコピーしました"
    else
        echo "❌ $FUNCTION.js が見つかりません"
        continue
    fi
    
    # package.jsonをコピー
    if [ -f "$LAMBDA_DIR/package.json" ]; then
        cp "$LAMBDA_DIR/package.json" "$TEMP_DIR/"
    fi
    
    # node_modulesをコピー（存在する場合）
    if [ -d "$LAMBDA_DIR/node_modules" ]; then
        cp -r "$LAMBDA_DIR/node_modules" "$TEMP_DIR/"
        echo "✅ node_modules をコピーしました"
    else
        echo "⚠️  node_modules が見つかりません。依存関係をインストールします..."
        cd "$TEMP_DIR"
        npm install --production --silent
        cd "$PROJECT_ROOT"
    fi
    
    # ZIPファイルを作成
    cd "$TEMP_DIR"
    zip -r "$DIST_DIR/$FUNCTION.zip" . -x "*.git*" "*.DS_Store*" "test/*" "tests/*" > /dev/null
    cd "$PROJECT_ROOT"
    
    # 一時ディレクトリを削除
    rm -rf "$TEMP_DIR"
    
    echo "✅ $FUNCTION.zip を作成しました"
done

echo "🎉 すべてのLambda関数のパッケージ化が完了しました！"
echo "📁 パッケージファイルの場所: $DIST_DIR"
ls -la "$DIST_DIR"/*.zip 2>/dev/null || echo "⚠️ ZIPファイルが見つかりません"