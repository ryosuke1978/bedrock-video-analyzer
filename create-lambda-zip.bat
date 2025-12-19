@echo off
echo Lambda髢｢謨ｰ縺ｮZIP繝輔ぃ繧､繝ｫ繧剃ｽ懈・縺励※縺・∪縺・..

REM 迺ｰ蠅・､画焚險ｭ螳・
set AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
set AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
set AWS_DEFAULT_REGION=ap-northeast-1

REM 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ菴懈・
if exist temp-lambda rmdir /s /q temp-lambda
mkdir temp-lambda

REM 蜷Лambda髢｢謨ｰ縺ｮZIP繝輔ぃ繧､繝ｫ繧剃ｽ懈・
for %%f in (upload analysis status query limits) do (
    echo 蜃ｦ逅・ｸｭ: %%f
    mkdir temp-lambda\%%f
    
    REM 繧ｳ繝ｳ繝代う繝ｫ貂医∩JS繝輔ぃ繧､繝ｫ繧偵さ繝斐・
    if exist lambda\dist\%%f.js (
        copy lambda\dist\%%f.js temp-lambda\%%f\%%f.js
        if exist lambda\dist\%%f.js.map copy lambda\dist\%%f.js.map temp-lambda\%%f\%%f.js.map
    ) else (
        echo 繧ｨ繝ｩ繝ｼ: lambda\dist\%%f.js 縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ
        goto :error
    )
    
    REM utils繝・ぅ繝ｬ繧ｯ繝医Μ繧偵さ繝斐・
    if exist lambda\dist\utils (
        xcopy /e /i lambda\dist\utils temp-lambda\%%f\utils
    )
    
    REM package.json繧剃ｽ懈・
    echo { > temp-lambda\%%f\package.json
    echo   "name": "bedrock-video-analyzer-%%f", >> temp-lambda\%%f\package.json
    echo   "version": "1.0.0", >> temp-lambda\%%f\package.json
    echo   "main": "%%f.js" >> temp-lambda\%%f\package.json
    echo } >> temp-lambda\%%f\package.json
    
    REM ZIP繝輔ぃ繧､繝ｫ菴懈・・・owerShell繧剃ｽｿ逕ｨ・・
    powershell -Command "Compress-Archive -Path 'temp-lambda\%%f\*' -DestinationPath '%%f.zip' -Force"
    
    REM S3縺ｫ繧｢繝・・繝ｭ繝ｼ繝・
    echo S3縺ｫ繧｢繝・・繝ｭ繝ｼ繝我ｸｭ: %%f.zip
    aws s3 cp %%f.zip s3://bedrock-video-analyzer-dev-252689085095/lambda/%%f.zip
    
    if errorlevel 1 (
        echo 繧ｨ繝ｩ繝ｼ: %%f.zip 縺ｮ繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆
        goto :error
    ) else (
        echo 謌仙粥: %%f.zip 繧偵い繝・・繝ｭ繝ｼ繝峨＠縺ｾ縺励◆
    )
    
    REM ZIP繝輔ぃ繧､繝ｫ蜑企勁
    del %%f.zip
)

REM 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ蜑企勁
rmdir /s /q temp-lambda

echo 蜈ｨ縺ｦ縺ｮLambda髢｢謨ｰ縺ｮZIP繝輔ぃ繧､繝ｫ縺梧ｭ｣蟶ｸ縺ｫ繧｢繝・・繝ｭ繝ｼ繝峨＆繧後∪縺励◆・・
goto :end

:error
echo 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ょ・逅・ｒ荳ｭ譁ｭ縺励∪縺吶・
if exist temp-lambda rmdir /s /q temp-lambda
pause
exit /b 1

:end
echo 蜃ｦ逅・′螳御ｺ・＠縺ｾ縺励◆縲
