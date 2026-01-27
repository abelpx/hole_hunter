# Hole Hunter 完整测试指南

## ⚠️ 重要：扫描功能需要 Nuclei

Hole Hunter 使用 [Nuclei](https://github.com/projectdiscovery/nuclei) 作为底层扫描引擎。

### 安装 Nuclei

#### Windows 安装方法

**方法 1：使用 Go 安装（推荐）**
```powershell
# 1. 确保已安装 Go (https://golang.org/dl/)
go version

# 2. 安装 Nuclei
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# 3. 确保 %USERPROFILE%\go\bin 在 PATH 中
# 或者设置环境变量 NUCLEI_PATH
$env:NUCLEI_PATH = "$env:USERPROFILE\go\bin\nuclei.exe"
```

**方法 2：下载预编译二进制文件**
```powershell
# 1. 访问 https://github.com/projectdiscovery/nuclei/releases
# 2. 下载 Windows amd64 版本的 nuclei_xxx_windows_amd64.zip
# 3. 解压到某个目录，例如 C:\Tools\nuclei.exe
# 4. 设置环境变量
$env:NUCLEI_PATH = "C:\Tools\nuclei.exe"

# 永久设置（管理员权限）
[Environment]::SetEnvironmentVariable("NUCLEI_PATH", "C:\Tools\nuclei.exe", "User")
```

**方法 3：使用 WSL2**
```bash
# 在 WSL2 中
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
export PATH=$PATH:~/go/bin
```

#### Linux/Mac 安装

```bash
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
export PATH=$PATH:$(go env GOPATH)/bin
```

### 验证安装

```bash
nuclei -version
# 应显示类似： nuclei v3.x.x
```

---

## 测试流程

### 第一步：启动测试环境

```bash
cd f:\program\goland\project\hole_hunter\test-environment
docker-compose up -d

# 等待容器启动完成
docker-compose ps
```

**预期结果：**
```
NAME                          STATUS          PORTS
hole_hunter_test_dvwa         Up 7 seconds    0.0.0.0:8080->80/tcp
hole_hunter_test_juice_shop   Up 7 seconds    0.0.0.0:3000->3000/tcp
hole_hunter_test_nginx        Up 7 seconds    0.0.0.0:8082->80/tcp
```

### 第二步：验证测试目标可访问

```bash
# 测试 DVWA
curl -I http://localhost:8080

# 测试 Juice Shop
curl -I http://localhost:3000

# 测试 Nginx
curl -I http://localhost:8082
```

**预期结果：** 所有目标返回 HTTP 200 或 302

### 第三步：使用 Nuclei 命令行测试

```bash
# 测试 Nginx 服务器版本检测
nuclei -u http://localhost:8082 -id exposure -json -silent | head -20

# 测试 DVWA（检测多个漏洞）
nuclei -u http://localhost:8080 -severity critical,high,medium -json -silent | head -20
```

**预期结果：** 应该检测到一些漏洞或信息

### 第四步：启动 Hole Hunter 应用

```bash
cd f:\program\goland\project\hole_hunter
wails dev
```

### 第五步：在 Hole Hunter 中测试

1. **添加目标**
   - 进入「目标管理」页面
   - 点击「添加目标」
   - 输入目标信息：
     - 名称：`DVWA 测试`
     - URL：`http://localhost:8080`
     - 描述：`Damn Vulnerable Web Application`
   - 保存

2. **创建扫描任务**
   - 进入「扫描任务」页面
   - 点击「新建扫描」
   - 填写信息：
     - 任务名称：`测试扫描 - DVWA`
     - 目标：选择刚创建的 DVWA 测试
     - 扫描策略：`快速扫描`（critical, high, medium）
   - 点击「创建」
   - 点击「启动」开始扫描

3. **观察扫描进度**
   - 扫描状态应从 `pending` → `running` → `completed`
   - 实时查看扫描进度和日志

4. **查看扫描结果**
   - 进入「漏洞列表」页面
   - 应能看到发现的漏洞
   - 点击任意漏洞查看详情

---

## 预期扫描结果

### DVWA (http://localhost:8080)

**可能检测到的漏洞类型：**
- ❌ **技术信息泄露** - 服务器版本、PHP 版本等
- ❌ **弱密码** - 默认 admin/password
- ❌ **XSS 跨站脚本** - 反射型和存储型 XSS
- ❌ **SQL 注入** - 多个 SQL 注入点
- ❌ **CSRF 跨站请求伪造**
- ❌ **敏感文件泄露** - .git、.env 等文件
- ❌ **点击劫持** - 缺少 X-Frame-Options

### Juice Shop (http://localhost:3000)

**可能检测到的漏洞类型：**
- ❌ **内容安全策略缺失**
- ❌ **X-Frame-Options 缺失**
- ❌ **多个 XSS 漏洞**
- ❌ **路径遍历**
- ❌ **不安全的直接对象引用**

### Nginx 1.15.0 (http://localhost:8082)

**可能检测到的漏洞类型：**
- ❌ **服务器版本信息泄露**
- ❌ **已知 CVE**（如果 Nuclei 有对应模板）

---

## 故障排查

### Nuclei 未找到

**错误：** `nuclei binary not found`

**解决方案：**
```powershell
# 检查 Nuclei 路径
$env:NUCLEI_PATH

# 如果为空，安装 Nuclei 或设置路径
$env:NUCLEI_PATH = "C:\path\to\nuclei.exe"
```

### 扫描失败

**错误：** `failed to start scan`

**可能原因：**
1. 目标不可访问
2. Nuclei 未正确安装
3. 端口被占用
4. Docker 容器未运行

**检查命令：**
```powershell
# 检查 Docker 容器
docker-compose ps

# 检查目标可访问性
curl http://localhost:8080

# 检查 Nuclei
nuclei -version
```

### 没有发现漏洞

**可能原因：**
1. 目标确实没有漏洞
2. Nuclei 模板未更新
3. 扫描策略过于严格

**解决方案：**
```bash
# 更新 Nuclei 模板
nuclei -update-templates

# 使用更宽松的策略
# 在 Hole Hunter 中选择「深度扫描」
```

---

## 清理测试环境

```bash
cd f:\program\goland\project\hole_hunter\test-environment
docker-compose down -v
```

---

## 下一步

测试通过后，你可以：
1. 添加更多自定义 PoC 模板
2. 测试其他目标
3. 配置定时扫描任务
4. 生成扫描报告
