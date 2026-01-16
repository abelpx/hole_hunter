#!/bin/bash
# API 类型一致性检查脚本
# 用于检测前端类型定义与后端实际返回值不匹配的问题

set -e

echo "=== 检查 Wails 绑定文件 ==="

# 检查绑定文件是否存在
BINDINGS_DIR="frontend/wailsjs/wailsjs/go/app"
if [ ! -f "$BINDINGS_DIR/App.js" ]; then
  echo "❌ 错误: $BINDINGS_DIR/App.js 不存在"
  echo "   请先运行 'wails dev' 或 'wails build' 生成绑定文件"
  exit 1
fi

echo "✅ 绑定文件存在"

# 检查 TypeScript 定义
echo ""
echo "=== 检查 TypeScript 类型定义 ==="

# 检查分页 API 返回类型
if grep -q "GetTemplatesPageByFilter.*Promise<Array<models.NucleiTemplate>>" "$BINDINGS_DIR/App.d.ts"; then
  echo "❌ 错误: GetTemplatesPageByFilter 返回类型不正确"
  echo "   当前: Promise<Array<models.NucleiTemplate>>"
  echo "   应该: Promise<[Array<models.NucleiTemplate>, number]>"
  echo ""
  echo "   这会导致前端无法正确解构返回值，分页功能失效！"
  exit 1
fi

if grep -q "GetTemplatesPage.*Promise<Array<models.NucleiTemplate>>" "$BINDINGS_DIR/App.d.ts"; then
  echo "❌ 错误: GetTemplatesPage 返回类型不正确"
  echo "   当前: Promise<Array<models.NucleiTemplate>>"
  echo "   应该: Promise<[Array<models.NucleiTemplate>, number]>"
  exit 1
fi

echo "✅ TypeScript 类型定义正确"

# 检查 models.ts 是否有 TemplateFilter
echo ""
echo "=== 检查模型定义 ==="

if ! grep -q "class TemplateFilter" "$BINDINGS_DIR/../models.ts"; then
  echo "❌ 错误: TemplateFilter 类不存在"
  exit 1
fi

echo "✅ 模型定义完整"

echo ""
echo "=== 所有检查通过 ✅ ==="
echo "前端类型定义与后端 API 匹配"
