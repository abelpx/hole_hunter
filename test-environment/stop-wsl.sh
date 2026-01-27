#!/bin/bash
# Hole Hunter 测试环境停止脚本 (WSL/Linux)

echo "========================================"
echo "停止 Hole Hunter 测试环境"
echo "========================================"
echo ""

echo "正在停止所有测试容器..."
docker-compose down

echo ""
echo "测试环境已停止"
