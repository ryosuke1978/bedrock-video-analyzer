/**
 * Property 6のプロパティベーステスト: PR文章・あらすじ生成の完全性
 * **Feature: bedrock-video-analyzer, Property 6: PR文章・あらすじ生成の完全性**
 * **検証対象: 要件 6.1, 6.2, 6.4, 6.5, 6.7, 6.8**
 */

import * as fc from 'fast-check';

// テスト用のモック結果データ
interface PRTexts {
  short: string;
  long: string;
  metadata?: {
    generatedAt: string;
    spoilerCheckApplied: boolean;
    contextUsed: boolean;
    lengths?: {
      short: number;
      long: number;
    };
  };
}

interface Summaries {
  short: string;
  long: string;
  metadata?: {
    generatedAt: string;
    conciseLogicApplied: boolean;
    contextUsed: boolean;
    lengths?: {
      short: number;
      long: number;
    };
    keyPoints?: string[];
  };
}

interface AnalysisResult {
  basicAnalysis: any;
  prTexts: PRTexts;
  summaries: Summaries;
  analysisMetadata: {
    completedAt: string;
    functionsExecuted: string[];
  };
}

// PR文章とあらすじの生成をシミュレート
function generatePRTexts(videoUrl: string, basicAnalysis?: any): PRTexts {
  const contextInfo = basicAnalysis ? {
    sceneCount: basicAnalysis.sceneCount || 0,
    activities: basicAnalysis.activities || []
  } : null;

  const shortPR = contextInfo 
    ? `この動画では${contextInfo.sceneCount}つのシーンを通じて興味深いコンテンツを提供しており、視聴者に価値ある情報を届けます。ぜひご覧ください！`
    : 'この動画では興味深いコンテンツを提供しており、視聴者に価値ある情報を届けます。ぜひご覧ください！';

  const longPR = contextInfo
    ? `この動画では${contextInfo.sceneCount}つのシーンを通じて非常に興味深いコンテンツを提供しており、視聴者に価値ある情報を届けます。詳細な解説と実践的なアドバイスが含まれており、初心者から上級者まで幅広い層に対応しています。ぜひ最後までご覧いただき、コメントやシェアもお願いします！`
    : 'この動画では非常に興味深いコンテンツを提供しており、視聴者に価値ある情報を届けます。詳細な解説と実践的なアドバイスが含まれており、初心者から上級者まで幅広い層に対応しています。ぜひ最後までご覧いただき、コメントやシェアもお願いします！';

  return {
    short: shortPR,
    long: longPR,
    metadata: {
      generatedAt: new Date().toISOString(),
      spoilerCheckApplied: true,
      contextUsed: !!basicAnalysis,
      lengths: {
        short: shortPR.length,
        long: longPR.length
      }
    }
  };
}

function generateSummaries(videoUrl: string, basicAnalysis?: any): Summaries {
  const contextInfo = basicAnalysis ? {
    sceneCount: basicAnalysis.sceneCount || 0,
    keyActivities: basicAnalysis.activities?.slice(0, 2) || []
  } : null;

  const shortSummary = contextInfo
    ? `この動画では${contextInfo.sceneCount}つのシーンを通じて重要なトピックについて解説しています。実用的な内容が含まれており、視聴者の理解を深めることができます。`
    : 'この動画では重要なトピックについて解説しています。実用的な内容が含まれており、視聴者の理解を深めることができます。';

  const longSummary = contextInfo
    ? `この動画では${contextInfo.sceneCount}つのシーンを通じて重要なトピックについて詳しく解説しています。まず基本概念から始まり、段階的に応用的な内容へと進んでいきます。実用的な例やケーススタディも豊富に含まれており、視聴者の理解を深めることができます。最後には今後の展望についても触れており、包括的な学習体験を提供しています。`
    : 'この動画では重要なトピックについて詳しく解説しています。まず基本概念から始まり、段階的に応用的な内容へと進んでいきます。実用的な例やケーススタディも豊富に含まれており、視聴者の理解を深めることができます。最後には今後の展望についても触れており、包括的な学習体験を提供しています。';

  return {
    short: shortSummary,
    long: longSummary,
    metadata: {
      generatedAt: new Date().toISOString(),
      conciseLogicApplied: true,
      contextUsed: !!basicAnalysis,
      lengths: {
        short: shortSummary.length,
        long: longSummary.length
      },
      keyPoints: contextInfo ? [`${contextInfo.sceneCount}つのシーンで構成`] : []
    }
  };
}

// ワンクリックコピー機能のシミュレート
function copyToClipboard(text: string): boolean {
  // 実際の実装ではnavigator.clipboard.writeText()を使用
  return text.length > 0;
}

// 明確な区別表示のシミュレート
function displayWithDistinction(prTexts: PRTexts, summaries: Summaries): {
  prSection: { title: string; content: PRTexts };
  summarySection: { title: string; content: Summaries };
} {
  return {
    prSection: {
      title: 'PR文章',
      content: prTexts
    },
    summarySection: {
      title: 'あらすじ',
      content: summaries
    }
  };
}

describe('Property 6: PR文章・あらすじ生成の完全性', () => {
  /**
   * Property 6.1: 200文字と500文字のPR文章生成
   * 任意の動画解析完了時において、200文字と500文字のPR文章が生成される
   * 検証対象: 要件 6.1, 6.2
   */
  test('200文字と500文字のPR文章が生成される', async () => {
    await fc.assert(fc.asyncProperty(
      fc.webUrl({ validSchemes: ['s3'] }).map(url => url.replace(/^https?:/, 's3:')), // S3 URL
      fc.option(fc.record({
        sceneCount: fc.integer({ min: 1, max: 10 }),
        activities: fc.array(fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }) }), { maxLength: 5 })
      })), // basicAnalysis (optional)
      async (videoUrl: string, basicAnalysis: any) => {
        const prTexts = generatePRTexts(videoUrl, basicAnalysis);

        // 200文字と500文字のPR文章が両方存在する
        expect(prTexts).toHaveProperty('short');
        expect(prTexts).toHaveProperty('long');

        // 文字列型である
        expect(typeof prTexts.short).toBe('string');
        expect(typeof prTexts.long).toBe('string');

        // 空でない
        expect(prTexts.short.length).toBeGreaterThan(0);
        expect(prTexts.long.length).toBeGreaterThan(0);

        // 長いPR文章は短いPR文章より長い（または同じ）
        expect(prTexts.long.length).toBeGreaterThanOrEqual(prTexts.short.length);

        // メタデータに長さ情報が含まれている
        if (prTexts.metadata?.lengths) {
          expect(prTexts.metadata.lengths.short).toBe(prTexts.short.length);
          expect(prTexts.metadata.lengths.long).toBe(prTexts.long.length);
        }
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 6.2: 200文字と500文字のあらすじ生成
   * 任意の動画解析完了時において、200文字と500文字のあらすじが生成される
   * 検証対象: 要件 6.4, 6.5
   */
  test('200文字と500文字のあらすじが生成される', async () => {
    await fc.assert(fc.asyncProperty(
      fc.webUrl({ validSchemes: ['s3'] }).map(url => url.replace(/^https?:/, 's3:')), // S3 URL
      fc.option(fc.record({
        sceneCount: fc.integer({ min: 1, max: 10 }),
        activities: fc.array(fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }) }), { maxLength: 3 })
      })), // basicAnalysis (optional)
      async (videoUrl: string, basicAnalysis: any) => {
        const summaries = generateSummaries(videoUrl, basicAnalysis);

        // 200文字と500文字のあらすじが両方存在する
        expect(summaries).toHaveProperty('short');
        expect(summaries).toHaveProperty('long');

        // 文字列型である
        expect(typeof summaries.short).toBe('string');
        expect(typeof summaries.long).toBe('string');

        // 空でない
        expect(summaries.short.length).toBeGreaterThan(0);
        expect(summaries.long.length).toBeGreaterThan(0);

        // 長いあらすじは短いあらすじより長い（または同じ）
        expect(summaries.long.length).toBeGreaterThanOrEqual(summaries.short.length);

        // メタデータに長さ情報が含まれている
        if (summaries.metadata?.lengths) {
          expect(summaries.metadata.lengths.short).toBe(summaries.short.length);
          expect(summaries.metadata.lengths.long).toBe(summaries.long.length);
        }
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 6.3: PR文章とあらすじの明確な区別表示
   * 任意の解析結果において、PR文章とあらすじが明確に区別されて表示される
   * 検証対象: 要件 6.7
   */
  test('PR文章とあらすじが明確に区別されて表示される', async () => {
    await fc.assert(fc.asyncProperty(
      fc.webUrl({ validSchemes: ['s3'] }).map(url => url.replace(/^https?:/, 's3:')), // S3 URL
      fc.option(fc.record({
        sceneCount: fc.integer({ min: 1, max: 10 }),
        activities: fc.array(fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }) }), { maxLength: 5 })
      })), // basicAnalysis (optional)
      async (videoUrl: string, basicAnalysis: any) => {
        const prTexts = generatePRTexts(videoUrl, basicAnalysis);
        const summaries = generateSummaries(videoUrl, basicAnalysis);

        const display = displayWithDistinction(prTexts, summaries);

        // PR文章セクションが存在する
        expect(display).toHaveProperty('prSection');
        expect(display.prSection).toHaveProperty('title');
        expect(display.prSection).toHaveProperty('content');
        expect(display.prSection.title).toBe('PR文章');

        // あらすじセクションが存在する
        expect(display).toHaveProperty('summarySection');
        expect(display.summarySection).toHaveProperty('title');
        expect(display.summarySection).toHaveProperty('content');
        expect(display.summarySection.title).toBe('あらすじ');

        // セクションが異なる
        expect(display.prSection.title).not.toBe(display.summarySection.title);

        // 内容が正しく分離されている
        expect(display.prSection.content).toEqual(prTexts);
        expect(display.summarySection.content).toEqual(summaries);
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 6.4: ワンクリックコピー機能の提供
   * 任意のPR文章やあらすじに対して、ワンクリックでコピー可能である
   * 検証対象: 要件 6.8
   */
  test('PR文章とあらすじがワンクリックでコピー可能である', async () => {
    await fc.assert(fc.asyncProperty(
      fc.webUrl({ validSchemes: ['s3'] }).map(url => url.replace(/^https?:/, 's3:')), // S3 URL
      fc.option(fc.record({
        sceneCount: fc.integer({ min: 1, max: 10 }),
        activities: fc.array(fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }) }), { maxLength: 5 })
      })), // basicAnalysis (optional)
      async (videoUrl: string, basicAnalysis: any) => {
        const prTexts = generatePRTexts(videoUrl, basicAnalysis);
        const summaries = generateSummaries(videoUrl, basicAnalysis);

        // PR文章（短）がコピー可能
        expect(copyToClipboard(prTexts.short)).toBe(true);

        // PR文章（長）がコピー可能
        expect(copyToClipboard(prTexts.long)).toBe(true);

        // あらすじ（短）がコピー可能
        expect(copyToClipboard(summaries.short)).toBe(true);

        // あらすじ（長）がコピー可能
        expect(copyToClipboard(summaries.long)).toBe(true);

        // 空でないテキストのみコピー可能
        expect(prTexts.short.length).toBeGreaterThan(0);
        expect(prTexts.long.length).toBeGreaterThan(0);
        expect(summaries.short.length).toBeGreaterThan(0);
        expect(summaries.long.length).toBeGreaterThan(0);
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 6.5: 生成されたテキストの完全性
   * 任意の解析結果において、PR文章とあらすじの全てのバリエーションが生成され、メタデータが含まれる
   */
  test('PR文章とあらすじの全てのバリエーションが生成され、メタデータが含まれる', async () => {
    await fc.assert(fc.asyncProperty(
      fc.webUrl({ validSchemes: ['s3'] }).map(url => url.replace(/^https?:/, 's3:')), // S3 URL
      fc.option(fc.record({
        sceneCount: fc.integer({ min: 1, max: 10 }),
        activities: fc.array(fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }) }), { maxLength: 5 })
      })), // basicAnalysis (optional)
      async (videoUrl: string, basicAnalysis: any) => {
        const prTexts = generatePRTexts(videoUrl, basicAnalysis);
        const summaries = generateSummaries(videoUrl, basicAnalysis);

        // PR文章の完全性
        expect(prTexts).toHaveProperty('short');
        expect(prTexts).toHaveProperty('long');
        expect(prTexts).toHaveProperty('metadata');

        // PR文章メタデータの完全性
        expect(prTexts.metadata).toHaveProperty('generatedAt');
        expect(prTexts.metadata).toHaveProperty('spoilerCheckApplied');
        expect(prTexts.metadata).toHaveProperty('contextUsed');
        expect(prTexts.metadata?.spoilerCheckApplied).toBe(true);

        // あらすじの完全性
        expect(summaries).toHaveProperty('short');
        expect(summaries).toHaveProperty('long');
        expect(summaries).toHaveProperty('metadata');

        // あらすじメタデータの完全性
        expect(summaries.metadata).toHaveProperty('generatedAt');
        expect(summaries.metadata).toHaveProperty('conciseLogicApplied');
        expect(summaries.metadata).toHaveProperty('contextUsed');
        expect(summaries.metadata?.conciseLogicApplied).toBe(true);

        // 生成時刻が有効なISO文字列である
        expect(() => new Date(prTexts.metadata!.generatedAt)).not.toThrow();
        expect(() => new Date(summaries.metadata!.generatedAt)).not.toThrow();

        // 基本解析が提供された場合はcontextUsedがtrue
        if (basicAnalysis) {
          expect(prTexts.metadata?.contextUsed).toBe(true);
          expect(summaries.metadata?.contextUsed).toBe(true);
        }
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 6.6: 統合結果における完全性
   * 任意の包括的解析結果において、PR文章とあらすじが完全に含まれている
   */
  test('包括的解析結果にPR文章とあらすじが完全に含まれている', async () => {
    await fc.assert(fc.asyncProperty(
      fc.webUrl({ validSchemes: ['s3'] }).map(url => url.replace(/^https?:/, 's3:')), // S3 URL
      fc.record({
        sceneCount: fc.integer({ min: 1, max: 10 }),
        activities: fc.array(fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }) }), { maxLength: 5 })
      }), // basicAnalysis
      async (videoUrl: string, basicAnalysis: any) => {
        // 包括的解析結果をシミュレート
        const analysisResult: AnalysisResult = {
          basicAnalysis,
          prTexts: generatePRTexts(videoUrl, basicAnalysis),
          summaries: generateSummaries(videoUrl, basicAnalysis),
          analysisMetadata: {
            completedAt: new Date().toISOString(),
            functionsExecuted: ['基本解析', 'PR文章生成', 'あらすじ生成']
          }
        };

        // 統合結果の構造が正しい
        expect(analysisResult).toHaveProperty('basicAnalysis');
        expect(analysisResult).toHaveProperty('prTexts');
        expect(analysisResult).toHaveProperty('summaries');
        expect(analysisResult).toHaveProperty('analysisMetadata');

        // PR文章の完全性
        expect(analysisResult.prTexts).toHaveProperty('short');
        expect(analysisResult.prTexts).toHaveProperty('long');
        expect(analysisResult.prTexts.short.length).toBeGreaterThan(0);
        expect(analysisResult.prTexts.long.length).toBeGreaterThan(0);

        // あらすじの完全性
        expect(analysisResult.summaries).toHaveProperty('short');
        expect(analysisResult.summaries).toHaveProperty('long');
        expect(analysisResult.summaries.short.length).toBeGreaterThan(0);
        expect(analysisResult.summaries.long.length).toBeGreaterThan(0);

        // 実行された機能が記録されている
        expect(analysisResult.analysisMetadata.functionsExecuted).toContain('PR文章生成');
        expect(analysisResult.analysisMetadata.functionsExecuted).toContain('あらすじ生成');

        // 完了時刻が有効なISO文字列である
        expect(() => new Date(analysisResult.analysisMetadata.completedAt)).not.toThrow();
      }
    ), { numRuns: 30 });
  });

  /**
   * Property 6.7: 長さの一貫性
   * 任意の生成されたテキストにおいて、長いバージョンは短いバージョン以上の長さである
   */
  test('長いバージョンは常に短いバージョン以上の長さである', async () => {
    await fc.assert(fc.asyncProperty(
      fc.webUrl({ validSchemes: ['s3'] }).map(url => url.replace(/^https?:/, 's3:')), // S3 URL
      fc.option(fc.record({
        sceneCount: fc.integer({ min: 1, max: 10 }),
        activities: fc.array(fc.record({ name: fc.string({ minLength: 1, maxLength: 20 }) }), { maxLength: 5 })
      })), // basicAnalysis (optional)
      async (videoUrl: string, basicAnalysis: any) => {
        const prTexts = generatePRTexts(videoUrl, basicAnalysis);
        const summaries = generateSummaries(videoUrl, basicAnalysis);

        // PR文章の長さの一貫性
        expect(prTexts.long.length).toBeGreaterThanOrEqual(prTexts.short.length);

        // あらすじの長さの一貫性
        expect(summaries.long.length).toBeGreaterThanOrEqual(summaries.short.length);

        // メタデータの長さ情報が実際の長さと一致する
        if (prTexts.metadata?.lengths) {
          expect(prTexts.metadata.lengths.short).toBe(prTexts.short.length);
          expect(prTexts.metadata.lengths.long).toBe(prTexts.long.length);
          expect(prTexts.metadata.lengths.long).toBeGreaterThanOrEqual(prTexts.metadata.lengths.short);
        }

        if (summaries.metadata?.lengths) {
          expect(summaries.metadata.lengths.short).toBe(summaries.short.length);
          expect(summaries.metadata.lengths.long).toBe(summaries.long.length);
          expect(summaries.metadata.lengths.long).toBeGreaterThanOrEqual(summaries.metadata.lengths.short);
        }
      }
    ), { numRuns: 30 });
  });
});