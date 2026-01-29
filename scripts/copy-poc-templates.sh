#!/bin/bash

# 复制全部 nuclei 模板并压缩

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
POC_TEMPLATES_DIR="$BUILD_DIR/poc-templates"
SOURCE_TEMPLATES="$PROJECT_ROOT/nuclei-templates"

echo "=========================================="
echo "Building Full POC Templates"
echo "=========================================="

# 清理旧文件
echo "Cleaning old build..."
rm -rf "$POC_TEMPLATES_DIR"
mkdir -p "$POC_TEMPLATES_DIR"

# 复制所有 http 模板
echo ""
echo "Copying all HTTP templates..."
if [ -d "$SOURCE_TEMPLATES/http" ]; then
    cp -r "$SOURCE_TEMPLATES/http"/* "$POC_TEMPLATES_DIR/" 2>/dev/null || true
fi

# 复制所有网络模板
echo "Copying all network templates..."
if [ -d "$SOURCE_TEMPLATES/network" ]; then
    mkdir -p "$POC_TEMPLATES_DIR/network"
    cp -r "$SOURCE_TEMPLATES/network"/* "$POC_TEMPLATES_DIR/network/" 2>/dev/null || true
fi

# 复制所有 SSL 模板
echo "Copying all SSL templates..."
if [ -d "$SOURCE_TEMPLATES/ssl" ]; then
    mkdir -p "$POC_TEMPLATES_DIR/ssl"
    cp -r "$SOURCE_TEMPLATES/ssl"/* "$POC_TEMPLATES_DIR/ssl/" 2>/dev/null || true
fi

# 复制所有 DNS 模板
echo "Copying all DNS templates..."
if [ -d "$SOURCE_TEMPLATES/dns" ]; then
    mkdir -p "$POC_TEMPLATES_DIR/dns"
    cp -r "$SOURCE_TEMPLATES/dns"/* "$POC_TEMPLATES_DIR/dns/" 2>/dev/null || true
fi

# 复制所有工作流模板
echo "Copying all workflow templates..."
if [ -d "$SOURCE_TEMPLATES/workflows" ]; then
    mkdir -p "$POC_TEMPLATES_DIR/workflows"
    cp -r "$SOURCE_TEMPLATES/workflows"/* "$POC_TEMPLATES_DIR/workflows/" 2>/dev/null || true
fi

# 复制所有 headless 模板
echo "Copying all headless templates..."
if [ -d "$SOURCE_TEMPLATES/headless" ]; then
    mkdir -p "$POC_TEMPLATES_DIR/headless"
    cp -r "$SOURCE_TEMPLATES/headless"/* "$POC_TEMPLATES_DIR/headless/" 2>/dev/null || true
fi

# 统计复制的模板数量
echo ""
echo "=========================================="
echo "Template Statistics"
echo "=========================================="
total_files=$(find "$POC_TEMPLATES_DIR" -name "*.yaml" | wc -l | xargs)
echo "  Total: $total_files templates"

# 计算大小
size=$(du -sh "$POC_TEMPLATES_DIR" | cut -f1)
echo "  Size: $size"

echo ""
echo "Creating zip archive..."
cd "$BUILD_DIR"
zip -r -q poc-templates.zip poc-templates/
zip_size=$(du -sh "$BUILD_DIR/poc-templates.zip" | cut -f1)
echo "  Zip size: $zip_size"

echo ""
echo "=========================================="
echo "✓ Full POC templates built successfully"
echo "=========================================="
echo "Location: $POC_TEMPLATES_DIR"
echo "Zip: $BUILD_DIR/poc-templates.zip"
