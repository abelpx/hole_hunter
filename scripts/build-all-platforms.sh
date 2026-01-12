#!/bin/bash
# 多平台构建脚本
# 为所有支持的平台构建 HoleHunter 桌面应用

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# 配置
NUCLEI_VERSION="${NUCLEI_VERSION:-v3.3.5}"
BUILD_DIR="build/dist"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 支持的平台
PLATFORMS=(
    "darwin/amd64"
    "darwin/arm64"
    "linux/amd64"
    "linux/arm64"
    "windows/amd64"
    "windows/arm64"
)

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  HoleHunter 多平台构建${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Nuclei 版本: ${NUCLEI_VERSION}${NC}"
echo -e "${GREEN}构建目录: ${BUILD_DIR}${NC}"
echo ""

# 1. 下载所有平台的 nuclei 二进制文件
echo -e "${BLUE}步骤 1: 下载 Nuclei 二进制文件...${NC}"
echo ""

for platform in "${PLATFORMS[@]}"; do
    IFS='/' read -r GOOS GOARCH <<< "$platform"

    case "$GOOS/$GOARCH" in
        darwin/amd64)
            nuclei_file="nuclei_darwin_amd64"
            ;;
        darwin/arm64)
            nuclei_file="nuclei_darwin_arm64"
            ;;
        linux/amd64)
            nuclei_file="nuclei_linux_amd64"
            ;;
        linux/arm64)
            nuclei_file="nuclei_linux_arm64"
            ;;
        windows/amd64)
            nuclei_file="nuclei_windows_amd64.exe"
            ;;
        windows/arm64)
            nuclei_file="nuclei_windows_arm64.exe"
            ;;
        *)
            echo -e "${RED}未知平台: $GOOS/$GOARCH${NC}"
            continue
            ;;
    esac

    echo -e "${YELLOW}下载 ${GOOS}/${GOARCH}...${NC}"

    download_url="https://github.com/projectdiscovery/nuclei/releases/download/${NUCLEI_VERSION}/${nuclei_file}.zip"
    output_dir="${PROJECT_ROOT}/build/nuclei-binaries/${GOOS}_${GOARCH}"

    mkdir -p "$output_dir"

    if command -v curl >/dev/null 2>&1; then
        curl -L -o "${output_dir}/nuclei.zip" "$download_url"
    elif command -v wget >/dev/null 2>&1; then
        wget -O "${output_dir}/nuclei.zip" "$download_url"
    else
        echo -e "${RED}错误: 需要 curl 或 wget${NC}"
        exit 1
    fi

    # 解压
    unzip -o "${output_dir}/nuclei.zip" -d "${output_dir}/"

    # 移动二进制文件
    if [ "$GOOS" = "windows" ]; then
        mv "${output_dir}/${nuclei_file}" "${output_dir}/nuclei.exe"
    else
        mv "${output_dir}/${nuclei_file}" "${output_dir}/nuclei"
        chmod +x "${output_dir}/nuclei"
    fi

    # 清理压缩文件
    rm "${output_dir}/nuclei.zip"

    echo -e "${GREEN}✓ ${GOOS}/${GOARCH} 完成${NC}"
done

echo ""
echo -e "${GREEN}✓ 所有 Nuclei 二进制文件下载完成${NC}"
echo ""

# 2. 构建每个平台的应用
echo -e "${BLUE}步骤 2: 构建应用程序...${NC}"
echo ""

for platform in "${PLATFORMS[@]}"; do
    IFS='/' read -r GOOS GOARCH <<< "$platform"

    echo -e "${YELLOW}构建 ${GOOS}/${GOARCH}...${NC}"

    # 设置环境变量
    export GOOS="$GOOS"
    export GOARCH="$GOARCH"
    export CGO_ENABLED=0

    # 确定输出文件名
    OUTPUT_NAME="HoleHunter"
    if [ "$GOOS" = "windows" ]; then
        OUTPUT_NAME="${OUTPUT_NAME}.exe"
    fi

    # 复制对应平台的 nuclei
    NUCLEI_SRC="${PROJECT_ROOT}/build/nuclei-binaries/${GOOS}_${GOARCH}/nuclei"
    if [ "$GOOS" = "windows" ]; then
        NUCLEI_SRC="${NUCLEI_SRC}.exe"
    fi

    # 创建资源目录
    RESOURCE_DIR="${PROJECT_ROOT}/build/resources/${GOOS}_${GOARCH}"
    mkdir -p "$RESOURCE_DIR"

    # 复制 nuclei 到资源目录
    if [ -f "$NUCLEI_SRC" ]; then
        cp "$NUCLEI_SRC" "${RESOURCE_DIR}/nuclei${EXE_EXT}"
        if [ "$GOOS" != "windows" ]; then
            chmod +x "${RESOURCE_DIR}/nuclei"
        fi
    else
        echo -e "${RED}警告: nuclei 未找到 for ${GOOS}/${GOARCH}${NC}"
    fi

    # 使用 wails build
    cd "$PROJECT_ROOT"

    if [ "$GOOS" = "darwin" ]; then
        # macOS 构建
        wails build -platform "$GOOS/$GOARCH" -output "${BUILD_DIR}/${GOOS}_${GOARCH}/${OUTPUT_NAME}" || true
    elif [ "$GOOS" = "linux" ]; then
        # Linux 构建
        wails build -platform "$GOOS/$GOARCH" -output "${BUILD_DIR}/${GOOS}_${GOARCH}/${OUTPUT_NAME}" || true
    elif [ "$GOOS" = "windows" ]; then
        # Windows 构建（需要在 Windows 或使用交叉编译）
        echo -e "${YELLOW}警告: Windows 构建需要在 Windows 环境中进行${NC}"
    fi

    echo -e "${GREEN}✓ ${GOOS}/${GOARCH} 构建完成${NC}"
    echo ""
done

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ 多平台构建完成${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}构建产物位置: ${BUILD_DIR}/${NC}"
ls -lh "${BUILD_DIR}"/*/ 2>/dev/null || true
echo ""
echo -e "${YELLOW}注意: Windows 构建需要在 Windows 环境中进行${NC}"
echo -e "${YELLOW}      或者使用 Docker 运行 Windows 容器${NC}"
