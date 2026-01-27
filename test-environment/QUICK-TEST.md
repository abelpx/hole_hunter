# Hole Hunter 快速测试指南

## 测试环境状态

✓ 测试容器已启动：
- DVWA: http://localhost:8080
- Juice Shop: http://localhost:3000
- Nginx 1.15.0: http://localhost:8082

## 测试步骤

### 1. 在 Hole Hunter 中添加目标

1. 启动 Hole Hunter 应用
2. 进入「目标管理」页面
3. 点击「添加目标」
4. 输入: `http://localhost:8080`
5. 保存

### 2. 创建扫描任务

1. 进入「扫描任务」页面
2. 点击「新建扫描」
3. 选择刚才添加的目标
4. 选择 PoC 模板（建议使用 HTTP 类型的模板）

### 3. 预期扫描结果

**DVWA (localhost:8080)** 可能检测到：
- SQL 注入
- XSS 跨站脚本
- CSRF 跨站请求伪造
- 弱密码
- 敏感文件泄露

**Nginx 1.15.0 (localhost:8082)** 可能检测到：
- 服务器版本信息泄露
- 已知 CVE 漏洞

### 4. 手动验证

你也可以直接在浏览器访问这些 URL 来验证：
- http://localhost:8080 - DVWA 登录页 (默认: admin/password)
- http://localhost:3000 - Juice Shop
- http://localhost:8082 - Nginx 测试页

## 常用命令

```bash
# 查看容器状态
cd test-environment && docker-compose ps

# 查看容器日志
docker-compose logs dvwa
docker-compose logs juice-shop

# 重启容器
docker-compose restart

# 停止测试环境
docker-compose down
```

## 测试完成后

停止测试环境以释放资源：
```bash
cd test-environment && docker-compose down
```
