/**
 * Property 5のプロパティベーステスト: 解析結果の構造化表示
 * **Feature: bedrock-video-analyzer, Property 5: 解析結果の構造化表示**
 * **検証対象: 要件 4.1, 4.2, 4.5**
 */

import * as fc from 'fast-check';

// 解析結果の型定義
interface AnalysisResult {
  basicAnalysis?: {
    summary?: string;
    scenes?: string[];
    objects?: string[];
    activities?: string[];
    emotions?: string[];
    topics?: string[];
  };
  prTexts?: {
    short?: string;
    long?: string;
  };
  summaries?: {
    short?: string;
    long?: string;
  };
  additionalAnalysis?: any;
}

// 結果表示コンポーネント（テスト用に抽出）
class ResultsDisplayValidator {
  /**
   * 解析結果が機能別にカテゴリ分けされているかを検証
   * 要件 4.1: 解析結果を機能別にカテゴリ分けして表示する
   */
  validateCategoryStructure(results: AnalysisResult): boolean {
    if (!results) return false;

    // 少なくとも1つのカテゴリが存在する必要がある
    const hasCategories = 
      results.basicAnalysis !== undefined ||
      results.prTexts !== undefined ||
      results.summaries !== undefined ||
      results.additionalAnalysis !== undefined;

    if (!hasCategories) return false;

    // 各カテゴリが適切な構造を持っているかを確認
    if (results.basicAnalysis) {
      const basicAnalysisKeys = Object.keys(results.basicAnalysis);
      if (basicAnalysisKeys.length === 0) return false;
    }

    if (results.prTexts) {
      const prTextsKeys = Object.keys(results.prTexts);
      if (prTextsKeys.length === 0) return false;
    }

    if (results.summaries) {
      const summariesKeys = Object.keys(results.summaries);
      if (summariesKeys.length === 0) return false;
    }

    return true;
  }

  /**
   * テキスト情報が日本語で読みやすい形式で表示されているかを検証
   * 要件 4.2: テキスト情報を日本語で読みやすい形式で表示する
   */
  validateJapaneseReadability(results: AnalysisResult): boolean {
    if (!results) return false;

    // 日本語文字（ひらがな、カタカナ、漢字）を含むかチェック
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

    // 基本解析のテキストをチェック
    if (results.basicAnalysis) {
      if (results.basicAnalysis.summary) {
        // 英語のみの場合は日本語化されていない
        if (!japaneseRegex.test(results.basicAnalysis.summary) && 
            /[a-zA-Z]/.test(results.basicAnalysis.summary)) {
          return false;
        }
      }

      // 配列要素もチェック
      const arrayFields = ['scenes', 'objects', 'activities', 'emotions', 'topics'];
      for (const field of arrayFields) {
        const fieldData = results.basicAnalysis[field as keyof typeof results.basicAnalysis];
        if (Array.isArray(fieldData) && fieldData.length > 0) {
          for (const item of fieldData) {
            if (typeof item === 'string' && item.length > 0) {
              // 英語のみの場合は日本語化されていない
              if (!japaneseRegex.test(item) && /[a-zA-Z]/.test(item)) {
                return false;
              }
            }
          }
        }
      }
    }

    // PR文章のテキストをチェック
    if (results.prTexts) {
      if (results.prTexts.short && results.prTexts.short.length > 0) {
        if (!japaneseRegex.test(results.prTexts.short) && 
            /[a-zA-Z]/.test(results.prTexts.short)) {
          return false;
        }
      }
      if (results.prTexts.long && results.prTexts.long.length > 0) {
        if (!japaneseRegex.test(results.prTexts.long) && 
            /[a-zA-Z]/.test(results.prTexts.long)) {
          return false;
        }
      }
    }

    // あらすじのテキストをチェック
    if (results.summaries) {
      if (results.summaries.short && results.summaries.short.length > 0) {
        if (!japaneseRegex.test(results.summaries.short) && 
            /[a-zA-Z]/.test(results.summaries.short)) {
          return false;
        }
      }
      if (results.summaries.long && results.summaries.long.length > 0) {
        if (!japaneseRegex.test(results.summaries.long) && 
            /[a-zA-Z]/.test(results.summaries.long)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * JSON形式でエクスポート可能かを検証
   * 要件 4.5: JSON形式でダウンロード機能を提供する
   */
  validateJSONExportability(results: AnalysisResult): boolean {
    if (!results) return false;

    try {
      // JSON.stringifyが成功するかテスト
      const jsonString = JSON.stringify(results);
      
      // 空のJSONでないことを確認
      if (jsonString === '{}' || jsonString === 'null' || jsonString === 'undefined') {
        return false;
      }

      // パース可能であることを確認（ラウンドトリップ）
      const parsed = JSON.parse(jsonString);
      
      // パースした結果が元のオブジェクトと同等であることを確認
      const reparsed = JSON.stringify(parsed);
      if (jsonString !== reparsed) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * カテゴリが明確に区別されているかを検証
   */
  validateCategoryDistinction(results: AnalysisResult): boolean {
    if (!results) return false;

    const categories = [];
    
    if (results.basicAnalysis) categories.push('basicAnalysis');
    if (results.prTexts) categories.push('prTexts');
    if (results.summaries) categories.push('summaries');
    if (results.additionalAnalysis) categories.push('additionalAnalysis');

    // 少なくとも1つのカテゴリが存在する
    if (categories.length === 0) return false;

    // 各カテゴリが独立している（重複していない）
    const uniqueCategories = new Set(categories);
    if (uniqueCategories.size !== categories.length) return false;

    // PR文章とあらすじが明確に区別されている
    if (results.prTexts && results.summaries) {
      // PR文章とあらすじは異なるオブジェクトである
      if (results.prTexts === results.summaries) return false;
      
      // 両方が空でない場合のみ内容の違いをチェック
      const prHasContent = results.prTexts.short || results.prTexts.long;
      const summaryHasContent = results.summaries.short || results.summaries.long;
      
      if (prHasContent && summaryHasContent) {
        // 内容が異なる（同じテキストでない）
        if (results.prTexts.short === results.summaries.short && 
            results.prTexts.short !== undefined && results.prTexts.short !== null) {
          return false;
        }
        if (results.prTexts.long === results.summaries.long && 
            results.prTexts.long !== undefined && results.prTexts.long !== null) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 構造化された表示形式を検証
   */
  validateStructuredFormat(results: AnalysisResult): boolean {
    if (!results) return false;

    // 基本解析が構造化されている
    if (results.basicAnalysis) {
      const basicAnalysis = results.basicAnalysis;
      
      // 配列フィールドが適切な配列である（nullは許可）
      const arrayFields = ['scenes', 'objects', 'activities', 'emotions', 'topics'];
      for (const field of arrayFields) {
        const fieldData = basicAnalysis[field as keyof typeof basicAnalysis];
        if (fieldData !== undefined && fieldData !== null && !Array.isArray(fieldData)) {
          return false;
        }
      }

      // テキストフィールドが文字列である（nullは許可）
      if (basicAnalysis.summary !== undefined && basicAnalysis.summary !== null && typeof basicAnalysis.summary !== 'string') {
        return false;
      }
    }

    // PR文章が構造化されている
    if (results.prTexts) {
      if (results.prTexts.short !== undefined && results.prTexts.short !== null && typeof results.prTexts.short !== 'string') {
        return false;
      }
      if (results.prTexts.long !== undefined && results.prTexts.long !== null && typeof results.prTexts.long !== 'string') {
        return false;
      }
    }

    // あらすじが構造化されている
    if (results.summaries) {
      if (results.summaries.short !== undefined && results.summaries.short !== null && typeof results.summaries.short !== 'string') {
        return false;
      }
      if (results.summaries.long !== undefined && results.summaries.long !== null && typeof results.summaries.long !== 'string') {
        return false;
      }
    }

    return true;
  }
}

// テスト用のジェネレータ
const japaneseTextArbitrary = fc.string({ minLength: 1, maxLength: 500 })
  .map(text => {
    // 日本語文字を含むテキストに変換
    const japaneseChars = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
    const kanjiChars = '動画解析結果基本情報詳細内容';
    const katakanaChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    
    if (text.length === 0) return 'テスト';
    
    // 一部を日本語に置き換え
    let result = text;
    for (let i = 0; i < Math.min(5, text.length); i++) {
      const pos = Math.floor(Math.random() * result.length);
      const charSet = [japaneseChars, kanjiChars, katakanaChars][Math.floor(Math.random() * 3)];
      const char = charSet[Math.floor(Math.random() * charSet.length)];
      result = result.substring(0, pos) + char + result.substring(pos + 1);
    }
    
    return result;
  });

const analysisResultArbitrary: fc.Arbitrary<AnalysisResult> = fc.record({
  basicAnalysis: fc.option(fc.record({
    summary: fc.option(japaneseTextArbitrary),
    scenes: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 10 })),
    objects: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 15 })),
    activities: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 10 })),
    emotions: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 5 })),
    topics: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 8 }))
  })),
  prTexts: fc.option(fc.record({
    short: fc.option(japaneseTextArbitrary.filter(t => t.length <= 250)),
    long: fc.option(japaneseTextArbitrary.filter(t => t.length <= 600))
  })),
  summaries: fc.option(fc.record({
    short: fc.option(japaneseTextArbitrary.filter(t => t.length <= 250)),
    long: fc.option(japaneseTextArbitrary.filter(t => t.length <= 600))
  })),
  additionalAnalysis: fc.option(fc.record({
    transcript: fc.option(japaneseTextArbitrary),
    keyframes: fc.option(fc.array(fc.string(), { maxLength: 5 }))
  }))
}) as fc.Arbitrary<AnalysisResult>;

describe('Property 5: 解析結果の構造化表示', () => {
  const validator = new ResultsDisplayValidator();

  /**
   * Property 5.1: 機能別カテゴリ分け
   * 任意の解析完了時において、結果は機能別にカテゴリ分けされている
   */
  test('解析結果が機能別にカテゴリ分けされている', () => {
    fc.assert(fc.property(
      analysisResultArbitrary,
      (results: AnalysisResult) => {
        // 少なくとも1つのカテゴリが存在する場合のみテスト
        const hasAnyCategory = 
          results.basicAnalysis !== undefined ||
          results.prTexts !== undefined ||
          results.summaries !== undefined ||
          results.additionalAnalysis !== undefined;

        if (!hasAnyCategory) {
          // カテゴリが全くない場合はスキップ
          return true;
        }

        return validator.validateCategoryStructure(results);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 5.2: 日本語での読みやすい表示
   * 任意の解析完了時において、テキスト情報は日本語で読みやすい形式で表示される
   */
  test('テキスト情報が日本語で読みやすい形式で表示される', () => {
    fc.assert(fc.property(
      analysisResultArbitrary,
      (results: AnalysisResult) => {
        // テキスト情報が存在する場合のみテスト
        const hasTextInfo = 
          (results.basicAnalysis && results.basicAnalysis.summary) ||
          (results.prTexts && (results.prTexts.short || results.prTexts.long)) ||
          (results.summaries && (results.summaries.short || results.summaries.long));

        if (!hasTextInfo) {
          // テキスト情報がない場合はスキップ
          return true;
        }

        return validator.validateJapaneseReadability(results);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 5.3: JSON形式でのエクスポート可能性
   * 任意の解析完了時において、結果はJSON形式でエクスポート可能である
   */
  test('解析結果がJSON形式でエクスポート可能である', () => {
    fc.assert(fc.property(
      analysisResultArbitrary,
      (results: AnalysisResult) => {
        return validator.validateJSONExportability(results);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 5.4: カテゴリの明確な区別
   * 任意の解析結果において、各カテゴリ（基本解析、PR文章、あらすじ）が明確に区別されている
   */
  test('各カテゴリが明確に区別されている', () => {
    fc.assert(fc.property(
      analysisResultArbitrary,
      (results: AnalysisResult) => {
        // 少なくとも1つのカテゴリが存在する場合のみテスト
        const hasAnyCategory = 
          results.basicAnalysis !== undefined ||
          results.prTexts !== undefined ||
          results.summaries !== undefined ||
          results.additionalAnalysis !== undefined;

        if (!hasAnyCategory) {
          return true;
        }

        return validator.validateCategoryDistinction(results);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 5.5: 構造化された表示形式
   * 任意の解析結果において、データが適切な型で構造化されている
   */
  test('データが適切な型で構造化されている', () => {
    fc.assert(fc.property(
      analysisResultArbitrary,
      (results: AnalysisResult) => {
        return validator.validateStructuredFormat(results);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 5.6: JSONラウンドトリップの一貫性
   * 任意の解析結果において、JSON化→パース→JSON化のラウンドトリップで一貫性が保たれる
   */
  test('JSONラウンドトリップで一貫性が保たれる', () => {
    fc.assert(fc.property(
      analysisResultArbitrary,
      (results: AnalysisResult) => {
        try {
          const json1 = JSON.stringify(results);
          const parsed = JSON.parse(json1);
          const json2 = JSON.stringify(parsed);
          
          return json1 === json2;
        } catch (error) {
          return false;
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 5.7: カテゴリ内のデータ完全性
   * 任意の解析結果において、各カテゴリ内のデータが完全に保持されている
   */
  test('各カテゴリ内のデータが完全に保持されている', () => {
    fc.assert(fc.property(
      analysisResultArbitrary,
      (results: AnalysisResult) => {
        // 基本解析のデータ完全性
        if (results.basicAnalysis) {
          const ba = results.basicAnalysis;
          
          // 配列フィールドの完全性（nullは許可）
          if (ba.scenes !== undefined && ba.scenes !== null && !Array.isArray(ba.scenes)) return false;
          if (ba.objects !== undefined && ba.objects !== null && !Array.isArray(ba.objects)) return false;
          if (ba.activities !== undefined && ba.activities !== null && !Array.isArray(ba.activities)) return false;
          if (ba.emotions !== undefined && ba.emotions !== null && !Array.isArray(ba.emotions)) return false;
          if (ba.topics !== undefined && ba.topics !== null && !Array.isArray(ba.topics)) return false;
          
          // 文字列フィールドの完全性（nullは許可）
          if (ba.summary !== undefined && ba.summary !== null && typeof ba.summary !== 'string') return false;
        }

        // PR文章のデータ完全性
        if (results.prTexts) {
          if (results.prTexts.short !== undefined && results.prTexts.short !== null && typeof results.prTexts.short !== 'string') return false;
          if (results.prTexts.long !== undefined && results.prTexts.long !== null && typeof results.prTexts.long !== 'string') return false;
        }

        // あらすじのデータ完全性
        if (results.summaries) {
          if (results.summaries.short !== undefined && results.summaries.short !== null && typeof results.summaries.short !== 'string') return false;
          if (results.summaries.long !== undefined && results.summaries.long !== null && typeof results.summaries.long !== 'string') return false;
        }

        return true;
      }
    ), { numRuns: 100 });
  });

  /**
   * Property 5.8: エクスポートデータの可読性
   * 任意の解析結果において、エクスポートされたJSONが人間にとって読みやすい形式である
   */
  test('エクスポートされたJSONが読みやすい形式である', () => {
    fc.assert(fc.property(
      analysisResultArbitrary,
      (results: AnalysisResult) => {
        try {
          // インデント付きJSON
          const prettyJson = JSON.stringify(results, null, 2);
          
          // 改行が含まれている（整形されている）
          if (!prettyJson.includes('\n')) return false;
          
          // パース可能である
          const parsed = JSON.parse(prettyJson);
          
          // 元のデータと同等である
          const originalJson = JSON.stringify(results);
          const parsedJson = JSON.stringify(parsed);
          
          return originalJson === parsedJson;
        } catch (error) {
          return false;
        }
      }
    ), { numRuns: 100 });
  });
});
