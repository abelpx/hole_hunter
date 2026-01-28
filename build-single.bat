@echo off
REM HoleHunter 单文件构建脚本
REM nuclei.exe 已嵌入到 exe 中，用户只需一个文件

echo ========================================
echo HoleHunter 单文件构建
echo ========================================
echo.

echo [1/3] 清理旧文件...
if exist build\bin\HoleHunter.exe del build\bin\HoleHunter.exe

echo.
echo [2/3] 构建 Wails 应用（已嵌入 nuclei.exe）...
wails build

if %errorlevel% neq 0 (
    echo 构建失败
    exit /b 1
)

echo.
echo [3/3] 验证嵌入的资源...
powershell -Command "$size = (Get-Item build\bin\HoleHunter.exe).Length / 1MB; Write-Host ('单 exe 大小: {0:N2} MB' -f $size)"

echo.
echo ========================================
echo 构建完成！
echo ========================================
echo.
echo 输出文件: build\bin\HoleHunter.exe
echo.
echo 分发说明:
echo   1. 将 build\bin\HoleHunter.exe 发送给用户
echo   2. 用户双击运行即可
echo   3. 首次运行会自动:
echo      - 从嵌入资源中解压 nuclei.exe 到用户目录
echo      - 下载 nuclei-templates（需要网络）
echo   4. 离线用户: 手动下载 nuclei-templates 放到用户目录
echo.
pause
