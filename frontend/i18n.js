/**
 * 多言語対応ユーティリティ
 * 英語の解析結果を日本語に翻訳し、UI全体の日本語化を管理
 */

class I18nManager {
    constructor() {
        this.currentLanguage = 'ja';
        this.translations = {
            ja: {
                // UI要素
                ui: {
                    uploadTitle: '動画ファイルのアップロード',
                    uploadDescription: '動画ファイルをドラッグ&ドロップするか、クリックして選択してください',
                    selectFile: 'ファイルを選択',
                    uploadStart: 'アップロード開始',
                    uploading: 'アップロード中...',
                    uploadCompleted: '✓ アップロード完了',
                    analysisProgress: '解析進行状況',
                    analysisResults: '解析結果',
                    detailedQuery: '詳細な問い合わせ',
                    basicAnalysis: '📊 基本解析',
                    prTexts: '📝 PR文章',
                    summaries: '📖 あらすじ',
                    shortVersion: '200文字版',
                    longVersion: '500文字版',
                    copyButton: '📋 コピー',
                    copiedButton: '✅ コピー済み',
                    exportJson: '📄 JSON形式でエクスポート',
                    newAnalysis: '🔄 新しい動画を解析',
                    showQuery: '💬 詳細な問い合わせ',
                    backToResults: '← 結果画面に戻る',
                    submitQuestion: '質問を送信',
                    cancel: '解析をキャンセル',
                    estimatedTime: '推定残り時間',
                    calculating: '計算中...',
                    minutes: '分',
                    questionPlaceholder: '動画について質問してください...',
                    questionExamples: '質問例',
                    confidence: '信頼度',
                    timeReferences: '参照時間'
                },
                
                // ファイル情報
                fileInfo: {
                    fileName: 'ファイル名',
                    fileSize: 'ファイルサイズ',
                    format: '形式',
                    selectedFile: '選択されたファイル'
                },
                
                // 制限事項
                limitations: {
                    title: '📋 制限事項',
                    supportedFormats: '対応形式',
                    maxFileSize: '最大ファイルサイズ',
                    maxDuration: '最大動画長',
                    resolutionLimit: '解像度制限',
                    estimatedCost: '概算コスト',
                    note: '※ 制限事項は予告なく変更される場合があります',
                    formatsList: 'MP4, MOV, AVI, MKV, WEBM, MXF, FLV, WMV, M4V',
                    maxSize: '100MB',
                    maxTime: '10分',
                    maxResolution: '1920x1080まで',
                    costRange: '1回の解析あたり約$0.10-0.50'
                },
                
                // 進行状況
                progress: {
                    functions: {
                        basicAnalysis: '基本解析',
                        prGeneration: 'PR文章生成',
                        summaryGeneration: 'あらすじ生成'
                    },
                    status: {
                        waiting: '待機中',
                        processing: '処理中',
                        completed: '完了',
                        failed: '失敗'
                    }
                },
                
                // エラーメッセージ
                errors: {
                    unsupportedFormat: '対応していないファイル形式です。\n対応形式: {formats}',
                    fileSizeTooLarge: 'ファイルサイズが制限を超えています。\n現在のサイズ: {currentSize}\n最大サイズ: {maxSize}',
                    fileTooSmall: 'ファイルが小さすぎます。有効な動画ファイルを選択してください。',
                    fileNameTooLong: 'ファイル名が長すぎます（最大255文字）。',
                    invalidCharacters: 'ファイル名に使用できない文字が含まれています。',
                    mimeTypeMismatch: 'ファイルの内容が拡張子と一致しません。\n検出されたタイプ: {detectedType}',
                    uploadFailed: 'アップロードに失敗しました: {message}',
                    serverError: 'サーバーエラー: {status}',
                    networkError: 'ネットワークエラーが発生しました',
                    timeout: 'アップロードがタイムアウトしました',
                    analysisStartFailed: '解析開始に失敗しました',
                    statusFetchFailed: 'ステータス取得に失敗しました',
                    analysisFailed: '解析に失敗しました',
                    questionSubmissionFailed: '質問の送信に失敗しました',
                    copyFailed: 'コピーに失敗しました',
                    noVideoAnalyzed: '解析が完了した動画がありません',
                    enterQuestion: '質問を入力してください',
                    confirmCancel: '解析をキャンセルしますか？'
                },
                
                // 成功メッセージ
                success: {
                    uploadCompleted: 'ファイルのアップロードが完了しました！\n解析を開始します...',
                    analysisCompleted: '解析が完了しました！',
                    questionSubmitted: '質問を送信しました',
                    resultsCopied: 'クリップボードにコピーしました',
                    resultsExported: '結果をエクスポートしました'
                },
                
                // 質問例
                questionExamples: {
                    summarize: '動画の内容をまとめてほしい',
                    sceneBreakdown: '動画をシーンごとに内容をまとめてほしい',
                    transcription: 'インタビュー内容を文字起こししてほしい',
                    keyPoints: '動画の重要なポイントを教えて',
                    characters: '登場人物について教えて',
                    timeline: '時系列で内容を整理して'
                },
                
                // 解析結果のカテゴリ
                analysisCategories: {
                    overview: '概要',
                    scenes: '検出されたシーン',
                    objects: '検出されたオブジェクト',
                    activities: '検出されたアクティビティ',
                    emotions: '感情分析',
                    topics: 'トピック',
                    keyframes: 'キーフレーム',
                    transcript: '音声認識結果',
                    noData: 'データなし'
                }
            }
        };
        
        // 英語から日本語への翻訳マッピング
        this.englishToJapanese = {
            // 基本的な動詞・形容詞
            'analyze': '解析する',
            'analysis': '解析',
            'video': '動画',
            'audio': '音声',
            'scene': 'シーン',
            'object': 'オブジェクト',
            'person': '人物',
            'activity': 'アクティビティ',
            'emotion': '感情',
            'happy': '幸せ',
            'sad': '悲しい',
            'angry': '怒り',
            'surprised': '驚き',
            'neutral': '中性',
            'positive': 'ポジティブ',
            'negative': 'ネガティブ',
            'confident': '自信のある',
            'uncertain': '不確実',
            
            // オブジェクト・物体
            'car': '車',
            'person': '人',
            'building': '建物',
            'tree': '木',
            'sky': '空',
            'water': '水',
            'road': '道路',
            'house': '家',
            'dog': '犬',
            'cat': '猫',
            'bird': '鳥',
            'flower': '花',
            'mountain': '山',
            'beach': 'ビーチ',
            'city': '都市',
            'nature': '自然',
            
            // アクティビティ
            'walking': '歩く',
            'running': '走る',
            'sitting': '座る',
            'standing': '立つ',
            'talking': '話す',
            'eating': '食べる',
            'drinking': '飲む',
            'reading': '読む',
            'writing': '書く',
            'cooking': '料理する',
            'driving': '運転する',
            'playing': '遊ぶ',
            'working': '働く',
            'sleeping': '眠る',
            'dancing': '踊る',
            'singing': '歌う',
            
            // 時間表現
            'morning': '朝',
            'afternoon': '午後',
            'evening': '夕方',
            'night': '夜',
            'day': '日',
            'week': '週',
            'month': '月',
            'year': '年',
            'minute': '分',
            'second': '秒',
            'hour': '時間',
            
            // 場所・環境
            'indoor': '屋内',
            'outdoor': '屋外',
            'office': 'オフィス',
            'home': '家',
            'school': '学校',
            'park': '公園',
            'restaurant': 'レストラン',
            'street': '通り',
            'room': '部屋',
            'kitchen': 'キッチン',
            'bedroom': '寝室',
            'bathroom': 'バスルーム',
            
            // 色
            'red': '赤',
            'blue': '青',
            'green': '緑',
            'yellow': '黄色',
            'black': '黒',
            'white': '白',
            'gray': 'グレー',
            'brown': '茶色',
            'pink': 'ピンク',
            'purple': '紫',
            'orange': 'オレンジ',
            
            // 技術用語
            'confidence': '信頼度',
            'timestamp': 'タイムスタンプ',
            'duration': '長さ',
            'resolution': '解像度',
            'format': 'フォーマット',
            'quality': '品質',
            'frame': 'フレーム',
            'audio track': '音声トラック',
            'video track': '映像トラック',
            'metadata': 'メタデータ'
        };
    }

    /**
     * 指定されたキーの翻訳を取得
     * @param {string} key - 翻訳キー（ドット記法対応）
     * @param {Object} params - パラメータ置換用オブジェクト
     * @returns {string} 翻訳されたテキスト
     */
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }
        
        if (typeof value !== 'string') {
            console.warn(`Translation value is not a string: ${key}`);
            return key;
        }
        
        // パラメータ置換
        return this.replaceParams(value, params);
    }

    /**
     * パラメータ置換処理
     * @param {string} text - 置換対象テキスト
     * @param {Object} params - 置換パラメータ
     * @returns {string} 置換後テキスト
     */
    replaceParams(text, params) {
        return text.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * 英語テキストを日本語に翻訳
     * @param {string} englishText - 英語テキスト
     * @returns {string} 日本語テキスト
     */
    translateEnglishToJapanese(englishText) {
        if (!englishText || typeof englishText !== 'string') {
            return englishText;
        }

        let translatedText = englishText.toLowerCase();
        
        // 単語レベルでの翻訳
        for (const [english, japanese] of Object.entries(this.englishToJapanese)) {
            const regex = new RegExp(`\\b${english}\\b`, 'gi');
            translatedText = translatedText.replace(regex, japanese);
        }
        
        // 文の構造を日本語らしく調整
        translatedText = this.adjustJapaneseSentenceStructure(translatedText);
        
        return translatedText;
    }

    /**
     * 日本語の文構造に調整
     * @param {string} text - 調整対象テキスト
     * @returns {string} 調整後テキスト
     */
    adjustJapaneseSentenceStructure(text) {
        // 基本的な文構造の調整
        text = text.replace(/(\w+)\s+is\s+(\w+)/gi, '$1は$2です');
        text = text.replace(/(\w+)\s+are\s+(\w+)/gi, '$1は$2です');
        text = text.replace(/there\s+is\s+(\w+)/gi, '$1があります');
        text = text.replace(/there\s+are\s+(\w+)/gi, '$1があります');
        
        // 時間表現の調整
        text = text.replace(/at\s+(\d+):(\d+)/gi, '$1時$2分に');
        text = text.replace(/(\d+)\s+minutes?/gi, '$1分');
        text = text.replace(/(\d+)\s+seconds?/gi, '$1秒');
        text = text.replace(/(\d+)\s+hours?/gi, '$1時間');
        
        // 数量表現の調整
        text = text.replace(/(\d+)\s+people/gi, '$1人');
        text = text.replace(/(\d+)\s+cars?/gi, '$1台の車');
        text = text.replace(/(\d+)\s+objects?/gi, '$1個のオブジェクト');
        
        return text;
    }

    /**
     * 解析結果オブジェクトを日本語化
     * @param {Object} analysisResult - 解析結果オブジェクト
     * @returns {Object} 日本語化された解析結果
     */
    translateAnalysisResult(analysisResult) {
        if (!analysisResult || typeof analysisResult !== 'object') {
            return analysisResult;
        }

        const translated = JSON.parse(JSON.stringify(analysisResult));

        // 基本解析結果の翻訳
        if (translated.basicAnalysis) {
            if (translated.basicAnalysis.summary) {
                translated.basicAnalysis.summary = this.translateEnglishToJapanese(translated.basicAnalysis.summary);
            }
            
            if (Array.isArray(translated.basicAnalysis.scenes)) {
                translated.basicAnalysis.scenes = translated.basicAnalysis.scenes.map(scene => 
                    this.translateEnglishToJapanese(scene)
                );
            }
            
            if (Array.isArray(translated.basicAnalysis.objects)) {
                translated.basicAnalysis.objects = translated.basicAnalysis.objects.map(obj => 
                    this.translateEnglishToJapanese(obj)
                );
            }
            
            if (Array.isArray(translated.basicAnalysis.activities)) {
                translated.basicAnalysis.activities = translated.basicAnalysis.activities.map(activity => 
                    this.translateEnglishToJapanese(activity)
                );
            }
        }

        // PR文章の翻訳（既に日本語の場合はそのまま）
        if (translated.prTexts) {
            if (translated.prTexts.short && this.isEnglishText(translated.prTexts.short)) {
                translated.prTexts.short = this.translateEnglishToJapanese(translated.prTexts.short);
            }
            if (translated.prTexts.long && this.isEnglishText(translated.prTexts.long)) {
                translated.prTexts.long = this.translateEnglishToJapanese(translated.prTexts.long);
            }
        }

        // あらすじの翻訳（既に日本語の場合はそのまま）
        if (translated.summaries) {
            if (translated.summaries.short && this.isEnglishText(translated.summaries.short)) {
                translated.summaries.short = this.translateEnglishToJapanese(translated.summaries.short);
            }
            if (translated.summaries.long && this.isEnglishText(translated.summaries.long)) {
                translated.summaries.long = this.translateEnglishToJapanese(translated.summaries.long);
            }
        }

        return translated;
    }

    /**
     * テキストが英語かどうかを判定
     * @param {string} text - 判定対象テキスト
     * @returns {boolean} 英語の場合true
     */
    isEnglishText(text) {
        if (!text || typeof text !== 'string') {
            return false;
        }
        
        // 日本語文字（ひらがな、カタカナ、漢字）が含まれている場合は日本語と判定
        const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
        if (japaneseRegex.test(text)) {
            return false;
        }
        
        // 英語のアルファベットが主体の場合は英語と判定
        const englishRegex = /[a-zA-Z]/;
        return englishRegex.test(text);
    }

    /**
     * エラーメッセージを日本語化
     * @param {string} errorKey - エラーキー
     * @param {Object} params - パラメータ
     * @returns {string} 日本語エラーメッセージ
     */
    getErrorMessage(errorKey, params = {}) {
        return this.t(`errors.${errorKey}`, params);
    }

    /**
     * 成功メッセージを日本語化
     * @param {string} successKey - 成功メッセージキー
     * @param {Object} params - パラメータ
     * @returns {string} 日本語成功メッセージ
     */
    getSuccessMessage(successKey, params = {}) {
        return this.t(`success.${successKey}`, params);
    }

    /**
     * UI要素のテキストを更新
     */
    updateUITexts() {
        // ボタンテキストの更新
        const selectFileBtn = document.getElementById('select-file-btn');
        if (selectFileBtn) {
            selectFileBtn.textContent = this.t('ui.selectFile');
        }

        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.textContent = this.t('ui.uploadStart');
        }

        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.textContent = this.t('ui.cancel');
        }

        const exportJsonBtn = document.getElementById('export-json-btn');
        if (exportJsonBtn) {
            exportJsonBtn.textContent = this.t('ui.exportJson');
        }

        const newAnalysisBtn = document.getElementById('new-analysis-btn');
        if (newAnalysisBtn) {
            newAnalysisBtn.textContent = this.t('ui.newAnalysis');
        }

        const showQueryBtn = document.getElementById('show-query-btn');
        if (showQueryBtn) {
            showQueryBtn.textContent = this.t('ui.showQuery');
        }

        const backToResultsBtn = document.getElementById('back-to-results-btn');
        if (backToResultsBtn) {
            backToResultsBtn.textContent = this.t('ui.backToResults');
        }

        const submitQuestionBtn = document.getElementById('submit-question-btn');
        if (submitQuestionBtn) {
            submitQuestionBtn.textContent = this.t('ui.submitQuestion');
        }

        // プレースホルダーの更新
        const questionInput = document.getElementById('question-input');
        if (questionInput) {
            questionInput.placeholder = this.t('ui.questionPlaceholder');
        }

        // 制限事項の更新
        this.updateLimitationsTexts();

        // 質問例の更新
        this.updateQuestionExamples();
    }

    /**
     * 制限事項テキストの更新
     */
    updateLimitationsTexts() {
        const limitationItems = document.querySelectorAll('.limitation-item');
        if (limitationItems.length >= 5) {
            limitationItems[0].querySelector('.limitation-label').textContent = this.t('limitations.supportedFormats') + ':';
            limitationItems[0].querySelector('.limitation-value').textContent = this.t('limitations.formatsList');
            
            limitationItems[1].querySelector('.limitation-label').textContent = this.t('limitations.maxFileSize') + ':';
            limitationItems[1].querySelector('.limitation-value').textContent = this.t('limitations.maxSize');
            
            limitationItems[2].querySelector('.limitation-label').textContent = this.t('limitations.maxDuration') + ':';
            limitationItems[2].querySelector('.limitation-value').textContent = this.t('limitations.maxTime');
            
            limitationItems[3].querySelector('.limitation-label').textContent = this.t('limitations.resolutionLimit') + ':';
            limitationItems[3].querySelector('.limitation-value').textContent = this.t('limitations.maxResolution');
            
            limitationItems[4].querySelector('.limitation-label').textContent = this.t('limitations.estimatedCost') + ':';
            limitationItems[4].querySelector('.limitation-value').textContent = this.t('limitations.costRange');
        }

        const limitationsNote = document.querySelector('.limitations-note small');
        if (limitationsNote) {
            limitationsNote.textContent = this.t('limitations.note');
        }
    }

    /**
     * 質問例の更新
     */
    updateQuestionExamples() {
        const exampleBtns = document.querySelectorAll('.example-btn');
        const examples = [
            this.t('questionExamples.summarize'),
            this.t('questionExamples.sceneBreakdown'),
            this.t('questionExamples.transcription')
        ];

        exampleBtns.forEach((btn, index) => {
            if (examples[index]) {
                btn.textContent = examples[index];
                btn.dataset.question = examples[index];
            }
        });
    }
}

// グローバルインスタンス
window.i18n = new I18nManager();