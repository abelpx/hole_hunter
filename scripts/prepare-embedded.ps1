# HoleHunter Windows 嵌入资源准备脚本
# 为 Windows 构建准备 nuclei 二进制和 POC 模板

$ErrorActionPreference = "Stop"

# 配置
$NUCLEI_VERSION = if ($env:NUCLEI_VERSION) { $env:NUCLEI_VERSION } else { "v3.6.2" }
$PROJECT_ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$BUILD_DIR = Join-Path $PROJECT_ROOT "build"
$EMBEDDED_DIR = Join-Path $BUILD_DIR "embedded"
$BINARIES_DIR = Join-Path $BUILD_DIR "binaries"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  HoleHunter - Windows 嵌入资源准备" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "版本: $NUCLEI_VERSION" -ForegroundColor Green
Write-Host ""

# 创建目录
Write-Host "[1/3] 创建目录结构..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path $EMBEDDED_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $BINARIES_DIR | Out-Null
Write-Host "  目录创建完成" -ForegroundColor Green
Write-Host ""

# 下载 nuclei 二进制
Write-Host "[2/3] 下载 nuclei 二进制..." -ForegroundColor Blue
$NUCLEI_ZIP = Join-Path $BINARIES_DIR "nuclei.zip"
$NUCLEI_EXE = Join-Path $BINARIES_DIR "nuclei.exe"
$DOWNLOAD_URL = "https://github.com/projectdiscovery/nuclei/releases/download/$NUCLEI_VERSION/nuclei_3.6.2_windows_amd64.zip"

# 检查是否已存在
if (Test-Path $NUCLEI_EXE) {
    Write-Host "  nuclei.exe 已存在" -ForegroundColor Yellow
    try {
        $versionOutput = & $NUCLEI_EXE -version 2>&1
        Write-Host "  当前版本: $versionOutput" -ForegroundColor Cyan
    } catch {
        Write-Host "  无法验证版本，将重新下载" -ForegroundColor Yellow
        Remove-Item $NUCLEI_EXE -Force
    }
}

if (-not (Test-Path $NUCLEI_EXE)) {
    Write-Host "  正在下载..." -ForegroundColor Cyan
    Write-Host "  URL: $DOWNLOAD_URL" -ForegroundColor DarkGray

    try {
        # 使用 ProgressPreference 加快下载速度
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $NUCLEI_ZIP -UseBasicParsing
        $ProgressPreference = 'Continue'

        Write-Host "  解压..." -ForegroundColor Cyan
        Expand-Archive -Path $NUCLEI_ZIP -DestinationPath $BINARIES_DIR -Force

        # 清理
        Remove-Item $NUCLEI_ZIP -Force
        Write-Host "  nuclei.exe 下载完成" -ForegroundColor Green
    } catch {
        Write-Host "  下载失败: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "请手动下载 nuclei:" -ForegroundColor Yellow
        Write-Host "  1. 访问: https://github.com/projectdiscovery/nuclei/releases" -ForegroundColor Yellow
        Write-Host "  2. 下载: nuclei_${NUCLEI_VERSION}_windows_amd64.zip" -ForegroundColor Yellow
        Write-Host "  3. 解压到: $BINARIES_DIR" -ForegroundColor Yellow
        exit 1
    }
}

# 复制到 embedded 目录
Write-Host "  复制到 embedded 目录..." -ForegroundColor Cyan
Copy-Item -Path $NUCLEI_EXE -Destination (Join-Path $EMBEDDED_DIR "nuclei") -Force
Write-Host "  已复制: build\embedded\nuclei" -ForegroundColor Green
Write-Host ""

# 创建 POC 模板 zip
Write-Host "[3/3] 准备 POC 模板..." -ForegroundColor Blue
$POC_TEMPLATES_DIR = Join-Path $BUILD_DIR "poc-templates"
$SOURCE_TEMPLATES = Join-Path $PROJECT_ROOT "nuclei-templates"
$ZIP_FILE = Join-Path $BUILD_DIR "poc-templates.zip"

if (-not (Test-Path $SOURCE_TEMPLATES)) {
    Write-Host "  警告: nuclei-templates 子模块未初始化" -ForegroundColor Yellow
    Write-Host "  请运行: git submodule update --init --recursive" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "跳过模板准备，继续构建..." -ForegroundColor Yellow
} else {
    Write-Host "  正在构建核心 POC 模板..." -ForegroundColor Cyan

    # 清理旧目录
    if (Test-Path $POC_TEMPLATES_DIR) {
        Remove-Item -Path $POC_TEMPLATES_DIR -Recurse -Force
    }
    New-Item -ItemType Directory -Path $POC_TEMPLATES_DIR | Out-Null

    # 定义要复制的模板目录
    $categories = @(
        @{Source = "http\cves"; Dest = "cves"; Pattern = "2023-*.yaml"},
        @{Source = "http\cves"; Dest = "cves"; Pattern = "2024-*.yaml"},
        @{Source = "http\vulnerabilities"; Dest = "vulnerabilities"; Pattern = ""},
        @{Source = "http\exposed-panels"; Dest = "exposed-panels"; Pattern = ""},
        @{Source = "http\technologies"; Dest = "technologies"; Pattern = ""},
        @{Source = "http\misconfiguration"; Dest = "misconfiguration"; Pattern = ""},
        @{Source = "http\default-logins"; Dest = "default-logins"; Pattern = ""},
        @{Source = "http\takeovers"; Dest = "takeovers"; Pattern = ""},
        @{Source = "http\exposures"; Dest = "exposures"; Pattern = ""}
    )

    $totalFiles = 0

    foreach ($cat in $categories) {
        $sourcePath = Join-Path $SOURCE_TEMPLATES $cat.Source
        if (Test-Path $sourcePath) {
            $destPath = Join-Path $POC_TEMPLATES_DIR $cat.Dest
            New-Item -ItemType Directory -Path $destPath -Force | Out-Null

            if ($cat.Pattern) {
                $files = Get-ChildItem -Path $sourcePath -Filter $cat.Pattern -File -ErrorAction SilentlyContinue
            } else {
                # 复制子目录结构
                $subdirs = Get-ChildItem -Path $sourcePath -Directory -ErrorAction SilentlyContinue
                foreach ($subdir in $subdirs) {
                    $subDestPath = Join-Path $destPath $subdir.Name
                    New-Item -ItemType Directory -Path $subDestPath -Force | Out-Null
                    $yamlFiles = Get-ChildItem -Path $subdir.FullName -Filter "*.yaml" -File -ErrorAction SilentlyContinue
                    foreach ($file in $yamlFiles) {
                        Copy-Item -Path $file.FullName -Destination $subDestPath -Force
                        $totalFiles++
                    }
                }
            }

            if ($cat.Pattern) {
                foreach ($file in $files) {
                    Copy-Item -Path $file.FullName -Destination $destPath -Force
                    $totalFiles++
                }
            }

            Write-Host "    $($cat.Dest): 完成" -ForegroundColor DarkGray
        }
    }

    # 复制顶级常见漏洞模板
    $vulnTypes = @("sqli", "rce", "xss", "ssrf", "xxe", "ssti", "idor")
    $vulnPath = Join-Path $SOURCE_TEMPLATES "http\vulnerabilities"
    if (Test-Path $vulnPath) {
        foreach ($type in $vulnTypes) {
            $files = Get-ChildItem -Path $vulnPath -Filter "*$type*.yaml" -File -ErrorAction SilentlyContinue
            foreach ($file in $files) {
                Copy-Item -Path $file.FullName -Destination $POC_TEMPLATES_DIR -Force
                $totalFiles++
            }
        }
    }

    # 创建 zip
    Write-Host "  创建 zip 压缩包..." -ForegroundColor Cyan
    Compress-Archive -Path "$POC_TEMPLATES_DIR\*" -DestinationPath $ZIP_FILE -Force

    $zipSize = (Get-Item $ZIP_FILE).Length / 1MB
    Write-Host "    模板文件: $totalFiles" -ForegroundColor DarkGray
    Write-Host "    Zip 大小: $([math]::Round($zipSize, 2)) MB" -ForegroundColor DarkGray
    Write-Host "  已创建: build\poc-templates.zip" -ForegroundColor Green
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  嵌入资源准备完成!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "准备的文件:" -ForegroundColor Yellow
Write-Host "  - build\embedded\nuclei" -ForegroundColor White
Write-Host "  - build\poc-templates.zip" -ForegroundColor White
Write-Host ""
Write-Host "下一步: 运行 wails build" -ForegroundColor Green
Write-Host ""
