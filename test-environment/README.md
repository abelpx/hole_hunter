# Hole Hunter 测试环境

这个目录包含用于测试 Hole Hunter 漏洞扫描器的易受攻击的应用程序。

## 包含的测试应用

| 服务 | 端口 | 描述 |
|------|------|------|
| DVWA | 8080 | Damn Vulnerable Web Application - PHP 漏洞应用 |
| Juice Shop | 3000 | OWASP Juice Shop - Node.js 漏洞应用 |
| WebGoat | 8081 | Java Web 应用漏洞训练平台 |
| Nginx (旧版) | 8082 | Nginx 1.15.0 (包含已知 CVE) |
| WordPress | 8083 | WordPress 4.9 (已知漏洞版本) |
| Heartbleed Test | 8084 | OpenSSL Heartbleed 漏洞测试 |

## 使用方法

### 1. 启动测试环境

```bash
# 使用 Docker Desktop
docker-compose up -d

# 或者使用 WSL2
wsl docker-compose up -d
```

### 2. 查看服务状态

```bash
docker-compose ps
```

### 3. 测试 URL

启动后，可以访问以下 URL 进行测试：

- http://localhost:8080 - DVWA
- http://localhost:3000 - Juice Shop
- http://localhost:8081 - WebGoat
- http://localhost:8082 - Nginx
- http://localhost:8083 - WordPress
- http://localhost:8084 - Heartbleed Test

### 4. 在 Hole Hunter 中测试

1. 启动 Hole Hunter 应用
2. 添加目标：`http://localhost:8080`
3. 创建扫描任务
4. 选择合适的 PoC 模板
5. 运行扫描

### 5. 停止测试环境

```bash
docker-compose down
```

### 6. 完全清理（包括数据卷）

```bash
docker-compose down -v
```

## 预期扫描结果

### DVWA (http://localhost:8080)
- SQL 注入漏洞
- XSS 跨站脚本
- CSRF 跨站请求伪造
- 文件包含漏洞
- 弱密码

### Juice Shop (http://localhost:3000)
- 多种 XSS 漏洞
- SQL 注入
- 路径遍历
- 不安全的直接对象引用

### WordPress 4.9 (http://localhost:8083)
- 已知的 CVE 漏洞
- XML-RPC 暴力破解
- 潜在的插件漏洞

## 注意事项

1. 这些应用**仅供测试使用**，不要在生产环境运行
2. 部分应用需要初始配置（如 DVWA）
3. 确保防火墙允许这些端口访问
4. 测试完成后记得停止容器

## WSL2 用户

如果你使用 WSL2，可能需要以下额外步骤：

```bash
# 在 PowerShell 中，允许 WSL 访问 Docker
# 确保 Docker Desktop 的 WSL2 集成已启用

# 在 WSL 中
export DISPLAY=:0
docker-compose up -d
```
