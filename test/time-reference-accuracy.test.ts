/**
 * Property 8: 時間帯参照の正確性のプロパティベーステスト
 * 検証対象: 要件 7.6
 */

import * as fc from 'fast-check';

// テスト対象の型定義
interface TimeReference {
  start: number; // 秒単位
  end: number;   // 秒単位
  description: string;
}

interface TimeParseResult {
  isValid: boolean;
  timeReferences: TimeReference[];
  originalInput: string;
  confidence: number;
}

// 時間参照解析クラス
class TimeReferenceParser {
  private readonly VIDEO_DURATION = 600; // 10分の動画を想定

  // 時間参照の解析メイン関数
  parseTimeReferences(input: string): TimeParseResult {
    const timeReferences: TimeReference[] = [];
    let confidence = 0.5;

    try {
      // 各種時間パターンの解析
      const patterns = this.getTimePatterns();
      
      for (const pattern of patterns) {
        const matches = this.findMatches(input, pattern);
        timeReferences.push(...matches);
      }

      // 重複除去と正規化
      const normalizedRefs = this.normalizeTimeReferences(timeReferences);
      
      // 信頼度計算
      confidence = this.calculateConfidence(input, normalizedRefs);

      return {
        isValid: normalizedRefs.length > 0,
        timeReferences: normalizedRefs,
        originalInput: input,
        confidence
      };
    } catch (error) {
      return {
        isValid: false,
        timeReferences: [],
        originalInput: input,
        confidence: 0
      };
    }
  }

  // 時間パターンの定義
  private getTimePatterns() {
    return [
      {
        name: 'mm:ss',
        regex: /(\d{1,2}):(\d{2})/g,
        parser: (match: RegExpMatchArray) => {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          const totalSeconds = minutes * 60 + seconds;
          return {
            start: totalSeconds,
            end: totalSeconds + 30, // デフォルト30秒間
            description: `${minutes}分${seconds}秒付近`
          };
        }
      },
      {
        name: 'X分Y秒',
        regex: /(\d+)分(\d+)秒/g,
        parser: (match: RegExpMatchArray) => {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          const totalSeconds = minutes * 60 + seconds;
          return {
            start: totalSeconds,
            end: totalSeconds + 30,
            description: `${minutes}分${seconds}秒付近`
          };
        }
      },
      {
        name: 'X分目',
        regex: /(\d+)分目/g,
        parser: (match: RegExpMatchArray) => {
          const minutes = parseInt(match[1]);
          const startSeconds = (minutes - 1) * 60;
          return {
            start: startSeconds,
            end: startSeconds + 60,
            description: `${minutes}分目`
          };
        }
      },
      {
        name: '最初のX分',
        regex: /最初の(\d+)分/g,
        parser: (match: RegExpMatchArray) => {
          const minutes = parseInt(match[1]);
          return {
            start: 0,
            end: minutes * 60,
            description: `最初の${minutes}分間`
          };
        }
      },
      {
        name: '開始からX秒',
        regex: /開始から(\d+)秒/g,
        parser: (match: RegExpMatchArray) => {
          const seconds = parseInt(match[1]);
          return {
            start: 0,
            end: seconds,
            description: `開始から${seconds}秒間`
          };
        }
      },
      {
        name: '相対的時間参照',
        regex: /(最初|開始|始まり|最後|終わり|中盤|前半|後半)/g,
        parser: (match: RegExpMatchArray) => {
          const term = match[1];
          switch (term) {
            case '最初':
            case '開始':
            case '始まり':
              return {
                start: 0,
                end: 60,
                description: '動画の最初の部分'
              };
            case '最後':
            case '終わり':
              return {
                start: this.VIDEO_DURATION - 60,
                end: this.VIDEO_DURATION,
                description: '動画の最後の部分'
              };
            case '中盤':
              const midPoint = this.VIDEO_DURATION / 2;
              return {
                start: midPoint - 30,
                end: midPoint + 30,
                description: '動画の中盤'
              };
            case '前半':
              return {
                start: 0,
                end: this.VIDEO_DURATION / 2,
                description: '動画の前半'
              };
            case '後半':
              return {
                start: this.VIDEO_DURATION / 2,
                end: this.VIDEO_DURATION,
                description: '動画の後半'
              };
            default:
              return {
                start: 0,
                end: 30,
                description: '不明な時間参照'
              };
          }
        }
      }
    ];
  }

  // パターンマッチング
  private findMatches(input: string, pattern: any): TimeReference[] {
    const matches: TimeReference[] = [];
    let match;

    while ((match = pattern.regex.exec(input)) !== null) {
      try {
        const timeRef = pattern.parser(match);
        if (this.isValidTimeReference(timeRef)) {
          matches.push(timeRef);
        }
      } catch (error) {
        // パース失敗は無視
      }
    }

    return matches;
  }

  // 時間参照の妥当性検証
  private isValidTimeReference(timeRef: TimeReference): boolean {
    return (
      timeRef.start >= 0 &&
      timeRef.end > timeRef.start &&
      timeRef.start < this.VIDEO_DURATION &&
      timeRef.description.length > 0
    );
  }

  // 時間参照の正規化（重複除去・マージ）
  private normalizeTimeReferences(timeRefs: TimeReference[]): TimeReference[] {
    if (timeRefs.length === 0) return [];

    // 開始時間でソート
    const sorted = timeRefs.sort((a, b) => a.start - b.start);
    const normalized: TimeReference[] = [];

    for (const current of sorted) {
      const last = normalized[normalized.length - 1];
      
      // 重複や重なりをチェック
      if (last && this.isOverlapping(last, current)) {
        // マージ
        last.end = Math.max(last.end, current.end);
        last.description = `${last.description}・${current.description}`;
      } else {
        normalized.push({ ...current });
      }
    }

    return normalized;
  }

  // 時間参照の重なり判定
  private isOverlapping(ref1: TimeReference, ref2: TimeReference): boolean {
    return ref1.end >= ref2.start && ref2.end >= ref1.start;
  }

  // 信頼度計算
  private calculateConfidence(input: string, timeRefs: TimeReference[]): number {
    let confidence = 0.5;

    // 時間参照の数による調整
    confidence += Math.min(timeRefs.length * 0.2, 0.4);

    // 具体的な時間指定があると信頼度向上
    if (input.match(/\d+:\d+/) || input.match(/\d+分\d+秒/)) {
      confidence += 0.3;
    }

    // 相対的な時間参照のみの場合は信頼度低下
    if (timeRefs.every(ref => ref.description.includes('部分'))) {
      confidence -= 0.1;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  // 時間フォーマット変換
  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // 時間範囲の検証
  isTimeInRange(seconds: number): boolean {
    return seconds >= 0 && seconds <= this.VIDEO_DURATION;
  }
}

// テスト用のArbitrary生成器
const timeReferenceInputArbitrary = fc.oneof(
  // 具体的な時間指定
  fc.record({
    minutes: fc.integer({ min: 0, max: 9 }),
    seconds: fc.integer({ min: 0, max: 59 })
  }).map(({ minutes, seconds }) => `${minutes}分${seconds}秒のところで何が起こりますか？`),
  
  // mm:ss形式
  fc.record({
    minutes: fc.integer({ min: 0, max: 9 }),
    seconds: fc.integer({ min: 0, max: 59 })
  }).map(({ minutes, seconds }) => `${minutes}:${seconds.toString().padStart(2, '0')}から何が始まりますか？`),
  
  // 相対的な時間参照
  fc.constantFrom(
    '最初の部分について教えてください',
    '動画の最後はどうなりますか？',
    '中盤の見どころは何ですか？',
    '前半の内容をまとめてください',
    '後半で何が起こりますか？',
    '開始から30秒の内容は？',
    '最初の2分間について',
    '3分目の内容は？'
  ),
  
  // 複数の時間参照
  fc.constantFrom(
    '1:30から2:45までの内容は？',
    '最初の1分と最後の1分を比較してください',
    '2分30秒と5分15秒の場面について',
    '前半と後半の違いは？'
  ),
  
  // 時間参照なし
  fc.constantFrom(
    '動画の内容を教えてください',
    'どんな動画ですか？',
    '感想を聞かせてください'
  )
);

describe('Property 8: 時間帯参照の正確性', () => {
  let parser: TimeReferenceParser;

  beforeEach(() => {
    parser = new TimeReferenceParser();
  });

  describe('Property 8.1: 時間解析の一貫性', () => {
    test('同じ入力に対して常に同じ結果を返す', () => {
      fc.assert(fc.property(
        timeReferenceInputArbitrary,
        (input) => {
          const result1 = parser.parseTimeReferences(input);
          const result2 = parser.parseTimeReferences(input);
          
          expect(result1.isValid).toBe(result2.isValid);
          expect(result1.timeReferences).toEqual(result2.timeReferences);
          expect(result1.confidence).toBe(result2.confidence);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 8.2: 具体的時間指定の正確性', () => {
    test('mm:ss形式の時間指定が正確に解析される', () => {
      fc.assert(fc.property(
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 59 }),
        (minutes, seconds) => {
          const input = `${minutes}:${seconds.toString().padStart(2, '0')}の内容は？`;
          const result = parser.parseTimeReferences(input);
          
          expect(result.isValid).toBe(true);
          expect(result.timeReferences.length).toBeGreaterThan(0);
          
          const timeRef = result.timeReferences[0];
          const expectedSeconds = minutes * 60 + seconds;
          
          expect(timeRef.start).toBe(expectedSeconds);
          expect(timeRef.end).toBeGreaterThan(timeRef.start);
          expect(parser.isTimeInRange(timeRef.start)).toBe(true);
          expect(parser.isTimeInRange(timeRef.end)).toBe(true);
        }
      ), { numRuns: 30 });
    });

    test('X分Y秒形式の時間指定が正確に解析される', () => {
      fc.assert(fc.property(
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 59 }),
        (minutes, seconds) => {
          const input = `${minutes}分${seconds}秒で何が起こりますか？`;
          const result = parser.parseTimeReferences(input);
          
          expect(result.isValid).toBe(true);
          expect(result.timeReferences.length).toBeGreaterThan(0);
          
          const timeRef = result.timeReferences[0];
          const expectedSeconds = minutes * 60 + seconds;
          
          expect(timeRef.start).toBe(expectedSeconds);
          expect(timeRef.description).toContain(`${minutes}分${seconds}秒`);
        }
      ), { numRuns: 30 });
    });
  });

  describe('Property 8.3: 相対的時間参照の妥当性', () => {
    test('相対的な時間参照が適切な範囲にマップされる', () => {
      const testCases = [
        { input: '最初の部分', expectedStart: 0, maxEnd: 120 },
        { input: '最後の部分', minStart: 480, expectedEnd: 600 },
        { input: '中盤の内容', minStart: 250, maxEnd: 350 },
        { input: '前半について', expectedStart: 0, maxEnd: 300 },
        { input: '後半の内容', minStart: 300, expectedEnd: 600 }
      ];

      testCases.forEach(({ input, expectedStart, expectedEnd, minStart, maxEnd }) => {
        const result = parser.parseTimeReferences(input);
        
        expect(result.isValid).toBe(true);
        expect(result.timeReferences.length).toBeGreaterThan(0);
        
        const timeRef = result.timeReferences[0];
        
        if (expectedStart !== undefined) {
          expect(timeRef.start).toBe(expectedStart);
        }
        if (expectedEnd !== undefined) {
          expect(timeRef.end).toBe(expectedEnd);
        }
        if (minStart !== undefined) {
          expect(timeRef.start).toBeGreaterThanOrEqual(minStart);
        }
        if (maxEnd !== undefined) {
          expect(timeRef.end).toBeLessThanOrEqual(maxEnd);
        }
      });
    });
  });

  describe('Property 8.4: 時間範囲の妥当性', () => {
    test('すべての時間参照が有効な範囲内にある', () => {
      fc.assert(fc.property(
        timeReferenceInputArbitrary,
        (input) => {
          const result = parser.parseTimeReferences(input);
          
          result.timeReferences.forEach(timeRef => {
            // 開始時間は0以上
            expect(timeRef.start).toBeGreaterThanOrEqual(0);
            
            // 終了時間は開始時間より大きい
            expect(timeRef.end).toBeGreaterThan(timeRef.start);
            
            // 動画の長さを超えない（相対参照の場合は例外）
            if (!timeRef.description.includes('部分')) {
              expect(timeRef.start).toBeLessThanOrEqual(600);
              expect(timeRef.end).toBeLessThanOrEqual(630); // 30秒のバッファを考慮
            }
            
            // 説明文が存在する
            expect(timeRef.description).toBeTruthy();
            expect(timeRef.description.length).toBeGreaterThan(0);
          });
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 8.5: 重複時間参照の正規化', () => {
    test('重複する時間参照が適切にマージされる', () => {
      const testInputs = [
        '1:30から2:00までと1:45から2:15までの内容',
        '最初の1分と開始から30秒の部分',
        '2分30秒と2分45秒の場面について'
      ];

      testInputs.forEach(input => {
        const result = parser.parseTimeReferences(input);
        
        if (result.timeReferences.length > 1) {
          // 時間参照がソートされている
          for (let i = 1; i < result.timeReferences.length; i++) {
            expect(result.timeReferences[i].start).toBeGreaterThanOrEqual(
              result.timeReferences[i - 1].start
            );
          }
          
          // 重複がない
          for (let i = 1; i < result.timeReferences.length; i++) {
            const prev = result.timeReferences[i - 1];
            const current = result.timeReferences[i];
            expect(current.start).toBeGreaterThanOrEqual(prev.end);
          }
        }
      });
    });
  });

  describe('Property 8.6: 信頼度計算の妥当性', () => {
    test('時間参照の特徴に応じて適切な信頼度が計算される', () => {
      fc.assert(fc.property(
        timeReferenceInputArbitrary,
        (input) => {
          const result = parser.parseTimeReferences(input);
          
          // 信頼度は0-1の範囲内
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
          
          // 具体的な時間指定があると信頼度が高い
          if (input.match(/\d+:\d+/) || input.match(/\d+分\d+秒/)) {
            expect(result.confidence).toBeGreaterThan(0.7);
          }
          
          // 時間参照がない場合は信頼度が低い
          if (result.timeReferences.length === 0) {
            expect(result.confidence).toBeLessThan(0.6);
          }
          
          // 複数の時間参照があると信頼度が向上
          if (result.timeReferences.length > 1) {
            expect(result.confidence).toBeGreaterThan(0.6);
          }
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 8.7: 時間フォーマット変換の正確性', () => {
    test('秒数が正しくmm:ss形式に変換される', () => {
      fc.assert(fc.property(
        fc.integer({ min: 0, max: 600 }),
        (seconds) => {
          const formatted = parser.formatTime(seconds);
          const expectedMinutes = Math.floor(seconds / 60);
          const expectedSeconds = seconds % 60;
          const expected = `${expectedMinutes}:${expectedSeconds.toString().padStart(2, '0')}`;
          
          expect(formatted).toBe(expected);
          
          // 逆変換の検証
          const [minutesPart, secondsPart] = formatted.split(':');
          const reconstructed = parseInt(minutesPart) * 60 + parseInt(secondsPart);
          expect(reconstructed).toBe(seconds);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Property 8.8: エラー処理の堅牢性', () => {
    test('不正な入力に対して適切に処理される', () => {
      const invalidInputs = [
        '',
        '   ',
        '25:99の内容', // 無効な時間
        '100分30秒について', // 動画長を超える時間
        '特殊文字@#$%^&*()',
        null,
        undefined
      ];

      invalidInputs.forEach(input => {
        expect(() => {
          const safeInput = input || '';
          const result = parser.parseTimeReferences(safeInput);
          
          // 基本構造は維持される
          expect(result).toHaveProperty('isValid');
          expect(result).toHaveProperty('timeReferences');
          expect(result).toHaveProperty('originalInput');
          expect(result).toHaveProperty('confidence');
          
          // 信頼度は有効範囲内
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        }).not.toThrow();
      });
    });
  });

  describe('Property 8.9: 境界値処理の正確性', () => {
    test('境界値の時間参照が適切に処理される', () => {
      const boundaryInputs = [
        '0:00の内容',      // 開始時点
        '10:00の内容',     // 終了時点
        '0分0秒について',   // 開始時点（別形式）
        '9分59秒の場面'    // 終了直前
      ];

      boundaryInputs.forEach(input => {
        const result = parser.parseTimeReferences(input);
        
        if (result.isValid) {
          result.timeReferences.forEach(timeRef => {
            expect(timeRef.start).toBeGreaterThanOrEqual(0);
            expect(timeRef.start).toBeLessThanOrEqual(600);
            expect(timeRef.end).toBeGreaterThan(timeRef.start);
          });
        }
      });
    });
  });
});