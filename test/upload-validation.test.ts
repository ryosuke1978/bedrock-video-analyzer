/**
 * Property-Based Tests for Upload Validation
 * Feature: bedrock-video-analyzer, Property 1: ファイル形式検証の完全性
 * Validates: Requirements 1.1, 1.5
 */

import * as fc from 'fast-check';

// テスト対象の関数をインポート（実際の実装から）
// 注意: Lambda関数から検証ロジックを抽出してテスト可能にする必要があります

// 対応フォーマットの定義（要件1.1に基づく）
const SUPPORTED_FORMATS = {
  'mp4': ['video/mp4', 'application/mp4'],
  'mov': ['video/quicktime', 'video/mov'],
  'avi': ['video/avi', 'video/x-msvideo', 'video/msvideo'],
  'mkv': ['video/x-matroska', 'video/mkv'],
  'webm': ['video/webm'],
  'mxf': ['application/mxf', 'application/x-mxf'],
  'flv': ['video/x-flv', 'video/flv'],
  'wmv': ['video/x-ms-wmv', 'video/wmv'],
  'm4v': ['video/x-m4v', 'video/mp4']
};

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
  fileExtension?: string;
}

/**
 * ファイルの包括的検証（Lambda関数から抽出）
 */
function validateVideoFile(request: UploadRequest): ValidationResult {
  const { fileName, fileSize, contentType, fileExtension } = request;

  // ファイル名の検証
  if (!fileName || fileName.trim().length === 0) {
    return { isValid: false, error: 'ファイル名が指定されていません' };
  }

  if (fileName.length > 255) {
    return { 
      isValid: false, 
      error: `ファイル名が長すぎます（最大255文字）`,
      details: { currentLength: fileName.length, maxLength: 255 }
    };
  }

  // 危険な文字のチェック
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(fileName)) {
    return { 
      isValid: false, 
      error: 'ファイル名に使用できない文字が含まれています' 
    };
  }

  // ファイル拡張子の検証
  const extension = fileExtension || fileName.split('.').pop()?.toLowerCase();
  if (!extension) {
    return { isValid: false, error: 'ファイル拡張子が見つかりません' };
  }

  if (!Object.keys(SUPPORTED_FORMATS).includes(extension)) {
    return { 
      isValid: false, 
      error: '対応していないファイル形式です',
      details: { 
        provided: extension,
        supported: Object.keys(SUPPORTED_FORMATS)
      }
    };
  }

  // MIMEタイプの検証（提供されている場合）
  if (contentType) {
    const expectedMimeTypes = SUPPORTED_FORMATS[extension as keyof typeof SUPPORTED_FORMATS];
    if (!expectedMimeTypes.includes(contentType)) {
      return { 
        isValid: false, 
        error: 'ファイルの内容が拡張子と一致しません',
        details: { 
          providedMimeType: contentType,
          expectedMimeTypes: expectedMimeTypes
        }
      };
    }
  }

  // ファイルサイズの検証
  if (typeof fileSize !== 'number' || fileSize <= 0) {
    return { isValid: false, error: '有効なファイルサイズが指定されていません' };
  }

  if (fileSize < MIN_FILE_SIZE) {
    return { 
      isValid: false, 
      error: 'ファイルが小さすぎます。有効な動画ファイルを選択してください',
      details: { currentSize: fileSize, minSize: MIN_FILE_SIZE }
    };
  }

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

// Property-Based Test Generators
describe('Property 1: ファイル形式検証の完全性', () => {
  
  /**
   * Property 1.1: 対応フォーマットのファイルは受け入れられる
   * 任意の対応フォーマット（MP4、MOV、AVI、MKV、WEBM、MXF、FLV、WMV、M4V）のファイルは受け入れられる
   */
  test('対応フォーマットのファイルは常に受け入れられる', () => {
    fc.assert(fc.property(
      // 対応フォーマットのジェネレーター
      fc.constantFrom(...Object.keys(SUPPORTED_FORMATS)),
      // 有効なファイル名のジェネレーター
      fc.string({ minLength: 1, maxLength: 200 }).filter(s => !/[<>:"/\\|?*\x00-\x1f]/.test(s)),
      // 有効なファイルサイズのジェネレーター
      fc.integer({ min: MIN_FILE_SIZE, max: MAX_FILE_SIZE }),
      (extension, baseName, fileSize) => {
        const fileName = `${baseName}.${extension}`;
        const mimeTypes = SUPPORTED_FORMATS[extension as keyof typeof SUPPORTED_FORMATS];
        const contentType = fc.sample(fc.constantFrom(...mimeTypes), 1)[0];
        
        const request: UploadRequest = {
          fileName,
          fileSize,
          contentType,
          fileExtension: extension
        };
        
        const result = validateVideoFile(request);
        
        // 対応フォーマットのファイルは常に受け入れられるべき
        expect(result.isValid).toBe(true);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 1.2: 非対応フォーマットのファイルは拒否される
   * 任意の非対応フォーマットのファイルは適切なエラーメッセージと共に拒否される
   */
  test('非対応フォーマットのファイルは常に拒否される', () => {
    fc.assert(fc.property(
      // 非対応フォーマットのジェネレーター
      fc.constantFrom('txt', 'pdf', 'doc', 'exe', 'zip', 'jpg', 'png', 'gif', 'wav', 'mp3'),
      // 有効なファイル名のジェネレーター
      fc.string({ minLength: 1, maxLength: 200 }).filter(s => !/[<>:"/\\|?*\x00-\x1f]/.test(s)),
      // 有効なファイルサイズのジェネレーター
      fc.integer({ min: MIN_FILE_SIZE, max: MAX_FILE_SIZE }),
      (extension, baseName, fileSize) => {
        const fileName = `${baseName}.${extension}`;
        
        const request: UploadRequest = {
          fileName,
          fileSize,
          fileExtension: extension
        };
        
        const result = validateVideoFile(request);
        
        // 非対応フォーマットのファイルは常に拒否されるべき
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('対応していないファイル形式です');
        expect(result.details?.provided).toBe(extension);
        expect(result.details?.supported).toEqual(Object.keys(SUPPORTED_FORMATS));
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 1.3: MIMEタイプと拡張子の不一致は拒否される
   * 任意の対応フォーマットでも、MIMEタイプが拡張子と一致しない場合は拒否される
   */
  test('MIMEタイプと拡張子の不一致は拒否される', () => {
    fc.assert(fc.property(
      // 対応フォーマットのジェネレーター
      fc.constantFrom(...Object.keys(SUPPORTED_FORMATS)),
      // 異なる対応フォーマットのジェネレーター（MIMEタイプ用）
      fc.constantFrom(...Object.keys(SUPPORTED_FORMATS)),
      // 有効なファイル名のジェネレーター
      fc.string({ minLength: 1, maxLength: 200 }).filter(s => !/[<>:"/\\|?*\x00-\x1f]/.test(s)),
      // 有効なファイルサイズのジェネレーター
      fc.integer({ min: MIN_FILE_SIZE, max: MAX_FILE_SIZE }),
      (extension, mimeExtension, baseName, fileSize) => {
        // 異なる拡張子の場合のみテスト
        fc.pre(extension !== mimeExtension);
        
        const fileName = `${baseName}.${extension}`;
        const wrongMimeTypes = SUPPORTED_FORMATS[mimeExtension as keyof typeof SUPPORTED_FORMATS];
        const wrongContentType = fc.sample(fc.constantFrom(...wrongMimeTypes), 1)[0];
        
        const request: UploadRequest = {
          fileName,
          fileSize,
          contentType: wrongContentType,
          fileExtension: extension
        };
        
        const result = validateVideoFile(request);
        
        // MIMEタイプが一致しない場合は拒否されるべき
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('ファイルの内容が拡張子と一致しません');
        expect(result.details?.providedMimeType).toBe(wrongContentType);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 1.4: 無効なファイル名は拒否される
   * 任意の無効な文字を含むファイル名は拒否される
   */
  test('無効な文字を含むファイル名は拒否される', () => {
    fc.assert(fc.property(
      // 対応フォーマットのジェネレーター
      fc.constantFrom(...Object.keys(SUPPORTED_FORMATS)),
      // 無効な文字のジェネレーター
      fc.constantFrom('<', '>', ':', '"', '/', '\\', '|', '?', '*'),
      // ベースファイル名のジェネレーター
      fc.string({ minLength: 1, maxLength: 100 }),
      // 有効なファイルサイズのジェネレーター
      fc.integer({ min: MIN_FILE_SIZE, max: MAX_FILE_SIZE }),
      (extension, invalidChar, baseName, fileSize) => {
        const fileName = `${baseName}${invalidChar}file.${extension}`;
        
        const request: UploadRequest = {
          fileName,
          fileSize,
          fileExtension: extension
        };
        
        const result = validateVideoFile(request);
        
        // 無効な文字を含むファイル名は拒否されるべき
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('ファイル名に使用できない文字が含まれています');
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 1.5: 空のファイル名は拒否される
   * 空文字列や空白のみのファイル名は拒否される
   */
  test('空のファイル名は拒否される', () => {
    fc.assert(fc.property(
      // 空文字列または空白のみの文字列のジェネレーター
      fc.constantFrom('', '   ', '\t', '\n', '  \t  \n  '),
      // 有効なファイルサイズのジェネレーター
      fc.integer({ min: MIN_FILE_SIZE, max: MAX_FILE_SIZE }),
      (fileName, fileSize) => {
        const request: UploadRequest = {
          fileName,
          fileSize
        };
        
        const result = validateVideoFile(request);
        
        // 空のファイル名は拒否されるべき
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('ファイル名が指定されていません');
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 1.6: 長すぎるファイル名は拒否される
   * 255文字を超えるファイル名は拒否される
   */
  test('長すぎるファイル名は拒否される', () => {
    fc.assert(fc.property(
      // 対応フォーマットのジェネレーター
      fc.constantFrom(...Object.keys(SUPPORTED_FORMATS)),
      // 長い文字列のジェネレーター
      fc.string({ minLength: 256, maxLength: 500 }),
      // 有効なファイルサイズのジェネレーター
      fc.integer({ min: MIN_FILE_SIZE, max: MAX_FILE_SIZE }),
      (extension, longName, fileSize) => {
        const fileName = `${longName}.${extension}`;
        
        const request: UploadRequest = {
          fileName,
          fileSize,
          fileExtension: extension
        };
        
        const result = validateVideoFile(request);
        
        // 長すぎるファイル名は拒否されるべき
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('ファイル名が長すぎます');
        expect(result.details?.currentLength).toBe(fileName.length);
        expect(result.details?.maxLength).toBe(255);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 1.7: 拡張子のないファイルは拒否される
   * 拡張子を持たないファイル名は拒否される
   */
  test('拡張子のないファイルは拒否される', () => {
    fc.assert(fc.property(
      // 拡張子のないファイル名のジェネレーター
      fc.string({ minLength: 1, maxLength: 200 }).filter(s => !s.includes('.') && !/[<>:"/\\|?*\x00-\x1f]/.test(s)),
      // 有効なファイルサイズのジェネレーター
      fc.integer({ min: MIN_FILE_SIZE, max: MAX_FILE_SIZE }),
      (fileName, fileSize) => {
        const request: UploadRequest = {
          fileName,
          fileSize
        };
        
        const result = validateVideoFile(request);
        
        // 拡張子のないファイルは拒否されるべき
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('ファイル拡張子が見つかりません');
      }
    ), { numRuns: 100 });
  });
});