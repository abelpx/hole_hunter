#!/bin/bash
# 交叉编译 nuclei for all platforms

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# 配置
NUCLEI_VERSION="${NUCLEI_VERSION:-v3.6.2}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${PROJECT_ROOT}/build/nuclei-binaries"
BUILD_DIR="${PROJECT_ROOT}/build/nuclei-build"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Nuclei 交叉编译脚本${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}版本: ${NUCLEI_VERSION}${NC}"
echo -e "${GREEN}输出目录: ${OUTPUT_DIR}${NC}"
echo ""

# 创建目录
mkdir -p "${OUTPUT_DIR}"

# 克隆 nuclei 源码
echo -e "${BLUE}步骤 1: 获取 Nuclei 源码...${NC}"
if [ -d "${BUILD_DIR}/nuclei" ]; then
    echo -e "${YELLOW}nuclei 源码已存在，跳过克隆${NC}"
    echo -e "${YELLOW}如需重新克隆，请手动删除: ${BUILD_DIR}/nuclei${NC}"
else
    echo -e "${YELLOW}正在克隆 nuclei ${NUCLEI_VERSION}...${NC}"
    git clone --depth 1 --branch "${NUCLEI_VERSION}" git@github.com:projectdiscovery/nuclei.git "${BUILD_DIR}/nuclei"
    echo -e "${GREEN}✓ 克隆完成${NC}"
fi
echo ""

# 定义要编译的平台
PLATFORMS="darwin-arm64,darwin_amd64,linux-arm64,linux_amd64,windows_amd64"

echo -e "${BLUE}步骤 2: 交叉编译所有平台...${NC}"
echo ""

# 编译每个平台
OLDIFS="$IFS"
IFS=','
for PLATFORM in $PLATFORMS; do
    IFS="$OLDIFS"

    GOPLATFORM="$PLATFORM"
    OUTPUT_NAME="nuclei"
    EXT=""

    # 设置 Go 编译参数
    case "$PLATFORM" in
        darwin_arm64)
            GOOS="darwin"
            GOARCH="arm64"
            ;;
        darwin_amd64)
            GOOS="darwin"
            GOARCH="amd64"
            ;;
        linux_arm64)
            GOOS="linux"
            GOARCH="arm64"
            ;;
        linux_amd64)
            GOOS="linux"
            GOARCH="amd64"
            ;;
        windows_amd64)
            GOOS="windows"
            GOARCH="amd64"
            EXT=".exe"
            OUTPUT_NAME="nuclei.exe"
            ;;
    esac

    OUTPUT_PATH="${OUTPUT_DIR}/${PLATFORM}"
    mkdir -p "${OUTPUT_PATH}"

    echo -e "${YELLOW}编译 ${GOOS}/${GOARCH}...${NC}"

    # 编译
    cd "${BUILD_DIR}/nuclei"
    env GOOS="$GOOS" GOARCH="$GOARCH" CGO_ENABLED=0 \
        go build -trimpath -ldflags="-s -w" \
        -o "${OUTPUT_PATH}/${OUTPUT_NAME}" \
        ./cmd/nuclei

    echo -e "${GREEN}✓ ${GOOS}/${GOARCH} 完成${NC}"
done
IFS="$OLDIFS"

echo ""
echo -e "${BLUE}步骤 3: 获取 Nuclei 官方模板...${NC}"

TEMPLATES_DIR="${PROJECT_ROOT}/build/nuclei-templates"
if [ -d "${TEMPLATES_DIR}" ]; then
    echo -e "${YELLOW}模板目录已存在，跳过下载${NC}"
else
    echo -e "${YELLOW}正在克隆 nuclei-templates...${NC}"
    git clone --depth 1 git@github.com:projectdiscovery/nuclei-templates.git "${TEMPLATES_DIR}"
    echo -e "${GREEN}✓ 模板下载完成${NC}"

    # 统计模板数量
    TEMPLATE_COUNT=$(find "${TEMPLATES_DIR}" -name "*.yaml" 2>/dev/null | wc -l | xargs)
    echo -e "${GREEN}✓ 共下载 ${TEMPLATE_COUNT} 个模板${NC}"
fi
echo ""

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ 所有平台编译完成${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}输出目录: ${OUTPUT_DIR}${NC}"
echo ""

# 显示结果
for PLATFORM in darwin-arm64 darwin-amd64 linux-arm64 linux-amd64 windows-amd64; do
    OUTPUT_PATH="${OUTPUT_DIR}/${PLATFORM}"
    if [ -f "${OUTPUT_PATH}/nuclei" ] || [ -f "${OUTPUT_PATH}/nuclei.exe" ]; then
        FILE=$(ls "${OUTPUT_PATH}"/nuclei* 2>/dev/null | head -1)
        if [ -n "$FILE" ]; then
            SIZE=$(ls -lh "$FILE" 2>/dev/null | awk '{print $5}')
            echo -e "${GREEN}✓ ${PLATFORM}: ${SIZE}${NC}"
        fi
    fi
done

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
