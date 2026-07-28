export type ItemKind = "task" | "job" | "knowledge" | "resource" | "thought";

export type WorkspaceItem = {
  id: string;
  kind: ItemKind;
  title: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const now = "2026-07-28T08:00:00.000Z";

export const seedItems: WorkspaceItem[] = [
  { id: "task-1", kind: "task", title: "整理百度 AI 产品运营 JD", data: { dueDate: "2026-07-28", priority: "high", category: "求职", done: false, note: "提炼核心职责和关键词" }, createdAt: now, updatedAt: now },
  { id: "task-2", kind: "task", title: "继续阅读 RAG 入门资料", data: { dueDate: "2026-07-28", priority: "medium", category: "学习", done: false, note: "完成 30 分钟阅读" }, createdAt: now, updatedAt: now },
  { id: "task-3", kind: "task", title: "补充个人 Skill 项目说明", data: { dueDate: "2026-07-30", priority: "medium", category: "项目", done: false, note: "补充项目目标与成果" }, createdAt: now, updatedAt: now },
  { id: "task-4", kind: "task", title: "复习 5 张知识卡片", data: { dueDate: "2026-07-31", priority: "low", category: "学习", done: false, note: "" }, createdAt: now, updatedAt: now },

  { id: "job-1", kind: "job", title: "AI 产品运营实习生", data: { company: "百度", location: "北京", batch: "秋招正式批", openDate: "2026-07-18", status: "准备中", category: "大厂", keywords: ["大模型应用", "用户运营", "数据分析"], link: "https://talent.baidu.com", description: "参与 AI 产品用户运营与内容策略，结合数据反馈优化体验。" }, createdAt: now, updatedAt: now },
  { id: "job-2", kind: "job", title: "AIGC 内容产品实习生", data: { company: "百度", location: "北京", batch: "日常实习", openDate: "2026-07-12", status: "关注中", category: "大厂", keywords: ["AIGC", "内容策略", "产品分析"], link: "https://talent.baidu.com", description: "围绕 AIGC 内容产品进行用户研究、产品分析与运营实验。" }, createdAt: now, updatedAt: now },
  { id: "job-3", kind: "job", title: "AI Solution Intern", data: { company: "Microsoft", location: "上海", batch: "秋招提前批", openDate: "2026-07-06", status: "关注中", category: "外企", keywords: ["解决方案", "客户沟通", "云服务"], link: "https://careers.microsoft.com", description: "支持 AI 解决方案设计、客户沟通与交付协作。" }, createdAt: now, updatedAt: now },
  { id: "job-4", kind: "job", title: "AI 产品运营", data: { company: "中国移动", location: "杭州", batch: "秋招正式批", openDate: "2026-07-20", status: "未分析", category: "国央企", keywords: ["产品运营", "行业研究", "项目推进"], link: "https://job.10086.cn", description: "参与 AI 产品运营、行业研究和跨团队项目推进。" }, createdAt: now, updatedAt: now },

  { id: "knowledge-1", kind: "knowledge", title: "RAG", data: { level: "已理解", tone: "cyan", summary: "通过检索外部知识，为大模型生成提供更可靠的上下文。", explanation: "RAG 像是让模型先翻资料，再基于资料回答。", tags: ["检索", "大模型"] }, createdAt: now, updatedAt: now },
  { id: "knowledge-2", kind: "knowledge", title: "Agent", data: { level: "刚遇到", tone: "lilac", summary: "围绕目标选择工具、保持状态并执行多步骤任务。", explanation: "Agent 是能够持续观察、判断并行动的执行者。", tags: ["工具", "工作流"] }, createdAt: now, updatedAt: now },
  { id: "knowledge-3", kind: "knowledge", title: "Embedding", data: { level: "能解释", tone: "violet", summary: "将文本或其他内容映射为可比较的向量表示。", explanation: "Embedding 把语义关系转换成可计算的空间距离。", tags: ["向量", "检索"] }, createdAt: now, updatedAt: now },
  { id: "knowledge-4", kind: "knowledge", title: "MCP", data: { level: "学习中", tone: "peach", summary: "用统一协议连接模型、工具与外部数据。", explanation: "MCP 降低了模型适配不同工具和数据源的成本。", tags: ["协议", "工具"] }, createdAt: now, updatedAt: now },
  { id: "knowledge-5", kind: "knowledge", title: "Workflow", data: { level: "已收藏", tone: "lime", summary: "把稳定任务拆成可重复执行的步骤与节点。", explanation: "Workflow 更适合路径明确、需要稳定复现的任务。", tags: ["流程", "自动化"] }, createdAt: now, updatedAt: now },

  { id: "resource-1", kind: "resource", title: "RAG 产品实践手册", data: { folder: "RAG 与检索增强", type: "PDF", status: "学习中", progress: 35, url: "" }, createdAt: now, updatedAt: now },
  { id: "resource-2", kind: "resource", title: "检索增强生成的产品边界", data: { folder: "RAG 与检索增强", type: "网页", status: "已收藏", progress: 20, url: "https://www.anthropic.com/research/contextual-retrieval" }, createdAt: now, updatedAt: now },
  { id: "resource-3", kind: "resource", title: "Agent 与工作流笔记", data: { folder: "Agent 与工作流", type: "笔记", status: "学习中", progress: 50, url: "" }, createdAt: now, updatedAt: now },
  { id: "resource-4", kind: "resource", title: "AI 产品行业观察清单", data: { folder: "产品与行业观察", type: "网页", status: "持续更新", progress: 70, url: "" }, createdAt: now, updatedAt: now },

  { id: "thought-1", kind: "thought", title: "AI 产品运营和 AI 产品经理的能力边界是什么？", data: { status: "待继续", content: "从最近收藏的 JD 看，两者都要求理解模型能力，但承担的业务结果与工作方法不同。", date: "2026-07-26" }, createdAt: now, updatedAt: now },
  { id: "thought-2", kind: "thought", title: "为什么收藏越多，行动反而越少？", data: { status: "已形成结论", content: "问题不在信息不足，而在收集、理解和下一步行动之间没有固定出口。", date: "2026-07-24" }, createdAt: now, updatedAt: now },
];
