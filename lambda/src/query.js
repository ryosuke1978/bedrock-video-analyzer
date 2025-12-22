const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// AWS サービスの初期化
const bedrock = new AWS.BedrockRuntime({ region: process.env.REGION || 'ap-northeast-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient();

// 環境変数
const VIDEO_ANALYSIS_TABLE = process.env.VIDEO_ANALYSIS_TABLE_NAME;
const QUERY_HISTORY_TABLE = process.env.QUERY_HISTORY_TABLE_NAME;
const REGION = process.env.REGION || 'ap-northeast-1';
const PEGASUS_MODEL_ID = process.env.PEGASUS_MODEL_ID || 'twelvelabs.pegasus-1-2';

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

// 動画解析結果を取得
const getVideoAnalysis = async (videoId) => {
    const params = {
        TableName: VIDEO_ANALYSIS_TABLE,
        Key: { videoId }
    };
    
    try {
        const result = await dynamodb.get(params).promise();
        if (!result.Item) {
            throw new Error('動画が見つかりません');
        }
        
        if (result.Item.status !== 'completed' || !result.Item.analysisResult) {
            throw new Error('動画の解析が完了していません');
        }
        
        return result.Item;
    } catch (error) {
        console.error('Failed to get video analysis:', error);
        throw error;
    }
};

// 質問履歴を保存
const saveQueryHistory = async (videoId, question, answer, queryId) => {
    const item = {
        videoId,
        queryId,
        question,
        answer,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
        ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90日後に削除
    };
    
    const params = {
        TableName: QUERY_HISTORY_TABLE,
        Item: item
    };
    
    try {
        await dynamodb.put(params).promise();
        console.log('Saved query history:', queryId);
        return item;
    } catch (error) {
        console.error('Failed to save query history:', error);
        throw error;
    }
};

// 過去の質問履歴を取得
const getQueryHistory = async (videoId, limit = 5) => {
    const params = {
        TableName: QUERY_HISTORY_TABLE,
        KeyConditionExpression: 'videoId = :videoId',
        ExpressionAttributeValues: {
            ':videoId': videoId
        },
        ScanIndexForward: false, // 新しい順
        Limit: limit
    };
    
    try {
        const result = await dynamodb.query(params).promise();
        return result.Items || [];
    } catch (error) {
        console.error('Failed to get query history:', error);
        return [];
    }
};

// Bedrockで質問応答
const queryVideoWithBedrock = async (videoAnalysis, question, queryHistory = []) => {
    // コンテキスト情報の構築
    const context = {
        videoInfo: {
            fileName: videoAnalysis.fileName,
            summary: videoAnalysis.analysisResult.summary,
            topics: videoAnalysis.analysisResult.topics,
            scenes: videoAnalysis.analysisResult.scenes
        },
        previousQueries: queryHistory.slice(0, 3).map(q => ({
            question: q.question,
            answer: q.answer
        }))
    };
    
    // プロンプトの構築
    const prompt = `あなたは動画解析の専門家です。以下の動画について質問に答えてください。

動画情報:
- ファイル名: ${context.videoInfo.fileName}
- 概要: ${context.videoInfo.summary}
- 主要トピック: ${context.videoInfo.topics.join(', ')}
- シーン情報: ${context.videoInfo.scenes.map(s => `${s.timestamp}: ${s.description}`).join(', ')}

${context.previousQueries.length > 0 ? `
過去の質問と回答:
${context.previousQueries.map((q, i) => `Q${i+1}: ${q.question}\nA${i+1}: ${q.answer}`).join('\n\n')}
` : ''}

質問: ${question}

上記の動画情報に基づいて、質問に対して正確で有用な回答を日本語で提供してください。動画の内容に関連しない質問の場合は、動画の内容について説明してください。`;

    const bedrockParams = {
        modelId: PEGASUS_MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            prompt: prompt,
            max_tokens: 1000,
            temperature: 0.7,
            top_p: 0.9,
            stop_sequences: ["\n\n質問:", "\n\nQ:"]
        })
    };
    
    try {
        console.log('Querying Bedrock for video question');
        const response = await bedrock.invokeModel(bedrockParams).promise();
        
        const responseBody = JSON.parse(response.body.toString());
        const answer = responseBody.completion || responseBody.text || '申し訳ございませんが、回答を生成できませんでした。';
        
        console.log('Bedrock query completed');
        return answer.trim();
        
    } catch (error) {
        console.error('Bedrock query failed:', error);
        
        // モックレスポンス（開発・テスト用）
        if (process.env.ENABLE_MOCK === 'true') {
            console.log('Using mock query response');
            return generateMockAnswer(question, context.videoInfo);
        }
        
        throw new Error(`質問の処理に失敗しました: ${error.message}`);
    }
};

// モック回答生成（開発・テスト用）
const generateMockAnswer = (question, videoInfo) => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('要約') || lowerQuestion.includes('内容')) {
        return `この動画「${videoInfo.fileName}」は、${videoInfo.summary}`;
    } else if (lowerQuestion.includes('時間') || lowerQuestion.includes('長さ')) {
        return `動画の詳細な時間情報は解析結果に含まれています。主要なシーンは${videoInfo.scenes.length}個確認されています。`;
    } else if (lowerQuestion.includes('トピック') || lowerQuestion.includes('テーマ')) {
        return `この動画の主要なトピックは以下の通りです: ${videoInfo.topics.join('、')}`;
    } else {
        return `ご質問「${question}」について、動画「${videoInfo.fileName}」の解析結果に基づいてお答えします。${videoInfo.summary} より詳細な情報が必要でしたら、具体的な質問をお聞かせください。`;
    }
};

// メインハンドラー
exports.handler = async (event) => {
    console.log('Query handler called:', JSON.stringify(event, null, 2));
    
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
        
        const { videoId, question } = requestBody;
        
        // 必須パラメータのチェック
        if (!videoId || !question) {
            return createErrorResponse(400, 'videoId and question are required', 'MISSING_PARAMETERS');
        }
        
        // 質問の長さチェック
        if (question.length > 500) {
            return createErrorResponse(400, '質問は500文字以内で入力してください', 'QUESTION_TOO_LONG');
        }
        
        // 動画解析結果を取得
        const videoAnalysis = await getVideoAnalysis(videoId);
        
        // 過去の質問履歴を取得
        const queryHistory = await getQueryHistory(videoId);
        
        // Bedrockで質問応答
        const answer = await queryVideoWithBedrock(videoAnalysis, question, queryHistory);
        
        // 質問履歴を保存
        const queryId = uuidv4();
        const historyItem = await saveQueryHistory(videoId, question, answer, queryId);
        
        return createResponse(200, {
            success: true,
            message: '質問への回答を生成しました',
            queryId,
            videoId,
            question,
            answer,
            timestamp: historyItem.timestamp,
            videoInfo: {
                fileName: videoAnalysis.fileName,
                status: videoAnalysis.status
            }
        });
        
    } catch (error) {
        console.error('Query handler error:', error);
        
        // AWS サービスエラーの詳細処理
        if (error.code) {
            switch (error.code) {
                case 'ResourceNotFoundException':
                    return createErrorResponse(404, '動画または解析結果が見つかりません', 'VIDEO_NOT_FOUND');
                case 'AccessDenied':
                    return createErrorResponse(500, 'Bedrockサービスへのアクセスが拒否されました', 'BEDROCK_ACCESS_DENIED');
                case 'ThrottlingException':
                    return createErrorResponse(429, 'リクエストが多すぎます。しばらく待ってから再試行してください', 'THROTTLING');
                case 'ValidationException':
                    return createErrorResponse(400, '入力データが無効です', 'VALIDATION_ERROR');
                default:
                    return createErrorResponse(500, `AWS サービスエラー: ${error.message}`, error.code);
            }
        }
        
        return createErrorResponse(500, error.message || '質問処理中に内部エラーが発生しました', 'QUERY_ERROR');
    }
};