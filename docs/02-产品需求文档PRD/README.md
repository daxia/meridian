## 产品需求文档PRD说明：

我的需求，转换成PRD文档时，需要根据实际的需求修改进行拆分，

产品需求文档中，分别有下面的文档：

* PRD-WEB-Admin页面需求.md
* PRD-WEB-用户端需求.md
* PRD-SYS-日志功能需求.md
* PRD-API-核心服务需求.md
* PRD-ML-智能服务需求.md
* PRD-DB-数据架构需求.md
* PRD-SYS-运维架构需求.md
* PRD-SYS-报告导出模块需求.md

涉及到哪个模块的修改需求，就需要在哪个模块的需求文档中，进行补充更新文档。

也就是说对我的需求进行分析，根据我的需求，实际落地到距离的模块需求。

### 文档职责说明

| 文档名称                              | 职责范围                                                                                                                                     | 维护者         |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------- | :------------- |
| **PRD-WEB-Admin页面需求.md**    | 负责**Frontend (Admin Panel)** 相关的功能需求。包括界面显示修复（如 Source Analytics 表格）、交互优化、前端数据格式化等。              | Frontend       |
| **PRD-WEB-用户端需求.md**       | 负责**Frontend (User Interface)** 相关的用户侧功能需求。包括文章列表、阅读界面、搜索功能、个性化订阅等。                               | Frontend       |
| **PRD-SYS-日志功能需求.md**     | 负责**System & Backend** 相关的日志与监控需求。包括日志文件格式化（ANSI 清理）、日志轮转策略、后台定时监控任务日志等。                 | System/Backend |
| **PRD-API-核心服务需求.md**     | 负责**Backend API & Workflows** 相关的核心业务逻辑。包括 RSS 抓取调度 (Durable Objects)、文章处理工作流 (Workflows)、用户认证 API 等。 | Backend        |
| **PRD-ML-智能服务需求.md**      | 负责**ML Service** 相关的 AI 功能需求。包括文本向量化 (Embeddings)、语义分析、推荐算法、Python 服务接口等。                            | ML Service     |
| **PRD-DB-数据架构需求.md**      | 负责**Database & Storage** 相关的数据层需求。包括 PostgreSQL Schema 变更、SQL 迁移、R2 存储结构、向量数据库配置等。                    | Database       |
| **PRD-SYS-运维架构需求.md**     | 负责**System & DevOps** 相关的基础设施需求。包括 CI/CD 流程、环境配置、部署脚本、性能优化、安全策略等。                                | DevOps         |
| **PRD-SYS-报告导出模块需求.md** | 负责**Report Export** 相关的本地报告导出需求。包括简报生成、格式转换、本地文件写入等。                                                 | System/Backend |
