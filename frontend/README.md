# Bedrock Video Analyzer - フロントエンド

Amazon Bedrock TwelveLabs Pegasus 1.2を使用した動画解析システムのWebインターフェース

## 🚀 機能

### 主要機能
- **動画アップロード**: ドラッグ&ドロップまたはファイル選択
- **動画解析**: Amazon Bedrock TwelveLabs Pegasus 1.2による自動解析
- **質問応答**: 解析済み動画への自然言語質問
- **履歴管理**: 質問と回答の履歴表示
- **リアルタイム進捗**: アップロードと解析の進捗表示

### 対応形式
- **動画形式**: MP4, MOV, AVI, MKV, WebM
- **最大ファイルサイズ**: 100MB
- **最大動画時間**: 1時間

## 📁 ファイル構成

```
frontend/
├── index.html          # メインHTML
├── styles.css          # スタイルシート
├── config.js           # 設定ファイル
├── api.js              # API通信ライブラリ
├── app.js              # メインアプリケーション
└── README.md           # このファイル
```

## 🛠️ セットアップ

### 1. 設定の更新

`config.js`でAPI Gateway URLを設定：

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-api-gateway-url/dev',
    // ...
};
```

### 2. ローカル開発サーバー

HTTPSサーバーが必要です（CORS対応）：

```bash
# Python 3の場合
python -m http.server 8000

# Node.jsの場合
npx http-server -p 8000 --cors

# Live Serverの場合（VS Code拡張）
# index.htmlを右クリック → "Open with Live Server"
```

### 3. ブラウザでアクセス

```
http://localhost:8000
```

## 🎨 UI コンポーネント

### アップロードエリア
- ドラッグ&ドロップ対応
- ファイル形式・サイズ検証
- プログレスバー表示

### 解析セクション
- リアルタイムステータス更新
- 解析結果表示
- エラーハンドリング

### 質問セクション
- 自然言語入力
- 履歴表示
- タイムスタンプ付き

### システム情報
- 対応形式表示
- 制限値表示
- リージョン情報

## 🔧 カスタマイズ

### API エンドポイントの変更

`config.js`で設定を変更：

```javascript
const CONFIG = {
    API_BASE_URL: 'https://new-api-url/dev',
    ENDPOINTS: {
        LIMITS: '/limits',
        UPLOAD: '/upload',
        ANALYSIS: '/analysis',
        QUERY: '/query',
        STATUS: '/status'
    }
};
```

### UI テーマの変更

`styles.css`でカラーテーマを変更：

```css
:root {
    --primary-color: #4f46e5;
    --secondary-color: #7c3aed;
    --success-color: #10b981;
    --error-color: #ef4444;
}
```

### ファイル制限の変更

`config.js`で制限値を変更：

```javascript
FILE_LIMITS: {
    MAX_SIZE: 200 * 1024 * 1024, // 200MB
    ALLOWED_TYPES: ['video/mp4', 'video/mov'],
    ALLOWED_EXTENSIONS: ['.mp4', '.mov']
}
```

## 🐛 トラブルシューティング

### よくある問題

1. **CORS エラー**
   ```
   Access to fetch at 'API_URL' from origin 'localhost' has been blocked by CORS policy
   ```
   **解決**: HTTPSサーバーを使用するか、API GatewayのCORS設定を確認

2. **ファイルアップロードエラー**
   ```
   Upload failed: 403
   ```
   **解決**: プリサインドURLの有効期限またはS3権限を確認

3. **解析タイムアウト**
   ```
   解析がタイムアウトしました
   ```
   **解決**: `config.js`の`ANALYSIS_TIMEOUT`を増加

### デバッグモード

`config.js`でデバッグを有効化：

```javascript
const CONFIG = {
    DEBUG: true,
    // ...
};
```

ブラウザのコンソールで詳細ログを確認できます。

## 📱 レスポンシブ対応

- **デスクトップ**: フル機能
- **タブレット**: 最適化されたレイアウト
- **モバイル**: タッチ操作対応

## 🔒 セキュリティ

- **HTTPS必須**: 本番環境ではHTTPS使用
- **ファイル検証**: クライアントサイドでの事前検証
- **エラーハンドリング**: 適切なエラーメッセージ表示

## 🚀 本番デプロイ

### S3 + CloudFront

```bash
# S3バケットにアップロード
aws s3 sync frontend/ s3://your-bucket-name/

# CloudFrontで配信
# HTTPSとカスタムドメイン設定推奨
```

### GitHub Pages

```bash
# gh-pagesブランチにプッシュ
git subtree push --prefix frontend origin gh-pages
```

## 📊 パフォーマンス

- **初期読み込み**: < 2秒
- **ファイルアップロード**: プログレス表示
- **API応答**: リアルタイム更新
- **メモリ使用量**: 最適化済み

## 🤝 コントリビューション

1. フォークしてブランチ作成
2. 機能追加・バグ修正
3. テスト実行
4. プルリクエスト作成

## 📄 ライセンス

MIT License