# HoleHunter Backend Dockerfile
# 多阶段构建以优化镜像大小

# Stage 1: Build stage
FROM golang:1.21-alpine AS builder

# 安装必要的系统包
RUN apk add --no-cache git make gcc musl-dev

# 设置工作目录
WORKDIR /app

# 复制 go mod 文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o holehunter ./cmd/server

# Stage 2: Runtime stage
FROM alpine:latest

# 安装必要的运行时依赖
RUN apk add --no-cache \
    ca-certificates \
    sqlite \
    curl \
    nuclei \
    && update-ca-certificates

# 创建非 root 用户
RUN addgroup -g 1000 holehunter && \
    adduser -D -u 1000 -G holehunter holehunter

# 设置工作目录
WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /app/holehunter .

# 创建数据目录
RUN mkdir -p /app/data && \
    chown -R holehunter:holehunter /app

# 切换到非 root 用户
USER holehunter

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/health || exit 1

# 设置环境变量
ENV HOLEHUNTER_SERVER_PORT=8080
ENV HOLEHUNTER_DB_PATH=/app/data/holehunter.db
ENV HOLEHUNTER_LOG_LEVEL=info

# 运行应用
CMD ["./holehunter"]
