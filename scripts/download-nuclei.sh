#!/bin/bash
# 下载 nuclei 二进制文件到项目目录

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# 配置
NUCLEI_VERSION="${NUCLEI_VERSION:-v3.6.2}"
OUTPUT_DIR="build/binaries"
CROSS_COMPILE_DIR="build/nuclei-binaries"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  HoleHunter - Nuclei 下载脚本${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}版本: ${NUCLEI_VERSION}${NC}"
echo ""

# 检测平台并返回 nuclei 文件名格式
detect_nuclei_filename() {
    local OS="$(uname -s)"
    local ARCH="$(uname -m)"

    case "$OS" in
        Darwin)
            if [ "$ARCH" = "arm64" ]; then
                echo "nuclei_${NUCLEI_VERSION#v}_macOS_arm64.zip"
            else
                echo "nuclei_${NUCLEI_VERSION#v}_macOS_amd64.zip"
            fi
            ;;
        Linux)
            if [ "$ARCH" = "aarch64" ]; then
                echo "nuclei_${NUCLEI_VERSION#v}_linux_arm64.zip"
            elif [ "$ARCH" = "arm" ]; then
                echo "nuclei_${NUCLEI_VERSION#v}_linux_arm.zip"
            else
                echo "nuclei_${NUCLEI_VERSION#v}_linux_amd64.zip"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            echo "nuclei_${NUCLEI_VERSION#v}_windows_amd64.zip"
            ;;
        *)
            echo -e "${RED}未知平台: $OS $ARCH${NC}"
            exit 1
            ;;
    esac
}

# 获取平台显示名称
get_platform_name() {
    local OS="$(uname -s)"
    local ARCH="$(uname -m)"

    case "$OS" in
        Darwin)
            if [ "$ARCH" = "arm64" ]; then
                echo "macOS ARM64"
            else
                echo "macOS AMD64"
            fi
            ;;
        Linux)
            if [ "$ARCH" = "aarch64" ]; then
                echo "Linux ARM64"
            elif [ "$ARCH" = "arm" ]; then
                echo "Linux ARM"
            else
                echo "Linux AMD64"
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            echo "Windows AMD64"
            ;;
        *)
            echo "Unknown"
            ;;
    esac
}

PLATFORM_NAME=$(get_platform_name)
FILENAME=$(detect_nuclei_filename)

echo -e "${GREEN}检测到平台: ${PLATFORM_NAME}${NC}"
echo -e "${GREEN}文件名: ${FILENAME}${NC}"
echo ""

# 创建输出目录
FULL_OUTPUT_DIR="${PROJECT_ROOT}/${OUTPUT_DIR}"
mkdir -p "${FULL_OUTPUT_DIR}"

# 优先从交叉编译目录复制
PLATFORM_KEY=""
case "$PLATFORM_NAME" in
    "macOS ARM64")
        PLATFORM_KEY="darwin-arm64"
        ;;
    "macOS AMD64")
        PLATFORM_KEY="darwin-amd64"
        ;;
    "Linux ARM64")
        PLATFORM_KEY="linux-arm64"
        ;;
    "Linux AMD64")
        PLATFORM_KEY="linux-amd64"
        ;;
    "Windows AMD64")
        PLATFORM_KEY="windows-amd64"
        ;;
esac

if [ -n "$PLATFORM_KEY" ] && [ -f "${PROJECT_ROOT}/${CROSS_COMPILE_DIR}/${PLATFORM_KEY}/nuclei" ]; then
    echo -e "${BLUE}从交叉编译目录复制 nuclei...${NC}"
    cp -f "${PROJECT_ROOT}/${CROSS_COMPILE_DIR}/${PLATFORM_KEY}/nuclei"* "${FULL_OUTPUT_DIR}/"
    chmod +x "${FULL_OUTPUT_DIR}/nuclei" 2>/dev/null || true
    echo -e "${GREEN}✓ 从交叉编译目录复制完成${NC}"
    echo ""
    exit 0
fi

# 检查是否已存在
NUCLEI_BINARY="${FULL_OUTPUT_DIR}/nuclei"
if [ -f "${NUCLEI_BINARY}" ]; then
    echo -e "${YELLOW}nuclei 已存在，跳过下载${NC}"
    echo -e "${BLUE}位置: ${NUCLEI_BINARY}${NC}"

    # 验证版本
    CURRENT_VERSION=$("${NUCLEI_BINARY}" -version 2>&1 | grep -oE 'v?[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo "")
    if [ -n "$CURRENT_VERSION" ]; then
        # 移除可能的 v 前缀进行比较
        CURRENT_VERSION=${CURRENT_VERSION#v}
        REQUIRED_VERSION=${NUCLEI_VERSION#v}

        if [ "$CURRENT_VERSION" = "$REQUIRED_VERSION" ]; then
            echo -e "${GREEN}✓ 版本匹配: ${CURRENT_VERSION}${NC}"
            exit 0
        else
            echo -e "${YELLOW}版本不匹配 (当前: ${CURRENT_VERSION}, 需要: ${REQUIRED_VERSION})，重新下载...${NC}"
            rm "${NUCLEI_BINARY}"
        fi
    else
        echo -e "${YELLOW}无法获取当前版本，重新下载...${NC}"
        rm "${NUCLEI_BINARY}"
    fi
fi

# 下载 nuclei
DOWNLOAD_URL="https://github.com/projectdiscovery/nuclei/releases/download/${NUCLEI_VERSION}/${FILENAME}"

echo -e "${BLUE}正在下载 nuclei...${NC}"
echo -e "${YELLOW}URL: ${DOWNLOAD_URL}${NC}"
echo ""

# 下载
if command -v curl >/dev/null 2>&1; then
    HTTP_CODE=$(curl -sL -w "%{http_code}" -o "${FULL_OUTPUT_DIR}/nuclei.zip" "${DOWNLOAD_URL}")
    if [ "$HTTP_CODE" != "200" ]; then
        echo -e "${RED}下载失败，HTTP 状态码: ${HTTP_CODE}${NC}"
        echo -e "${RED}请检查版本号和平台是否正确${NC}"
        rm -f "${FULL_OUTPUT_DIR}/nuclei.zip"
        exit 1
    fi
elif command -v wget >/dev/null 2>&1; then
    wget -O "${FULL_OUTPUT_DIR}/nuclei.zip" "${DOWNLOAD_URL}"
else
    echo -e "${RED}错误: 需要 curl 或 wget 来下载 nuclei${NC}"
    exit 1
fi

echo -e "${GREEN}下载完成，正在解压...${NC}"

# 解压
if command -v unzip >/dev/null 2>&1; then
    unzip -o "${FULL_OUTPUT_DIR}/nuclei.zip" -d "${FULL_OUTPUT_DIR}/"
else
    echo -e "${RED}错误: 需要 unzip 来解压文件${NC}"
    exit 1
fi

# 查找并移动二进制文件
EXTRACTED_FILE=$(find "${FULL_OUTPUT_DIR}" -type f -name "nuclei" -o -name "nuclei.exe" 2>/dev/null | head -1)
if [ -z "${EXTRACTED_FILE}" ]; then
    echo -e "${RED}错误: 解压后未找到 nuclei 二进制文件${NC}"
    exit 1
fi

mv "${EXTRACTED_FILE}" "${NUCLEI_BINARY}"
chmod +x "${NUCLEI_BINARY}"

# 清理压缩文件
rm -f "${FULL_OUTPUT_DIR}/nuclei.zip"
rm -rf "${FULL_OUTPUT_DIR}/__MACOSX" 2>/dev/null || true

echo -e "${GREEN}解压完成${NC}"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ nuclei 下载完成${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}位置: ${NUCLEI_BINARY}${NC}"
echo -e "${BLUE}版本: ${NUCLEI_VERSION}${NC}"
echo -e "${BLUE}平台: ${PLATFORM_NAME}${NC}"
echo ""

# 验证二进制文件
if [ -f "${NUCLEI_BINARY}" ]; then
    echo -e "${GREEN}验证 nuclei 版本:${NC}"
    "${NUCLEI_BINARY}" -version 2>/dev/null || echo "版本验证失败"
    echo ""
    echo -e "${GREEN}文件信息:${NC}"
    ls -lh "${NUCLEI_BINARY}"
else
    echo -e "${RED}错误: nuclei 二进制文件未找到${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
