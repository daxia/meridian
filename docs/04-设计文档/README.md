## 设计文档说明：

PRD文档转成设计文档，写到对应的设计文档中，

设计文档中，分别有下面的文档：

* DD-WEB-Admin页面需求.md
* DD-WEB-用户端需求.md
* DD-SYS-日志功能需求.md
* DD-API-核心服务需求.md
* DD-ML-智能服务需求.md
* DD-DB-数据架构需求.md
* DD-SYS-运维架构需求.md
* DD-SYS-报告导出模块需求.md

涉及到哪个模块的修改需求，就需要在哪个模块的设计文档中，进行补充更新文档。

也就是根据PRD文档进行分析，，实际落地到对应的设计文档模块需求。

### 文档职责说明

| 文档名称                             | 职责范围                                                                                                                                                    | 维护者         |
| :----------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------- |
| **DD-WEB-Admin页面需求.md**    | 对应 `PRD-WEB-Admin页面需求.md`。负责 **Frontend (Admin Panel)** 的详细设计，包括 Vue 组件结构、Store 状态管理、UI/UX 实现细节等。                  | Frontend       |
| **DD-WEB-用户端需求.md**       | 对应 `PRD-WEB-用户端需求.md`。负责 **Frontend (User Interface)** 的详细设计，包括路由设计、组件交互、API 调用封装等。                               | Frontend       |
| **DD-SYS-日志功能需求.md**     | 对应 `PRD-SYS-日志功能需求.md`。负责 **System & Backend** 的日志实现细节，包括 Logger 库配置、文件流处理、Worker 定时任务实现等。                   | System/Backend |
| **DD-API-核心服务需求.md**     | 对应 `PRD-API-核心服务需求.md`。负责 **Backend API & Workflows** 的架构设计，包括 Durable Objects 状态机、Workflow 流程图、API 接口定义 (Hono) 等。 | Backend        |
| **DD-ML-智能服务需求.md**      | 对应 `PRD-ML-智能服务需求.md`。负责 **ML Service** 的算法与服务设计，包括 Python 模块划分、模型加载策略、FastAPI 接口设计等。                       | ML Service     |
| **DD-DB-数据架构需求.md**      | 对应 `PRD-DB-数据架构需求.md`。负责 **Database & Storage** 的物理设计，包括 Drizzle Schema 定义、索引优化策略、R2 目录结构等。                      | Database       |
| **DD-SYS-运维架构需求.md**     | 对应 `PRD-SYS-运维架构需求.md`。负责 **System & DevOps** 的部署设计，包括 Wrangler 配置、Dockerfile 编写、CI/CD 管道配置等。                        | DevOps         |
| **DD-SYS-报告导出模块需求.md** | 对应 `PRD-SYS-报告导出.md`。负责 **Report Export** 的本地实现细节，包括导出脚本逻辑、API 交互、文件系统操作等。                                     | System/Backend |
