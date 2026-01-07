# HoleHunter 产品需求文档 (PRD)

**版本**: v2.0
**最后更新**: 2025-01-07
**文档状态**: ✅ 完整版
**参考产品**: DudeSuite Web Security Tools
**项目状态**: ✅ 已完成，可投入使用

---

## 文档概述

本文档是 HoleHunter 项目的完整产品需求文档(PRD)，基于 DudeSuite Web Security Tools 的设计理念和功能架构，提供类似的渗透测试工具集功能。

---

## 目录

1. [产品概述](#1-产品概述)
2. [产品定位与差异化](#2-产品定位与差异化)
3. [用户角色与场景](#3-用户角色与场景)
4. [功能需求](#4-功能需求)
5. [技术架构](#5-技术架构)
6. [数据模型](#6-数据模型)
7. [界面设计](#7-界面设计)
8. [安全与性能](#8-安全与性能)
9. [部署方案](#9-部署方案)
10. [发布计划](#10-发布计划)

---

## 1. 产品概述

### 1.1 产品名称

**HoleHunter** - 基于 Nuclei 引擎的 Web 安全渗透测试工具集

### 1.2 产品标语

> "轻量化集成化的单兵渗透测试工具"

### 1.3 产品愿景

打造一款**轻量、集成、高效**的 Web 渗透测试工具集，让安全测试人员能够：
- 🎯 快速进行漏洞验证和复现
- 🔄 便捷的请求重放和爆破
- 🔍 指纹识别和漏洞扫描
- 🌐 流量劫持和抓包分析
- 🛠️ 集成常用安全工具插件
- 💻 本地化数据管理

### 1.4 核心价值

| 价值点 | 说明 |
|--------|------|
| **轻量化** | 无组件依赖，解压即可使用 |
| **集成化** | 多种渗透测试工具于一体 |
| **高效率** | 快速验证漏洞，提高测试效率 |
| **本地化** | 数据本地存储，保护隐私 |
| **开源化** | 基于 Nuclei 开源社区 |

---

## 2. 产品定位与差异化

### 2.1 市场定位

**目标用户群**:
- 🔰 红队安全测试人员
- 🏢 渗透测试工程师
- 🎓 漏洞研究员
- 💻 安全运维人员
- 🏫 攻防演练参与者

**使用场景**:
- Web 应用渗透测试
- 漏洞验证和复现
- 攻防演练实战
- 微信小程序渗透
- 安全合规检查
- 应急响应测试

### 2.2 与 DudeSuite 的对比

| 维度 | DudeSuite | HoleHunter | 差异程度 |
|------|-----------|------------|----------|
| **产品定位** | 轻量化集成化渗透测试工具集 | 轻量化集成化渗透测试工具集 | ✅ 完全一致 |
| **重放爆破** | HTTP/S 重放、各类型爆破 | HTTP/S 重放、各类型爆破 | ✅ 完全一致 |
| **漏洞验证** | POC/EXP 验证 | 基于 Nuclei POC 验证 | ✅ 功能一致 |
| **扫描功能** | 指纹扫描、漏洞扫描 | 指纹扫描、Nuclei 漏洞扫描 | ✅ 功能一致 |
| **流量劫持** | HTTPS/小程序抓包重放 | HTTPS/小程序抓包重放 | ✅ 功能一致 |
| **远程管理** | 反向 Shell 管理 | 反向 Shell 管理 | ✅ 功能一致 |
| **工具插件** | 编码解码、资产搜索、JWT、SQLMAP | 编码解码、资产搜索、JWT、Nuclei | ✅ 功能一致 |
| **技术栈** | 桌面应用 | Electron + React + Go | ⚠️ 实现方式不同 |
| **开源程度** | 闭源工具 | 完全开源 | ⚠️ 开源策略不同 |
| **价格** | 免费工具 | 免费开源 | ✅ 一致 |

### 2.3 核心功能模块（对标 DudeSuite）

#### 模块 1: 重放及爆破（对标 DudeSuite 核心功能）
- HTTP/S 流量数据包截获
- 数据包修改和重发
- 支持多种爆破攻击模式
- 响应对比和分析

#### 模块 2: 漏洞验证（对标 DudeSuite POC/EXP）
- POC 漏洞验证
- 快速验证最新漏洞
- 基于 Nuclei 模板库
- 自定义 POC 支持

#### 模块 3: 扫描功能（对标 DudeSuite 扫描）
- Web 指纹信息扫描
- CMS 识别
- 端口扫描
- 漏洞扫描

#### 模块 4: 流量劫持（对标 DudeSuite 流量劫持）
- HTTPS 数据包抓取
- 微信小程序数据包抓包及重放
- 中间人攻击配置
- 证书管理

#### 模块 5: 远程管理（对标 DudeSuite 远程管理）
- 反向 Shell 管理
- 文件管理
- 进程管理
- 屏幕截图

#### 模块 6: 工具插件（对标 DudeSuite 脚本三宝）
- 编码/解码工具
- 加密/破解工具
- JWT 解析和爆破
- 网络空间资产搜索
- 域名爆破
- SQLMAP 集成
- Nuclei 集成

---

## 3. 用户角色与场景

### 3.1 用户角色

#### 角色 1: 红队渗透测试人员
**特征**:
- 3-5 年渗透测试经验
- 熟悉各类攻击手法
- 需要快速验证漏洞
- 参与攻防演练

**需求**:
- 快速漏洞验证工具
- 便捷的请求重放
- 批量爆破功能
- 流量抓包分析

**痛点**:
- 工具分散，切换频繁
- 部分工具收费
- 操作复杂，学习成本高

**HoleHunter 解决方案**:
- 集成多种工具于一体
- 完全免费开源
- 界面简洁，操作直观

#### 角色 2: 安全运维人员
**特征**:
- 负责企业安全检查
- 定期漏洞扫描
- 应急响应处理

**需求**:
- 快速指纹识别
- 批量漏洞扫描
- 生成检测报告

**痛点**:
- 手工检查效率低
- 漏洞验证困难
- 缺乏自动化工具

**HoleHunter 解决方案**:
- 自动化指纹识别
- Nuclei 批量扫描
- 一键生成报告

#### 角色 3: 漏洞研究员
**特征**:
- 研究新漏洞
- 编写 POC 验证
- 复现漏洞场景

**需求**:
- POC 编写和测试
- 请求重放调试
- 流量分析工具

**痛点**:
- POC 测试环境搭建复杂
- 缺乏便捷的调试工具
- 流量抓包困难

**HoleHunter 解决方案**:
- 内置 POC 测试环境
- 强大的请求重放功能
- 流量劫持抓包

#### 角色 4: 安全学习爱好者
**特征**:
- 学习渗透测试
- 练习漏洞复现
- 参与漏洞挖掘

**需求**:
- 易上手的工具
- 完整的功能集
- 学习资源丰富

**痛点**:
- 工具配置复杂
- 缺乏系统学习路径
- 实战练习机会少

**HoleHunter 解决方案**:
- 开箱即用，无依赖
- 集成常用渗透工具
- 开源社区支持

### 3.2 典型使用场景

#### 场景 1: 快速漏洞验证（对标 DudeSuite POC 验证）

**背景**:
红队人员在攻防演练中发现某目标存在 CVE-2024-XXXX 漏洞，需要快速验证。

**流程**:
1. 在 HoleHunter 中添加目标 URL
2. 选择对应的 CVE POC 模板
3. 一键执行验证
4. 查看验证结果和响应
5. 导出验证报告

**价值**:
- 5 分钟内完成验证，提高效率
- 自动化执行，减少人为错误
- 结果可追溯，便于报告

#### 场景 2: 登录爆破（对标 DudeSuite 爆破功能）

**背景**:
测试某管理系统弱口令，需要批量尝试常见密码。

**流程**:
1. 抓取登录请求包
2. 标记爆破参数（用户名/密码）
3. 加载密码字典
4. 设置并发线程
5. 开始爆破，实时查看结果
6. 成功后保存凭据

**价值**:
- 自动化爆破，节省时间
- 支持多种编码格式
- 智能响应分析

#### 场景 3: 小程序渗透（对标 DudeSuite 小程序抓包）

**背景**:
某微信小程序存在越权漏洞，需要抓包分析。

**流程**:
1. 配置 HoleHunter 代理
2. 手机设置代理指向 HoleHunter
3. 打开微信小程序进行操作
4. HoleHunter 自动抓取流量
5. 分析请求，发现越权点
6. 重放请求，验证漏洞

**价值**:
- 解决小程序抓包难题
- 自动解密 HTTPS 流量
- 便捷的重放测试

#### 场景 4: 批量资产扫描（对标 DudeSuite 指纹扫描）

**背景**:
对一批企业资产进行指纹识别和漏洞扫描。

**流程**:
1. 导入资产列表（IP/域名）
2. 配置扫描参数（端口/指纹/漏洞）
3. 启动批量扫描
4. 实时查看扫描进度
5. 分析扫描结果
6. 导出资产报告

**价值**:
- 自动化批量处理
- 多维度资产分析
- 快速发现风险

---

## 4. 功能需求

### 4.1 模块 1: 重放及爆破（Replay & Brute Force）

#### 4.1.1 HTTP 请求重放

**功能描述**:
支持 HTTP/HTTPS 请求的捕获、修改和重放。

**详细规格**:

**请求捕获**:
- 支持代理模式捕获请求
- 支持手动粘贴请求
- 支持从文件导入请求
- 支持浏览器插件直接发送

**请求编辑**:
- 可视化编辑请求行（Method/URL/Version）
- 编辑请求头（支持添加/删除/修改）
- 编辑请求体（支持多种格式：JSON/Form/Multipart）
- 自动 Content-Length 计算
- 支持请求模板保存

**请求发送**:
- 单次发送
- 批量发送（从文件读取多个请求）
- 定时发送（延迟发送）
- 并发发送（多线程）

**响应查看**:
- 响应状态码高亮
- 响应头查看
- 响应体格式化（JSON/HTML/XML）
- 响应时间统计
- 响应大小统计
- 响应历史记录

**响应对比**:
- 支持两次响应的 diff 对比
- 高亮显示差异部分
- Side-by-side 对比视图

#### 4.1.2 爆破功能（Brute Force）

**功能描述**:
支持多种类型的爆破攻击。

**爆破类型**:

1. **单参数爆破**
   - 选择一个参数进行爆破
   - 支持字典文件
   - 支持数字递增
   - 支持字符集遍历
   - 支持日期时间递增

2. **多参数爆破**
   - 支持多个参数同时爆破
   - 支持 payload 组合（pitchfork）
   - 支持 payload 乘积（cluster bomb）
   - 支持自定义组合规则

3. **字典爆破**
   - 加载外部字典文件
   - 内置常见密码字典
   - 支持字典变形（规则引擎）
   - 支持字典去重

4. **模式爆破**
   - 数字模式：{1-100}
   - 字符模式：{a-z}{0-9}
   - 日期模式：{2024-01-01}{2024-12-31}
   - 自定义正则模式

**爆破设置**:
- 并发线程数（1-100）
- 请求超时时间
- 重试次数
- 延迟设置（避免被封）
- User-Agent 轮换
- 代理轮换

**响应分析**:
- 关键字匹配（成功/失败标识）
- 状态码过滤
- 响应长度过滤
- 响应时间过滤
- 正则表达式匹配

**结果保存**:
- 保存成功的请求
- 导出爆破日志
- 生成爆破报告

### 4.2 模块 2: 漏洞验证（Vulnerability Verify）

#### 4.2.1 POC 验证

**功能描述**:
基于 Nuclei 模板的 POC 漏洞验证。

**POC 管理**:
- 显示所有可用 POC
- 按 CVE ID、严重程度、类型分类
- POC 搜索功能
- POC 收藏功能
- 自定义 POC 导入

**POC 执行**:
- 单目标单 POC 验证
- 单目标多 POC 验证
- 多目标单 POC 验证
- 多目标多 POC 批量验证

**POC 结果**:
- 漏洞存在/不存在状态
- 漏洞详细信息
- 请求响应示例
- 修复建议
- 漏洞参考链接

**POC 编辑**:
- YAML 格式编辑器
- 语法高亮
- POC 测试功能
- POC 导出

#### 4.2.2 快速验证

**功能描述**:
针对最新爆发的 CVE 进行快速验证。

**功能特性**:
- 显示最新 CVE 列表
- 一键验证单个 CVE
- 批量验证多个 CVE
- CVE 详情查看
- 验证历史记录

### 4.3 模块 3: 扫描功能（Scanner）

#### 4.3.1 指纹扫描

**功能描述**:
识别 Web 应用、框架、CMS、中间件等信息。

**指纹类型**:
- Web 框架（ThinkPHP/Struts2/Spring 等）
- CMS 系统（WordPress/DedeCMS/Discuz 等）
- 中间件（Nginx/Apache/IIS/Tomcat 等）
- 前端框架（React/Vue/Angular 等）
- CDN（Cloudflare/CloudFront 等）
- WAF（宝塔/安全狗等）

**扫描方式**:
- 单个目标扫描
- 批量目标扫描
- 端口扫描（常用 Web 端口）
- 子域名扫描

**结果展示**:
- 指纹名称和版本
- 指纹类别
- 置信度
- 发现位置（Header/Cookie/Body）

#### 4.3.2 端口扫描

**功能描述**:
扫描目标开放的端口和服务。

**扫描参数**:
- 常用端口（Top 100/Top 1000）
- 自定义端口范围
- 全端口扫描（1-65535）
- 扫描速度设置

**结果展示**:
- 开放端口列表
- 服务识别
- Banner 信息
- 端口状态（Open/Closed/Filtered）

#### 4.3.3 漏洞扫描

**功能描述**:
基于 Nuclei 引擎进行漏洞扫描。

**扫描策略**:
- 快速扫描（高危漏洞）
- 深度扫描（全部漏洞）
- CVE 扫描（已知 CVE）
- 配置错误扫描
- 信息泄露扫描
- 未授权访问扫描
- 自定义模板扫描

**扫描设置**:
- 目标配置（URL/IP）
- 模板选择
- 并发数量
- 超时时间
- 扫描深度
- 排除模板

**扫描结果**:
- 漏洞列表
- 按严重程度分类
- 漏洞详情
- 请求响应
- 修复建议

### 4.4 模块 4: 流量劫持（Traffic Hijack）

#### 4.4.1 代理配置

**功能描述**:
配置 HTTP/HTTPS 代理进行流量拦截。

**代理设置**:
- 监听端口（默认 8080）
- 监听地址（0.0.0.0 / 127.0.0.1）
- 透明代理模式
- 上游代理配置（链式代理）

**HTTPS 解密**:
- 自动生成 CA 证书
- CA 证书导出
- 证书安装指引
- 域名白名单（不解密）

#### 4.4.2 流量拦截

**功能描述**:
拦截并显示经过代理的流量。

**流量显示**:
- 请求列表（URL/Method/Status/Time）
- 请求详情
- 响应详情
- 搜索和过滤
- 标记和备注

**流量操作**:
- 发送到重放模块
- 发送到爆破模块
- 发送到 POC 验证
- 保存到文件
- 删除流量

#### 4.4.3 小程序抓包

**功能描述**:
专门针对微信小程序的流量抓包。

**功能特性**:
- 自动识别小程序流量
- 解密小程序加密参数
- 显示小程序 API 调用
- 支持请求重放
- 支持参数修改

**配置说明**:
- 手机配置代理
- 安装 CA 证书
- 打开微信小程序
- 自动抓取流量

### 4.5 模块 5: 远程管理（Remote Management）

#### 4.5.1 反向 Shell

**功能描述**:
管理反向连接的 Shell。

**Shell 管理**:
- 生成 Shell 代码（多种语言）
- 显示在线 Shell 列表
- Shell 交互终端
- 文件上传下载
- 屏幕截图
- 进程管理
- 键盘记录

#### 4.5.2 文件管理

**功能描述**:
远程文件系统管理。

**文件操作**:
- 浏览文件目录
- 上传文件
- 下载文件
- 删除文件
- 重命名文件
- 编辑文件
- 文件搜索

#### 4.5.3 进程管理

**功能描述**:
远程进程管理。

**进程操作**:
- 列出所有进程
- 结束进程
- 启动进程
- 进程信息查看

### 4.6 模块 6: 工具插件（Tools & Plugins）

#### 4.6.1 编码/解码工具

**支持格式**:
- Base64 编码/解码
- URL 编码/解码
- HTML 编码/解码
- Hex 编码/解码
- Unicode 编码/解码
- MD5 哈希
- SHA 哈希（1/256/512）
- AES 加密/解密
- RSA 加密/解密

#### 4.6.2 JWT 工具

**功能特性**:
- JWT 解析
- JWT 生成
- JWT 签名验证
- JWT 爆破（密钥爆破）
- 常见密钥字典

#### 4.6.3 资产搜索

**功能描述**:
搜索网络空间资产。

**搜索引擎**:
- FOFA 集成
- Hunter 集成
- Quake 集成
- ZoomEye 集成

**搜索语法**:
- 支持各引擎语法
- 常用搜索模板
- 搜索结果保存

#### 4.6.4 域名爆破

**功能描述**:
子域名暴力破解。

**爆破模式**:
- 字典爆破
- 字典生成
- API 接口查询
- 证书透明度查询

#### 4.6.5 SQLMAP 集成

**功能描述**:
集成 SQLMAP 进行 SQL 注入测试。

**功能特性**:
- 一键调用 SQLMAP
- 自动检测注入点
- 支持所有 SQLMAP 参数
- 结果展示

#### 4.6.6 Nuclei 集成

**功能描述**:
集成 Nuclei 进行漏洞扫描。

**功能特性**:
- Nuclei 版本检测
- 模板更新
- 扫描任务管理
- 结果展示和导出

---

## 5. 技术架构

### 5.1 整体架构

```
┌────────────────────────────────────────────────────────────┐
│                    HoleHunter 客户端                        │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 重放及爆破   │  │ 漏洞验证     │  │ 扫描功能     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 流量劫持     │  │ 远程管理     │  │ 工具插件     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Electron 主进程 + 渲染进程                  │  │
│  └──────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Nuclei 引擎  │  │ HTTP 代理    │  │ SQLite 数据库│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────────────────────────────┘
```

### 5.2 技术栈

#### 桌面版

| 层级 | 技术选择 | 说明 |
|------|---------|------|
| **桌面框架** | Electron 28+ | 跨平台桌面应用 |
| **前端框架** | React 18.2 | UI 框架 |
| **类型系统** | TypeScript 5.3+ | 类型安全 |
| **状态管理** | Zustand 4.4+ | 轻量状态管理 |
| **UI 组件** | Ant Design 5.x | 企业级 UI 组件 |
| **样式方案** | Tailwind CSS 3.4+ | 工具类 CSS |
| **构建工具** | Vite 5+ | 快速构建 |
| **数据库** | SQLite (better-sqlite3) | 本地数据库 |
| **扫描引擎** | Nuclei 3.0+ | 漏洞扫描 |
| **代理服务** | http-proxy-middleware | HTTP 代理 |
| **加密库** | crypto-js | 加密解密 |

#### 服务版（可选）

| 层级 | 技术选择 | 说明 |
|------|---------|------|
| **后端语言** | Go 1.21+ | 高性能后端 |
| **Web 框架** | Gin 1.9+ | HTTP 框架 |
| **数据库** | MySQL 8.0+ / PostgreSQL 14+ | 关系数据库 |
| **ORM** | GORM | 数据库 ORM |
| **扫描引擎** | Nuclei 3.0+ | 漏洞扫描 |

### 5.3 架构设计原则

1. **模块化设计**: 各功能模块独立，低耦合
2. **插件化架构**: 工具插件可扩展
3. **本地优先**: 数据本地存储，保护隐私
4. **离线可用**: 核心功能支持离线使用
5. **跨平台**: 支持 Windows/macOS/Linux

---

## 6. 数据模型

### 6.1 数据库表设计

#### 表 1: targets（目标管理）

```sql
CREATE TABLE targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    type VARCHAR(50) DEFAULT 'web',
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_targets_url ON targets(url);
CREATE INDEX idx_targets_tags ON targets(tags);
```

#### 表 2: requests（请求记录）

```sql
CREATE TABLE requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER,
    method VARCHAR(10) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    headers TEXT,
    body TEXT,
    response_status INTEGER,
    response_headers TEXT,
    response_body TEXT,
    response_time INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_id) REFERENCES targets(id)
);

CREATE INDEX idx_requests_target ON requests(target_id);
CREATE INDEX idx_requests_method ON requests(method);
CREATE INDEX idx_requests_created ON requests(created_at);
```

#### 表 3: brute_tasks（爆破任务）

```sql
CREATE TABLE brute_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    target_id INTEGER,
    request_template TEXT,
    payload_config TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    total_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_id) REFERENCES targets(id)
);
```

#### 表 4: brute_results（爆破结果）

```sql
CREATE TABLE brute_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    payload TEXT,
    response_status INTEGER,
    response_length INTEGER,
    response_time INTEGER,
    is_success BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES brute_tasks(id)
);

CREATE INDEX idx_brute_results_task ON brute_results(task_id);
CREATE INDEX idx_brute_results_success ON brute_results(is_success);
```

#### 表 5: vuln_scans（漏洞扫描）

```sql
CREATE TABLE vuln_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    target_id INTEGER,
    templates TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_id) REFERENCES targets(id)
);
```

#### 表 6: vulns（漏洞结果）

```sql
CREATE TABLE vulns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER,
    target_id INTEGER,
    template_id VARCHAR(255),
    severity VARCHAR(50),
    name VARCHAR(255),
    description TEXT,
    url VARCHAR(2048),
    request TEXT,
    response TEXT,
    matched_at VARCHAR(255),
    false_positive BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES vuln_scans(id),
    FOREIGN KEY (target_id) REFERENCES targets(id)
);

CREATE INDEX idx_vulns_scan ON vulns(scan_id);
CREATE INDEX idx_vulns_severity ON vulns(severity);
CREATE INDEX idx_vulns_false_positive ON vulns(false_positive);
```

#### 表 7: fingerprints（指纹信息）

```sql
CREATE TABLE fingerprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    version VARCHAR(100),
    confidence INTEGER DEFAULT 0,
    location VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_id) REFERENCES targets(id),
    UNIQUE(target_id, name, category)
);

CREATE INDEX idx_fingerprints_target ON fingerprints(target_id);
CREATE INDEX idx_fingerprints_category ON fingerprints(category);
```

#### 表 8: configs（配置）

```sql
CREATE TABLE configs (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. 界面设计

### 7.1 设计原则

参考 DudeSuite 的界面设计理念：
- **简洁直观**: 功能模块清晰，操作简单
- **高效便捷**: 常用功能一键访问
- **专业实用**: 面向专业人员，不花哨

### 7.2 主界面布局

```
┌────────────────────────────────────────────────────────────┐
│  HoleHunter          文件  工具  帮助          [设置]     │
├──────────┬─────────────────────────────────────────────────┤
│          │                                                 │
│ 功能列表 │              工作区                             │
│          │                                                 │
│ 📂 重放  │  ┌──────────────────────────────────────────┐  │
│   ├ 请求 │  │                                          │  │
│   ├ 重放 │  │           当前功能的内容展示区            │  │
│   └ 历史 │  │                                          │  │
│          │  │                                          │  │
│ 💣 爆破  │  │                                          │  │
│   ├ 任务 │  │                                          │  │
│   └ 字典 │  └──────────────────────────────────────────┘  │
│          │                                                 │
│ 🔍 验证  │  ┌──────────────────────────────────────────┐  │
│   ├ POC │  │           日志/结果输出区                 │  │
│   └ CVE │  └──────────────────────────────────────────┘  │
│          │                                                 │
│ 🌐 扫描  │                                                 │
│   ├ 指纹 │                                                 │
│   ├ 端口 │                                                 │
│   └ 漏洞 │                                                 │
│          │                                                 │
│ 🎣 代理  │                                                 │
│          │                                                 │
│ 🛠️ 工具  │                                                 │
│          │                                                 │
└──────────┴─────────────────────────────────────────────────┘
```

### 7.3 功能模块界面

#### 重放及爆破界面

**请求重放**:
- 上部：请求编辑区（Method/URL/Headers/Body）
- 下部：响应显示区（Status/Headers/Body）
- 右侧：请求历史

**爆破攻击**:
- 上部：爆破配置（目标位置/字典/设置）
- 中部：进度显示（成功/失败/进度条）
- 下部：结果显示（成功的请求）

#### 漏洞验证界面

**POC 验证**:
- 左侧：POC 列表（分类/搜索）
- 右侧：验证配置和结果

**快速验证**:
- 上部：目标输入
- 中部：最新 CVE 列表
- 下部：验证结果

#### 扫描功能界面

**指纹扫描**:
- 上部：目标输入
- 中部：扫描进度
- 下部：指纹结果列表

**漏洞扫描**:
- 上部：目标和模板选择
- 中部：扫描进度和统计
- 下部：漏洞列表

#### 流量劫持界面

**代理配置**:
- 代理端口设置
- HTTPS 解密配置
- CA 证书管理

**流量拦截**:
- 流量列表（类似浏览器 DevTools）
- 请求响应详情
- 标记和搜索

#### 工具插件界面

**编码/解码**:
- 输入框
- 编码/解码选择
- 输出框

**JWT 工具**:
- JWT 输入
- 解析结果显示
- 密钥爆破

---

## 8. 安全与性能

### 8.1 安全措施

1. **本地数据存储**: 所有数据存储在本地，不上传云端
2. **CA 证书管理**: 自动生成和管理 CA 证书
3. **敏感信息保护**: 密码等敏感信息加密存储
4. **权限最小化**: 仅请求必要的系统权限
5. **代码签名**: 发布版本进行代码签名

### 8.2 性能要求

1. **启动时间**: < 3 秒
2. **请求响应**: < 100ms（本地操作）
3. **扫描性能**: 支持 100+ 并发
4. **内存占用**: < 500MB（空闲）
5. **CPU 占用**: < 10%（空闲）

---

## 9. 部署方案

### 9.1 桌面版

#### Windows
- **格式**: NSIS 安装包 / Portable ZIP
- **依赖**: 无（内置 Nuclei）
- **安装**: 解压即可使用

#### macOS
- **格式**: DMG 镜像
- **依赖**: 无
- **安装**: 拖拽到应用程序

#### Linux
- **格式**: AppImage / DEB / RPM
- **依赖**: 无
- **安装**: 直接运行 / 包管理器安装

### 9.2 版本管理

- **版本号**: v主版本.次版本.修订号 (v1.0.0)
- **更新策略**:
  - 主版本：重大功能变更
  - 次版本：新增功能
  - 修订号：Bug 修复

---

## 10. 发布计划

### 10.1 版本路线图

#### v1.0.0 - MVP 版本
**时间**: 2025 Q1
**功能**:
- ✅ 基础框架搭建
- ✅ 重放及爆破模块
- ✅ 漏洞验证模块（基础 POC）
- ✅ 指纹扫描
- ✅ 编码/解码工具

#### v1.1.0 - 功能增强
**时间**: 2025 Q2
**功能**:
- ✅ 流量劫持模块
- ✅ 端口扫描
- ✅ JWT 工具
- ✅ 资产搜索集成
- ✅ 域名爆破

#### v1.2.0 - 高级功能
**时间**: 2025 Q3
**功能**:
- ✅ 远程管理模块
- ✅ SQLMAP 集成
- ✅ 小程序抓包优化
- ✅ 报告导出功能

#### v2.0.0 - 企业版
**时间**: 2025 Q4
**功能**:
- ✅ 团队协作
- ✅ 云端同步（可选）
- ✅ API 接口
- ✅ 权限管理

### 10.2 里程碑

| 里程碑 | 目标 | 时间 |
|--------|------|------|
| M1 | 项目启动 | 2025-01 |
| M2 | MVP 发布 | 2025-03 |
| M3 | 功能完善 | 2025-06 |
| M4 | 正式版发布 | 2025-09 |
| M5 | 企业版发布 | 2025-12 |

---

## 附录

### A. 参考资料

- [DudeSuite GitHub](https://github.com/x364e3ab6/DudeSuite)
- [Nuclei 官方文档](https://docs.projectdiscovery.io/nuclei/)
- [渗透测试最佳实践](https://www.owasp.org/)

### B. 术语表

| 术语 | 说明 |
|------|------|
| POC | Proof of Concept，概念验证 |
| EXP | Exploit，漏洞利用代码 |
| CVE | Common Vulnerabilities and Exposures，通用漏洞披露 |
| JWT | JSON Web Token，JSON Web 令牌 |

### C. 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v2.0 | 2025-01-07 | 基于 DudeSuite 重新设计 PRD | HoleHunter Team |
| v1.0 | 2025-01-05 | 初始版本 | HoleHunter Team |

---

**文档结束**

如有疑问或建议，请联系：[GitHub Issues](https://github.com/yourusername/hole_hunter/issues)

---

## Sources

- [DudeSuite Web Security Tools - GitHub](https://github.com/x364e3ab6/DudeSuite)
- [DudeSuite智能安全测试平台介绍 - 隐侠安全客栈](https://www.dfyxsec.com/2025/05/18/dudesuite智能安全测试平台介绍/)
- [DudeSuite Web Security Tools 渗透测试工具集 - CSDN](https://blog.csdn.net/persist213/article/details/142623337)
- [红队单兵渗透工具-DudeSuite - W3xue](https://www.w3xue.com/exp/article/20253/90971.html)
- [一键解锁攻防演练小程序渗透新姿势 - CN-SEC](https://cn-sec.com/archives/3934904.html)
