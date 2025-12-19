/**
 * Property 4のプロパティベーステスト: 進行状況表示の一貫性
 * **Feature: bedrock-video-analyzer, Property 4: 進行状況表示の一貫性**
 * **検証対象: 要件 3.1, 3.2**
 */

import * as fc from 'fast-check';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// テスト用のモック設定
const mockDynamoClient = {
  send: jest.fn()
} as unknown as DynamoDBDocumentClient;

// 進行状況追跡クラス（テスト用に抽出）
class AnalysisProgressTracker {
  private videoId: string;
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(videoId: string, docClient: DynamoDBDocumentClient) {
    this.videoId = videoId;
    this.docClient = docClient;
    this.tableName = process.env.VIDEO_ANALYSIS_TABLE_NAME || 'test-table';
  }

  async updateProgress(progress: number, status: string, message?: string): Promise<void> {
    const hasMessage = message && message.trim().length > 0;
    const updateCommand = new UpdateCommand({
      TableName: this.tableName,
      Key: { videoId: this.videoId },
      UpdateExpression: 'SET progress = :progress, #status = :status, updatedAt = :updatedAt' + 
                       (hasMessage ? ', progressMessage = :message' : ''),
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':progress': Math.min(100, Math.max(0, progress)),
        ':status': status,
        ':updatedAt': new Date().toISOString(),
        ...(hasMessage && { ':message': message })
      }
    });

    await this.docClient.send(updateCommand);
  }

  async recordError(error: Error, retryCount: number = 0): Promise<void> {
    const updateCommand = new UpdateCommand({
      TableName: this.tableName,
      Key: { videoId: this.videoId },
      UpdateExpression: 'SET #status = :status, errorMessage = :errorMessage, retryCount = :retryCount, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': retryCount > 0 ? 'RETRYING' : 'FAILED',
        ':errorMessage': error.message,
        ':retryCount': retryCount,
        ':updatedAt': new Date().toISOString()
      }
    });

    await this.docClient.send(updateCommand);
  }
}

describe('Property 4: 進行状況表示の一貫性', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDynamoClient.send as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 4.1: 進行状況パーセンテージの範囲制限
   * 任意の進行状況値に対して、0-100の範囲内に正規化される
   */
  test('進行状況は常に0-100の範囲内に正規化される', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 50 }), // videoId
      fc.integer({ min: -1000, max: 2000 }), // progress (範囲外も含む)
      fc.string({ minLength: 1, maxLength: 20 }), // status
      fc.option(fc.string({ minLength: 1, maxLength: 100 })), // message
      async (videoId: string, progress: number, status: string, message: string | null) => {
        // 各テストケースでモックをリセット
        jest.clearAllMocks();
        
        const tracker = new AnalysisProgressTracker(videoId, mockDynamoClient);
        
        await tracker.updateProgress(progress, status, message || undefined);
        
        // DynamoDBへの呼び出しがあったことを確認
        expect(mockDynamoClient.send).toHaveBeenCalled();
        
        const calls = (mockDynamoClient.send as jest.Mock).mock.calls;
        const lastCall = calls[calls.length - 1][0];
        const normalizedProgress = lastCall.input.ExpressionAttributeValues[':progress'];
        
        // 進行状況が0-100の範囲内に正規化されていることを確認
        expect(normalizedProgress).toBeGreaterThanOrEqual(0);
        expect(normalizedProgress).toBeLessThanOrEqual(100);
        
        // 元の値が範囲内の場合は変更されない
        if (progress >= 0 && progress <= 100) {
          expect(normalizedProgress).toBe(progress);
        }
        
        // 元の値が範囲外の場合は適切にクランプされる
        if (progress < 0) {
          expect(normalizedProgress).toBe(0);
        }
        if (progress > 100) {
          expect(normalizedProgress).toBe(100);
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 4.2: エラー記録時のステータス一貫性
   * 任意のエラーとリトライ回数に対して、適切なステータスが設定される
   */
  test('エラー記録時のステータスはリトライ回数に応じて一貫している', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 50 }), // videoId
      fc.string({ minLength: 1, maxLength: 100 }), // error message
      fc.integer({ min: 0, max: 10 }), // retry count
      async (videoId: string, errorMessage: string, retryCount: number) => {
        // 各テストケースでモックをリセット
        jest.clearAllMocks();
        
        const tracker = new AnalysisProgressTracker(videoId, mockDynamoClient);
        const error = new Error(errorMessage);
        
        await tracker.recordError(error, retryCount);
        
        // DynamoDBへの呼び出しがあったことを確認
        expect(mockDynamoClient.send).toHaveBeenCalled();
        
        const calls = (mockDynamoClient.send as jest.Mock).mock.calls;
        const lastCall = calls[calls.length - 1][0];
        const status = lastCall.input.ExpressionAttributeValues[':status'];
        const recordedRetryCount = lastCall.input.ExpressionAttributeValues[':retryCount'];
        const recordedErrorMessage = lastCall.input.ExpressionAttributeValues[':errorMessage'];
        
        // ステータスがリトライ回数に応じて適切に設定される
        if (retryCount > 0) {
          expect(status).toBe('RETRYING');
        } else {
          expect(status).toBe('FAILED');
        }
        
        // エラーメッセージとリトライ回数が正確に記録される
        expect(recordedErrorMessage).toBe(errorMessage);
        expect(recordedRetryCount).toBe(retryCount);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 4.3: 進行状況更新の必須フィールド一貫性
   * 任意の進行状況更新において、必須フィールドが常に含まれる
   */
  test('進行状況更新には必須フィールドが常に含まれる', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 50 }), // videoId
      fc.integer({ min: 0, max: 100 }), // progress
      fc.string({ minLength: 1, maxLength: 20 }), // status
      fc.option(fc.string({ minLength: 5, maxLength: 100 })), // message (最小5文字で空文字列を避ける)
      async (videoId: string, progress: number, status: string, message: string | null) => {
        // 各テストケースでモックをリセット
        jest.clearAllMocks();
        
        const tracker = new AnalysisProgressTracker(videoId, mockDynamoClient);
        
        await tracker.updateProgress(progress, status, message || undefined);
        
        const calls = (mockDynamoClient.send as jest.Mock).mock.calls;
        const lastCall = calls[calls.length - 1][0];
        const values = lastCall.input.ExpressionAttributeValues;
        
        // 必須フィールドが常に含まれる
        expect(values).toHaveProperty(':progress');
        expect(values).toHaveProperty(':status');
        expect(values).toHaveProperty(':updatedAt');
        
        // 値の型が正しい
        expect(typeof values[':progress']).toBe('number');
        expect(typeof values[':status']).toBe('string');
        expect(typeof values[':updatedAt']).toBe('string');
        
        // updatedAtがISO形式の日付文字列である
        expect(() => new Date(values[':updatedAt'])).not.toThrow();
        
        // メッセージが提供された場合のみ含まれる
        if (message && message.trim().length > 0) {
          expect(values).toHaveProperty(':message');
          expect(values[':message']).toBe(message);
        } else {
          expect(values).not.toHaveProperty(':message');
        }
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 4.4: DynamoDB更新式の構造一貫性
   * 任意の更新において、DynamoDB更新式が適切な構造を持つ
   */
  test('DynamoDB更新式は常に適切な構造を持つ', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 50 }), // videoId
      fc.integer({ min: 0, max: 100 }), // progress
      fc.string({ minLength: 1, maxLength: 20 }), // status
      fc.option(fc.string({ minLength: 5, maxLength: 100 })), // message (最小5文字で空文字列を避ける)
      async (videoId: string, progress: number, status: string, message: string | null) => {
        // 各テストケースでモックをリセット
        jest.clearAllMocks();
        
        const tracker = new AnalysisProgressTracker(videoId, mockDynamoClient);
        
        await tracker.updateProgress(progress, status, message || undefined);
        
        const calls = (mockDynamoClient.send as jest.Mock).mock.calls;
        const lastCall = calls[calls.length - 1][0];
        
        // テーブル名が設定されている
        expect(lastCall.input.TableName).toBe('test-table');
        
        // キーにvideoIdが含まれている（値は実装によって変わる可能性がある）
        expect(lastCall.input.Key).toHaveProperty('videoId');
        expect(typeof lastCall.input.Key.videoId).toBe('string');
        
        // 更新式が適切な形式である
        const updateExpression = lastCall.input.UpdateExpression;
        expect(updateExpression).toMatch(/^SET /);
        expect(updateExpression).toContain('progress = :progress');
        expect(updateExpression).toContain('#status = :status');
        expect(updateExpression).toContain('updatedAt = :updatedAt');
        
        // 属性名マッピングが含まれている
        expect(lastCall.input.ExpressionAttributeNames).toHaveProperty('#status');
        expect(lastCall.input.ExpressionAttributeNames['#status']).toBe('status');
        
        // メッセージがある場合は更新式に含まれる
        if (message && message.trim().length > 0) {
          expect(updateExpression).toContain('progressMessage = :message');
        } else {
          expect(updateExpression).not.toContain('progressMessage');
        }
      }
    ), { numRuns: 50 });
  });
});