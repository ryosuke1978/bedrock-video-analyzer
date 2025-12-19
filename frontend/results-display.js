/**
 * 結果表示コンポーネント
 * 機能別カテゴリ表示、PR文章・あらすじの区別表示、コピー機能、エクスポート機能を提供
 */

class ResultsDisplayComponent {
    constructor() {
        this.analysisResults = null;
        this.categoryOrder = [
            'basicAnalysis',
            'prTexts', 
            'summaries',
            'additionalAnalysis'
        ];
        
        this.initializeComponent();
    }

    /**
     * コンポーネントの初期化
     */
    initializeComponent() {
        this.setupEventListeners();
        this.createCategoryStructure();
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // コピーボタンのイベント委譲
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn') || e.target.closest('.copy-btn')) {
                const button = e.target.classList.contains('copy-btn') ? e.target : e.target.closest('.copy-btn');
                this.handleCopyClick(button);
            }
        });

        // エクスポートボタン
        const exportBtn = document.getElementById('export-json-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToJSON());
        }

        // カテゴリ展開/折りたたみ
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-toggle')) {
                this.toggleCategory(e.target);
            }
        });

        // 全選択/全解除ボタン
        document.addEventListener('click', (e) => {
            if (e.target.id === 'select-all-btn') {
                this.selectAllResults();
            } else if (e.target.id === 'deselect-all-btn') {
                this.deselectAllResults();
            }
        });
    }

    /**
     * カテゴリ構造の作成
     */
    createCategoryStructure() {
        const resultsContainer = document.querySelector('.results-container');
        if (!resultsContainer) return;

        // 結果操作パネルを追加
        this.addResultsControlPanel(resultsContainer);
    }

    /**
     * 結果操作パネルの追加
     */
    addResultsControlPanel(container) {
        const controlPanel = document.createElement('div');
        controlPanel.className = 'results-control-panel';
        controlPanel.innerHTML = `
            <div class="control-buttons">
                <button id="select-all-btn" class="btn btn-secondary btn-sm">
                    📋 全て選択
                </button>
                <button id="deselect-all-btn" class="btn btn-secondary btn-sm">
                    ❌ 選択解除
                </button>
                <button id="copy-selected-btn" class="btn btn-info btn-sm">
                    📄 選択項目をコピー
                </button>
                <div class="export-options">
                    <select id="export-format" class="export-select">
                        <option value="json">JSON形式</option>
                        <option value="text">テキスト形式</option>
                        <option value="markdown">Markdown形式</option>
                    </select>
                    <button id="export-selected-btn" class="btn btn-success btn-sm">
                        💾 エクスポート
                    </button>
                </div>
            </div>
            <div class="results-summary">
                <span id="results-count">結果: 0項目</span>
                <span id="selected-count">選択: 0項目</span>
            </div>
        `;

        container.insertBefore(controlPanel, container.firstChild);

        // 新しいボタンのイベントリスナー
        document.getElementById('copy-selected-btn').addEventListener('click', () => this.copySelectedResults());
        document.getElementById('export-selected-btn').addEventListener('click', () => this.exportSelectedResults());
    }

    /**
     * 解析結果の表示
     * @param {Object} results - 解析結果オブジェクト
     */
    displayResults(results) {
        this.analysisResults = results;
        this.updateResultsDisplay();
        this.updateResultsCount();
    }

    /**
     * 結果表示の更新
     */
    updateResultsDisplay() {
        if (!this.analysisResults) return;

        // 基本解析結果の更新
        this.updateBasicAnalysis();
        
        // PR文章の更新
        this.updatePRTexts();
        
        // あらすじの更新
        this.updateSummaries();

        // 追加解析結果があれば表示
        this.updateAdditionalAnalysis();

        // カテゴリにチェックボックスを追加
        this.addCategoryCheckboxes();
    }

    /**
     * 基本解析結果の更新
     */
    updateBasicAnalysis() {
        const basicAnalysisDiv = document.getElementById('basic-analysis-result');
        if (!basicAnalysisDiv || !this.analysisResults.basicAnalysis) return;

        const analysis = this.analysisResults.basicAnalysis;
        const noDataText = window.i18n ? window.i18n.t('analysisCategories.noData') : 'データなし';

        // 構造化された表示を作成
        const structuredContent = this.createStructuredAnalysisDisplay(analysis, noDataText);
        basicAnalysisDiv.innerHTML = structuredContent;
    }

    /**
     * 構造化された解析表示の作成
     */
    createStructuredAnalysisDisplay(analysis, noDataText) {
        const categories = [
            { key: 'summary', label: window.i18n ? window.i18n.t('analysisCategories.overview') : '概要', type: 'text' },
            { key: 'scenes', label: window.i18n ? window.i18n.t('analysisCategories.scenes') : '検出されたシーン', type: 'list' },
            { key: 'objects', label: window.i18n ? window.i18n.t('analysisCategories.objects') : '検出されたオブジェクト', type: 'list' },
            { key: 'activities', label: window.i18n ? window.i18n.t('analysisCategories.activities') : '検出されたアクティビティ', type: 'list' },
            { key: 'emotions', label: window.i18n ? window.i18n.t('analysisCategories.emotions') : '感情分析', type: 'list' },
            { key: 'topics', label: window.i18n ? window.i18n.t('analysisCategories.topics') : 'トピック', type: 'list' }
        ];

        let html = '<div class="structured-analysis">';
        
        categories.forEach(category => {
            const data = analysis[category.key];
            if (data) {
                html += `
                    <div class="analysis-category" data-category="${category.key}">
                        <div class="category-header">
                            <input type="checkbox" class="category-checkbox" id="check-${category.key}">
                            <h5 class="category-title">${category.label}</h5>
                            <button class="category-toggle" data-target="${category.key}">
                                <span class="toggle-icon">▼</span>
                            </button>
                        </div>
                        <div class="category-content" id="content-${category.key}">
                            ${this.formatCategoryContent(data, category.type, noDataText)}
                        </div>
                        <div class="category-actions">
                            <button class="copy-btn btn-sm" data-target="content-${category.key}" data-type="category">
                                📋 コピー
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        html += '</div>';
        return html;
    }

    /**
     * カテゴリコンテンツのフォーマット
     */
    formatCategoryContent(data, type, noDataText) {
        if (!data) return `<p class="no-data">${noDataText}</p>`;

        switch (type) {
            case 'text':
                return `<p class="text-content">${data}</p>`;
            case 'list':
                if (Array.isArray(data) && data.length > 0) {
                    return `<ul class="list-content">${data.map(item => `<li>${item}</li>`).join('')}</ul>`;
                } else {
                    return `<p class="no-data">${noDataText}</p>`;
                }
            default:
                return `<div class="raw-content">${JSON.stringify(data, null, 2)}</div>`;
        }
    }

    /**
     * PR文章の更新
     */
    updatePRTexts() {
        if (!this.analysisResults.prTexts) return;

        const prTexts = this.analysisResults.prTexts;
        const noDataText = window.i18n ? window.i18n.t('analysisCategories.noData') : 'データなし';

        // 200文字版
        const prShortElement = document.getElementById('pr-short');
        if (prShortElement) {
            prShortElement.innerHTML = this.createTextItemContent(
                prTexts.short || noDataText, 
                'pr-short',
                '200文字PR文章'
            );
        }

        // 500文字版
        const prLongElement = document.getElementById('pr-long');
        if (prLongElement) {
            prLongElement.innerHTML = this.createTextItemContent(
                prTexts.long || noDataText, 
                'pr-long',
                '500文字PR文章'
            );
        }
    }

    /**
     * あらすじの更新
     */
    updateSummaries() {
        if (!this.analysisResults.summaries) return;

        const summaries = this.analysisResults.summaries;
        const noDataText = window.i18n ? window.i18n.t('analysisCategories.noData') : 'データなし';

        // 200文字版
        const summaryShortElement = document.getElementById('summary-short');
        if (summaryShortElement) {
            summaryShortElement.innerHTML = this.createTextItemContent(
                summaries.short || noDataText, 
                'summary-short',
                '200文字あらすじ'
            );
        }

        // 500文字版
        const summaryLongElement = document.getElementById('summary-long');
        if (summaryLongElement) {
            summaryLongElement.innerHTML = this.createTextItemContent(
                summaries.long || noDataText, 
                'summary-long',
                '500文字あらすじ'
            );
        }
    }

    /**
     * テキストアイテムコンテンツの作成
     */
    createTextItemContent(text, id, label) {
        return `
            <div class="text-item-wrapper">
                <div class="text-item-header">
                    <input type="checkbox" class="text-checkbox" id="check-${id}">
                    <label for="check-${id}" class="text-label">${label}</label>
                </div>
                <div class="text-content" id="${id}-content">${text}</div>
                <div class="text-actions">
                    <button class="copy-btn btn-sm" data-target="${id}-content" data-type="text">
                        📋 コピー
                    </button>
                    <span class="char-count">${text.length}文字</span>
                </div>
            </div>
        `;
    }

    /**
     * 追加解析結果の更新
     */
    updateAdditionalAnalysis() {
        // 将来の拡張用：音声認識結果、キーフレーム等
        const additionalData = this.analysisResults.additionalAnalysis;
        if (!additionalData) return;

        // 追加解析結果がある場合の表示処理
        console.log('Additional analysis data:', additionalData);
    }

    /**
     * カテゴリにチェックボックスを追加
     */
    addCategoryCheckboxes() {
        // 既存のカテゴリにチェックボックスを追加
        const categories = document.querySelectorAll('.result-category');
        categories.forEach(category => {
            if (!category.querySelector('.category-checkbox')) {
                const header = category.querySelector('h3');
                if (header) {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'category-checkbox';
                    checkbox.id = `check-category-${category.className.split(' ')[1] || 'unknown'}`;
                    
                    header.insertBefore(checkbox, header.firstChild);
                }
            }
        });
    }

    /**
     * コピーボタンクリックの処理
     */
    async handleCopyClick(button) {
        const targetId = button.dataset.target;
        const type = button.dataset.type || 'text';
        
        let textToCopy = '';
        
        if (type === 'category') {
            textToCopy = this.getCategoryText(targetId);
        } else {
            const element = document.getElementById(targetId);
            textToCopy = element ? element.textContent.trim() : '';
        }

        if (!textToCopy) {
            const errorMessage = window.i18n ? 
                window.i18n.getErrorMessage('copyFailed') : 
                'コピーするテキストがありません';
            alert(errorMessage);
            return;
        }

        try {
            await navigator.clipboard.writeText(textToCopy);
            this.showCopyFeedback(button);
        } catch (error) {
            console.error('Copy failed:', error);
            // フォールバック: テキストエリアを使用
            this.fallbackCopy(textToCopy, button);
        }
    }

    /**
     * カテゴリテキストの取得
     */
    getCategoryText(targetId) {
        const element = document.getElementById(targetId);
        if (!element) return '';

        const category = element.closest('.analysis-category');
        if (!category) return element.textContent.trim();

        const title = category.querySelector('.category-title')?.textContent || '';
        const content = element.textContent.trim();
        
        return `${title}\n${'='.repeat(title.length)}\n${content}`;
    }

    /**
     * フォールバック コピー機能
     */
    fallbackCopy(text, button) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        
        try {
            textArea.select();
            document.execCommand('copy');
            this.showCopyFeedback(button);
        } catch (error) {
            console.error('Fallback copy failed:', error);
            const errorMessage = window.i18n ? 
                window.i18n.getErrorMessage('copyFailed') : 
                'コピーに失敗しました';
            alert(errorMessage);
        } finally {
            document.body.removeChild(textArea);
        }
    }

    /**
     * コピー成功フィードバック
     */
    showCopyFeedback(button) {
        const originalText = button.textContent;
        const copiedText = window.i18n ? window.i18n.t('ui.copiedButton') : '✅ コピー済み';
        
        button.textContent = copiedText;
        button.classList.add('copied');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }

    /**
     * カテゴリの展開/折りたたみ
     */
    toggleCategory(button) {
        const targetId = button.dataset.target;
        const content = document.getElementById(`content-${targetId}`);
        const icon = button.querySelector('.toggle-icon');
        
        if (!content || !icon) return;

        const isExpanded = content.style.display !== 'none';
        
        content.style.display = isExpanded ? 'none' : 'block';
        icon.textContent = isExpanded ? '▶' : '▼';
        
        // アニメーション効果
        if (!isExpanded) {
            content.style.animation = 'fadeIn 0.3s ease';
        }
    }

    /**
     * 全選択
     */
    selectAllResults() {
        const checkboxes = document.querySelectorAll('.category-checkbox, .text-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        this.updateSelectedCount();
    }

    /**
     * 全解除
     */
    deselectAllResults() {
        const checkboxes = document.querySelectorAll('.category-checkbox, .text-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateSelectedCount();
    }

    /**
     * 選択項目のコピー
     */
    async copySelectedResults() {
        const selectedText = this.getSelectedResultsText();
        
        if (!selectedText) {
            alert('コピーする項目を選択してください');
            return;
        }

        try {
            await navigator.clipboard.writeText(selectedText);
            alert('選択した項目をコピーしました');
        } catch (error) {
            console.error('Copy selected failed:', error);
            this.fallbackCopy(selectedText, { textContent: 'コピー' });
        }
    }

    /**
     * 選択された結果のテキスト取得
     */
    getSelectedResultsText() {
        const selectedItems = [];
        
        // カテゴリチェックボックスをチェック
        const categoryCheckboxes = document.querySelectorAll('.category-checkbox:checked');
        categoryCheckboxes.forEach(checkbox => {
            const category = checkbox.closest('.analysis-category');
            if (category) {
                const title = category.querySelector('.category-title')?.textContent || '';
                const content = category.querySelector('.category-content')?.textContent?.trim() || '';
                selectedItems.push(`${title}\n${'='.repeat(title.length)}\n${content}\n`);
            }
        });

        // テキストチェックボックスをチェック
        const textCheckboxes = document.querySelectorAll('.text-checkbox:checked');
        textCheckboxes.forEach(checkbox => {
            const wrapper = checkbox.closest('.text-item-wrapper');
            if (wrapper) {
                const label = wrapper.querySelector('.text-label')?.textContent || '';
                const content = wrapper.querySelector('.text-content')?.textContent?.trim() || '';
                selectedItems.push(`${label}\n${'-'.repeat(label.length)}\n${content}\n`);
            }
        });

        return selectedItems.join('\n');
    }

    /**
     * 選択項目のエクスポート
     */
    exportSelectedResults() {
        const format = document.getElementById('export-format')?.value || 'json';
        const selectedData = this.getSelectedResultsData();
        
        if (!selectedData || Object.keys(selectedData).length === 0) {
            alert('エクスポートする項目を選択してください');
            return;
        }

        this.performExport(selectedData, format, 'selected-results');
    }

    /**
     * 選択された結果データの取得
     */
    getSelectedResultsData() {
        const selectedData = {};
        
        // 基本解析の選択項目
        const categoryCheckboxes = document.querySelectorAll('.category-checkbox:checked');
        categoryCheckboxes.forEach(checkbox => {
            const categoryKey = checkbox.id.replace('check-', '');
            if (this.analysisResults.basicAnalysis && this.analysisResults.basicAnalysis[categoryKey]) {
                if (!selectedData.basicAnalysis) selectedData.basicAnalysis = {};
                selectedData.basicAnalysis[categoryKey] = this.analysisResults.basicAnalysis[categoryKey];
            }
        });

        // PR文章とあらすじの選択項目
        const textCheckboxes = document.querySelectorAll('.text-checkbox:checked');
        textCheckboxes.forEach(checkbox => {
            const textId = checkbox.id.replace('check-', '');
            
            if (textId.startsWith('pr-')) {
                if (!selectedData.prTexts) selectedData.prTexts = {};
                const key = textId.replace('pr-', '');
                if (this.analysisResults.prTexts && this.analysisResults.prTexts[key]) {
                    selectedData.prTexts[key] = this.analysisResults.prTexts[key];
                }
            } else if (textId.startsWith('summary-')) {
                if (!selectedData.summaries) selectedData.summaries = {};
                const key = textId.replace('summary-', '');
                if (this.analysisResults.summaries && this.analysisResults.summaries[key]) {
                    selectedData.summaries[key] = this.analysisResults.summaries[key];
                }
            }
        });

        return selectedData;
    }

    /**
     * JSON エクスポート
     */
    exportToJSON() {
        if (!this.analysisResults) {
            alert('エクスポートする結果がありません');
            return;
        }

        this.performExport(this.analysisResults, 'json', 'video-analysis-results');
    }

    /**
     * エクスポート実行
     */
    performExport(data, format, filename) {
        let content = '';
        let mimeType = '';
        let extension = '';

        switch (format) {
            case 'json':
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
                extension = 'json';
                break;
            case 'text':
                content = this.convertToText(data);
                mimeType = 'text/plain';
                extension = 'txt';
                break;
            case 'markdown':
                content = this.convertToMarkdown(data);
                mimeType = 'text/markdown';
                extension = 'md';
                break;
            default:
                alert('サポートされていない形式です');
                return;
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}-${new Date().toISOString().split('T')[0]}.${extension}`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * テキスト形式への変換
     */
    convertToText(data) {
        let text = '動画解析結果\n';
        text += '='.repeat(20) + '\n\n';
        
        if (data.basicAnalysis) {
            text += '基本解析\n';
            text += '-'.repeat(10) + '\n';
            Object.entries(data.basicAnalysis).forEach(([key, value]) => {
                text += `${key}: ${Array.isArray(value) ? value.join(', ') : value}\n`;
            });
            text += '\n';
        }

        if (data.prTexts) {
            text += 'PR文章\n';
            text += '-'.repeat(10) + '\n';
            Object.entries(data.prTexts).forEach(([key, value]) => {
                text += `${key}: ${value}\n`;
            });
            text += '\n';
        }

        if (data.summaries) {
            text += 'あらすじ\n';
            text += '-'.repeat(10) + '\n';
            Object.entries(data.summaries).forEach(([key, value]) => {
                text += `${key}: ${value}\n`;
            });
            text += '\n';
        }

        return text;
    }

    /**
     * Markdown形式への変換
     */
    convertToMarkdown(data) {
        let md = '# 動画解析結果\n\n';
        
        if (data.basicAnalysis) {
            md += '## 基本解析\n\n';
            Object.entries(data.basicAnalysis).forEach(([key, value]) => {
                md += `### ${key}\n\n`;
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        md += `- ${item}\n`;
                    });
                } else {
                    md += `${value}\n`;
                }
                md += '\n';
            });
        }

        if (data.prTexts) {
            md += '## PR文章\n\n';
            Object.entries(data.prTexts).forEach(([key, value]) => {
                md += `### ${key}\n\n${value}\n\n`;
            });
        }

        if (data.summaries) {
            md += '## あらすじ\n\n';
            Object.entries(data.summaries).forEach(([key, value]) => {
                md += `### ${key}\n\n${value}\n\n`;
            });
        }

        return md;
    }

    /**
     * 結果数の更新
     */
    updateResultsCount() {
        const resultsCountElement = document.getElementById('results-count');
        if (resultsCountElement && this.analysisResults) {
            let count = 0;
            
            if (this.analysisResults.basicAnalysis) {
                count += Object.keys(this.analysisResults.basicAnalysis).length;
            }
            if (this.analysisResults.prTexts) {
                count += Object.keys(this.analysisResults.prTexts).length;
            }
            if (this.analysisResults.summaries) {
                count += Object.keys(this.analysisResults.summaries).length;
            }
            
            resultsCountElement.textContent = `結果: ${count}項目`;
        }
        
        this.updateSelectedCount();
    }

    /**
     * 選択数の更新
     */
    updateSelectedCount() {
        const selectedCountElement = document.getElementById('selected-count');
        if (selectedCountElement) {
            const selectedCheckboxes = document.querySelectorAll('.category-checkbox:checked, .text-checkbox:checked');
            selectedCountElement.textContent = `選択: ${selectedCheckboxes.length}項目`;
        }
    }
}

// グローバルインスタンス
window.resultsDisplay = new ResultsDisplayComponent();