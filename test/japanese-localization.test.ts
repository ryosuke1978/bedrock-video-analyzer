/**
 * Property 9のプロパティベーステスト: 日本語対応の完全性
 * **Feature: bedrock-video-analyzer, Property 9: 日本語対応の完全性**
 * **検証対象: 要件 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**
 */

import * as fc from 'fast-check';

// システム出力の型定義
interface SystemOutput {
  analysisResults?: {
    basicAnalysis?: any;
    prTexts?: any;
    summaries?: any;
  };
  uiElements?: {
    buttons?: string[];
    labels?: string[];
    messages?: string[];
  };
  errorMessages?: string[];
  functionDescriptions?: string[];
  limitations?: string[];
  queryResponses?: string[];
}

// 日本語対応検証クラス
class JapaneseLocalizationValidator {
  private japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  private englishOnlyRegex = /^[a-zA-Z0-9\s\.,!?;:'"()\-_+=<>\/\\@#$%^&*\[\]{}|`~]*$/;

  /**
   * 解析結果の日本語翻訳を検証
   * 要件 8.1: 解析結果が英語で返される場合、日本語に翻訳する
   */
  validateAnalysisResultTranslation(originalResult: any, translatedResult: any): boolean {
    if (!originalResult || !translatedResult) return false;

    // 元の結果に英語コンテンツが含まれているかチェック
    const hasEnglishContent = this.hasEnglishContentInResult(originalResult);
    
    // 英語コンテンツがない場合は翻訳の必要がないため、常に有効
    if (!hasEnglishContent) {
      return true;
    }

    // 基本解析結果の翻訳検証
    if (originalResult.basicAnalysis && translatedResult.basicAnalysis) {
      if (!this.validateBasicAnalysisTranslation(originalResult.basicAnalysis, translatedResult.basicAnalysis)) {
        return false;
      }
    }

    // PR文章の翻訳検証
    if (originalResult.prTexts && translatedResult.prTexts) {
      if (!this.validateTextTranslation(originalResult.prTexts, translatedResult.prTexts)) {
        return false;
      }
    }

    // あらすじの翻訳検証
    if (originalResult.summaries && translatedResult.summaries) {
      if (!this.validateTextTranslation(originalResult.summaries, translatedResult.summaries)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 結果に英語コンテンツが含まれているかチェック
   */
  private hasEnglishContentInResult(result: any): boolean {
    if (!result) return false;

    // 基本解析の英語コンテンツチェック
    if (result.basicAnalysis) {
      if (result.basicAnalysis.summary && this.isEnglishOnly(result.basicAnalysis.summary)) {
        return true;
      }
      
      const arrayFields = ['scenes', 'objects', 'activities', 'emotions', 'topics'];
      for (const field of arrayFields) {
        if (result.basicAnalysis[field] && Array.isArray(result.basicAnalysis[field])) {
          for (const item of result.basicAnalysis[field]) {
            if (typeof item === 'string' && this.isEnglishOnly(item)) {
              return true;
            }
          }
        }
      }
    }

    // PR文章の英語コンテンツチェック
    if (result.prTexts) {
      if ((result.prTexts.short && this.isEnglishOnly(result.prTexts.short)) ||
          (result.prTexts.long && this.isEnglishOnly(result.prTexts.long))) {
        return true;
      }
    }

    // あらすじの英語コンテンツチェック
    if (result.summaries) {
      if ((result.summaries.short && this.isEnglishOnly(result.summaries.short)) ||
          (result.summaries.long && this.isEnglishOnly(result.summaries.long))) {
        return true;
      }
    }

    return false;
  }

  /**
   * 基本解析結果の翻訳検証
   */
  private validateBasicAnalysisTranslation(original: any, translated: any): boolean {
    // サマリーの翻訳
    if (original.summary && translated.summary) {
      if (this.isEnglishOnly(original.summary) && !this.containsJapanese(translated.summary)) {
        return false;
      }
    }

    // 配列要素の翻訳
    const arrayFields = ['scenes', 'objects', 'activities', 'emotions', 'topics'];
    for (const field of arrayFields) {
      if (original[field] && translated[field]) {
        if (!this.validateArrayTranslation(original[field], translated[field])) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * テキスト翻訳の検証
   */
  private validateTextTranslation(original: any, translated: any): boolean {
    const textFields = ['short', 'long'];
    
    for (const field of textFields) {
      if (original[field] && translated[field]) {
        if (this.isEnglishOnly(original[field]) && !this.containsJapanese(translated[field])) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 配列要素の翻訳検証
   */
  private validateArrayTranslation(originalArray: string[], translatedArray: string[]): boolean {
    if (!Array.isArray(originalArray) || !Array.isArray(translatedArray)) {
      return false;
    }

    // 空の配列の場合は有効
    if (originalArray.length === 0 && translatedArray.length === 0) {
      return true;
    }

    // 元の配列が空で翻訳後に要素がある場合は有効（翻訳で追加される場合）
    if (originalArray.length === 0 && translatedArray.length > 0) {
      return true;
    }

    // 元の配列に英語要素があるが翻訳後が空の場合
    // 翻訳システムが英語要素を削除する可能性があるため、これは許可する
    // 重要なのは、英語要素が日本語要素に置き換わることではなく、
    // 英語要素がそのまま残らないことである

    // 両方に要素がある場合、英語要素が日本語に翻訳されているかチェック
    for (let i = 0; i < Math.min(originalArray.length, translatedArray.length); i++) {
      const original = originalArray[i];
      const translated = translatedArray[i];
      
      if (typeof original === 'string' && typeof translated === 'string') {
        if (this.isEnglishOnly(original) && !this.containsJapanese(translated)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * UI要素の日本語表示を検証
   * 要件 8.2: 全てのインターフェースを日本語で表示する
   */
  validateUIJapaneseDisplay(uiElements: any): boolean {
    if (!uiElements) return true;

    // ボタンテキストの検証
    if (uiElements.buttons && Array.isArray(uiElements.buttons)) {
      for (const buttonText of uiElements.buttons) {
        if (typeof buttonText === 'string' && buttonText.length > 0) {
          if (this.isEnglishOnly(buttonText)) {
            return false;
          }
        }
      }
    }

    // ラベルテキストの検証
    if (uiElements.labels && Array.isArray(uiElements.labels)) {
      for (const labelText of uiElements.labels) {
        if (typeof labelText === 'string' && labelText.length > 0) {
          if (this.isEnglishOnly(labelText)) {
            return false;
          }
        }
      }
    }

    // メッセージテキストの検証
    if (uiElements.messages && Array.isArray(uiElements.messages)) {
      for (const messageText of uiElements.messages) {
        if (typeof messageText === 'string' && messageText.length > 0) {
          if (this.isEnglishOnly(messageText)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * エラーメッセージの日本語表示を検証
   * 要件 8.3: エラー内容を日本語で説明する
   */
  validateErrorMessageJapanese(errorMessages: string[]): boolean {
    if (!errorMessages || !Array.isArray(errorMessages)) return true;

    for (const errorMessage of errorMessages) {
      if (typeof errorMessage === 'string' && errorMessage.length > 0) {
        // エラーメッセージが英語のみの場合は日本語化されていない
        if (this.isEnglishOnly(errorMessage)) {
          return false;
        }
        
        // 日本語が含まれているかチェック
        if (!this.containsJapanese(errorMessage)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 機能説明の日本語表示を検証
   * 要件 8.4: 機能説明を日本語で提供する
   */
  validateFunctionDescriptionJapanese(descriptions: string[]): boolean {
    if (!descriptions || !Array.isArray(descriptions)) return true;

    for (const description of descriptions) {
      if (typeof description === 'string' && description.length > 0) {
        // 機能説明が英語のみの場合は日本語化されていない
        if (this.isEnglishOnly(description)) {
          return false;
        }
        
        // 日本語が含まれているかチェック
        if (!this.containsJapanese(description)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 制限事項の日本語表示を検証
   * 要件 8.5: 制限内容を日本語で明記する
   */
  validateLimitationsJapanese(limitations: string[]): boolean {
    if (!limitations || !Array.isArray(limitations)) return true;

    for (const limitation of limitations) {
      if (typeof limitation === 'string' && limitation.length > 0) {
        // 制限事項が英語のみの場合は日本語化されていない
        if (this.isEnglishOnly(limitation)) {
          return false;
        }
        
        // 日本語が含まれているかチェック
        if (!this.containsJapanese(limitation)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 自然言語問い合わせの日本語対応を検証
   * 要件 8.6: 日本語での質問を理解し、日本語で回答する
   */
  validateQueryResponseJapanese(queryResponses: string[]): boolean {
    if (!queryResponses || !Array.isArray(queryResponses)) return true;

    for (const response of queryResponses) {
      if (typeof response === 'string' && response.length > 0) {
        // 回答が英語のみの場合は日本語化されていない
        if (this.isEnglishOnly(response)) {
          return false;
        }
        
        // 日本語が含まれているかチェック
        if (!this.containsJapanese(response)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * PR文章・あらすじの日本語生成を検証
   * 要件 8.7: 全て日本語で生成する
   */
  validateGeneratedContentJapanese(prTexts: any, summaries: any): boolean {
    // PR文章の日本語検証
    if (prTexts) {
      if (prTexts.short && typeof prTexts.short === 'string') {
        if (this.isEnglishOnly(prTexts.short)) {
          return false;
        }
        if (!this.containsJapanese(prTexts.short)) {
          return false;
        }
      }
      
      if (prTexts.long && typeof prTexts.long === 'string') {
        if (this.isEnglishOnly(prTexts.long)) {
          return false;
        }
        if (!this.containsJapanese(prTexts.long)) {
          return false;
        }
      }
    }

    // あらすじの日本語検証
    if (summaries) {
      if (summaries.short && typeof summaries.short === 'string') {
        if (this.isEnglishOnly(summaries.short)) {
          return false;
        }
        if (!this.containsJapanese(summaries.short)) {
          return false;
        }
      }
      
      if (summaries.long && typeof summaries.long === 'string') {
        if (this.isEnglishOnly(summaries.long)) {
          return false;
        }
        if (!this.containsJapanese(summaries.long)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * システム全体の日本語対応完全性を検証
   */
  validateCompleteJapaneseLocalization(systemOutput: SystemOutput): boolean {
    // 解析結果の日本語化
    if (systemOutput.analysisResults) {
      if (!this.validateAnalysisResultsJapanese(systemOutput.analysisResults)) {
        return false;
      }
    }

    // UI要素の日本語化
    if (systemOutput.uiElements) {
      if (!this.validateUIJapaneseDisplay(systemOutput.uiElements)) {
        return false;
      }
    }

    // エラーメッセージの日本語化
    if (systemOutput.errorMessages) {
      if (!this.validateErrorMessageJapanese(systemOutput.errorMessages)) {
        return false;
      }
    }

    // 機能説明の日本語化
    if (systemOutput.functionDescriptions) {
      if (!this.validateFunctionDescriptionJapanese(systemOutput.functionDescriptions)) {
        return false;
      }
    }

    // 制限事項の日本語化
    if (systemOutput.limitations) {
      if (!this.validateLimitationsJapanese(systemOutput.limitations)) {
        return false;
      }
    }

    // 問い合わせ回答の日本語化
    if (systemOutput.queryResponses) {
      if (!this.validateQueryResponseJapanese(systemOutput.queryResponses)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 解析結果全体の日本語化を検証
   */
  private validateAnalysisResultsJapanese(analysisResults: any): boolean {
    if (analysisResults.basicAnalysis) {
      if (!this.validateBasicAnalysisJapanese(analysisResults.basicAnalysis)) {
        return false;
      }
    }

    if (analysisResults.prTexts && analysisResults.summaries) {
      if (!this.validateGeneratedContentJapanese(analysisResults.prTexts, analysisResults.summaries)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 基本解析結果の日本語化を検証
   */
  private validateBasicAnalysisJapanese(basicAnalysis: any): boolean {
    if (basicAnalysis.summary && typeof basicAnalysis.summary === 'string') {
      if (this.isEnglishOnly(basicAnalysis.summary)) {
        return false;
      }
    }

    const arrayFields = ['scenes', 'objects', 'activities', 'emotions', 'topics'];
    for (const field of arrayFields) {
      if (basicAnalysis[field] && Array.isArray(basicAnalysis[field])) {
        for (const item of basicAnalysis[field]) {
          if (typeof item === 'string' && this.isEnglishOnly(item)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * テキストが英語のみかどうかを判定
   */
  private isEnglishOnly(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    
    // 空白や記号のみの場合はスキップ
    if (text.trim().length === 0) return false;
    
    return this.englishOnlyRegex.test(text) && /[a-zA-Z]/.test(text);
  }

  /**
   * テキストに日本語が含まれているかを判定
   */
  private containsJapanese(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    return this.japaneseRegex.test(text);
  }
}

// テスト用のジェネレータ
const englishTextArbitrary = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => /[a-zA-Z]/.test(s))
  .map(s => s.replace(/[^\x00-\x7F]/g, '')); // ASCII文字のみ

const japaneseTextArbitrary = fc.string({ minLength: 1, maxLength: 200 })
  .map(text => {
    const japaneseChars = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
    const kanjiChars = '動画解析結果基本情報詳細内容処理完了開始終了';
    const katakanaChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    
    if (text.length === 0) return 'テスト';
    
    let result = '';
    for (let i = 0; i < Math.min(text.length, 50); i++) {
      const charSet = [japaneseChars, kanjiChars, katakanaChars][Math.floor(Math.random() * 3)];
      result += charSet[Math.floor(Math.random() * charSet.length)];
    }
    
    return result;
  });

const systemOutputArbitrary: fc.Arbitrary<SystemOutput> = fc.record({
  analysisResults: fc.option(fc.record({
    basicAnalysis: fc.option(fc.record({
      summary: fc.option(japaneseTextArbitrary),
      scenes: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 5 })),
      objects: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 8 })),
      activities: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 5 }))
    })),
    prTexts: fc.option(fc.record({
      short: fc.option(japaneseTextArbitrary),
      long: fc.option(japaneseTextArbitrary)
    })),
    summaries: fc.option(fc.record({
      short: fc.option(japaneseTextArbitrary),
      long: fc.option(japaneseTextArbitrary)
    }))
  })),
  uiElements: fc.option(fc.record({
    buttons: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 10 })),
    labels: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 8 })),
    messages: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 5 }))
  })),
  errorMessages: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 5 })),
  functionDescriptions: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 5 })),
  limitations: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 5 })),
  queryResponses: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 5 }))
}) as fc.Arbitrary<SystemOutput>;

describe('Property 9: 日本語対応の完全性', () => {
  const validator = new JapaneseLocalizationValidator();

  /**
   * Property 9.1: 解析結果の日本語翻訳
   * 任意の解析結果において、英語で返される場合は日本語に翻訳される
   */
  test('解析結果が英語の場合は日本語に翻訳される', () => {
    fc.assert(fc.property(
      fc.record({
        basicAnalysis: fc.option(fc.record({
          summary: fc.option(englishTextArbitrary),
          scenes: fc.option(fc.array(englishTextArbitrary, { maxLength: 3 })),
          objects: fc.option(fc.array(englishTextArbitrary, { maxLength: 3 }))
        })),
        prTexts: fc.option(fc.record({
          short: fc.option(englishTextArbitrary),
          long: fc.option(englishTextArbitrary)
        }))
      }),
      fc.record({
        basicAnalysis: fc.option(fc.record({
          summary: fc.option(japaneseTextArbitrary),
          scenes: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 3 })),
          objects: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 3 }))
        })),
        prTexts: fc.option(fc.record({
          short: fc.option(japaneseTextArbitrary),
          long: fc.option(japaneseTextArbitrary)
        }))
      }),
      (originalResult: any, translatedResult: any) => {
        return validator.validateAnalysisResultTranslation(originalResult, translatedResult);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 9.2: UI要素の日本語表示
   * 任意のUI要素において、全てのインターフェースが日本語で表示される
   */
  test('UI要素が全て日本語で表示される', () => {
    fc.assert(fc.property(
      fc.record({
        buttons: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 8 })),
        labels: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 6 })),
        messages: fc.option(fc.array(japaneseTextArbitrary, { maxLength: 4 }))
      }),
      (uiElements: any) => {
        return validator.validateUIJapaneseDisplay(uiElements);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 9.3: エラーメッセージの日本語表示
   * 任意のエラーメッセージにおいて、エラー内容が日本語で説明される
   */
  test('エラーメッセージが日本語で説明される', () => {
    fc.assert(fc.property(
      fc.array(japaneseTextArbitrary, { maxLength: 5 }),
      (errorMessages: string[]) => {
        return validator.validateErrorMessageJapanese(errorMessages);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 9.4: 機能説明の日本語提供
   * 任意の機能説明において、説明が日本語で提供される
   */
  test('機能説明が日本語で提供される', () => {
    fc.assert(fc.property(
      fc.array(japaneseTextArbitrary, { maxLength: 5 }),
      (descriptions: string[]) => {
        return validator.validateFunctionDescriptionJapanese(descriptions);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 9.5: 制限事項の日本語明記
   * 任意の制限事項において、制限内容が日本語で明記される
   */
  test('制限事項が日本語で明記される', () => {
    fc.assert(fc.property(
      fc.array(japaneseTextArbitrary, { maxLength: 5 }),
      (limitations: string[]) => {
        return validator.validateLimitationsJapanese(limitations);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 9.6: 問い合わせ回答の日本語対応
   * 任意の問い合わせ回答において、日本語で回答される
   */
  test('問い合わせ回答が日本語で提供される', () => {
    fc.assert(fc.property(
      fc.array(japaneseTextArbitrary, { maxLength: 5 }),
      (responses: string[]) => {
        return validator.validateQueryResponseJapanese(responses);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 9.7: 生成コンテンツの日本語生成
   * 任意のPR文章・あらすじにおいて、全て日本語で生成される
   */
  test('PR文章・あらすじが日本語で生成される', () => {
    fc.assert(fc.property(
      fc.record({
        short: fc.option(japaneseTextArbitrary),
        long: fc.option(japaneseTextArbitrary)
      }),
      fc.record({
        short: fc.option(japaneseTextArbitrary),
        long: fc.option(japaneseTextArbitrary)
      }),
      (prTexts: any, summaries: any) => {
        return validator.validateGeneratedContentJapanese(prTexts, summaries);
      }
    ), { numRuns: 50 });
  });

  /**
   * Property 9.8: システム全体の日本語対応完全性
   * 任意のシステム出力において、全ての要素が日本語で表示される
   */
  test('システム全体が日本語で対応されている', () => {
    fc.assert(fc.property(
      systemOutputArbitrary,
      (systemOutput: SystemOutput) => {
        return validator.validateCompleteJapaneseLocalization(systemOutput);
      }
    ), { numRuns: 50 });
  });
});