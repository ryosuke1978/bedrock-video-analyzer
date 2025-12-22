const AWS = require('aws-sdk');

// AWS サービスの初期化
const dynamodb = new AWS.DynamoDB.DocumentClient();

// 環境変数
const TABLE_NAME = process.env.VIDEO_ANALYSIS_TABLE_NAME;
const REGION = process.env.REGION || 'ap-northeast-1';

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

// エラーレスポンス作成
const createErrorResponse = (statusCode, message, errorCode = null) => {
    console.error(`Error ${statusCode}: ${message}`, errorCode);
    return createResponse(statusCode, {
        error: true,
        message,
        errorCode,
        timestamp: new Date().toISOString()
    });
};

// DynamoDBからビデオ情報を取得
const getVideoStatus = async (videoId) => {
    const params = {
        TableName: TABLE_NAME,
        Key: { videoId }
    };
    
    try {
        const result = await dynamodb.get(params).promise();
        if (!result.Item) {
            throw new Error('動画が見つかりません');
        }
        return result.Item;
    } catch (error) {
        console.error('Failed to get video status:', error);
        throw error;
    }
};

// ステータスメッセージを生成
const generateStatusMessage = (status, videoInfo) => {
    const messages = {
        'uploaded': '動画のアップロードが完了しました。解析を開始してください。',
        'analyzing': '動画を解析中です。しばらくお待ちください。',
        'completed': '動画の解析が完了しました。質問をお送りください。',
        'failed': '動画の解析に失敗しました。再度お試しください。',
        'error': 'エラーが発生しました。サポートにお問い合わせください。'
    };
    
    return messages[status] || '不明なステータスです。';
};

// 進捗率を計算
const calculateProgress = (status, videoInfo) => {
    const progressMap = {
        'uploaded': 25,
        'analyzing': 75,
        'completed': 100,
        'failed': 0,
        'error': 0
    };
    
    return progressMap[status] || 0;
};

// 推定残り時間を計算
const estimateTimeRemaining = (status, videoInfo) => {
    if (status === 'completed' || status === 'failed' || status === 'error') {
        return 0;
    }
    
    if (status === 'analyzing') {
        // ファイルサイズに基づく推定（大まかな計算）
        const fileSizeMB = (videoInfo.fileSize || 0) / (1024 * 1024);
        const estimatedMinutes = Math.max(1, Math.ceil(fileSizeMB / 10)); // 10MB/分と仮定
        return estimatedMinutes * 60; // 秒単位で返す
    }
    
    return 300; // デフォルト5分
};

// メインハンドラー
exports.handler = async (event) => {
    console.log('Status handler called:', JSON.stringify(event, null, 2));
    
    try {
        // OPTIONS リクエストの処理
        if (event.httpMethod === 'OPTIONS') {
            return createResponse(200, { message: 'CORS preflight' });
        }
        
        // GET リクエストのみ許可
        if (event.httpMethod !== 'GET') {
            return createErrorResponse(405, 'Method Not Allowed', 'METHOD_NOT_ALLOWED');
        }
        
        // クエリパラメータからvideoIdを取得
        const videoId = event.queryStringParameters?.videoId;
        
        if (!videoId) {
            return createErrorResponse(400, 'videoId query parameter is required', 'MISSING_VIDEO_ID');
        }
        
        // ビデオ情報を取得
        const videoInfo = await getVideoStatus(videoId);
        
        // ステータス情報を構築
        const status = videoInfo.status || 'unknown';
        const progress = calculateProgress(status, videoInfo);
        const message = generateStatusMessage(status, videoInfo);
        const estimatedTimeRemaining = estimateTimeRemaining(status, videoInfo);
        
        // レスポンスデータを構築
        const responseData = {
            success: true,
            videoId,
            status,
            message,
            progress,
            estimatedTimeRemaining,
            videoInfo: {
                fileName: videoInfo.fileName,
                fileSize: videoInfo.fileSize,
                uploadTimestamp: videoInfo.uploadTimestamp,
                createdAt: videoInfo.createdAt,
                updatedAt: videoInfo.updatedAt
            },
            timestamps: {
                uploaded: videoInfo.createdAt,
                updated: videoInfo.updatedAt,
                analyzed: videoInfo.analyzedAt || null,
                error: videoInfo.errorAt || null
            }
        };
        
        // ステータス別の追加情報
        switch (status) {
            case 'completed':
                if (videoInfo.analysisResult) {
                    responseData.analysisResult = {
                        summary: videoInfo.analysisResult.summary,
                        topicsCount: videoInfo.analysisResult.topics?.length || 0,
                        scenesCount: videoInfo.analysisResult.scenes?.length || 0,
                        hasTranscription: !!videoInfo.analysisResult.transcription
                    };
                }
                break;
                
            case 'failed':
            case 'error':
                if (videoInfo.error) {
                    responseData.error = {
                        message: videoInfo.error,
                        timestamp: videoInfo.errorAt
                    };
                }
                break;
                
            case 'analyzing':
                responseData.analysisInfo = {
                    startedAt: videoInfo.updatedAt,
                    estimatedCompletion: new Date(Date.now() + estimatedTimeRemaining * 1000).toISOString()
                };
                break;
        }
        
        return createResponse(200, responseData);
        
    } catch (error) {
        console.error('Status handler error:', error);
        
        // AWS サービスエラーの詳細処理
        if (error.code) {
            switch (error.code) {
                case 'ResourceNotFoundException':
                    return createErrorResponse(404, '動画が見つかりません', 'VIDEO_NOT_FOUND');
                case 'AccessDenied':
                    return createErrorResponse(500, 'データベースへのアクセスが拒否されました', 'ACCESS_DENIED');
                default:
                    return createErrorResponse(500, `AWS サービスエラー: ${error.message}`, error.code);
            }
        }
        
        return createErrorResponse(500, error.message || 'ステータス取得中に内部エラーが発生しました', 'STATUS_ERROR');
    }
};