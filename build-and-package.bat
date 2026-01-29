@echo off
REM HoleHunter 一键构建和打包脚本

echo ========================================
echo HoleHunter 构建和打包
echo ========================================
echo.

echo [1/4] 准备嵌入资源...
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-embedded.ps1
if %errorlevel% neq 0 (
    echo 警告: 嵌入资源准备失败，将尝试使用外部资源
)

echo.
echo [2/4] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo 错误: npm install 失败
    exit /b 1
)

echo.
echo [3/4] 构建 Wails 应用...
call wails build
if %errorlevel% neq 0 (
    echo 错误: wails build 失败
    exit /b 1
)

echo.
echo [4/4] 打包资源文件...
if exist .\build\copy-binaries.ps1 (
    powershell -ExecutionPolicy Bypass -File .\build\copy-binaries.ps1
) else (
    echo 警告: copy-binaries.ps1 不存在，跳过外部资源复制
    echo 提示: 嵌入的资源已包含在 exe 中
)

echo.
echo ========================================
echo 构建完成！
echo ========================================
echo.
echo 输出目录: build\bin\
echo.
echo 如果构建时嵌入了资源:
echo   - HoleHunter.exe (包含 nuclei 和模板)
echo.
echo 如果使用外部资源模式:
echo   - HoleHunter.exe (主程序)
echo   - nuclei.exe (扫描引擎)
echo   - nuclei-templates\ (漏洞模板)
echo.
pause
