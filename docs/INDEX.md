# HoleHunter 文档索引

## 📚 核心文档

### 1. [README.md](../README.md) - 项目主文档
**用途**: 项目介绍、快速开始指南
**内容**:
- 项目简介和核心特性
- 快速开始指南
- 技术栈说明
- 使用指南
- 贡献指南

### 2. [COMPLETE_PRD.md](./COMPLETE_PRD.md) - 完整产品需求文档
**版本**: v2.0
**参考产品**: DudeSuite Web Security Tools
**大小**: 56KB (1154行)
**内容**:
- **产品概述**: 轻量化集成化渗透测试工具集
- **产品定位**: 对标 DudeSuite，面向红队和渗透测试人员
- **用户角色**: 4种典型用户角色和场景
- **功能需求**: 6大核心模块
  - 模块 1: 重放及爆破（HTTP请求重放、多种爆破攻击）
  - 模块 2: 漏洞验证（POC验证、CVE快速验证）
  - 模块 3: 扫描功能（指纹扫描、端口扫描、漏洞扫描）
  - 模块 4: 流量劫持（代理配置、流量拦截、小程序抓包）
  - 模块 5: 远程管理（反向Shell、文件管理、进程管理）
  - 模块 6: 工具插件（编码解码、JWT、资产搜索、SQLMAP、Nuclei）
- **技术架构**: Electron + React + Go
- **数据模型**: 8张表的完整Schema
- **界面设计**: 简洁直观的专业界面
- **安全与性能**: 本地存储、性能要求
- **部署方案**: 桌面版打包方案
- **发布计划**: v1.0到v2.0路线图

### 3. [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) - 构建和部署指南
**用途**: 桌面版打包、服务版部署
**大小**: 8.6KB
**内容**:
- 桌面版打包（macOS/Windows/Linux）
- 服务版部署（Docker/Systemd/手动）
- 环境变量配置
- Nginx反向代理配置
- 故障排查指南
- 性能优化建议

### 4. [UI_FUNCTIONALITY_TEST.md](./UI_FUNCTIONALITY_TEST.md) - UI功能测试指南
**用途**: 功能测试步骤、已知问题解决方案
**大小**: 13KB
**内容**:
- 5大功能模块测试清单
- 数据流测试
- TypeScript错误修复方案
- 性能测试场景
- 用户流程测试
- 已知限制和解决方案

---

## 📖 文档使用指南

### 新手入门
1. 阅读 [README.md](../README.md) 了解项目
2. 按照 [README.md](../README.md) 快速开始章节搭建环境
3. 参考 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 了解产品功能

### 产品经理/设计师
1. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第1-2章：产品概述和定位
2. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第3章：用户角色与场景
3. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第4章：6大功能模块详细规格
4. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第7章：界面设计

### 前端开发者
1. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第5章：技术架构
2. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第4章：功能需求（6大模块）
3. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第7章：界面设计
4. 参考 [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) 进行打包

### 后端开发者
1. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第5章：技术架构
2. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第6章：数据模型
3. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第4章：功能需求（各模块详细规格）
4. 参考 [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) 进行部署

### 渗透测试人员
1. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第1-3章：产品概述和用户场景
2. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第4章：6大功能模块
   - 重放及爆破：HTTP重放、爆破攻击
   - 漏洞验证：POC验证、CVE验证
   - 扫描功能：指纹、端口、漏洞扫描
   - 流量劫持：代理抓包、小程序抓包
   - 远程管理：Shell管理、文件管理
   - 工具插件：编码解码、JWT、资产搜索
3. 参考 [README.md](../README.md) 快速开始使用

### DevOps/运维
1. 查看 [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) 完整部署流程
2. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第8章：安全与性能
3. 参考 [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) 故障排查部分

### QA/测试工程师
1. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第4章：功能需求（测试基准）
2. 查看 [UI_FUNCTIONALITY_TEST.md](./UI_FUNCTIONALITY_TEST.md) 完整测试流程

---

## 🎯 产品定位说明

HoleHunter v2.0 基于 **DudeSuite Web Security Tools** 设计，提供类似的功能：

| 功能模块 | DudeSuite | HoleHunter | 对标程度 |
|---------|-----------|------------|----------|
| 重放及爆破 | ✅ | ✅ | 100% |
| 漏洞验证 | ✅ | ✅ | 100% |
| 扫描功能 | ✅ | ✅ | 100% |
| 流量劫持 | ✅ | ✅ | 100% |
| 远程管理 | ✅ | ✅ | 100% |
| 工具插件 | ✅ | ✅ | 100% |

**核心差异**:
- **技术实现**: Electron + React + Go（开源技术栈）
- **开源策略**: 完全开源 vs 闭源
- **扫描引擎**: Nuclei（社区活跃）

---

## 🗂️ 文档维护

### 文档更新原则
- 每个维度只保留一份核心文档
- 删除临时的、说明性的、冗余的文档
- 优先更新核心文档，而非创建新文档

### 保留的核心文档
- ✅ README.md - 项目主文档
- ✅ COMPLETE_PRD.md - 产品需求文档（v2.0，基于DudeSuite）
- ✅ BUILD_AND_DEPLOYMENT.md - 构建部署文档
- ✅ UI_FUNCTIONALITY_TEST.md - 功能测试文档
- ✅ INDEX.md - 文档索引导航

---

**最后更新**: 2025-01-07
**文档版本**: v2.0
**参考产品**: DudeSuite Web Security Tools
