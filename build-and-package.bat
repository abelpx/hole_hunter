@echo off
REM HoleHunter 一键构建脚本（单文件版本）

echo ========================================
echo HoleHunter 构建和打包
echo ========================================
echo.

echo [1/2] 清理旧文件...
if exist build\bin\HoleHunter.exe del build\bin\HoleHunter.exe

echo.
echo [2/2] 构建 Wails 应用（已嵌入 nuclei.exe）...
wails build

if %errorlevel% neq 0 (
    echo 错误: wails build 失败
    exit /b 1
)

echo.
echo ========================================
echo 构建完成！
echo ========================================
echo.
echo 输出目录: build\bin\
echo.
echo 单文件分发:
echo   - HoleHunter.exe (主程序，已内嵌 nuclei.exe)
echo.
echo 用户使用说明:
echo   1. 双击运行 HoleHunter.exe
echo   2. 首次运行会自动解压 nuclei.exe
echo   3. 首次运行会下载 nuclei-templates
echo   4. 离线用户需手动下载模板
echo.
pause
