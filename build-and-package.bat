@echo off
REM HoleHunter 一键构建和打包脚本

echo ========================================
echo HoleHunter 构建和打包
echo ========================================
echo.

echo [1/3] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo 错误: npm install 失败
    exit /b 1
)

echo.
echo [2/3] 构建 Wails 应用...
call wails build
if %errorlevel% neq 0 (
    echo 错误: wails build 失败
    exit /b 1
)

echo.
echo [3/3] 打包资源文件...
powershell -ExecutionPolicy Bypass -File .\build\copy-binaries.ps1
if %errorlevel% neq 0 (
    echo 错误: 打包失败
    exit /b 1
)

echo.
echo ========================================
echo 构建完成！
echo ========================================
echo.
echo 输出目录: build\bin\
echo.
echo 包含文件:
echo   - HoleHunter.exe (主程序)
echo   - nuclei.exe (扫描引擎)
echo   - nuclei-templates\ (漏洞模板)
echo.
pause
