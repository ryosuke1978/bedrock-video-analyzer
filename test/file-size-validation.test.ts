/**
 * Property-Based Tests for File Size Validation
 * Feature: bedrock-video-analyzer, Property 2: ファイルサイズ制限の遵守
 * Validates: Requirements 1.2
 */

import * as fc from 'fast-check';

// ファイルサイズ制限（要件1.2に基づく）
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MIN_FILE_SIZE = 1024; // 1KB

// 検証結果の型定義
interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: any;
}

// リクエストボディの型定義
interface UploadRequest {
  fileName: string;
  fileSize: number;
  contentType?: string;
}

/**
 * ファイルサイズ検証関数（Lambda関数から抽出）
 */
function validateFileSize(request: UploadRequest): ValidationResult {
  const { fileName, fileSize } = request;

  // ファイルサイズの型チェック
  if (typeof fileSize !== 'number') {
    return { 
      isValid: false, 
      error: '有効なファイルサイズが指定されていません',
      details: { providedType: typeof fileSize, expectedType: 'number' }
    };
  }

  // 負の値や0のチェック
  if (fileSize <= 0) {
    return { 
      isValid: false, 
      error: 'ファイルサイズは正の値である必要があります',
      details: { providedSize: fileSize }
    };
  }

  // 最小サイズチェック（破損ファイル検出）
  if (fileSize < MIN_FILE_SIZE) {
    return { 
      isValid: false, 
      error: 'ファイルが小さすぎます。有効な動画ファイルを選択してください',
      details: { 
        currentSize: fileSize, 
        minSize: MIN_FILE_SIZE,
        currentSizeKB: Math.round(fileSize / 1024 * 100) / 100,
        minSizeKB: Math.round(MIN_FILE_SIZE / 1024)
      }
    };
  }

  // 最大サイズチェック（要件1.2）
  if (fileSize > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: 'ファイルサイズが制限を超えています',
      details: { 
        currentSize: fileSize, 
        maxSize: MAX_FILE_SIZE,
        currentSizeMB: Math.round(fileSize / (1024 * 1024) * 100) / 100,
        maxSizeMB: Math.round(MAX_FILE_SIZE / (1024 * 1024))
      }
    };
  }

  return { isValid: true };
}

/**
 * ファイルサイズのフォーマット関数
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

describe('Property 2: ファイルサイズ制限の遵守', () => {
  
  /**
   * Property 2.1: 制限内のファイルサイズは受け入れられる
   * 任意の制限内（1KB以上100MB以下）のファイルサイズは受け入れられる
   */
  test('制限内のファイルサイズは常に受け入れられる', () => {
    fc.assert(fc.property(
      // 有効なファイルサイズのジェネレーター（1KB以上100MB以下）
      fc.integer({ min: MIN_FILE_SIZE, max: MAX_FILE_SIZE }),
      // 有効なファイル名のジェネレーター
      fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.mp4`),
      (fileSize, fileName) => {
        const request: UploadRequest = {
          fileName,
          fileSize
        };
        
        const result = validateFileSize(request);
        
        // 制限内のファイルサイズは常に受け入れられるべき
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 2.2: 制限を超えるファイルサイズは拒否される
   * 任意の制限を超える（100MBより大きい）ファイルサイズは拒否される
   */
  test('制限を超えるファイルサイズは常に拒否される', () => {
    fc.assert(fc.property(
      // 制限を超えるファイルサイズのジェネレーター
      fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 10 }),
      // 有効なファイル名のジェネレーター
      fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.mp4`),
      (fileSize, fileName) => {
        const request: UploadRequest = {
          fileName,
          fileSize
        };
        
        const result = validateFileSize(request);
        
        // 制限を超えるファイルサイズは常に拒否されるべき
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('ファイルサイズが制限を超えています');
        expect(result.details?.currentSize).toBe(fileSize);
        expect(result.details?.maxSize).toBe(MAX_FILE_SIZE);
        expect(result.details?.currentSizeMB).toBeGreaterThan(result.details?.maxSizeMB);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 2.3: 最小サイズ未満のファイルは拒否される
   * 任意の最小サイズ未満（1KB未満）のファイルサイズは拒否される
   */
  test('最小サイズ未満のファイルは常に拒否される', () => {
    fc.assert(fc.property(
      // 最小サイズ未満のファイルサイズのジェネレーター
      fc.integer({ min: 1, max: MIN_FILE_SIZE - 1 }),
      // 有効なファイル名のジェネレーター
      fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.mp4`),
      (fileSize, fileName) => {
        const request: UploadRequest = {
          fileName,
          fileSize
        };
        
        const result = validateFileSize(request);
        
        // 最小サイズ未満のファイルは常に拒否されるべき
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('ファイルが小さすぎます');
        expect(result.details?.currentSize).toBe(fileSize);
        expect(result.details?.minSize).toBe(MIN_FILE_SIZE);
        expect(result.details?.currentSizeKB).toBeLessThan(result.details?.minSizeKB);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 2.4: 負の値や0のファイルサイズは拒否される
   * 任意の負の値や0のファイルサイズは拒否される
   */
  test('負の値や0のファイルサイズは拒否される', () => {
    fc.assert(fc.property(
      // 負の値や0のファイルサイズのジェネレーター
      fc.integer({ min: -1000000, max: 0 }),
      // 有効なファイル名のジェネレーター
      fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.mp4`),
      (fileSize, fileName) => {
        const request: UploadRequest = {
          fileName,
          fileSize
        };
        
        const result = validateFileSize(request);
        
        // 負の値や0のファイルサイズは常に拒否されるべき
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('ファイルサイズは正の値である必要があります');
        expect(result.details?.providedSize).toBe(fileSize);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 2.5: 無効な型のファイルサイズは拒否される
   * 任意の数値以外の型のファイルサイズは拒否される
   */
  test('無効な型のファイルサイズは拒否される', () => {
    fc.assert(fc.property(
      // 無効な型のファイルサイズのジェネレーター
      fc.oneof(
        fc.string(),
        fc.constant(null),
        fc.constant(undefined),
        fc.boolean(),
        fc.object()
      ),
      // 有効なファイル名のジェネレーター
      fc.string({ minLength: 1, maxLength: 50 }).map(s => `${s}.mp4`),
      (fileSize, fileName) => {
        const request: UploadRequest = {
          fileName,
          fileSize: fileSize as any // 型チェックを回避
        };
        
        const result = validateFileSize(request);
        
        // 無効な型のファイルサイズは常に拒否されるべき
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('有効なファイルサイズが指定されていません');
        expect(result.details?.providedType).toBe(typeof fileSize);
        expect(result.details?.expectedType).toBe('number');
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 2.6: 境界値テスト
   * 境界値（最小サイズ、最大サイズ）での動作を検証
   */
  test('境界値での動作が正しい', () => {
    // 最小サイズちょうど（受け入れられるべき）
    const minSizeResult = validateFileSize({
      fileName: 'test.mp4',
      fileSize: MIN_FILE_SIZE
    });
    expect(minSizeResult.isValid).toBe(true);

    // 最小サイズ-1（拒否されるべき）
    const belowMinResult = validateFileSize({
      fileName: 'test.mp4',
      fileSize: MIN_FILE_SIZE - 1
    });
    expect(belowMinResult.isValid).toBe(false);

    // 最大サイズちょうど（受け入れられるべき）
    const maxSizeResult = validateFileSize({
      fileName: 'test.mp4',
      fileSize: MAX_FILE_SIZE
    });
    expect(maxSizeResult.isValid).toBe(true);

    // 最大サイズ+1（拒否されるべき）
    const aboveMaxResult = validateFileSize({
      fileName: 'test.mp4',
      fileSize: MAX_FILE_SIZE + 1
    });
    expect(aboveMaxResult.isValid).toBe(false);
  });

  /**
   * Property 2.7: エラーメッセージの詳細情報検証
   * エラー時に適切な詳細情報が提供されることを検証
   */
  test('エラーメッセージに適切な詳細情報が含まれる', () => {
    fc.assert(fc.property(
      // 制限を超えるファイルサイズのジェネレーター
      fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 2 }),
      (fileSize) => {
        const request: UploadRequest = {
          fileName: 'test.mp4',
          fileSize
        };
        
        const result = validateFileSize(request);
        
        // エラー詳細情報の検証
        expect(result.isValid).toBe(false);
        expect(result.details).toBeDefined();
        expect(result.details?.currentSize).toBe(fileSize);
        expect(result.details?.maxSize).toBe(MAX_FILE_SIZE);
        expect(result.details?.currentSizeMB).toBe(Math.round(fileSize / (1024 * 1024) * 100) / 100);
        expect(result.details?.maxSizeMB).toBe(Math.round(MAX_FILE_SIZE / (1024 * 1024)));
      }
    ), { numRuns: 50 });
  });

  /**
   * Unit tests for specific scenarios
   */
  test('ファイルサイズフォーマット関数のテスト', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(MAX_FILE_SIZE)).toBe('100 MB');
  });

  test('具体的なファイルサイズでの検証', () => {
    // 50MB（有効）
    const validResult = validateFileSize({
      fileName: 'video.mp4',
      fileSize: 50 * 1024 * 1024
    });
    expect(validResult.isValid).toBe(true);

    // 150MB（無効）
    const invalidResult = validateFileSize({
      fileName: 'video.mp4',
      fileSize: 150 * 1024 * 1024
    });
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.error).toContain('ファイルサイズが制限を超えています');
  });
});