#!/bin/bash
# Hole Hunter 测试环境启动脚本 (WSL/Linux)

echo "========================================"
echo "Hole Hunter 测试环境启动"
echo "========================================"
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "[错误] Docker 未运行"
    echo "请启动 Docker Desktop 并确保 WSL2 集成已启用"
    exit 1
fi

echo "[1/3] 启动测试环境..."
docker-compose up -d

echo ""
echo "[2/3] 等待服务启动..."
sleep 10

echo ""
echo "[3/3] 检查服务状态..."
docker-compose ps

echo ""
echo "========================================"
echo "测试环境已启动！"
echo "========================================"
echo ""
echo "可用的测试目标:"
echo "  - DVWA:           http://localhost:8080"
echo "  - Juice Shop:     http://localhost:3000"
echo "  - WebGoat:        http://localhost:8081"
echo "  - Nginx Vuln:     http://localhost:8082"
echo "  - WordPress:      http://localhost:8083"
echo "  - Heartbleed:     http://localhost:8084"
echo ""
echo "下一步:"
echo "  1. 启动 Hole Hunter 应用"
echo "  2. 添加目标: http://localhost:8080"
echo "  3. 创建扫描任务并运行"
echo ""
echo "停止环境: ./stop-wsl.sh"
echo "========================================"
