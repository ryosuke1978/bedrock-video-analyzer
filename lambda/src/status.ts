import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { 
  VideoAnalyzerError, 
  ErrorType, 
  createErrorResponse, 
  withErrorHandling,
  retryWithExponentialBackoff,
  DEFAULT_RETRY_CONFIG
} from './utils/error-handler';

const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// メインハンドラー（包括的エラーハンドリング付き）
const statusHandlerCore = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Status request received:', JSON.stringify(event, null, 2));

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    const videoId = event.queryStringParameters?.videoId;

    if (!videoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'videoIdクエリパラメータが必要です' })
      };
    }

    // DynamoDBから動画情報を取得
    const getCommand = new GetCommand({
      TableName: process.env.VIDEO_ANALYSIS_TABLE_NAME,
      Key: { videoId }
    });

    const result = await docClient.send(getCommand);
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: '動画が見つかりません' })
      };
    }

    const videoInfo = result.Item;

    // 推定残り時間の計算（モック）
    let estimatedTimeRemaining = 0;
    if (videoInfo.status === 'ANALYZING') {
      const progress = videoInfo.progress || 0;
      if (progress > 0 && progress < 100) {
        // 簡単な推定：現在の進行状況から残り時間を計算
        const elapsedTime = Date.now() - new Date(videoInfo.updatedAt).getTime();
        const totalEstimatedTime = (elapsedTime / progress) * 100;
        estimatedTimeRemaining = Math.max(0, totalEstimatedTime - elapsedTime);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        videoId: videoInfo.videoId,
        fileName: videoInfo.fileName,
        status: videoInfo.status,
        progress: videoInfo.progress || 0,
        progressMessage: videoInfo.progressMessage || '',
        estimatedTimeRemaining: Math.round(estimatedTimeRemaining / 1000), // 秒単位
        retryCount: videoInfo.retryCount || 0,
        errorMessage: videoInfo.errorMessage || null,
        createdAt: videoInfo.createdAt,
        updatedAt: videoInfo.updatedAt,
        basicAnalysis: videoInfo.basicAnalysis,
        prTexts: videoInfo.prTexts,
        summaries: videoInfo.summaries
      })
    };

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  const videoId = event.queryStringParameters?.videoId;

  if (!videoId) {
    throw new VideoAnalyzerError(
      ErrorType.VALIDATION_ERROR,
      'videoIdクエリパラメータが必要です',
      400
    );
  }

  // DynamoDBから動画情報を取得（リトライ付き）
  const result = await retryWithExponentialBackoff(
    async () => {
      const getCommand = new GetCommand({
        TableName: process.env.VIDEO_ANALYSIS_TABLE_NAME,
        Key: { videoId }
      });
      return await docClient.send(getCommand);
    },
    DEFAULT_RETRY_CONFIG,
    'status-fetch'
  );

  if (!result.Item) {
    throw new VideoAnalyzerError(
      ErrorType.RESOURCE_NOT_FOUND,
      '動画が見つかりません',
      404
    );
  }

  const videoInfo = result.Item;

  // 推定残り時間の計算
  let estimatedTimeRemaining = 0;
  if (videoInfo.status === 'ANALYZING' && videoInfo.progress < 100) {
    const elapsedTime = Date.now() - new Date(videoInfo.createdAt).getTime();
    const progressRate = videoInfo.progress / 100;
    if (progressRate > 0) {
      const totalEstimatedTime = elapsedTime / progressRate;
      estimatedTimeRemaining = totalEstimatedTime - elapsedTime;
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      videoId,
      status: videoInfo.status,
      progress: videoInfo.progress || 0,
      progressMessage: videoInfo.progressMessage || '',
      estimatedTimeRemaining: Math.round(estimatedTimeRemaining / 1000), // 秒単位
      retryCount: videoInfo.retryCount || 0,
      errorMessage: videoInfo.errorMessage || null,
      createdAt: videoInfo.createdAt,
      updatedAt: videoInfo.updatedAt,
      basicAnalysis: videoInfo.basicAnalysis,
      prTexts: videoInfo.prTexts,
      summaries: videoInfo.summaries
    })
  };
};

// 包括的エラーハンドリング付きのメインハンドラー
export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      return await statusHandlerCore(event);
    } catch (error) {
      return createErrorResponse(error, event.requestContext?.requestId);
    }
  },
  'status-handler'
);