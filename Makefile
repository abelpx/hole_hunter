.PHONY: help backend frontend desktop clean install deps list-artifacts verify verify-frontend test-desktop

# 默认目标
.DEFAULT_GOAL := help

# 颜色定义
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
NC     := \033[0m # No Color

## help: 显示帮助信息
help:
	@echo "$(BLUE)HoleHunter 项目构建工具$(NC)"
	@echo ""
	@echo "$(GREEN)可用命令:$(NC)"
	@echo "  $(YELLOW)make deps$(NC)             - 安装所有依赖（前端 + 后端）"
	@echo "  $(YELLOW)make backend$(NC)          - 构建后端服务"
	@echo "  $(YELLOW)make backend-run$(NC)      - 运行后端服务"
	@echo "  $(YELLOW)make frontend$(NC)         - 构建前端"
	@echo "  $(YELLOW)make frontend-dev$(NC)     - 开发模式运行前端"
	@echo "  $(YELLOW)make desktop$(NC)          - 构建桌面应用"
	@echo "  $(YELLOW)make desktop-dev$(NC)      - 开发模式运行桌面应用"
	@echo "  $(YELLOW)make verify$(NC)           - 验证构建产物"
	@echo "  $(YELLOW)make test-desktop$(NC)     - 测试桌面应用"
	@echo "  $(YELLOW)make list-artifacts$(NC)   - 查看构建产物"
	@echo "  $(YELLOW)make clean$(NC)            - 清理构建产物"
	@echo "  $(YELLOW)make install$(NC)          - 安装项目依赖"
	@echo ""
	@echo "$(GREEN)构建产物位置:$(NC)"
	@echo "  后端二进制: backend/bin/server"
	@echo "  前端构建:   frontend/dist/"
	@echo "  安装包:     frontend/release/"
	@echo ""

## deps: 安装所有依赖
deps:
	@echo "$(GREEN)安装依赖...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)前端依赖安装完成$(NC)"
	@cd backend && go mod download
	@echo "$(GREEN)后端依赖安装完成$(NC)"

## backend: 构建后端服务
backend:
	@echo "$(GREEN)构建后端服务...$(NC)"
	@cd backend && go build -o bin/server cmd/server/main.go
	@echo "$(GREEN)✓ 后端服务构建完成$(NC)"
	@echo "$(BLUE)  位置: backend/bin/server$(NC)"
	@ls -lh backend/bin/server 2>/dev/null | awk '{print "  大小: " $$9}'

## backend-run: 运行后端服务
backend-run:
	@echo "$(GREEN)启动后端服务...$(NC)"
	@cd backend && go run cmd/server/main.go

## backend-build: 编译后端（跨平台）
backend-build:
	@echo "$(GREEN)编译后端服务...$(NC)"
	@cd backend && go build -o bin/server cmd/server/main.go
	@echo "$(GREEN)✓ 后端编译完成$(NC)"
	@echo "$(BLUE)  位置: backend/bin/server$(NC)"

## frontend: 构建前端
frontend:
	@echo "$(GREEN)构建前端...$(NC)"
	@cd frontend && npm run build
	@echo "$(GREEN)✓ 前端构建完成$(NC)"
	@echo "$(BLUE)  位置: frontend/dist/$(NC)"
	@du -sh frontend/dist 2>/dev/null | awk '{print "  大小: " $$1}'

## frontend-dev: 开发模式运行前端
frontend-dev:
	@echo "$(GREEN)启动前端开发服务器...$(NC)"
	@cd frontend && npm run dev

## desktop: 构建桌面应用
desktop: frontend backend
	@echo "$(GREEN)构建桌面应用...$(NC)"
	@echo "$(BLUE)准备后端二进制文件...$(NC)"
	@mkdir -p frontend/build/backend
	@$(MAKE) prepare-backend-binaries
	@cd frontend && npm run dist
	@echo "$(GREEN)✓ 桌面应用构建完成$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(BLUE)  安装包位置: frontend/release/$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@if [ -d "frontend/release" ]; then \
		ls -lh frontend/release/*.* 2>/dev/null | awk '{printf "  ✓ %s (%s)\n", $$9, $$5}'; \
	fi
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"

## prepare-backend-binaries: 准备后端二进制文件
prepare-backend-binaries:
	@echo "$(BLUE)编译后端二进制文件...$(NC)"
	@cd backend && go build -o ../frontend/build/backend/server cmd/server/main.go
	@if [ "$(shell uname -s)" = "Darwin" ]; then \
		echo "$(BLUE)为 macOS 构建通用二进制...$(NC)"; \
		cd backend && GOARCH=arm64 go build -o ../frontend/build/backend/server-arm64 cmd/server/main.go; \
		cd backend && GOARCH=amd64 go build -o ../frontend/build/backend/server-amd64 cmd/server/main.go; \
		lipo -create -output ../frontend/build/backend/server-universal ../frontend/build/backend/server-arm64 ../frontend/build/backend/server-amd64 || true; \
	fi

## desktop-dev: 开发模式运行桌面应用
desktop-dev:
	@echo "$(GREEN)启动桌面应用开发模式...$(NC)"
	@cd frontend && npm run dev:electron

## desktop-build: 构建桌面应用（指定平台）
desktop-build-win:
	@echo "$(GREEN)构建 Windows 桌面应用...$(NC)"
	@$(MAKE) prepare-backend-binaries
	@cd frontend && npm run dist:win
	@echo "$(GREEN)✓ Windows 桌面应用构建完成$(NC)"
	@echo "$(BLUE)  安装包位置: frontend/release/$(NC)"
	@ls -lh frontend/release/*.{exe,zip} 2>/dev/null | awk '{printf "  ✓ %s (%s)\n", $$9, $$5}'

desktop-build-mac:
	@echo "$(GREEN)构建 macOS 桌面应用...$(NC)"
	@$(MAKE) prepare-backend-binaries
	@cd frontend && npm run dist:mac
	@echo "$(GREEN)✓ macOS 桌面应用构建完成$(NC)"
	@echo "$(BLUE)  安装包位置: frontend/release/$(NC)"
	@ls -lh frontend/release/*.{dmg,zip} 2>/dev/null | awk '{printf "  ✓ %s (%s)\n", $$9, $$5}'

desktop-build-linux:
	@echo "$(GREEN)构建 Linux 桌面应用...$(NC)"
	@$(MAKE) prepare-backend-binaries
	@cd frontend && npm run dist:linux
	@echo "$(GREEN)✓ Linux 桌面应用构建完成$(NC)"
	@echo "$(BLUE)  安装包位置: frontend/release/$(NC)"
	@ls -lh frontend/release/*.{AppImage,deb} 2>/dev/null | awk '{printf "  ✓ %s (%s)\n", $$9, $$5}'

## desktop-build-all: 构建所有平台的桌面应用
desktop-build-all:
	@echo "$(GREEN)构建所有平台桌面应用...$(NC)"
	@echo "$(BLUE)Windows...$(NC)"
	@GOOS=windows GOARCH=amd64 go build -o frontend/build/backend/server.exe cmd/server/main.go
	@echo "$(BLUE)macOS...$(NC)"
	@GOOS=darwin GOARCH=amd64 go build -o frontend/build/backend/server-darwin-amd64 cmd/server/main.go
	@GOOS=darwin GOARCH=arm64 go build -o frontend/build/backend/server-darwin-arm64 cmd/server/main.go
	@echo "$(BLUE)Linux...$(NC)"
	@GOOS=linux GOARCH=amd64 go build -o frontend/build/backend/server-linux-amd64 cmd/server/main.go
	@cd frontend && npm run dist
	@echo "$(GREEN)✓ 所有平台桌面应用构建完成$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(BLUE)  安装包位置: frontend/release/$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@ls -lh frontend/release/* 2>/dev/null | awk '{printf "  ✓ %s (%s)\n", $$9, $$5}'
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"

## clean: 清理构建产物
clean:
	@echo "$(GREEN)清理构建产物...$(NC)"
	@rm -rf frontend/dist
	@rm -rf frontend/node_modules/.vite
	@rm -rf backend/bin
	@rm -rf releases/*.dmg
	@rm -rf releases/*.exe
	@rm -rf releases/*.AppImage
	@echo "$(GREEN)清理完成$(NC)"

## install: 安装项目依赖
install: deps
	@echo "$(GREEN)项目依赖安装完成$(NC)"

## dev: 启动开发环境（后端 + 前端）
dev: backend frontend
	@echo "$(GREEN)启动开发环境...$(NC)"
	@echo "$(BLUE)后端服务: backend/bin/server$(NC)"
	@echo "$(BLUE)前端服务: cd frontend && npm run dev$(NC)"

## test: 运行测试
test:
	@echo "$(GREEN)运行测试...$(NC)"
	@cd backend && go test ./...
	@cd frontend && npm test

## lint: 代码检查
lint:
	@echo "$(GREEN)运行代码检查...$(NC)"
	@cd backend && go vet ./...
	@cd frontend && npm run lint

## format: 格式化代码
format:
	@echo "$(GREEN)格式化代码...$(NC)"
	@cd backend && go fmt ./...
	@cd frontend && npm run format

## build: 完整构建（前端 + 后端）
build: backend frontend
	@echo "$(GREEN)✓ 完整构建完成$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(BLUE)  后端二进制: backend/bin/server$(NC)"
	@echo "$(BLUE)  前端构建:   frontend/dist/$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"

## all: 完整构建并打包桌面应用
all: desktop
	@echo "$(GREEN)所有构建完成$(NC)"

## list-artifacts: 查看构建产物
list-artifacts:
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo "$(BLUE)  HoleHunter 构建产物$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo ""
	@echo "$(GREEN)后端二进制:$(NC)"
	@if [ -f "backend/bin/server" ]; then \
		ls -lh backend/bin/server | awk '{printf "  ✓ backend/bin/server (%s)\n", $$5}'; \
	else \
		echo "  $(YELLOW)✗ backend/bin/server (未构建)$(NC)"; \
	fi
	@echo ""
	@echo "$(GREEN)前端构建:$(NC)"
	@if [ -d "frontend/dist" ]; then \
		du -sh frontend/dist 2>/dev/null | awk '{printf "  ✓ frontend/dist/ (%s)\n", $$1}'; \
	else \
		echo "  $(YELLOW)✗ frontend/dist/ (未构建)$(NC)"; \
	fi
	@echo ""
	@echo "$(GREEN)安装包:$(NC)"
	@if [ -d "frontend/release" ] && [ -n "$$(ls frontend/release/*.{dmg,exe,AppImage,deb,zip} 2>/dev/null)" ]; then \
		ls -lh frontend/release/*.{dmg,exe,AppImage,deb,zip} 2>/dev/null | awk '{printf "  ✓ %s (%s)\n", $$9, $$5}'; \
	else \
		echo "  $(YELLOW)✗ frontend/release/ (未构建)$(NC)"; \
	fi
	@echo ""
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"

## verify: 验证构建产物
verify:
	@echo "$(GREEN)验证构建产物...$(NC)"
	@cd frontend && ./verify-electron.sh

## verify-frontend: 验证前端构建
verify-frontend:
	@echo "$(GREEN)验证前端构建...$(NC)"
	@cd frontend && npm run build
	@echo "$(GREEN)✓ 前端构建验证完成$(NC)"

## test-desktop: 测试桌面应用
test-desktop:
	@echo "$(GREEN)测试桌面应用...$(NC)"
	@cd frontend && ./test-electron.sh

	@echo ""
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
