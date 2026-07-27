"use client";

import { useMemo, useState } from "react";

type View = "today" | "jobs" | "knowledge" | "resources" | "tasks" | "thoughts";

const navigation: { id: View; label: string; mark: string }[] = [
  { id: "today", label: "今日", mark: "01" },
  { id: "jobs", label: "秋招", mark: "02" },
  { id: "knowledge", label: "知识", mark: "03" },
  { id: "resources", label: "资料", mark: "04" },
  { id: "tasks", label: "任务", mark: "05" },
  { id: "thoughts", label: "思考", mark: "06" },
];

const tasks = [
  { id: 1, title: "整理百度 AI 产品运营 JD", meta: "今天 · 高优先级" },
  { id: 2, title: "继续阅读 RAG 入门资料", meta: "30 分钟 · 学习" },
  { id: 3, title: "补充个人 Skill 项目说明", meta: "本周 · 项目" },
];

const jobs = [
  ["百度", "AI 产品运营实习生", "AI 运营", "北京", "较匹配", "准备中"],
  ["诺亚控股", "AI 产品运营岗", "AI 运营", "上海", "部分匹配", "关注中"],
  ["示例科技", "AI 咨询解决方案", "AI 咨询", "杭州", "未分析", "关注中"],
];

const cards = [
  { title: "RAG", desc: "通过检索外部知识，为大模型生成提供更可靠的上下文。", level: "已理解", tone: "cyan" },
  { title: "Agent", desc: "能够围绕目标选择工具、保持状态并执行多步骤任务。", level: "刚遇到", tone: "lilac" },
  { title: "Embedding", desc: "将文本或其他内容映射为可比较的向量表示。", level: "能解释", tone: "lime" },
];

const resources = [
  ["RAG 入门与工程实践", "PDF", "35%", "学习中"],
  ["开源 Agent 项目", "GitHub", "0%", "待读"],
  ["AI 厂商产品更新", "网页", "100%", "已完成"],
];

export default function Home() {
  const [view, setView] = useState<View>("today");
  const [done, setDone] = useState<number[]>([]);
  const [collectOpen, setCollectOpen] = useState(false);
  const [toast, setToast] = useState("");

  const title = useMemo(
    () => navigation.find((item) => item.id === view)?.label ?? "今日",
    [view],
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  return (
    <main className="workspace">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-glyph">C</span>
            <div>
              <strong>CareerOS</strong>
              <span>AI growth desk</span>
            </div>
          </div>

          <nav aria-label="主导航">
            {navigation.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${view === item.id ? "active" : ""}`}
                onClick={() => setView(item.id)}
                type="button"
              >
                <span className="nav-mark">{item.mark}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <button className="collect-button" type="button" onClick={() => setCollectOpen(true)}>
            <span>快速收集</span>
            <span className="button-orb">＋</span>
          </button>

          <div className="sidebar-foot">
            <div className="profile">Z</div>
            <div>
              <strong>赵新玥</strong>
              <span>秋招进行中</span>
            </div>
            <button type="button" aria-label="打开设置">···</button>
          </div>
        </aside>

        <section className="content">
          <header className="topbar">
            <div>
              <span className="eyebrow">PERSONAL WORKSPACE · 2026</span>
              <h1>{title}</h1>
            </div>
            <div className="top-actions">
              <label className="search">
                <span>⌕</span>
                <input aria-label="全局搜索" placeholder="搜索岗位、知识、资料…" />
                <kbd>⌘ K</kbd>
              </label>
              <button className="quiet-icon" type="button" aria-label="通知">◌</button>
            </div>
          </header>

          {view === "today" && (
            <TodayView
              done={done}
              onToggle={(id) =>
                setDone((current) =>
                  current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                )
              }
              onNavigate={setView}
              onNotify={notify}
            />
          )}
          {view === "jobs" && <JobsView onNotify={notify} />}
          {view === "knowledge" && <KnowledgeView onNotify={notify} />}
          {view === "resources" && <ResourcesView onNotify={notify} />}
          {view === "tasks" && <TasksView done={done} setDone={setDone} />}
          {view === "thoughts" && <ThoughtsView onNotify={notify} />}
        </section>
      </section>

      {collectOpen && (
        <div className="modal-layer" role="presentation" onMouseDown={() => setCollectOpen(false)}>
          <section
            className="collect-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="collect-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">CAPTURE FIRST</span>
                <h2 id="collect-title">快速收集</h2>
              </div>
              <button type="button" onClick={() => setCollectOpen(false)} aria-label="关闭">×</button>
            </div>
            <label>
              类型
              <select defaultValue="auto">
                <option value="auto">自动判断</option>
                <option>JD</option>
                <option>学习资料</option>
                <option>任务</option>
                <option>思考</option>
              </select>
            </label>
            <label>
              链接或文字
              <textarea placeholder="粘贴企业官网 JD、文章链接、GitHub 地址或随手想法…" />
            </label>
            <label>
              为什么保存 <span>选填</span>
              <input placeholder="例如：面试前想系统了解 RAG" />
            </label>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => {
                setCollectOpen(false);
                notify("已存入待整理");
              }}>存入待整理</button>
              <button className="primary-button" type="button" onClick={() => {
                setCollectOpen(false);
                notify("已进入下一步处理");
              }}>
                <span>继续处理</span><span className="button-orb">→</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function TodayView({
  done,
  onToggle,
  onNavigate,
  onNotify,
}: {
  done: number[];
  onToggle: (id: number) => void;
  onNavigate: (view: View) => void;
  onNotify: (message: string) => void;
}) {
  return (
    <div className="view-stack">
      <section className="hero-grid">
        <article className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">SUNDAY · JUL 27</span>
            <h2>把今天接触的信息，<br />变成可以积累的知识。</h2>
            <p>目前最重要的是完成知识助手闭环，并持续记录秋招进展。</p>
          </div>
          <div className="hero-progress">
            <div className="ring"><strong>42%</strong><span>本周推进</span></div>
            <div className="mini-metrics">
              <span><strong>08</strong>知识卡片</span>
              <span><strong>05</strong>关注岗位</span>
            </div>
          </div>
        </article>

        <article className="focus-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">TODAY</span><h3>今日任务</h3></div>
            <button type="button" onClick={() => onNavigate("tasks")}>查看全部 ↗</button>
          </div>
          <div className="task-list">
            {tasks.map((task) => (
              <button
                type="button"
                key={task.id}
                className={`task-row ${done.includes(task.id) ? "done" : ""}`}
                onClick={() => onToggle(task.id)}
              >
                <span className="check">{done.includes(task.id) ? "✓" : ""}</span>
                <span><strong>{task.title}</strong><small>{task.meta}</small></span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="metric-strip">
        <button className="metric cyan" type="button" onClick={() => onNavigate("knowledge")}>
          <span>今日新知识</span><strong>02</strong><small>RAG · MCP</small>
        </button>
        <button className="metric lime" type="button" onClick={() => onNavigate("jobs")}>
          <span>秋招进度</span><strong>05</strong><small>2 个岗位待分析</small>
        </button>
        <button className="metric lilac" type="button" onClick={() => onNavigate("resources")}>
          <span>学习中资料</span><strong>03</strong><small>本周阅读 2.5h</small>
        </button>
      </section>

      <section className="lower-grid">
        <article className="knowledge-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">KNOWLEDGE</span><h3>最近知识</h3></div>
            <button type="button" onClick={() => onNavigate("knowledge")}>进入知识库 ↗</button>
          </div>
          <div className="knowledge-list">
            {cards.map((card) => (
              <button type="button" key={card.title} className="knowledge-row" onClick={() => onNavigate("knowledge")}>
                <span className={`topic-dot ${card.tone}`} />
                <span><strong>{card.title}</strong><small>{card.desc}</small></span>
                <em>{card.level}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="summary-panel">
          <span className="eyebrow">DAILY NOTE</span>
          <h3>今日知识总结</h3>
          <p>根据今天的 2 次查询、1 张知识卡片和 1 条学习记录生成。</p>
          <div className="summary-quote">“今天开始理解 RAG 不只是一个检索步骤，而是一套围绕可信上下文构建的应用流程。”</div>
          <button className="primary-button" type="button" onClick={() => onNotify("今日知识总结已生成")}>
            <span>生成今天的总结</span><span className="button-orb">→</span>
          </button>
        </article>
      </section>
    </div>
  );
}

function JobsView({ onNotify }: { onNotify: (message: string) => void }) {
  return (
    <div className="view-stack">
      <section className="section-toolbar">
        <div className="filter-row">
          <button className="filter active" type="button">全部岗位 05</button>
          <button className="filter" type="button">关注中 03</button>
          <button className="filter" type="button">已投递 02</button>
        </div>
        <button className="primary-button" type="button" onClick={() => onNotify("打开 JD 录入")}>
          <span>添加 JD</span><span className="button-orb">＋</span>
        </button>
      </section>
      <section className="table-panel">
        <div className="table-title"><span>岗位库</span><small>更新于今天 09:40</small></div>
        <div className="data-table">
          <div className="table-row table-head">
            <span>公司 / 岗位</span><span>方向</span><span>地点</span><span>匹配</span><span>状态</span>
          </div>
          {jobs.map((job) => (
            <button type="button" className="table-row" key={`${job[0]}-${job[1]}`} onClick={() => onNotify(`打开 ${job[0]} JD 详情`)}>
              <span><strong>{job[0]}</strong><small>{job[1]}</small></span>
              <span>{job[2]}</span><span>{job[3]}</span><span><em>{job[4]}</em></span><span>{job[5]} ↗</span>
            </button>
          ))}
        </div>
      </section>
      <section className="job-insight">
        <div><span className="eyebrow">JOB SIGNAL</span><h3>当前岗位样本中，最常出现的能力</h3></div>
        <div className="skill-cloud"><span>大模型应用理解</span><span>内容与运营</span><span>数据分析</span><span>项目推进</span><span>AI 实践作品</span></div>
      </section>
    </div>
  );
}

function KnowledgeView({ onNotify }: { onNotify: (message: string) => void }) {
  const [answer, setAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  function ask() {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setAnswer(true);
    }, 800);
  }
  return (
    <div className="view-stack">
      <section className="ask-panel">
        <span className="eyebrow">KNOWLEDGE ASSISTANT</span>
        <h2>遇到不懂的 AI 名词，先在这里弄明白。</h2>
        <div className="ask-box">
          <input defaultValue="RAG 和微调有什么区别？" aria-label="向 AI 提问" />
          <button className="primary-button" type="button" onClick={ask}>
            <span>{loading ? "正在解释…" : "询问 AI"}</span><span className="button-orb">→</span>
          </button>
        </div>
        <div className="suggestions"><span>试试：</span><button type="button">MCP 是什么</button><button type="button">Agent vs Workflow</button></div>
      </section>
      {answer ? (
        <section className="answer-panel">
          <div className="answer-head"><div><span className="eyebrow">STRUCTURED ANSWER</span><h3>RAG 与微调的区别</h3></div><span className="answer-status">AI 草稿 · 尚未入库</span></div>
          <div className="answer-grid">
            <div><small>一句话解释</small><p>RAG 是在回答前查资料；微调是通过训练改变模型的行为和能力倾向。</p></div>
            <div><small>解决什么问题</small><p>RAG 解决知识更新和依据问题，微调更适合固定风格、任务习惯与能力适配。</p></div>
            <div className="wide"><small>简单判断</small><p>需要模型引用最新或私有资料时优先考虑 RAG；需要模型长期稳定遵循特定输出习惯时，再评估微调。</p></div>
          </div>
          <div className="answer-actions"><button type="button">继续追问</button><button type="button">编辑</button><button className="primary-button" type="button" onClick={() => onNotify("已生成知识卡片草稿")}><span>保存为知识卡片</span><span className="button-orb">＋</span></button></div>
        </section>
      ) : (
        <section className="card-gallery">
          {cards.map((card) => <article key={card.title} className={`topic-card ${card.tone}`}><span>{card.level}</span><h3>{card.title}</h3><p>{card.desc}</p><button type="button">打开卡片 ↗</button></article>)}
        </section>
      )}
    </div>
  );
}

function ResourcesView({ onNotify }: { onNotify: (message: string) => void }) {
  return (
    <div className="view-stack">
      <section className="section-toolbar">
        <div className="filter-row"><button className="filter active" type="button">学习资料</button><button className="filter" type="button">我的项目</button><button className="filter" type="button">待整理 02</button></div>
        <button className="primary-button" type="button" onClick={() => onNotify("打开资料上传")}><span>添加资料</span><span className="button-orb">＋</span></button>
      </section>
      <section className="resource-grid">
        {resources.map((item, index) => (
          <article className={`resource-card resource-${index + 1}`} key={item[0]}>
            <div className="resource-top"><span>{item[1]}</span><button type="button">···</button></div>
            <h3>{item[0]}</h3>
            <p>{index === 0 ? "理解检索、切分、向量化与生成之间的完整关系。" : index === 1 ? "用于观察一个个人 Agent 如何组织工具和状态。" : "记录值得关注的产品功能与应用变化。"}</p>
            <div className="progress-track"><span style={{ width: item[2] }} /></div>
            <div className="resource-meta"><span>{item[2]}</span><em>{item[3]}</em></div>
          </article>
        ))}
      </section>
    </div>
  );
}

function TasksView({ done, setDone }: { done: number[]; setDone: (value: number[]) => void }) {
  return (
    <div className="view-stack">
      <section className="task-board">
        <div className="panel-heading"><div><span className="eyebrow">FOCUS LIST</span><h3>今天与本周</h3></div><button type="button">＋ 新建任务</button></div>
        {tasks.map((task, index) => (
          <button className={`board-task ${done.includes(task.id) ? "done" : ""}`} type="button" key={task.id} onClick={() => setDone(done.includes(task.id) ? done.filter((id) => id !== task.id) : [...done, task.id])}>
            <span className="task-index">0{index + 1}</span><span className="check">{done.includes(task.id) ? "✓" : ""}</span><span><strong>{task.title}</strong><small>{task.meta}</small></span><em>{index === 0 ? "秋招" : index === 1 ? "知识" : "项目"}</em>
          </button>
        ))}
      </section>
    </div>
  );
}

function ThoughtsView({ onNotify }: { onNotify: (message: string) => void }) {
  return (
    <div className="view-stack">
      <section className="thought-hero">
        <span className="eyebrow">THINKING SPACE</span>
        <h2>先保留原始想法，<br />再慢慢形成自己的判断。</h2>
        <button className="primary-button" type="button" onClick={() => onNotify("打开思考记录")}><span>记录一个想法</span><span className="button-orb">＋</span></button>
      </section>
      <section className="thought-list">
        <article><span>待继续 · 7月26日</span><h3>AI 产品运营和 AI 产品经理的能力边界是什么？</h3><p>从最近收藏的 JD 看，两者都要求理解模型能力，但承担的业务结果与工作方法不同。</p><button type="button">继续思考 ↗</button></article>
        <article><span>已形成结论 · 7月24日</span><h3>为什么收藏越多，行动反而越少？</h3><p>问题不在信息不足，而在收集、理解和下一步行动之间没有固定出口。</p><button type="button">查看记录 ↗</button></article>
      </section>
    </div>
  );
}
