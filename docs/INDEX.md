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
**用途**: 产品规格、技术架构、功能需求
**大小**: 56KB (2088行)
**内容**:
- 产品概述与定位
- 用户角色与场景
- 功能需求（5大模块）
- 技术架构（桌面版+服务版）
- 数据模型（6张表的完整Schema）
- API规格（REST + IPC）
- UI/UX设计规范
- 安全与性能要求
- 部署方案
- 测试策略
- 发布计划

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
3. 参考 [UI_FUNCTIONALITY_TEST.md](./UI_FUNCTIONALITY_TEST.md) 测试各功能

### 产品经理/设计师
1. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第1-4章：产品概述和功能需求
2. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第8章：UI/UX设计

### 前端开发者
1. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第5章：技术架构
2. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第7章：API规格（IPC部分）
3. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第8章：UI/UX设计
4. 参考 [UI_FUNCTIONALITY_TEST.md](./UI_FUNCTIONALITY_TEST.md) 进行功能测试

### 后端开发者
1. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第5章：技术架构
2. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第6章：数据模型
3. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第7章：API规格（REST部分）
4. 参考 [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) 进行部署

### DevOps/运维
1. 查看 [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) 完整部署流程
2. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第9章：安全与性能
3. 参考 [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) 故障排查部分

### QA/测试工程师
1. 查看 [UI_FUNCTIONALITY_TEST.md](./UI_FUNCTIONALITY_TEST.md) 完整测试流程
2. 查看 [COMPLETE_PRD.md](./COMPLETE_PRD.md) 第11章：测试策略

---

## 🗂️ 文档维护

### 文档更新原则
- 每个维度只保留一份核心文档
- 删除临时的、说明性的、冗余的文档
- 优先更新核心文档，而非创建新文档

### 已删除的文档类型
- ❌ 阶段性实施记录（phase6-10）
- ❌ 技术实现说明文档
- ❌ 数据库配置说明文档
- ❌ 开发指南说明文档
- ❌ 快速开始指南（已整合到README）
- ❌ RPD文档（已整合到COMPLETE_PRD）

### 保留的核心文档
- ✅ README.md - 项目主文档
- ✅ COMPLETE_PRD.md - 产品需求文档
- ✅ BUILD_AND_DEPLOYMENT.md - 构建部署文档
- ✅ UI_FUNCTIONALITY_TEST.md - 功能测试文档

---

**最后更新**: 2025-01-05
**文档版本**: v1.0
