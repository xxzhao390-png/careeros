"use client";

import { useMemo, useState } from "react";

type View = "today" | "jobs" | "knowledge" | "resources" | "tasks" | "thoughts";

const navigation: { id: View; label: string; mark: string }[] = [
  { id: "today", label: "今日", mark: "01" },
  { id: "tasks", label: "任务", mark: "02" },
  { id: "jobs", label: "秋招", mark: "03" },
  { id: "knowledge", label: "知识", mark: "04" },
  { id: "resources", label: "资料", mark: "05" },
  { id: "thoughts", label: "思考", mark: "06" },
];

const tasks = [
  { id: 1, title: "整理百度 AI 产品运营 JD", meta: "今天 · 高优先级" },
  { id: 2, title: "继续阅读 RAG 入门资料", meta: "30 分钟 · 学习" },
  { id: 3, title: "补充个人 Skill 项目说明", meta: "本周 · 项目" },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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

      <section className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
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
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>

          <button className="collect-button" type="button" onClick={() => setCollectOpen(true)}>
            <span className="collect-label">快速收集</span>
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
          <button
            className="sidebar-toggle"
            type="button"
            aria-label={sidebarCollapsed ? "展开导航" : "收起导航"}
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            {sidebarCollapsed ? "›" : "‹"}
          </button>
        </aside>

        <section className="content">
          <header className="topbar">
            <div>
              <span className="eyebrow">PERSONAL WORKSPACE · 2026</span>
              <h1>{title}</h1>
            </div>
            <div className="top-actions">
              <label
                className={`search-companion ${searchOpen ? "open" : ""}`}
                onMouseEnter={() => setSearchOpen(true)}
                onMouseLeave={(event) => {
                  if (!event.currentTarget.contains(document.activeElement)) setSearchOpen(false);
                }}
              >
                <span className="companion-face" aria-hidden="true"><i /><i /></span>
                <input
                  aria-label="全局搜索"
                  placeholder="搜索岗位、知识、资料…"
                  onFocus={() => setSearchOpen(true)}
                  onBlur={(event) => {
                    if (!event.currentTarget.value) setSearchOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      notify("已完成搜索");
                      event.currentTarget.blur();
                      setSearchOpen(false);
                    }
                  }}
                />
                <span className="search-arrow">↗</span>
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
          {view === "jobs" && <JobsView onNotify={notify} onNavigate={setView} />}
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
  const dates = [
    ["周三", "23"], ["周四", "24"], ["周五", "25"], ["周六", "26"], ["今天", "27"], ["周一", "28"], ["周二", "29"],
  ];
  const [selectedDate, setSelectedDate] = useState("27");
  const [reviewIndex, setReviewIndex] = useState(0);
  const reviews = [
    { term: "RAG", prompt: "为什么 RAG 能减少模型一本正经地胡说？", answer: "因为它在生成前引入了可核验的外部资料，让回答不只依赖模型参数中的记忆。" },
    { term: "MCP", prompt: "MCP 在 AI 应用中承担什么角色？", answer: "它为模型连接工具和数据提供统一协议，降低每个工具单独适配的成本。" },
    { term: "Embedding", prompt: "为什么相似文本的向量更接近？", answer: "模型将语义关系编码进高维空间，使含义相近的内容在距离计算中更加接近。" },
  ];
  const review = reviews[reviewIndex];

  return (
    <div className="view-stack">
      <section className="date-switcher" aria-label="选择日期">
        <div>
          <span className="eyebrow">DAILY ARCHIVE</span>
          <strong>{selectedDate === "27" ? "今天" : `7月${selectedDate}日`}的记录</strong>
        </div>
        <div className="date-pills">
          {dates.map(([day, date]) => (
            <button
              type="button"
              key={date}
              className={selectedDate === date ? "active" : ""}
              onClick={() => {
                setSelectedDate(date);
                onNotify(date === "27" ? "已回到今天" : `正在查看 7 月 ${date} 日`);
              }}
            >
              <span>{day}</span><strong>{date}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="hero-grid">
        <article className="progress-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">TODAY PROGRESS</span><h3>今日推进</h3></div>
            <small>{selectedDate === "27" ? "实时更新" : `7月${selectedDate}日归档`}</small>
          </div>
          <div className="progress-rings">
            <button type="button" onClick={() => onNavigate("knowledge")}>
              <span className="progress-ring knowledge-ring"><strong>68%</strong></span>
              <em>知识</em><small>2 张卡片已更新</small>
            </button>
            <button type="button" onClick={() => onNavigate("tasks")}>
              <span className="progress-ring task-ring"><strong>42%</strong></span>
              <em>任务</em><small>1 / 3 已完成</small>
            </button>
            <button type="button" onClick={() => onNavigate("jobs")}>
              <span className="progress-ring job-ring"><strong>35%</strong></span>
              <em>秋招</em><small>2 个岗位待处理</small>
            </button>
          </div>
          <div className="progress-note">
            <span>今日重点</span>
            <strong>{selectedDate === "27" ? "完成知识助手闭环，整理一条重点 JD。" : "历史记录仅展示当日实际保存的内容。"}</strong>
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

      <section className="review-section">
        <div className="review-copy">
          <span className="eyebrow">YESTERDAY REVIEW</span>
          <h2>每日复习知识</h2>
          <p>把昨天搜索过的概念重新翻一遍。先回答问题，再翻开卡片核对理解。</p>
          <div className="review-controls">
            <button type="button" onClick={() => setReviewIndex((reviewIndex - 1 + reviews.length) % reviews.length)}>←</button>
            <span>{String(reviewIndex + 1).padStart(2, "0")} / {String(reviews.length).padStart(2, "0")}</span>
            <button type="button" onClick={() => setReviewIndex((reviewIndex + 1) % reviews.length)}>→</button>
          </div>
        </div>
        <div className="review-deck">
          <div className="review-card ghost ghost-two" />
          <div className="review-card ghost ghost-one" />
          <article className="review-card active">
            <span className="review-term">{review.term}</span>
            <h3>{review.prompt}</h3>
            <p>{review.answer}</p>
            <div>
              <button type="button" onClick={() => onNotify("已标记为需要再复习")}>还不熟</button>
              <button className="review-next" type="button" onClick={() => setReviewIndex((reviewIndex + 1) % reviews.length)}>理解了，下一张 →</button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

function JobsView({ onNotify, onNavigate }: { onNotify: (message: string) => void; onNavigate: (view: View) => void }) {
  const [category, setCategory] = useState("全部");
  const [detail, setDetail] = useState<string | null>(null);
  const companies = [
    {
      type: "大厂", company: "百度", logo: "百", color: "blue", industry: "互联网 / AI",
      jobs: [
        { title: "AI 产品运营实习生", direction: "AI 运营", location: "北京", batch: "秋招正式批", open: "2026-07-18", keywords: ["大模型应用", "用户运营", "数据分析"], status: "准备中", link: "https://talent.baidu.com" },
        { title: "AIGC 内容产品实习生", direction: "AI 产品", location: "北京", batch: "日常实习", open: "2026-07-12", keywords: ["AIGC", "内容策略", "产品分析"], status: "关注中", link: "https://talent.baidu.com" },
      ],
    },
    {
      type: "外企", company: "Microsoft", logo: "M", color: "cyan", industry: "外企 / 科技",
      jobs: [
        { title: "AI Solution Intern", direction: "AI 咨询", location: "上海", batch: "秋招提前批", open: "2026-07-06", keywords: ["解决方案", "客户沟通", "云服务"], status: "关注中", link: "https://careers.microsoft.com" },
      ],
    },
    {
      type: "国央企", company: "中国移动", logo: "移", color: "green", industry: "央企 / 通信",
      jobs: [
        { title: "AI 产品运营", direction: "AI 运营", location: "杭州", batch: "秋招正式批", open: "2026-07-20", keywords: ["产品运营", "行业研究", "项目推进"], status: "未分析", link: "https://job.10086.cn" },
      ],
    },
  ];
  const filtered = category === "全部" ? companies : companies.filter((company) => company.type === category);
  const selected = companies.flatMap((company) => company.jobs.map((job) => ({ ...job, company: company.company }))).find((job) => `${job.company}-${job.title}` === detail);

  return (
    <div className="view-stack">
      <section className="section-toolbar">
        <div className="filter-row">
          {["全部", "国央企", "大厂", "高校", "外企", "其他"].map((item) => (
            <button key={item} className={`filter ${category === item ? "active" : ""}`} type="button" onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
        <button className="primary-button" type="button" onClick={() => onNotify("打开 JD 录入")}>
          <span>添加 JD</span><span className="button-orb">＋</span>
        </button>
      </section>

      <section className="company-groups">
        {filtered.length ? filtered.map((company) => (
          <article className="company-group" key={company.company}>
            <header className="company-head">
              <div className={`company-logo ${company.color}`}>{company.logo}</div>
              <div><span>{company.type}</span><h3>{company.company}</h3><small>{company.industry}</small></div>
              <em>{company.jobs.length} 个岗位</em>
            </header>
            <div className="job-cards">
              {company.jobs.map((job) => (
                <article className="job-card" key={job.title}>
                  <div className="job-title-row"><div><span>{job.direction} · {job.location}</span><h4>{job.title}</h4></div><em>{job.status}</em></div>
                  <div className="job-facts">
                    <div><small>秋招类型</small><strong>{job.batch}</strong></div>
                    <div><small>开放日期</small><strong>{job.open}</strong></div>
                    <div className="official-link"><small>招聘官网</small><a href={job.link} target="_blank" rel="noreferrer">↗ {company.company}校园招聘</a></div>
                  </div>
                  <div className="keyword-line"><small>岗位关键词</small><div>{job.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div></div>
                  <div className="job-actions"><button type="button">记录投递</button><button className="jd-detail-button" type="button" onClick={() => setDetail(`${company.company}-${job.title}`)}>查看上传的 JD →</button></div>
                </article>
              ))}
            </div>
          </article>
        )) : <div className="empty-category">这个分类里还没有岗位，之后可以从“添加 JD”录入。</div>}
      </section>

      <section className="tech-stack-panel">
        <div><span className="eyebrow">TECH STACK</span><h3>从当前 JD 提取的技术栈</h3><p>点击概念可进入知识卡片；点击资源类内容可进入资料库。</p></div>
        <div className="tech-links">
          {["RAG", "Agent", "Prompt Engineering", "数据分析", "云服务", "API"].map((tech, index) => (
            <button type="button" key={tech} onClick={() => onNavigate(index < 3 ? "knowledge" : "resources")}><span>{String(index + 1).padStart(2, "0")}</span>{tech}<em>↗</em></button>
          ))}
        </div>
      </section>

      {selected && (
        <div className="modal-layer" role="presentation" onMouseDown={() => setDetail(null)}>
          <section className="jd-detail-modal" role="dialog" aria-modal="true" aria-labelledby="jd-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><span className="eyebrow">UPLOADED JD</span><h2 id="jd-detail-title">{selected.company} · {selected.title}</h2></div><button type="button" onClick={() => setDetail(null)}>×</button></div>
            <div className="jd-modal-meta"><span>{selected.direction}</span><span>{selected.location}</span><span>{selected.batch}</span><span>{selected.open}</span></div>
            <div className="jd-modal-body">
              <section><small>岗位职责</small><p>参与 AI 产品的用户运营与内容策略，结合数据反馈优化用户体验，推动跨团队项目落地。</p></section>
              <section><small>岗位要求</small><p>理解大语言模型及常见应用形态，具备用户洞察、数据分析、内容表达和项目协作能力；有 AI 实践作品优先。</p></section>
              <section><small>AI 分析</small><p>当前匹配优势是内容与视觉表达、AI 工作流实践；仍需补充量化运营结果与数据分析案例。</p></section>
            </div>
            <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setDetail(null)}>关闭</button><button className="primary-button" type="button" onClick={() => onNotify("进入完整 JD 分析")}><span>进入完整分析</span><span className="button-orb">→</span></button></div>
          </section>
        </div>
      )}
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
