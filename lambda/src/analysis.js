const AWS = require('aws-sdk');

// AWS サービスの初期化
const bedrock = new AWS.BedrockRuntime({ region: process.env.REGION || 'ap-northeast-1' });
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// 環境変数
const BUCKET_NAME = process.env.VIDEO_BUCKET_NAME;
const TABLE_NAME = process.env.VIDEO_ANALYSIS_TABLE_NAME;
const REGION = process.env.REGION || 'ap-northeast-1';
const PEGASUS_MODEL_ID = process.env.PEGASUS_MODEL_ID || 'twelvelabs.pegasus-1-2';

// CORS ヘッダー
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
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
const getVideoInfo = async (videoId) => {
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
        console.error('Failed to get video info:', error);
        throw error;
    }
};

// ビデオ解析ステータスを更新
const updateAnalysisStatus = async (videoId, status, analysisResult = null, error = null) => {
    const updateData = {
        status,
        updatedAt: new Date().toISOString()
    };
    
    if (analysisResult) {
        updateData.analysisResult = analysisResult;
        updateData.analyzedAt = new Date().toISOString();
    }
    
    if (error) {
        updateData.error = error;
        updateData.errorAt = new Date().toISOString();
    }
    
    const params = {
        TableName: TABLE_NAME,
        Key: { videoId },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':status': status,
            ':updatedAt': updateData.updatedAt
        }
    };
    
    // 追加フィールドの設定
    if (analysisResult) {
        params.UpdateExpression += ', analysisResult = :analysisResult, analyzedAt = :analyzedAt';
        params.ExpressionAttributeValues[':analysisResult'] = analysisResult;
        params.ExpressionAttributeValues[':analyzedAt'] = updateData.analyzedAt;
    }
    
    if (error) {
        params.UpdateExpression += ', #error = :error, errorAt = :errorAt';
        params.ExpressionAttributeNames['#error'] = 'error';
        params.ExpressionAttributeValues[':error'] = error;
        params.ExpressionAttributeValues[':errorAt'] = updateData.errorAt;
    }
    
    try {
        await dynamodb.update(params).promise();
        console.log(`Updated analysis status for ${videoId}: ${status}`);
    } catch (error) {
        console.error('Failed to update analysis status:', error);
        throw error;
    }
};

// S3から動画ファイルのプリサインドURLを生成
const generateVideoUrl = async (s3Key) => {
    const params = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Expires: 3600 // 1時間
    };
    
    try {
        const url = await s3.getSignedUrlPromise('getObject', params);
        console.log('Generated video URL for analysis:', s3Key);
        return url;
    } catch (error) {
        console.error('Failed to generate video URL:', error);
        throw new Error('動画URLの生成に失敗しました');
    }
};

// Bedrock TwelveLabs Pegasus 1.2で動画解析
const analyzeVideoWithBedrock = async (videoUrl, fileName) => {
    // TwelveLabs Pegasus 1.2用のプロンプト構築
    const prompt = {
        video_url: videoUrl,
        tasks: [
            "summarize", // 動画の要約
            "extract_topics", // トピック抽出
            "detect_scenes", // シーン検出
            "transcribe" // 音声転写（可能な場合）
        ],
        options: {
            language: "ja", // 日本語での解析
            detail_level: "medium",
            include_timestamps: true
        }
    };
    
    const bedrockParams = {
        modelId: PEGASUS_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            prompt: `動画を解析してください。以下の情報を日本語で提供してください：
1. 動画の概要・要約
2. 主要なトピックやテーマ
3. 重要なシーンやハイライト
4. 音声がある場合は主要な内容

動画ファイル: ${fileName}
解析設定: ${JSON.stringify(prompt)}`,
            max_tokens: 2000,
            temperature: 0.3,
            top_p: 0.9
        })
    };
    
    try {
        console.log('Starting Bedrock analysis for:', fileName);
        const response = await bedrock.invokeModel(bedrockParams).promise();
        
        const responseBody = JSON.parse(response.body.toString());
        console.log('Bedrock analysis completed');
        
        // レスポンスの構造化
        const analysisResult = {
            summary: responseBody.completion || responseBody.text || '動画の解析が完了しました',
            topics: extractTopics(responseBody.completion || responseBody.text || ''),
            scenes: extractScenes(responseBody.completion || responseBody.text || ''),
            metadata: {
                modelId: PEGASUS_MODEL_ID,
                analysisDate: new Date().toISOString(),
                fileName: fileName,
                language: 'ja'
            },
            rawResponse: responseBody
        };
        
        return analysisResult;
        
    } catch (error) {
        console.error('Bedrock analysis failed:', error);
        
        // モックレスポンス（開発・テスト用）
        if (process.env.ENABLE_MOCK === 'true') {
            console.log('Using mock analysis response');
            return {
                summary: `動画「${fileName}」の解析が完了しました。この動画には興味深いコンテンツが含まれており、視聴者にとって価値のある情報が提供されています。`,
                topics: ['動画コンテンツ', 'メディア解析', 'AI技術'],
                scenes: [
                    { timestamp: '00:00:00', description: '動画開始' },
                    { timestamp: '00:01:30', description: 'メインコンテンツ' },
                    { timestamp: '00:03:00', description: '動画終了' }
                ],
                metadata: {
                    modelId: 'mock-pegasus-1-2',
                    analysisDate: new Date().toISOString(),
                    fileName: fileName,
                    language: 'ja',
                    mock: true
                }
            };
        }
        
        throw new Error(`動画解析に失敗しました: ${error.message}`);
    }
};

// テキストからトピックを抽出
const extractTopics = (text) => {
    // 簡単なキーワード抽出（実際の実装ではより高度な処理が必要）
    const keywords = text.match(/[ァ-ヶー]+|[一-龯]+|[a-zA-Z]+/g) || [];
    const uniqueKeywords = [...new Set(keywords)]
        .filter(word => word.length > 2)
        .slice(0, 10);
    
    return uniqueKeywords.length > 0 ? uniqueKeywords : ['動画コンテンツ'];
};

// テキストからシーン情報を抽出
const extractScenes = (text) => {
    // タイムスタンプパターンを検索
    const timePattern = /(\d{2}:\d{2}:\d{2})/g;
    const timestamps = text.match(timePattern) || [];
    
    if (timestamps.length > 0) {
        return timestamps.map((time, index) => ({
            timestamp: time,
            description: `シーン ${index + 1}`
        }));
    }
    
    // デフォルトのシーン情報
    return [
        { timestamp: '00:00:00', description: '動画開始' },
        { timestamp: '00:01:00', description: 'メインコンテンツ' }
    ];
};

// メインハンドラー
exports.handler = async (event) => {
    console.log('Analysis handler called:', JSON.stringify(event, null, 2));
    
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
            return createErrorResponse(400, 'Invalid JSON in request body', 'INVALID_JSON');
        }
        
        const { videoId, action } = requestBody;
        
        // 必須パラメータのチェック
        if (!videoId) {
            return createErrorResponse(400, 'videoId is required', 'MISSING_VIDEO_ID');
        }
        
        // ビデオ情報を取得
        const videoInfo = await getVideoInfo(videoId);
        
        if (videoInfo.status === 'analyzing') {
            return createResponse(200, {
                success: true,
                message: '解析は既に進行中です',
                videoId,
                status: 'analyzing'
            });
        }
        
        if (videoInfo.status === 'completed' && videoInfo.analysisResult) {
            return createResponse(200, {
                success: true,
                message: '解析は既に完了しています',
                videoId,
                status: 'completed',
                analysisResult: videoInfo.analysisResult
            });
        }
        
        // 解析開始
        await updateAnalysisStatus(videoId, 'analyzing');
        
        try {
            // S3から動画URLを生成
            const videoUrl = await generateVideoUrl(videoInfo.s3Key);
            
            // Bedrockで動画解析
            const analysisResult = await analyzeVideoWithBedrock(videoUrl, videoInfo.fileName);
            
            // 解析結果を保存
            await updateAnalysisStatus(videoId, 'completed', analysisResult);
            
            return createResponse(200, {
                success: true,
                message: '動画解析が完了しました',
                videoId,
                status: 'completed',
                analysisResult
            });
            
        } catch (analysisError) {
            // 解析エラーを記録
            await updateAnalysisStatus(videoId, 'failed', null, analysisError.message);
            throw analysisError;
        }
        
    } catch (error) {
        console.error('Analysis handler error:', error);
        
        // AWS サービスエラーの詳細処理
        if (error.code) {
            switch (error.code) {
                case 'ResourceNotFoundException':
                    return createErrorResponse(404, '動画が見つかりません', 'VIDEO_NOT_FOUND');
                case 'AccessDenied':
                    return createErrorResponse(500, 'Bedrockサービスへのアクセスが拒否されました', 'BEDROCK_ACCESS_DENIED');
                case 'ThrottlingException':
                    return createErrorResponse(429, 'リクエストが多すぎます。しばらく待ってから再試行してください', 'THROTTLING');
                default:
                    return createErrorResponse(500, `AWS サービスエラー: ${error.message}`, error.code);
            }
        }
        
        return createErrorResponse(500, error.message || '動画解析中に内部エラーが発生しました', 'ANALYSIS_ERROR');
    }
};