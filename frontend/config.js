// API設定
const CONFIG = {
    // API Gateway URL
    API_BASE_URL: 'https://a2k8m1yy62.execute-api.ap-northeast-1.amazonaws.com/dev',
    
    // エンドポイント
    ENDPOINTS: {
        LIMITS: '/limits',
        UPLOAD: '/upload',
        ANALYSIS: '/analysis',
        QUERY: '/query',
        STATUS: '/status'
    },
    
    // ファイル制限
    FILE_LIMITS: {
        MAX_SIZE: 100 * 1024 * 1024, // 100MB
        ALLOWED_TYPES: ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'],
        ALLOWED_EXTENSIONS: ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    },
    
    // UI設定
    UI: {
        UPLOAD_TIMEOUT: 300000, // 5分
        ANALYSIS_TIMEOUT: 900000, // 15分
        POLLING_INTERVAL: 2000, // 2秒
        MAX_RETRIES: 3
    },
    
    // メッセージ
    MESSAGES: {
        UPLOAD_SUCCESS: 'ファイルのアップロードが完了しました',
        UPLOAD_ERROR: 'ファイルのアップロードに失敗しました',
        ANALYSIS_START: '動画解析を開始しています...',
        ANALYSIS_PROGRESS: '動画を解析中です...',
        ANALYSIS_COMPLETE: '動画解析が完了しました',
        ANALYSIS_ERROR: '動画解析に失敗しました',
        QUERY_SUCCESS: '質問への回答を取得しました',
        QUERY_ERROR: '質問の処理に失敗しました',
        FILE_TOO_LARGE: 'ファイルサイズが制限を超えています',
        FILE_TYPE_ERROR: 'サポートされていないファイル形式です',
        NETWORK_ERROR: 'ネットワークエラーが発生しました',
        UNKNOWN_ERROR: '予期しないエラーが発生しました'
    },
    
    // デバッグ設定
    DEBUG: true
};

// ユーティリティ関数
const Utils = {
    // ファイルサイズをフォーマット
    formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // 時間をフォーマット
    formatTime: (date) => {
        return new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(date);
    },
    
    // ファイル拡張子を取得
    getFileExtension: (filename) => {
        return filename.toLowerCase().substring(filename.lastIndexOf('.'));
    },
    
    // ファイルタイプを検証
    validateFileType: (file) => {
        const extension = Utils.getFileExtension(file.name);
        return CONFIG.FILE_LIMITS.ALLOWED_TYPES.includes(file.type) ||
               CONFIG.FILE_LIMITS.ALLOWED_EXTENSIONS.includes(extension);
    },
    
    // ファイルサイズを検証
    validateFileSize: (file) => {
        return file.size <= CONFIG.FILE_LIMITS.MAX_SIZE;
    },
    
    // UUIDを生成
    generateUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    // ログ出力
    log: (message, data = null) => {
        if (CONFIG.DEBUG) {
            console.log(`[Bedrock Video Analyzer] ${message}`, data || '');
        }
    },
    
    // エラーログ出力
    error: (message, error = null) => {
        console.error(`[Bedrock Video Analyzer ERROR] ${message}`, error || '');
    }
};

// エクスポート（モジュール環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, Utils };
}