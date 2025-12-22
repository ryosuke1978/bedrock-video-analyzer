// 環境変数
const REGION = process.env.REGION || 'ap-northeast-1';
const MAX_FILE_SIZE_BYTES = parseInt(process.env.MAX_FILE_SIZE_BYTES || '104857600'); // 100MB
const MAX_DURATION_SECONDS = parseInt(process.env.MAX_DURATION_SECONDS || '3600'); // 1時間

// CORS ヘッダー
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
};

// レスポンス作成ヘルパー
const createResponse = (statusCode, body) => ({
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
});

// ファイルサイズをフォーマット
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 時間をフォーマット
const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}時間${minutes > 0 ? minutes + '分' : ''}`;
    } else if (minutes > 0) {
        return `${minutes}分`;
    } else {
        return `${seconds}秒`;
    }
};

// メインハンドラー
exports.handler = async (event) => {
    console.log('Limits handler called:', JSON.stringify(event, null, 2));
    
    try {
        // OPTIONS リクエストの処理
        if (event.httpMethod === 'OPTIONS') {
            return createResponse(200, { message: 'CORS preflight' });
        }
        
        // GET リクエストのみ許可
        if (event.httpMethod !== 'GET') {
            return createResponse(405, {
                error: true,
                message: 'Method Not Allowed',
                allowedMethods: ['GET', 'OPTIONS']
            });
        }
        
        // システム制限情報
        const limits = {
            // ファイル制限
            file: {
                maxSize: formatFileSize(MAX_FILE_SIZE_BYTES),
                maxSizeBytes: MAX_FILE_SIZE_BYTES,
                supportedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
                supportedMimeTypes: [
                    'video/mp4',
                    'video/quicktime',
                    'video/x-msvideo',
                    'video/x-matroska',
                    'video/webm'
                ]
            },
            
            // 動画制限
            video: {
                maxDuration: formatDuration(MAX_DURATION_SECONDS),
                maxDurationSeconds: MAX_DURATION_SECONDS,
                supportedCodecs: ['H.264', 'H.265', 'VP8', 'VP9'],
                recommendedResolution: '1920x1080 (Full HD) 以下'
            },
            
            // API制限
            api: {
                uploadTimeout: '5分',
                analysisTimeout: '15分',
                queryTimeout: '30秒',
                maxConcurrentUploads: 5,
                maxConcurrentAnalysis: 3
            },
            
            // 地域制限
            regions: {
                supported: ['ap-northeast-1'],
                current: REGION,
                bedrockAvailable: ['ap-northeast-1', 'us-east-1', 'us-west-2']
            },
            
            // 機能制限
            features: {
                videoAnalysis: true,
                questionAnswering: true,
                sceneDetection: true,
                topicExtraction: true,
                transcription: false, // 現在未対応
                multiLanguage: false  // 現在日本語のみ
            },
            
            // システム情報
            system: {
                version: '1.0.0',
                lastUpdated: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                mockMode: process.env.ENABLE_MOCK === 'true'
            }
        };
        
        return createResponse(200, {
            success: true,
            limits,
            message: 'システム制限情報を取得しました',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Limits handler error:', error);
        
        return createResponse(500, {
            error: true,
            message: '制限情報の取得中にエラーが発生しました',
            errorCode: 'LIMITS_ERROR',
            timestamp: new Date().toISOString()
        });
    }
};