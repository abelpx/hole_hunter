.PHONY: help dev build build-debug clean run deps lint format test test-coverage test-ci nuclei-download nuclei-compile-all

# 默认目标
.DEFAULT_GOAL := help

# 颜色定义
GREEN  := \033[0;32m
YELLOW := \033[0;33m
BLUE   := \033[0;34m
RED    := \033[0;31m
NC     := \033[0m # No Color

# Wails CLI 路径（自动检测）
WAILS ?= $(shell which wails 2>/dev/null || echo "$$HOME/.gvm/pkgsets/go1.25.0/global/bin/darwin_amd64/wails")

# 应用信息
APP_NAME := HoleHunter
BUILD_DIR := build/bin
FRONTEND_DIR := frontend

# 检测操作系统
UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

# 确定平台特定的设置
ifeq ($(OS),Windows_NT)
    DETECTED_OS := Windows
    NUCLEI_NAME := nuclei.exe
    APP_EXT := .exe
    BUILD_OUTPUT := $(BUILD_DIR)/$(APP_NAME)$(APP_EXT)
else ifeq ($(UNAME_S),Linux)
    DETECTED_OS := Linux
    NUCLEI_NAME := nuclei
    APP_EXT :=
    BUILD_OUTPUT := $(BUILD_DIR)/$(APP_NAME)
else ifeq ($(UNAME_S),Darwin)
    DETECTED_OS := macOS
    NUCLEI_NAME := nuclei
    APP_EXT :=
    BUILD_OUTPUT := $(BUILD_DIR)/$(APP_NAME).app/Contents/MacOS/$(APP_NAME)
endif

## help: 显示帮助信息
help:
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo "$(BLUE)  $(APP_NAME) - Wails v2 桌面应用 (跨平台)$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(GREEN)检测到平台: $(DETECTED_OS) ($(UNAME_M))$(NC)"
	@echo ""
	@echo "$(GREEN)开发命令:$(NC)"
	@echo "  $(YELLOW)make dev$(NC)              - 启动开发模式（热重载）"
	@echo "  $(YELLOW)make run$(NC)              - 运行已构建的应用"
	@echo ""
	@echo "$(GREEN)构建命令:$(NC)"
	@echo "  $(YELLOW)make build$(NC)            - 生产构建（优化）"
	@echo "  $(YELLOW)make build-debug$(NC)      - 调试构建（包含开发者工具）"
	@echo ""
	@echo "$(GREEN)依赖管理:$(NC)"
	@echo "  $(YELLOW)make deps$(NC)             - 安装所有依赖"
	@echo ""
	@echo "$(GREEN)代码质量:$(NC)"
	@echo "  $(YELLOW)make lint$(NC)             - 代码检查"
	@echo "  $(YELLOW)make format$(NC)           - 格式化代码"
	@echo "  $(YELLOW)make test$(NC)             - 运行测试"
	@echo "  $(YELLOW)make test-coverage$(NC)    - 运行测试并生成覆盖率报告"
	@echo "  $(YELLOW)make test-ci$(NC)          - CI 模式测试（带竞态检测）"
	@echo ""
	@echo "$(GREEN)清理:$(NC)"
	@echo "  $(YELLOW)make clean$(NC)            - 清理构建产物"
	@echo ""
	@echo "$(GREEN)资源准备:$(NC)"
	@echo "  $(YELLOW)make prepare-embedded$(NC) - 准备嵌入资源（nuclei + 模板）"
	@echo "  $(YELLOW)make nuclei-download$(NC)  - 下载 nuclei 二进制文件"
	@echo "  $(YELLOW)make nuclei-compile-all$(NC) - 交叉编译所有平台 nuclei"
	@echo ""
	@echo "$(GREEN)其他:$(NC)"
	@echo "  $(YELLOW)make list$(NC)             - 查看构建产物"
	@echo ""
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo "$(BLUE)  构建产物: $(BUILD_DIR)/$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo ""

## dev: 启动开发模式（支持热重载）
dev:
	@echo "$(GREEN)启动 Wails 开发模式...$(NC)"
	@echo "$(BLUE)平台: $(DETECTED_OS)$(NC)"
	@echo "$(BLUE)提示: 修改代码会自动重新加载$(NC)"
	@echo ""
	@"$(WAILS)" dev

## build: 生产构建（优化）
build: check-embedded
	@echo "$(GREEN)构建 $(APP_NAME) 桌面应用...$(NC)"
	@echo "$(BLUE)平台: $(DETECTED_OS)$(NC)"
	@echo "$(BLUE)模式: 生产（优化）$(NC)"
ifeq ($(DETECTED_OS),Windows)
	@export PATH="/c/ProgramData/mingw64/mingw64/bin:$$PATH" && export CGO_ENABLED=1 && "$(WAILS)" build
else
	@"$(WAILS)" build
endif
	@echo ""
	@echo "$(GREEN)✓ 构建完成（资源已嵌入到 exe）$(NC)"
	@$(MAKE) show-build-info

## build-debug: 调试构建（包含开发者工具）
build-debug: check-embedded
	@echo "$(GREEN)构建 $(APP_NAME) 桌面应用（调试模式）...$(NC)"
	@echo "$(BLUE)平台: $(DETECTED_OS)$(NC)"
	@echo "$(BLUE)模式: 调试（包含开发者工具）$(NC)"
	@"$(WAILS)" build -debug
	@echo ""
	@echo "$(GREEN)✓ 构建完成（资源已嵌入到 exe）$(NC)"
	@$(MAKE) show-build-info

## copy-nuclei: 复制 nuclei 到应用包（内部目标）
copy-nuclei:
	@echo "$(BLUE)复制 nuclei 到应用包...$(NC)"
ifeq ($(DETECTED_OS),macOS)
	@if [ -f "$(BUILD_DIR)/$(APP_NAME).app/Contents/MacOS/$(APP_NAME)" ]; then \
		mkdir -p "$(BUILD_DIR)/$(APP_NAME).app/Contents/MacOS"; \
		cp -f build/binaries/nuclei "$(BUILD_DIR)/$(APP_NAME).app/Contents/MacOS/nuclei"; \
		chmod +x "$(BUILD_DIR)/$(APP_NAME).app/Contents/MacOS/nuclei"; \
		echo "$(GREEN)✓ nuclei 已打包到 .app/Contents/MacOS/$(NC)"; \
	else \
		echo "$(YELLOW)警告: 应用构建产物未找到$(NC)"; \
	fi
else ifeq ($(DETECTED_OS),Linux)
	@if [ -f "$(BUILD_DIR)/$(APP_NAME)" ]; then \
		cp -f build/binaries/nuclei "$(BUILD_DIR)/nuclei"; \
		chmod +x "$(BUILD_DIR)/nuclei"; \
		echo "$(GREEN)✓ nuclei 已复制到构建目录$(NC)"; \
	else \
		echo "$(YELLOW)警告: 应用构建产物未找到$(NC)"; \
	fi
else ifeq ($(DETECTED_OS),Windows)
	@if [ -f "$(BUILD_DIR)/$(APP_NAME).exe" ]; then \
		copy /Y build\\binaries\\nuclei.exe "$(BUILD_DIR)\\nuclei.exe" >nul 2>&1 || \
		cp -f build/binaries/nuclei.exe "$(BUILD_DIR)/nuclei.exe" 2>/dev/null || \
		echo "$(GREEN)✓ 请手动复制 nuclei.exe 到应用目录$(NC)"; \
	else \
		echo "$(YELLOW)警告: 应用构建产物未找到$(NC)"; \
	fi
endif
	@$(MAKE) copy-templates

## copy-templates: 复制 nuclei 模板到应用包（内部目标）
copy-templates:
	@echo "$(BLUE)复制 nuclei 模板到应用包...$(NC)"
	@TEMPLATES_SRC="nuclei-templates"; \
	if [ -d "$$TEMPLATES_SRC" ]; then \
		TEMPLATE_COUNT=$$(find "$$TEMPLATES_SRC" -name "*.yaml" 2>/dev/null | wc -l | xargs); \
		if [ "$(DETECTED_OS)" = "macOS" ]; then \
			if [ -d "$(BUILD_DIR)/$(APP_NAME).app/Contents/MacOS" ]; then \
				cp -rf "$$TEMPLATES_SRC" "$(BUILD_DIR)/$(APP_NAME).app/Contents/MacOS/nuclei-templates"; \
				echo "$(GREEN)✓ 模板已打包 ($$TEMPLATE_COUNT 个文件)$(NC)"; \
			fi; \
		elif [ "$(DETECTED_OS)" = "Linux" ]; then \
			if [ -d "$(BUILD_DIR)" ]; then \
				cp -rf "$$TEMPLATES_SRC" "$(BUILD_DIR)/nuclei-templates"; \
				echo "$(GREEN)✓ 模板已复制 ($$TEMPLATE_COUNT 个文件)$(NC)"; \
			fi; \
		elif [ "$(DETECTED_OS)" = "Windows" ]; then \
			if [ -d "$(BUILD_DIR)" ]; then \
				cp -rf "$$TEMPLATES_SRC" "$(BUILD_DIR)/nuclei-templates"; \
				echo "$(GREEN)✓ 模板已复制 ($$TEMPLATE_COUNT 个文件)$(NC)"; \
			fi; \
		fi; \
	else \
		echo "$(YELLOW)警告: 模板目录不存在，运行 'git submodule update --init --recursive' 获取模板$(NC)"; \
	fi

## show-build-info: 显示构建信息（内部目标）
show-build-info:
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@if [ -d "$(BUILD_DIR)" ]; then \
		find $(BUILD_DIR) -maxdepth 2 -type f -exec ls -lh {} \; 2>/dev/null | awk '{printf "  ✓ %s (%s)\n", $$9, $$5}' | head -10; \
	fi
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@echo ""
	@echo "$(YELLOW)运行: make run$(NC)"

## prepare-templates: 准备模板文件（清理并复制到 build 目录）
prepare-templates:
	@echo "$(BLUE)准备 POC 模板文件...$(NC)"
	@if [ -d "nuclei-templates" ]; then \
		./build/copy-templates.sh; \
	else \
		echo "$(YELLOW)警告: nuclei-templates 子模块未初始化$(NC)"; \
		echo "$(YELLOW)运行: git submodule update --init --recursive$(NC)"; \
	fi

## prepare-embedded: 准备嵌入资源（nuclei 二进制和 POC 模板）
prepare-embedded:
	@echo "$(BLUE)准备嵌入资源...$(NC)"
	@echo "$(BLUE)1. 下载 nuclei 二进制...$(NC)"
	@./scripts/download-nuclei.sh
	@mkdir -p build/embedded
	@cp -f build/binaries/nuclei build/embedded/nuclei
	@echo "$(GREEN)  ✓ nuclei 已复制到 build/embedded/$(NC)"
	@echo ""
	@echo "$(BLUE)2. 构建核心 POC 模板...$(NC)"
	@if [ -d "nuclei-templates" ]; then \
		./build/copy-poc-templates.sh; \
	else \
		echo "$(YELLOW)警告: nuclei-templates 子模块未初始化$(NC)"; \
		echo "$(YELLOW)运行: git submodule update --init --recursive$(NC)"; \
		exit 1; \
	fi
	@echo ""
	@echo "$(GREEN)✓ 嵌入资源准备完成$(NC)"

## check-embedded: 检查嵌入资源是否已准备
check-embedded:
	@echo "$(BLUE)检查嵌入资源...$(NC)"
	@if [ ! -f "build/embedded/nuclei" ]; then \
		echo "$(RED)错误: build/embedded/nuclei 不存在$(NC)"; \
		echo "$(YELLOW)请先运行: make prepare-embedded$(NC)"; \
		exit 1; \
	fi
	@if [ ! -f "build/poc-templates.zip" ]; then \
		echo "$(RED)错误: build/poc-templates.zip 不存在$(NC)"; \
		echo "$(YELLOW)请先运行: make prepare-embedded$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ 嵌入资源检查通过$(NC)"

## run: 运行已构建的应用
run:
ifeq ($(DETECTED_OS),macOS)
	@if [ -f "$(BUILD_DIR)/$(APP_NAME).app/Contents/MacOS/$(APP_NAME)" ]; then \
		echo "$(GREEN)启动 $(APP_NAME)...$(NC)"; \
		open "$(BUILD_DIR)/$(APP_NAME).app" || "$(BUILD_DIR)/$(APP_NAME).app/Contents/MacOS/$(APP_NAME)" & \
	else \
		echo "$(RED)错误: 应用未构建$(NC)"; \
		echo "$(YELLOW)请先运行: make build$(NC)"; \
		exit 1; \
	fi
else ifeq ($(DETECTED_OS),Linux)
	@if [ -f "$(BUILD_DIR)/$(APP_NAME)" ]; then \
		echo "$(GREEN)启动 $(APP_NAME)...$(NC)"; \
		"$(BUILD_DIR)/$(APP_NAME)" & \
	else \
		echo "$(RED)错误: 应用未构建$(NC)"; \
		echo "$(YELLOW)请先运行: make build$(NC)"; \
		exit 1; \
	fi
else ifeq ($(DETECTED_OS),Windows)
	@if [ -f "$(BUILD_DIR)/$(APP_NAME).exe" ]; then \
		echo "$(GREEN)启动 $(APP_NAME)...$(NC)"; \
		start "" "$(BUILD_DIR)/$(APP_NAME).exe" || \
		"$(BUILD_DIR)/$(APP_NAME).exe" & \
	else \
		echo "$(RED)错误: 应用未构建$(NC)"; \
		echo "$(YELLOW)请先运行: make build$(NC)"; \
		exit 1; \
	fi
endif

## deps: 安装所有依赖
deps:
	@echo "$(GREEN)安装依赖...$(NC)"
	@echo "$(BLUE)前端依赖...$(NC)"
	@cd $(FRONTEND_DIR) && npm install
	@echo "$(GREEN)✓ 依赖安装完成$(NC)"

## clean: 清理构建产物
clean:
	@echo "$(GREEN)清理构建产物...$(NC)"
	@rm -rf $(BUILD_DIR)
	@rm -rf $(FRONTEND_DIR)/dist
	@rm -f build/binaries/nuclei* 2>/dev/null || true
	@echo "$(GREEN)✓ 清理完成$(NC)"

## lint: 代码检查
lint:
	@echo "$(GREEN)代码检查...$(NC)"
	@echo "$(BLUE)后端代码...$(NC)"
	@golangci-lint run ./... || echo "警告: golangci-lint 未安装"
	@echo "$(BLUE)前端代码...$(NC)"
	@cd $(FRONTEND_DIR) && npm run lint || echo "警告: 前端 lint 未配置"
	@echo "$(GREEN)✓ 检查完成$(NC)"

## format: 格式化代码
format:
	@echo "$(GREEN)格式化代码...$(NC)"
	@echo "$(BLUE)后端代码...$(NC)"
	@go fmt ./...
	@echo "$(BLUE)前端代码...$(NC)"
	@cd $(FRONTEND_DIR) && npm run format || echo "警告: 前端 format 未配置"
	@echo "$(GREEN)✓ 格式化完成$(NC)"

## test: 运行测试
test:
	@echo "$(GREEN)运行测试...$(NC)"
	@echo "$(BLUE)后端测试...$(NC)"
	@go test -v ./internal/... || true
	@echo "$(BLUE)前端测试...$(NC)"
	@cd $(FRONTEND_DIR) && npm run test -- --run || echo "警告: 前端测试未配置"
	@echo "$(GREEN)✓ 测试完成$(NC)"

## test-coverage: 运行测试并生成覆盖率报告
test-coverage:
	@echo "$(GREEN)运行测试（带覆盖率）...$(NC)"
	@echo "$(BLUE)后端测试...$(NC)"
	@go test -v -coverprofile=coverage.out -covermode=atomic ./internal/...
	@echo "$(BLUE)生成覆盖率报告...$(NC)"
	@go tool cover -html=coverage.out -o coverage.html
	@echo "$(GREEN)✓ 覆盖率报告: coverage.html$(NC)"
	@go tool cover -func=coverage.out | tail -1
	@echo "$(BLUE)前端覆盖率...$(NC)"
	@cd $(FRONTEND_DIR) && npm run test:ci || echo "警告: 前端测试未配置"

## test-ci: CI 模式测试（带竞态检测）
test-ci:
	@echo "$(GREEN)CI 模式测试...$(NC)"
	@echo "$(BLUE)后端测试（竞态检测）...$(NC)"
	@go test -race -coverprofile=coverage.out -covermode=atomic ./internal/...
	@echo "$(GREEN)✓ CI 测试完成$(NC)"

## nuclei-download: 下载 nuclei 二进制文件
nuclei-download:
	@echo "$(GREEN)下载 Nuclei 二进制文件...$(NC)"
	@echo ""
	@./scripts/download-nuclei.sh
	@echo ""
	@echo "$(GREEN)✓ Nuclei 下载完成$(NC)"

## list: 查看构建产物
list:
	@echo "$(GREEN)构建产物:$(NC)"
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"
	@if [ -d "$(BUILD_DIR)" ]; then \
		find $(BUILD_DIR) -type f -exec ls -lh {} \; 2>/dev/null | awk '{printf "  %s (%s)\n", $$9, $$5}'; \
	fi
	@if [ -d "$(FRONTEND_DIR)/dist" ]; then \
		echo "$(BLUE)前端构建:$(NC)"; \
		du -sh $(FRONTEND_DIR)/dist 2>/dev/null | awk '{printf "  ✓ dist/ (%s)\n", $$1}'; \
	fi
	@echo "$(BLUE)━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$(NC)"

## nuclei-compile-all: 交叉编译所有平台的 nuclei
nuclei-compile-all:
	@echo "$(GREEN)交叉编译所有平台的 nuclei...$(NC)"
	@echo ""
	@./scripts/build-nuclei-all.sh
	@echo ""
	@echo "$(GREEN)✓ nuclei 编译完成$(NC)"
	@echo ""
	@echo "$(YELLOW)下一步: 为每个平台构建应用${NC}"
