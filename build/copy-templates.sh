#!/bin/bash
# 将 nuclei-templates 复制到 build 目录以便打包

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
TEMPLATES_SRC="$PROJECT_ROOT/nuclei-templates"
TEMPLATES_DEST="$BUILD_DIR/nuclei-templates"

echo "正在准备模板文件..."

# 检查源目录是否存在
if [ ! -d "$TEMPLATES_SRC" ]; then
    echo "错误: nuclei-templates 目录不存在"
    echo "请先运行: git submodule update --init --recursive"
    exit 1
fi

# 创建 build 目录
mkdir -p "$BUILD_DIR"

# 复制模板目录
echo "从 $TEMPLATES_SRC 复制到 $TEMPLATES_DEST"

# 使用 rsync 或 cp 复制
if command -v rsync &> /dev/null; then
    rsync -av --delete \
        --exclude='.git/' \
        --exclude='.github/' \
        --exclude='*.md' \
        --exclude='*.json' \
        --exclude='*.txt' \
        --exclude='tests/' \
        --exclude='.new-additions' \
        --exclude='.nuclei-ignore' \
        --exclude='.pre-commit-config.yml' \
        "$TEMPLATES_SRC/" "$TEMPLATES_DEST/"
else
    rm -rf "$TEMPLATES_DEST"
    cp -R "$TEMPLATES_SRC" "$TEMPLATES_DEST"
    # 清理不需要的文件
    find "$TEMPLATES_DEST" -name '.git' -type d -exec rm -rf {} + 2>/dev/null || true
    find "$TEMPLATES_DEST" -name '.github' -type d -exec rm -rf {} + 2>/dev/null || true
    find "$TEMPLATES_DEST" -name '*.md' -delete 2>/dev/null || true
    find "$TEMPLATES_DEST" -name '*.json' -not -name 'templates.json' -delete 2>/dev/null || true
    find "$TEMPLATES_DEST" -name '*.txt' -delete 2>/dev/null || true
    find "$TEMPLATES_DEST" -name 'tests' -type d -exec rm -rf {} + 2>/dev/null || true
fi

echo "模板文件已准备好，共 $(find "$TEMPLATES_DEST" -name '*.yaml' | wc -l) 个 YAML 文件"
echo "目录大小: $(du -sh "$TEMPLATES_DEST" | cut -f1)"
