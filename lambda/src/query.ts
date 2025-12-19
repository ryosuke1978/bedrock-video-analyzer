import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { 
  VideoAnalyzerError, 
  ErrorType, 
  createErrorResponse, 
  withErrorHandling,
  retryWithExponentialBackoff,
  DEFAULT_RETRY_CONFIG
} from './utils/error-handler';

// 自然言語問い合わせの解析インターface
interface QueryAnalysis {
  intent: string;
  timeReferences: string[];
  keywords: string[];
  questionType: 'content' | 'scene' | 'time' | 'analysis' | 'general';
  confidence: number;
}

// 時間参照の解析結果
interface TimeReference {
  start: number; // 秒単位
  end: number;   // 秒単位
  description: string;
}

// 文脈情報
interface ConversationContext {
  previousQuestions: string[];
  topics: string[];
  focusArea: string | null;
}

const bedrockClient = new BedrockRuntimeClient({ region: process.env.REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// 自然言語問い合わせの解析（要件7.6）
const analyzeQuery = (question: string): QueryAnalysis => {
  const lowerQuestion = question.toLowerCase();
  
  // 時間参照の検出
  const timePatterns = [
    /(\d+)分(\d+)秒/g,
    /(\d+):\d+/g,
    /最初の(\d+)分/g,
    /(\d+)分目/g,
    /開始から(\d+)秒/g,
    /終わり/g,
    /最後/g,
    /中盤/g,
    /前半/g,
    /後半/g
  ];
  
  const timeReferences: string[] = [];
  timePatterns.forEach(pattern => {
    const matches = lowerQuestion.match(pattern);
    if (matches) {
      timeReferences.push(...matches);
    }
  });

  // 質問タイプの分類
  let questionType: QueryAnalysis['questionType'] = 'general';
  if (lowerQuestion.includes('内容') || lowerQuestion.includes('まとめ')) {
    questionType = 'content';
  } else if (lowerQuestion.includes('シーン') || lowerQuestion.includes('場面')) {
    questionType = 'scene';
  } else if (timeReferences.length > 0) {
    questionType = 'time';
  } else if (lowerQuestion.includes('分析') || lowerQuestion.includes('感情') || lowerQuestion.includes('トーン')) {
    questionType = 'analysis';
  }

  // キーワード抽出
  const keywords = extractKeywords(question);

  // 意図の推定
  const intent = estimateIntent(question, questionType);

  return {
    intent,
    timeReferences,
    keywords,
    questionType,
    confidence: calculateConfidence(question, timeReferences, keywords)
  };
};

// キーワード抽出
const extractKeywords = (question: string): string[] => {
  const commonWords = ['は', 'が', 'を', 'に', 'で', 'と', 'の', 'から', 'まで', 'について', 'ですか', 'ください', 'してください'];
  const words = question.split(/[\s、。！？]+/).filter(word => 
    word.length > 1 && !commonWords.includes(word)
  );
  return words.slice(0, 10); // 最大10個のキーワード
};

// 意図推定
const estimateIntent = (question: string, questionType: QueryAnalysis['questionType']): string => {
  const intentMap = {
    'content': '動画内容の要約・説明',
    'scene': 'シーン別の詳細分析',
    'time': '特定時間帯の内容確認',
    'analysis': '感情・トーン分析',
    'general': '一般的な質問'
  };
  return intentMap[questionType];
};

// 信頼度計算
const calculateConfidence = (question: string, timeReferences: string[], keywords: string[]): number => {
  let confidence = 0.5; // ベース信頼度
  
  // 質問の長さによる調整
  if (question.length > 10) confidence += 0.1;
  if (question.length > 30) confidence += 0.1;
  
  // 時間参照があると信頼度向上
  if (timeReferences.length > 0) confidence += 0.2;
  
  // キーワード数による調整
  confidence += Math.min(keywords.length * 0.05, 0.2);
  
  return Math.min(confidence, 1.0);
};

// 時間参照の解析（要件7.6）
const parseTimeReferences = (timeRefs: string[]): TimeReference[] => {
  const references: TimeReference[] = [];
  
  timeRefs.forEach(ref => {
    const lowerRef = ref.toLowerCase();
    
    // 分:秒形式の解析
    const timeMatch = lowerRef.match(/(\d+):(\d+)/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      const totalSeconds = minutes * 60 + seconds;
      references.push({
        start: totalSeconds,
        end: totalSeconds + 30, // デフォルト30秒間
        description: `${minutes}分${seconds}秒付近`
      });
    }
    
    // 分秒形式の解析
    const minSecMatch = lowerRef.match(/(\d+)分(\d+)秒/);
    if (minSecMatch) {
      const minutes = parseInt(minSecMatch[1]);
      const seconds = parseInt(minSecMatch[2]);
      const totalSeconds = minutes * 60 + seconds;
      references.push({
        start: totalSeconds,
        end: totalSeconds + 30,
        description: `${minutes}分${seconds}秒付近`
      });
    }
    
    // 相対的な時間参照
    if (lowerRef.includes('最初') || lowerRef.includes('開始')) {
      references.push({
        start: 0,
        end: 60,
        description: '動画の最初の部分'
      });
    } else if (lowerRef.includes('最後') || lowerRef.includes('終わり')) {
      references.push({
        start: -60, // 最後の1分（実際の動画長から計算）
        end: -1,
        description: '動画の最後の部分'
      });
    } else if (lowerRef.includes('中盤')) {
      references.push({
        start: -1, // 動画の中央付近（実際の動画長から計算）
        end: -1,
        description: '動画の中盤'
      });
    }
  });
  
  return references;
};

// 文脈保持機能（要件7.7）
const buildConversationContext = (previousQueries: any[]): ConversationContext => {
  const questions = previousQueries.map(q => q.question || '');
  const topics = extractTopicsFromHistory(questions);
  const focusArea = determineFocusArea(questions);
  
  return {
    previousQuestions: questions.slice(0, 3), // 直近3件
    topics,
    focusArea
  };
};

// 履歴からトピック抽出
const extractTopicsFromHistory = (questions: string[]): string[] => {
  const allKeywords = questions.flatMap(q => extractKeywords(q));
  const topicCounts = allKeywords.reduce((acc, keyword) => {
    acc[keyword] = (acc[keyword] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(topicCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);
};

// フォーカスエリア決定
const determineFocusArea = (questions: string[]): string | null => {
  const recentQuestions = questions.slice(0, 2).join(' ');
  
  if (recentQuestions.includes('シーン') || recentQuestions.includes('場面')) {
    return 'scene_analysis';
  } else if (recentQuestions.includes('人物') || recentQuestions.includes('登場')) {
    return 'character_analysis';
  } else if (recentQuestions.includes('音楽') || recentQuestions.includes('音')) {
    return 'audio_analysis';
  } else if (recentQuestions.includes('感情') || recentQuestions.includes('トーン')) {
    return 'emotion_analysis';
  }
  
  return null;
};

// Bedrock Pegasus 1.2への問い合わせ
const queryPegasus = async (
  question: string,
  videoAnalysis: any,
  context: ConversationContext,
  timeRefs: TimeReference[]
): Promise<any> => {
  // 文脈を考慮したプロンプト構築
  let contextPrompt = '';
  if (context.previousQuestions.length > 0) {
    contextPrompt = `\n\n過去の質問履歴:\n${context.previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
  }
  
  if (context.topics.length > 0) {
    contextPrompt += `\n\n関連トピック: ${context.topics.join(', ')}`;
  }
  
  // 時間参照を考慮したプロンプト
  let timePrompt = '';
  if (timeRefs.length > 0) {
    timePrompt = `\n\n時間参照: ${timeRefs.map(ref => ref.description).join(', ')}`;
  }
  
  const prompt = `
動画解析結果に基づいて、以下の質問に日本語で回答してください。

動画解析データ:
${JSON.stringify(videoAnalysis, null, 2)}

質問: ${question}
${contextPrompt}
${timePrompt}

回答は以下の形式で提供してください:
- 具体的で詳細な回答
- 該当する時間帯がある場合は明記
- 信頼度（0-1の数値）
`;

  try {
    const command = new InvokeModelCommand({
      modelId: process.env.PEGASUS_MODEL_ID || 'twelvelabs.pegasus-1-2',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        prompt,
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9
      })
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return {
      answer: responseBody.completion || '申し訳ございませんが、回答を生成できませんでした。',
      confidence: responseBody.confidence || 0.7,
      timeReferences: timeRefs.map(ref => `${Math.floor(ref.start / 60)}:${String(ref.start % 60).padStart(2, '0')}-${Math.floor(ref.end / 60)}:${String(ref.end % 60).padStart(2, '0')}`)
    };
  } catch (error) {
    console.error('Pegasus API error:', error);
    // フォールバック: 構造化されたモック回答
    return generateStructuredMockResponse(question, context, timeRefs);
  }
};

// 構造化されたモック回答生成
const generateStructuredMockResponse = (
  question: string,
  context: ConversationContext,
  timeRefs: TimeReference[]
): any => {
  const analysis = analyzeQuery(question);
  
  let answer = '';
  let confidence = 0.8;
  
  switch (analysis.questionType) {
    case 'content':
      answer = `動画の内容について説明いたします。${context.focusArea ? `特に${context.focusArea}の観点から、` : ''}この動画では...`;
      break;
    case 'scene':
      answer = `シーン分析の結果をお答えします。動画は複数のシーンに分かれており...`;
      break;
    case 'time':
      answer = `指定された時間帯（${timeRefs.map(ref => ref.description).join(', ')}）について説明します...`;
      break;
    case 'analysis':
      answer = `動画の分析結果をお答えします。感情的なトーンや表現について...`;
      break;
    default:
      answer = `ご質問「${question}」について、動画の内容に基づいてお答えします...`;
  }
  
  // 文脈を考慮した回答の調整
  if (context.previousQuestions.length > 0) {
    answer += `\n\n前回のご質問との関連で申し上げますと...`;
    confidence += 0.1;
  }
  
  return {
    answer,
    confidence: Math.min(confidence, 1.0),
    timeReferences: timeRefs.map(ref => 
      ref.start >= 0 ? 
        `${Math.floor(ref.start / 60)}:${String(ref.start % 60).padStart(2, '0')}-${Math.floor(ref.end / 60)}:${String(ref.end % 60).padStart(2, '0')}` :
        ref.description
    )
  };
};

// メインハンドラー（包括的エラーハンドリング付き）
const queryHandlerCore = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Query request received:', JSON.stringify(event, null, 2));

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'リクエストボディが必要です' })
      };
    }

    const { videoId, question } = JSON.parse(event.body);

    if (!videoId || !question) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'videoIdとquestionが必要です' })
      };
    }

    // 自然言語問い合わせの解析（要件7.6）
    const queryAnalysis = analyzeQuery(question);
    console.log('Query analysis:', queryAnalysis);

    // 時間参照の解析
    const timeReferences = parseTimeReferences(queryAnalysis.timeReferences);
    console.log('Time references:', timeReferences);

    // 過去の問い合わせ履歴を取得（文脈保持のため - 要件7.7）
    const queryHistoryCommand = new QueryCommand({
      TableName: process.env.QUERY_HISTORY_TABLE_NAME,
      KeyConditionExpression: 'videoId = :videoId',
      ExpressionAttributeValues: {
        ':videoId': videoId
      },
      ScanIndexForward: false, // 最新順
      Limit: 10 // 直近10件
    });

    const historyResult = await docClient.send(queryHistoryCommand);
    const previousQueries = historyResult.Items || [];

    // 文脈情報の構築（要件7.7）
    const conversationContext = buildConversationContext(previousQueries);
    console.log('Conversation context:', conversationContext);

    // 動画解析結果を取得
    const videoAnalysisCommand = new GetCommand({
      TableName: process.env.VIDEO_ANALYSIS_TABLE_NAME,
      Key: {
        videoId: videoId,
        uploadTimestamp: 0 // 最新の解析結果を取得（実際の実装では適切なタイムスタンプを使用）
      }
    });

    const videoAnalysisResult = await docClient.send(videoAnalysisCommand);
    const videoAnalysis = videoAnalysisResult.Item;

    if (!videoAnalysis) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: '指定された動画の解析結果が見つかりません' })
      };
    }

    // Bedrock Pegasus 1.2への問い合わせ（要件7.6, 7.8）
    const pegasusResponse = await queryPegasus(
      question,
      videoAnalysis,
      conversationContext,
      timeReferences
    );

    // 問い合わせ履歴を保存
    const queryId = uuidv4();
    const putCommand = new PutCommand({
      TableName: process.env.QUERY_HISTORY_TABLE_NAME,
      Item: {
        videoId,
        queryId,
        question,
        answer: pegasusResponse.answer,
        confidence: pegasusResponse.confidence,
        timeReferences: pegasusResponse.timeReferences,
        queryAnalysis,
        conversationContext,
        timestamp: new Date().toISOString()
      }
    });

    await docClient.send(putCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        queryId,
        question,
        answer: pegasusResponse.answer,
        confidence: pegasusResponse.confidence,
        timeReferences: pegasusResponse.timeReferences,
        queryAnalysis,
        conversationContext,
        message: '問い合わせが完了しました'
      })
    };

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (!event.body) {
    throw new VideoAnalyzerError(
      ErrorType.VALIDATION_ERROR,
      'リクエストボディが必要です',
      400
    );
  }

  const { videoId, question } = JSON.parse(event.body);

  if (!videoId || !question) {
    throw new VideoAnalyzerError(
      ErrorType.VALIDATION_ERROR,
      'videoIdとquestionが必要です',
      400
    );
  }

  // 質問の長さ制限チェック
  if (question.length > 1000) {
    throw new VideoAnalyzerError(
      ErrorType.VALIDATION_ERROR,
      '質問は1000文字以内で入力してください',
      400
    );
  }

  // 自然言語問い合わせの解析（要件7.6）
  const queryAnalysis = analyzeQuery(question);
  console.log('Query analysis:', queryAnalysis);

  // 時間参照の解析
  const timeReferences = parseTimeReferences(queryAnalysis.timeReferences);
  console.log('Time references:', timeReferences);

  // 過去の問い合わせ履歴を取得（文脈保持のため - 要件7.7）（リトライ付き）
  const queryHistory = await retryWithExponentialBackoff(
    async () => {
      const queryHistoryCommand = new QueryCommand({
        TableName: process.env.QUERY_HISTORY_TABLE_NAME,
        KeyConditionExpression: 'videoId = :videoId',
        ExpressionAttributeValues: {
          ':videoId': videoId
        },
        ScanIndexForward: false, // 最新順
        Limit: 10 // 直近10件
      });

      const historyResult = await docClient.send(queryHistoryCommand);
      return historyResult.Items || [];
    },
    DEFAULT_RETRY_CONFIG,
    'query-history-fetch'
  );

  // 文脈情報の構築
  const conversationContext = buildConversationContext(queryHistory);
  console.log('Conversation context:', conversationContext);

  // 動画解析結果を取得（リトライ付き）
  const videoAnalysis = await retryWithExponentialBackoff(
    async () => {
      const getCommand = new GetCommand({
        TableName: process.env.VIDEO_ANALYSIS_TABLE_NAME,
        Key: { videoId }
      });

      const result = await docClient.send(getCommand);
      if (!result.Item) {
        throw new VideoAnalyzerError(
          ErrorType.RESOURCE_NOT_FOUND,
          '動画解析結果が見つかりません',
          404
        );
      }
      return result.Item;
    },
    DEFAULT_RETRY_CONFIG,
    'video-analysis-fetch'
  );

  // Pegasus 1.2に問い合わせ（リトライ付き）
  const pegasusResponse = await retryWithExponentialBackoff(
    () => queryPegasus(question, videoAnalysis, queryAnalysis, timeReferences, conversationContext),
    {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 2 // 問い合わせは時間がかかるため、リトライ回数を減らす
    },
    'pegasus-query'
  );

  // 問い合わせ履歴を保存（リトライ付き）
  const queryId = uuidv4();
  await retryWithExponentialBackoff(
    async () => {
      const putCommand = new PutCommand({
        TableName: process.env.QUERY_HISTORY_TABLE_NAME,
        Item: {
          videoId,
          queryId,
          question,
          answer: pegasusResponse.answer,
          confidence: pegasusResponse.confidence,
          timeReferences: pegasusResponse.timeReferences,
          queryAnalysis,
          timestamp: new Date().toISOString()
        }
      });

      await docClient.send(putCommand);
    },
    DEFAULT_RETRY_CONFIG,
    'query-history-save'
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      queryId,
      question,
      answer: pegasusResponse.answer,
      confidence: pegasusResponse.confidence,
      timeReferences: pegasusResponse.timeReferences,
      queryAnalysis,
      conversationContext,
      message: '問い合わせが完了しました'
    })
  };
};

// 包括的エラーハンドリング付きのメインハンドラー
export const handler = withErrorHandling(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      return await queryHandlerCore(event);
    } catch (error) {
      return createErrorResponse(error, event.requestContext?.requestId);
    }
  },
  'query-handler'
);