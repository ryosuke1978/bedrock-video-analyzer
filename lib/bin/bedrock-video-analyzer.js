#!/usr/bin/env node
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const video_analyzer_stack_1 = require("../lib/video-analyzer-stack");
const video_analyzer_dev_stack_1 = require("../lib/video-analyzer-dev-stack");
const app = new cdk.App();
// 環境設定
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1'
};
// 開発環境スタック
new video_analyzer_dev_stack_1.VideoAnalyzerDevStack(app, 'VideoAnalyzerDevStack', {
    env,
    description: 'Bedrock Video Analyzer - Development Environment'
});
// 本番環境スタック（デフォルトでは作成しない）
if (process.env.DEPLOY_PROD === 'true') {
    new video_analyzer_stack_1.VideoAnalyzerStack(app, 'VideoAnalyzerProdStack', {
        env,
        description: 'Bedrock Video Analyzer - Production Environment'
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVkcm9jay12aWRlby1hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL2Jpbi9iZWRyb2NrLXZpZGVvLWFuYWx5emVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXFDO0FBQ3JDLGlEQUFtQztBQUNuQyxzRUFBaUU7QUFDakUsOEVBQXdFO0FBRXhFLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLE9BQU87QUFDUCxNQUFNLEdBQUcsR0FBRztJQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtJQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxnQkFBZ0I7Q0FDM0QsQ0FBQztBQUVGLFdBQVc7QUFDWCxJQUFJLGdEQUFxQixDQUFDLEdBQUcsRUFBRSx1QkFBdUIsRUFBRTtJQUN0RCxHQUFHO0lBQ0gsV0FBVyxFQUFFLGtEQUFrRDtDQUNoRSxDQUFDLENBQUM7QUFFSCx5QkFBeUI7QUFDekIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsS0FBSyxNQUFNLEVBQUU7SUFDdEMsSUFBSSx5Q0FBa0IsQ0FBQyxHQUFHLEVBQUUsd0JBQXdCLEVBQUU7UUFDcEQsR0FBRztRQUNILFdBQVcsRUFBRSxpREFBaUQ7S0FDL0QsQ0FBQyxDQUFDO0NBQ0oiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgVmlkZW9BbmFseXplclN0YWNrIH0gZnJvbSAnLi4vbGliL3ZpZGVvLWFuYWx5emVyLXN0YWNrJztcclxuaW1wb3J0IHsgVmlkZW9BbmFseXplckRldlN0YWNrIH0gZnJvbSAnLi4vbGliL3ZpZGVvLWFuYWx5emVyLWRldi1zdGFjayc7XHJcblxyXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xyXG5cclxuLy8g55Kw5aKD6Kit5a6aXHJcbmNvbnN0IGVudiA9IHtcclxuICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8ICdhcC1ub3J0aGVhc3QtMSdcclxufTtcclxuXHJcbi8vIOmWi+eZuueSsOWig+OCueOCv+ODg+OCr1xyXG5uZXcgVmlkZW9BbmFseXplckRldlN0YWNrKGFwcCwgJ1ZpZGVvQW5hbHl6ZXJEZXZTdGFjaycsIHtcclxuICBlbnYsXHJcbiAgZGVzY3JpcHRpb246ICdCZWRyb2NrIFZpZGVvIEFuYWx5emVyIC0gRGV2ZWxvcG1lbnQgRW52aXJvbm1lbnQnXHJcbn0pO1xyXG5cclxuLy8g5pys55Wq55Kw5aKD44K544K/44OD44Kv77yI44OH44OV44Kp44Or44OI44Gn44Gv5L2c5oiQ44GX44Gq44GE77yJXHJcbmlmIChwcm9jZXNzLmVudi5ERVBMT1lfUFJPRCA9PT0gJ3RydWUnKSB7XHJcbiAgbmV3IFZpZGVvQW5hbHl6ZXJTdGFjayhhcHAsICdWaWRlb0FuYWx5emVyUHJvZFN0YWNrJywge1xyXG4gICAgZW52LFxyXG4gICAgZGVzY3JpcHRpb246ICdCZWRyb2NrIFZpZGVvIEFuYWx5emVyIC0gUHJvZHVjdGlvbiBFbnZpcm9ubWVudCdcclxuICB9KTtcclxufSJdfQ==