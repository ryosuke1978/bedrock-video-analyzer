const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// AWS サービスの初期化
AWS.config.update({ region: process.env.REGION || 'ap-northeast-1' });
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// 環境変数
const BUCKET_NAME = process.env.VIDEO_BUCKET_NAME;
const TABLE_NAME = process.env.VIDEO_ANALYSIS_TABLE_NAME;
const REGION = process.env.REGION || 'ap-northeast-1';

// CORS ヘッダー
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
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

// ファイル検証
const validateFile = (fileName, fileSize) => {
    const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    
    // ファイル拡張子チェック
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
        throw new Error('サポートされていないファイル形式です');
    }
    
    // ファイルサイズチェック
    if (fileSize > maxFileSize) {
        throw new Error('ファイルサイズが制限を超えています（最大100MB）');
    }
    
    return true;
};

// プリサインドURL生成
const generatePresignedUrl = async (videoId, fileName, fileSize) => {
    const key = `uploads/${videoId}/${fileName}`;
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
        Expires: 3600, // 1時間
        ContentType: 'video/*'
    };
    
    console.log('Generating presigned URL with params:', JSON.stringify(params, null, 2));
    
    try {
        const presignedUrl = await s3.getSignedUrlPromise('putObject', params);
        console.log('Successfully generated presigned URL for:', key);
        return { presignedUrl, s3Key: key };
    } catch (error) {
        console.error('Failed to generate presigned URL:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        throw new Error(`アップロードURLの生成に失敗しました: ${error.message}`);
    }
};

// DynamoDBにビデオ情報を保存
const saveVideoInfo = async (videoId, fileName, fileSize, s3Key) => {
    const item = {
        videoId,
        fileName,
        fileSize,
        s3Key,
        status: 'uploaded',
        uploadTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
            originalFileName: fileName,
            uploadSource: 'web-ui',
            region: REGION
        }
    };
    
    const params = {
        TableName: TABLE_NAME,
        Item: item
    };
    
    try {
        await dynamodb.put(params).promise();
        console.log('Saved video info to DynamoDB:', videoId);
        return item;
    } catch (error) {
        console.error('Failed to save video info:', error);
        throw new Error('動画情報の保存に失敗しました');
    }
};

// メインハンドラー
exports.handler = async (event) => {
    console.log('Upload handler called:', JSON.stringify(event, null, 2));
    console.log('Environment variables:', {
        BUCKET_NAME,
        TABLE_NAME,
        REGION
    });
    
    try {
        // OPTIONS リクエストの処理
        if (event.httpMethod === 'OPTIONS') {
            return createResponse(200, { message: 'CORS preflight' });
        }
        
        // POST リクエストのみ許可
        if (event.httpMethod !== 'POST') {
            return createErrorResponse(405, 'Method Not Allowed', 'METHOD_NOT_ALLOWED');
        }
        
        // リクエストボディの解析
        let requestBody;
        try {
            requestBody = JSON.parse(event.body || '{}');
        } catch (error) {
            console.error('JSON parse error:', error);
            return createErrorResponse(400, 'Invalid JSON in request body', 'INVALID_JSON');
        }
        
        const { fileName, fileSize, contentType } = requestBody;
        console.log('Request parameters:', { fileName, fileSize, contentType });
        
        // 必須パラメータのチェック
        if (!fileName || !fileSize) {
            return createErrorResponse(400, 'fileName and fileSize are required', 'MISSING_PARAMETERS');
        }
        
        // 環境変数チェック
        if (!BUCKET_NAME || !TABLE_NAME) {
            console.error('Missing environment variables:', { BUCKET_NAME, TABLE_NAME });
            return createErrorResponse(500, 'サーバー設定エラー', 'CONFIG_ERROR');
        }
        
        // ファイル検証
        try {
            validateFile(fileName, fileSize);
        } catch (error) {
            console.error('File validation error:', error);
            return createErrorResponse(400, error.message, 'VALIDATION_ERROR');
        }
        
        // ビデオIDを生成
        const videoId = uuidv4();
        console.log('Generated videoId:', videoId);
        
        // プリサインドURL生成
        let presignedUrl, s3Key;
        try {
            const result = await generatePresignedUrl(videoId, fileName, fileSize);
            presignedUrl = result.presignedUrl;
            s3Key = result.s3Key;
            console.log('Generated presigned URL for key:', s3Key);
        } catch (error) {
            console.error('Presigned URL generation error:', error);
            return createErrorResponse(500, 'アップロードURLの生成に失敗しました', 'PRESIGNED_URL_ERROR');
        }
        
        // DynamoDBに情報保存
        let videoInfo;
        try {
            videoInfo = await saveVideoInfo(videoId, fileName, fileSize, s3Key);
            console.log('Saved video info successfully');
        } catch (error) {
            console.error('DynamoDB save error:', error);
            return createErrorResponse(500, '動画情報の保存に失敗しました', 'DYNAMODB_ERROR');
        }
        
        // 成功レスポンス
        return createResponse(200, {
            success: true,
            videoId,
            presignedUrl,
            uploadUrl: presignedUrl,
            s3Key,
            expiresIn: 3600,
            message: 'アップロード用URLを生成しました',
            videoInfo: {
                videoId: videoInfo.videoId,
                fileName: videoInfo.fileName,
                fileSize: videoInfo.fileSize,
                status: videoInfo.status,
                createdAt: videoInfo.createdAt
            }
        });
        
    } catch (error) {
        console.error('Upload handler error:', error);
        console.error('Error stack:', error.stack);
        
        // AWS サービスエラーの詳細処理
        if (error.code) {
            console.error('AWS Error Code:', error.code);
            switch (error.code) {
                case 'NoSuchBucket':
                    return createErrorResponse(500, 'ストレージバケットが見つかりません', 'BUCKET_NOT_FOUND');
                case 'AccessDenied':
                    return createErrorResponse(500, 'ストレージへのアクセスが拒否されました', 'ACCESS_DENIED');
                case 'ResourceNotFoundException':
                    return createErrorResponse(500, 'データベーステーブルが見つかりません', 'TABLE_NOT_FOUND');
                default:
                    return createErrorResponse(500, `AWS サービスエラー: ${error.message}`, error.code);
            }
        }
        
        return createErrorResponse(500, error.message || '内部サーバーエラーが発生しました', 'INTERNAL_ERROR');
    }
};