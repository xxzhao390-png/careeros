# CareerOS

CareerOS 是一个面向求职者的个人求职 CRM 与知识管理系统。它把岗位跟进、任务、资料、知识卡片和随手记集中在一个工作台中，并预留了低成本 AI 整理能力。

## MVP 能力

- 今日工作台与任务管理
- 岗位 JD 导入、状态跟进和详情编辑
- 知识卡片管理
- 资料文件夹、文件上传与网课笔记
- 随手记、基础文档编辑、标签、回收站和关联任务
- Cloudflare D1 持久化数据
- Cloudflare R2 保存图片与文档
- 平台登录身份识别和服务端用户数据隔离
- JD 结构化整理与随手记智能整理接口
- AI 结果校验、用户确认、调用记录和每日限额

## 技术架构

| 层级 | 技术 | 作用 |
|---|---|---|
| 前端 | React、TypeScript、Vinext | 页面、交互和响应式布局 |
| API | Next.js Route Handlers | 接收请求、校验身份和业务参数 |
| 数据库 | Cloudflare D1、SQLite SQL、Drizzle | 保存用户和结构化业务数据 |
| 文件 | Cloudflare R2 | 保存图片、PDF 和 Office 文件 |
| 身份 | Sites / ChatGPT Sign-in headers | 识别当前登录用户 |
| AI | OpenAI-compatible provider adapter | 支持按环境切换模型服务商 |
| 部署 | Cloudflare Workers / Sites | 运行前端、API、D1 和 R2 |

## 数据隔离

CareerOS 使用一套代码、两个部署环境：

```text
同一套 GitHub 代码
├─ 私人部署 → 私人 D1 + 私人 R2 → 保存项目所有者真实数据
└─ 公开部署 → 公开 D1 + 公开 R2 → 每位用户拥有空白且相互隔离的工作台
```

每条业务记录和文件元数据都保存 `user_id`。所有读取、修改与删除操作都在服务端同时校验资源编号和当前用户编号，不能依赖前端隐藏按钮实现权限控制。

## 本地运行

要求 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

本地预览使用专门的本地测试身份，不会连接生产数据。验证构建：

```bash
npm run build
npm test
```

修改 `db/schema.ts` 后生成数据库迁移：

```bash
npm run db:generate
```

## 环境变量

AI 功能是可选的。未配置模型时，核心数据功能仍可使用，JD 导入会使用基础规则整理。

复制 `.env.example` 为本地 `.env`，再按需填写：

- `AI_API_KEY`：模型服务密钥
- `AI_BASE_URL`：兼容 OpenAI Chat Completions 的接口地址
- `AI_MODEL`：模型名称

真实密钥不得提交到 Git。

## 项目文档

- [开发进度](docs/CAREEROS_PROGRESS.md)
- [系统架构](docs/ARCHITECTURE.md)
- [数据库与 ER 图](docs/DATABASE.md)
- [API 接口规范](docs/API.md)
- [部署说明](docs/DEPLOYMENT.md)
- [安全说明](docs/SECURITY.md)
- [测试说明](docs/TESTING.md)

## 当前阶段

当前版本采用 `workspace_items` 通用业务表快速完成 MVP，详情字段暂存在 JSON 中。升级版本会逐步拆分为岗位、任务、笔记、资料等标准业务表，并通过 SQL 迁移保留现有数据。

## 许可说明

项目当前处于个人作品集开发阶段，暂未添加开源许可证。没有许可证时，仓库内容默认不授予复制、修改或再发布权利；正式开源前会补充适合的许可证。
