/**
 * Property 7: 自然言語問い合わせの文脈保持のプロパティベーステスト
 * 検証対象: 要件 7.7, 7.8
 */

import * as fc from 'fast-check';

// テスト対象の型定義
interface QueryAnalysis {
  intent: string;
  timeReferences: string[];
  keywords: string[];
  questionType: 'content' | 'scene' | 'time' | 'analysis' | 'general';
  confidence: number;
}

interface ConversationContext {
  previousQuestions: string[];
  topics: string[];
  focusArea: string | null;
}

interface TimeReference {
  start: number;
  end: number;
  description: string;
}

// モック実装（実際のLambda関数の機能をテスト用に再実装）
class NaturalLanguageQueryProcessor {
  
  // 自然言語問い合わせの解析
  analyzeQuery(question: string): QueryAnalysis {
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
    const keywords = this.extractKeywords(question);

    // 意図の推定
    const intent = this.estimateIntent(question, questionType);

    return {
      intent,
      timeReferences,
      keywords,
      questionType,
      confidence: this.calculateConfidence(question, timeReferences, keywords)
    };
  }

  // キーワード抽出
  private extractKeywords(question: string): string[] {
    const commonWords = ['は', 'が', 'を', 'に', 'で', 'と', 'の', 'から', 'まで', 'について', 'ですか', 'ください', 'してください'];
    const words = question.split(/[\s、。！？]+/).filter(word => 
      word.length > 1 && !commonWords.includes(word)
    );
    return words.slice(0, 10);
  }

  // 意図推定
  private estimateIntent(question: string, questionType: QueryAnalysis['questionType']): string {
    const intentMap = {
      'content': '動画内容の要約・説明',
      'scene': 'シーン別の詳細分析',
      'time': '特定時間帯の内容確認',
      'analysis': '感情・トーン分析',
      'general': '一般的な質問'
    };
    return intentMap[questionType];
  }

  // 信頼度計算
  private calculateConfidence(question: string, timeReferences: string[], keywords: string[]): number {
    let confidence = 0.5;
    
    if (question.length > 10) confidence += 0.1;
    if (question.length > 30) confidence += 0.1;
    if (timeReferences.length > 0) confidence += 0.2;
    confidence += Math.min(keywords.length * 0.05, 0.2);
    
    return Math.min(confidence, 1.0);
  }

  // 文脈保持機能
  buildConversationContext(previousQueries: string[]): ConversationContext {
    const topics = this.extractTopicsFromHistory(previousQueries);
    const focusArea = this.determineFocusArea(previousQueries);
    
    return {
      previousQuestions: previousQueries.slice(0, 3),
      topics,
      focusArea
    };
  }

  // 履歴からトピック抽出
  private extractTopicsFromHistory(questions: string[]): string[] {
    const allKeywords = questions.flatMap(q => this.extractKeywords(q));
    const topicCounts = allKeywords.reduce((acc, keyword) => {
      acc[keyword] = (acc[keyword] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  // フォーカスエリア決定
  private determineFocusArea(questions: string[]): string | null {
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
  }

  // 時間参照の解析
  parseTimeReferences(timeRefs: string[]): TimeReference[] {
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
          end: totalSeconds + 30,
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
          start: 540, // 9分（仮の動画長）
          end: 600,   // 10分
          description: '動画の最後の部分'
        });
      } else if (lowerRef.includes('中盤')) {
        references.push({
          start: 250, // 動画の中央付近
          end: 350,
          description: '動画の中盤'
        });
      }
    });
    
    return references;
  }
}

// テスト用のArbitrary生成器
const questionArbitrary = fc.oneof(
  fc.constantFrom(
    '動画の内容を教えてください',
    'シーンごとに説明してください',
    '3分30秒のところで何が起こっていますか？',
    '最初の2分間の内容は？',
    '動画の感情的なトーンを分析してください',
    '登場人物について教えてください',
    '音楽について説明してください',
    '動画の最後はどうなりますか？',
    '中盤の見どころは？',
    '1:45から2:30までの内容は？'
  ),
  fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 0)
);

const previousQuestionsArbitrary = fc.array(questionArbitrary, { minLength: 0, maxLength: 10 });

describe('Property 7: 自然言語問い合わせの文脈保持', () => {
  let processor: NaturalLanguageQueryProcessor;

  beforeEach(() => {
    processor = new NaturalLanguageQueryProcessor();
  });

  describe('Property 7.1: 質問解析の一貫性', () => {
    test('同じ質問は常に同じ解析結果を返す', () => {
      fc.assert(fc.property(
        questionArbitrary,
        (question) => {
          const result1 = processor.analyzeQuery(question);
          const result2 = processor.analyzeQuery(question);
          
          expect(result1.intent).toBe(result2.intent);
          expect(result1.questionType).toBe(result2.questionType);
          expect(result1.timeReferences).toEqual(result2.timeReferences);
          expect(result1.keywords).toEqual(result2.keywords);
          expect(result1.confidence).toBe(result2.confidence);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 7.2: 時間参照の正確性', () => {
    test('時間参照を含む質問は適切に解析される', () => {
      fc.assert(fc.property(
        fc.constantFrom(
          '3分30秒のところで何が起こっていますか？',
          '1:45から2:30までの内容は？',
          '最初の2分間について教えてください',
          '動画の最後の部分はどうなりますか？',
          '中盤の見どころを教えてください'
        ),
        (question) => {
          const analysis = processor.analyzeQuery(question);
          
          // 時間参照を含む質問は適切に分類される
          expect(analysis.timeReferences.length).toBeGreaterThan(0);
          
          // 時間参照の解析結果を検証
          const timeRefs = processor.parseTimeReferences(analysis.timeReferences);
          expect(timeRefs.length).toBeGreaterThan(0);
          
          // 時間参照があると信頼度が向上する
          expect(analysis.confidence).toBeGreaterThan(0.5);
          
          // 各時間参照は有効な範囲を持つ
          timeRefs.forEach(ref => {
            expect(ref.start).toBeGreaterThanOrEqual(0);
            expect(ref.end).toBeGreaterThan(ref.start);
            expect(ref.description).toBeTruthy();
          });
        }
      ), { numRuns: 30 });
    });
  });

  describe('Property 7.3: 文脈保持の完全性', () => {
    test('過去の質問履歴から適切な文脈が構築される', () => {
      fc.assert(fc.property(
        previousQuestionsArbitrary,
        (previousQuestions) => {
          const context = processor.buildConversationContext(previousQuestions);
          
          // 文脈情報の基本構造を検証
          expect(context.previousQuestions).toBeDefined();
          expect(context.topics).toBeDefined();
          expect(Array.isArray(context.previousQuestions)).toBe(true);
          expect(Array.isArray(context.topics)).toBe(true);
          
          // 過去の質問数の制限を検証
          expect(context.previousQuestions.length).toBeLessThanOrEqual(3);
          
          // トピック数の制限を検証
          expect(context.topics.length).toBeLessThanOrEqual(5);
          
          // 空の履歴でも適切に処理される
          if (previousQuestions.length === 0) {
            expect(context.previousQuestions).toEqual([]);
            expect(context.topics).toEqual([]);
            expect(context.focusArea).toBeNull();
          }
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 7.4: フォーカスエリア決定の論理性', () => {
    test('関連する質問からフォーカスエリアが適切に決定される', () => {
      const testCases = [
        {
          questions: ['シーンについて教えてください', '場面の切り替わりは？'],
          expectedFocus: 'scene_analysis'
        },
        {
          questions: ['登場人物は誰ですか？', '人物の関係性は？'],
          expectedFocus: 'character_analysis'
        },
        {
          questions: ['音楽について教えてください', '効果音はどうですか？'],
          expectedFocus: 'audio_analysis'
        },
        {
          questions: ['感情的なトーンは？', '動画の雰囲気を分析してください'],
          expectedFocus: 'emotion_analysis'
        },
        {
          questions: ['動画の内容は？', '全体的な流れを教えてください'],
          expectedFocus: null
        }
      ];

      testCases.forEach(({ questions, expectedFocus }) => {
        const context = processor.buildConversationContext(questions);
        expect(context.focusArea).toBe(expectedFocus);
      });
    });
  });

  describe('Property 7.5: トピック抽出の一貫性', () => {
    test('同じキーワードを含む質問群から一貫したトピックが抽出される', () => {
      fc.assert(fc.property(
        fc.array(fc.constantFrom(
          'シーンについて教えてください',
          'シーンの切り替わりはいつですか？',
          'このシーンの意味は？',
          '重要なシーンはどこですか？'
        ), { minLength: 2, maxLength: 5 }),
        (questions) => {
          const context = processor.buildConversationContext(questions);
          
          // 「シーン」というトピックが抽出されることを期待
          expect(context.topics).toContain('シーン');
          
          // トピックは頻度順にソートされている
          if (context.topics.length > 1) {
            // 最も頻繁に出現するトピックが最初に来る
            expect(context.topics[0]).toBe('シーン');
          }
        }
      ), { numRuns: 20 });
    });
  });

  describe('Property 7.6: 信頼度計算の妥当性', () => {
    test('質問の特徴に応じて信頼度が適切に計算される', () => {
      fc.assert(fc.property(
        questionArbitrary,
        (question) => {
          const analysis = processor.analyzeQuery(question);
          
          // 信頼度は0-1の範囲内
          expect(analysis.confidence).toBeGreaterThanOrEqual(0);
          expect(analysis.confidence).toBeLessThanOrEqual(1);
          
          // 長い質問ほど信頼度が高い傾向
          if (question.length > 30) {
            expect(analysis.confidence).toBeGreaterThan(0.5);
          }
          
          // 時間参照があると信頼度が向上
          if (analysis.timeReferences.length > 0) {
            expect(analysis.confidence).toBeGreaterThan(0.6);
          }
          
          // キーワードが多いと信頼度が向上
          if (analysis.keywords.length > 3) {
            expect(analysis.confidence).toBeGreaterThan(0.6);
          }
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 7.7: 質問タイプ分類の正確性', () => {
    test('質問の内容に応じて適切なタイプが分類される', () => {
      const testCases = [
        { question: '動画の内容をまとめてください', expectedType: 'content' },
        { question: 'シーンごとに説明してください', expectedType: 'scene' },
        { question: '3分30秒で何が起こりますか？', expectedType: 'time' },
        { question: '感情的なトーンを分析してください', expectedType: 'analysis' },
        { question: 'この動画はどうですか？', expectedType: 'general' }
      ];

      testCases.forEach(({ question, expectedType }) => {
        const analysis = processor.analyzeQuery(question);
        expect(analysis.questionType).toBe(expectedType);
      });
    });
  });

  describe('Property 7.8: エラー処理の堅牢性', () => {
    test('不正な入力に対して適切に処理される', () => {
      const invalidInputs = ['', '   ', null, undefined];
      
      invalidInputs.forEach(input => {
        expect(() => {
          // null/undefinedの場合は空文字として処理
          const safeInput = input || '';
          const analysis = processor.analyzeQuery(safeInput);
          
          // 基本構造は維持される
          expect(analysis).toHaveProperty('intent');
          expect(analysis).toHaveProperty('timeReferences');
          expect(analysis).toHaveProperty('keywords');
          expect(analysis).toHaveProperty('questionType');
          expect(analysis).toHaveProperty('confidence');
        }).not.toThrow();
      });
    });
  });
});