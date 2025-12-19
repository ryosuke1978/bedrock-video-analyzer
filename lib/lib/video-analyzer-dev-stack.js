"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoAnalyzerDevStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const video_analyzer_stack_1 = require("./video-analyzer-stack");
class VideoAnalyzerDevStack extends video_analyzer_stack_1.VideoAnalyzerStack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // 開発環境固有の設定をここに追加
        // 例：より短いライフサイクル、小さなリソースサイズなど
        // 開発環境用のタグを追加
        cdk.Tags.of(this).add('Environment', 'Development');
        cdk.Tags.of(this).add('Project', 'BedrockVideoAnalyzer');
        cdk.Tags.of(this).add('Owner', 'Development Team');
    }
}
exports.VideoAnalyzerDevStack = VideoAnalyzerDevStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlkZW8tYW5hbHl6ZXItZGV2LXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdmlkZW8tYW5hbHl6ZXItZGV2LXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLGlFQUE0RDtBQUU1RCxNQUFhLHFCQUFzQixTQUFRLHlDQUFrQjtJQUMzRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLGtCQUFrQjtRQUNsQiw2QkFBNkI7UUFFN0IsY0FBYztRQUNkLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDcEQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3pELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUNyRCxDQUFDO0NBQ0Y7QUFaRCxzREFZQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBWaWRlb0FuYWx5emVyU3RhY2sgfSBmcm9tICcuL3ZpZGVvLWFuYWx5emVyLXN0YWNrJztcclxuXHJcbmV4cG9ydCBjbGFzcyBWaWRlb0FuYWx5emVyRGV2U3RhY2sgZXh0ZW5kcyBWaWRlb0FuYWx5emVyU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIOmWi+eZuueSsOWig+WbuuacieOBruioreWumuOCkuOBk+OBk+OBq+i/veWKoFxyXG4gICAgLy8g5L6L77ya44KI44KK55+t44GE44Op44Kk44OV44K144Kk44Kv44Or44CB5bCP44GV44Gq44Oq44K944O844K544K144Kk44K644Gq44GpXHJcbiAgICBcclxuICAgIC8vIOmWi+eZuueSsOWig+eUqOOBruOCv+OCsOOCkui/veWKoFxyXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdFbnZpcm9ubWVudCcsICdEZXZlbG9wbWVudCcpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQcm9qZWN0JywgJ0JlZHJvY2tWaWRlb0FuYWx5emVyJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ093bmVyJywgJ0RldmVsb3BtZW50IFRlYW0nKTtcclxuICB9XHJcbn0iXX0=