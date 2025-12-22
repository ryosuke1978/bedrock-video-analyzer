// UI管理クラス
class UIManager {
    constructor() {
        this.elements = {};
        this.notifications = [];
        this.currentVideoId = null;
        this.analysisInterval = null;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    // DOM要素を初期化
    initializeElements() {
        this.elements = {
            // ファイルアップロード関連
            dropZone: document.getElementById(