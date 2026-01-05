#!/bin/bash
# HoleHunter Backend 安装脚本
# 支持 Linux 系统

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要 root 权限运行"
        exit 1
    fi
}

# 检测系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        log_error "无法检测操作系统"
        exit 1
    fi

    log_info "检测到操作系统: $OS $VERSION"
}

# 安装依赖
install_dependencies() {
    log_info "安装系统依赖..."

    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get install -y \
                wget \
                curl \
                sqlite3 \
                gcc \
                musl-dev \
                || log_error "安装依赖失败"
            ;;
        centos|rhel|fedora)
            yum install -y \
                wget \
                curl \
                sqlite \
                gcc \
                musl-devel \
                || log_error "安装依赖失败"
            ;;
        alpine)
            apk add --no-cache \
                wget \
                curl \
                sqlite \
                gcc \
                musl-dev \
                || log_error "安装依赖失败"
            ;;
        *)
            log_warn "未知的操作系统: $OS"
            ;;
    esac
}

# 安装 Nuclei
install_nuclei() {
    log_info "检查 Nuclei 安装..."

    if command -v nuclei &> /dev/null; then
        log_info "Nuclei 已安装: $(nuclei -version)"
        return
    fi

    log_info "安装 Nuclei..."
    go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest || \
    log_warn "Go 安装失败，尝试直接下载..."

    # 备选方案: 直接下载二进制
    ARCH=$(uname -m)
    case $ARCH in
        x86_64)
            NUCLEI_ARCH="amd64"
            ;;
        aarch64)
            NUCLEI_ARCH="arm64"
            ;;
        *)
            log_error "不支持的架构: $ARCH"
            exit 1
            ;;
    esac

    NUCLEI_VERSION="3.0.0"
    wget -O /tmp/nuclei.zip \
        "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_linux_${NUCLEI_ARCH}.zip" || \
    log_error "下载 Nuclei 失败"

    unzip /tmp/nuclei.zip -d /tmp/
    mv /tmp/nuclei /usr/local/bin/
    chmod +x /usr/local/bin/nuclei
    rm /tmp/nuclei.zip

    log_info "Nuclei 安装完成: $(nuclei -version)"
}

# 创建用户和目录
setup_user() {
    log_info "创建 HoleHunter 用户..."

    id -u holehunter &>/dev/null || \
        useradd -r -s /bin/false -d /var/lib/holehunter holehunter

    mkdir -p /opt/holehunter/bin
    mkdir -p /var/lib/holehunter
    mkdir -p /var/log/holehunter
    mkdir -p /var/run/holehunter

    chown -R holehunter:holehunter /opt/holehunter
    chown -R holehunter:holehunter /var/lib/holehunter
    chown -R holehunter:holehunter /var/log/holehunter
    chown -R holehunter:holehunter /var/run/holehunter
}

# 安装应用二进制
install_app() {
    log_info "安装 HoleHunter 应用..."

    BUILD_DIR="$(dirname "$0")/../../.."
    BINARY="$BUILD_DIR/holehunter"

    if [ ! -f "$BINARY" ]; then
        log_error "找不到二进制文件: $BINARY"
        log_info "请先运行: go build -o holehunter ./cmd/server"
        exit 1
    fi

    cp "$BINARY" /opt/holehunter/bin/
    chmod +x /opt/holehunter/bin/holehunter

    # 安装 systemd 服务
    cp "$(dirname "$0")/systemd/holehunter.service" /etc/systemd/system/
    systemctl daemon-reload

    log_info "应用安装完成"
}

# 配置防火墙
setup_firewall() {
    log_info "配置防火墙..."

    case $OS in
        ubuntu|debian)
            if command -v ufw &> /dev/null; then
                ufw allow 8080/tcp
                log_info "UFW 防火墙规则已添加"
            fi
            ;;
        centos|rhel|fedora)
            if command -v firewall-cmd &> /dev/null; then
                firewall-cmd --permanent --add-port=8080/tcp
                firewall-cmd --reload
                log_info "firewalld 防火墙规则已添加"
            fi
            ;;
        *)
            log_warn "跳过防火墙配置"
            ;;
    esac
}

# 启动服务
start_service() {
    log_info "启动 HoleHunter 服务..."

    systemctl enable holehunter
    systemctl start holehunter

    # 等待服务启动
    sleep 2

    if systemctl is-active --quiet holehunter; then
        log_info "HoleHunter 服务启动成功"
        systemctl status holehunter --no-pager
    else
        log_error "HoleHunter 服务启动失败"
        journalctl -u holehunter -n 20 --no-pager
        exit 1
    fi
}

# 主函数
main() {
    log_info "开始安装 HoleHunter Backend..."

    check_root
    detect_os
    install_dependencies
    install_nuclei
    setup_user
    install_app
    setup_firewall
    start_service

    log_info "============================================"
    log_info "HoleHunter Backend 安装完成！"
    log_info "============================================"
    log_info "服务状态: systemctl status holehunter"
    log_info "查看日志: journalctl -u holehunter -f"
    log_info "API 地址: http://localhost:8080"
    log_info "健康检查: curl http://localhost:8080/api/v1/health"
    log_info "============================================"
}

# 运行主函数
main "$@"
