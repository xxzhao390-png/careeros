"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

type View = "today" | "jobs" | "knowledge" | "resources" | "tasks" | "thoughts";

const navigation: { id: View; label: string; mark: string }[] = [
  { id: "today", label: "今日", mark: "⌂" },
  { id: "tasks", label: "任务", mark: "✓" },
  { id: "jobs", label: "求职", mark: "●" },
  { id: "knowledge", label: "知识", mark: "✦" },
  { id: "resources", label: "资料", mark: "▰" },
  { id: "thoughts", label: "思考", mark: "⌁" },
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [mascotMessage, setMascotMessage] = useState("");
  const [toast, setToast] = useState("");

  const title = useMemo(
    () => navigation.find((item) => item.id === view)?.label ?? "今日",
    [view],
  );
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "long",
      }).format(new Date()),
    [],
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
                data-view={item.id}
                onClick={() => setView(item.id)}
                type="button"
                data-date={item.id === "today" ? todayLabel : undefined}
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
                <button
                  className="companion-face"
                  type="button"
                  aria-label="打开搜索助手"
                  onClick={(event) => {
                    event.preventDefault();
                    setSearchOpen(true);
                    setMascotMessage("今天也在一点点变厉害 ✦");
                    window.setTimeout(() => setMascotMessage(""), 2400);
                  }}
                ><i /><i /></button>
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
      {mascotMessage && <div className="mascot-message" role="status">{mascotMessage}</div>}
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
  const [selectedDate, setSelectedDate] = useState("2026-07-27");
  const [reviewIndex, setReviewIndex] = useState(0);
  const reviews = [
    { term: "RAG", prompt: "为什么 RAG 能减少模型一本正经地胡说？", answer: "因为它在生成前引入了可核验的外部资料，让回答不只依赖模型参数中的记忆。" },
    { term: "MCP", prompt: "MCP 在 AI 应用中承担什么角色？", answer: "它为模型连接工具和数据提供统一协议，降低每个工具单独适配的成本。" },
    { term: "Embedding", prompt: "为什么相似文本的向量更接近？", answer: "模型将语义关系编码进高维空间，使含义相近的内容在距离计算中更加接近。" },
  ];
  const review = reviews[reviewIndex];
  const current = new Date(`${selectedDate}T00:00:00`);
  const monday = new Date(current);
  const dayOffset = (current.getDay() + 6) % 7;
  monday.setDate(current.getDate() - dayOffset);
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      iso: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      day: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][index],
      date: String(date.getDate()),
    };
  });
  function shiftWeek(offset: number) {
    const next = new Date(current);
    next.setDate(current.getDate() + offset * 7);
    setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`);
  }

  return (
    <div className="view-stack">
      <section className="date-switcher" aria-label="选择日期">
        <div>
          <span className="eyebrow">DAILY ARCHIVE</span>
          <strong>{current.getMonth() + 1}月{current.getDate()}日的记录</strong>
        </div>
        <div className="calendar-controls">
          <button className="week-arrow" type="button" onClick={() => shiftWeek(-1)} aria-label="上一周">←</button>
          <div className="date-pills">
          {weekDates.map(({ day, date, iso }) => (
            <button
              type="button"
              key={iso}
              className={selectedDate === iso ? "active" : ""}
              onClick={() => {
                setSelectedDate(iso);
                onNotify(`正在查看 ${current.getMonth() + 1} 月 ${date} 日`);
              }}
            >
              <span>{day}</span><strong>{date}</strong>
            </button>
          ))}
          </div>
          <button className="week-arrow" type="button" onClick={() => shiftWeek(1)} aria-label="下一周">→</button>
          <label className="date-picker-button">
            <span>选择日期</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="today-first-row">
        <article className="focus-panel task-primary">
          <div className="panel-heading">
            <div><span className="eyebrow">TODAY</span><h3>今日任务</h3></div>
            <button type="button" onClick={() => onNavigate("tasks")}>查看全部 ↗</button>
          </div>
          <div className="task-list">
            {tasks.map((task) => (
              <button type="button" key={task.id} className={`task-row ${done.includes(task.id) ? "done" : ""}`} onClick={() => onToggle(task.id)}>
                <span className="check">{done.includes(task.id) ? "✓" : ""}</span>
                <span><strong>{task.title}</strong><small>{task.meta}</small></span>
                <em>{task.id === 1 ? "求职" : task.id === 2 ? "知识" : "项目"}</em>
              </button>
            ))}
          </div>
        </article>

        <article className="progress-panel compact-progress">
          <div className="panel-heading">
            <div><span className="eyebrow">TODAY PROGRESS</span><h3>今日推进</h3></div>
            <small>3 个维度</small>
          </div>
          <div className="concentric-progress">
            <div className="progress-legend">
              <button type="button" onClick={() => onNavigate("knowledge")}><i className="purple" /><span>知识<strong>68%</strong></span></button>
              <button type="button" onClick={() => onNavigate("tasks")}><i className="blue" /><span>任务<strong>42%</strong></span></button>
              <button type="button" onClick={() => onNavigate("jobs")}><i className="orange" /><span>求职<strong>35%</strong></span></button>
            </div>
            <div className="multi-ring" aria-label="知识68%，任务42%，求职35%">
              <span className="outer-ring" /><span className="middle-ring" /><span className="inner-ring" />
            </div>
          </div>
        </article>

        <article className="month-square first-row-calendar">
          <div className="square-head"><div><span className="eyebrow">CHECK-IN</span><h3>2026年 7月</h3></div><em>连续记录 9 天</em></div>
          <div className="mini-calendar-head">{["一","二","三","四","五","六","日"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="mini-calendar">
            {Array.from({ length: 35 }, (_, index) => {
              const day = index - 2;
              const valid = day >= 1 && day <= 31;
              const past = valid && day < 27;
              return <button type="button" key={index} className={`${!valid ? "empty" : ""} ${past ? "checked" : ""} ${day === 27 ? "today" : ""}`}>{valid ? day : ""}</button>;
            })}
          </div>
        </article>
      </section>

      <section className="review-section">
        <div className="review-copy">
          <span className="eyebrow">YESTERDAY REVIEW</span>
          <h2>每日复习知识</h2>
          <p>把昨天搜索过的概念重新翻一遍。先回答问题，再翻开卡片核对理解。</p>
        </div>
        <div className="review-deck">
          <div className="review-card ghost ghost-two" />
          <div className="review-card ghost ghost-one" />
          <article className="review-card active">
            <span className="review-term">{review.term}</span>
            <h3>{review.prompt}</h3>
            <p>{review.answer}</p>
            <dl className="review-details">
              <div><dt>核心判断</dt><dd>{reviewIndex === 0 ? "外部知识 + 可追溯依据" : reviewIndex === 1 ? "统一连接工具与数据" : "语义映射与相似度检索"}</dd></div>
              <div><dt>实际例子</dt><dd>{reviewIndex === 0 ? "用企业内部文档回答制度问题" : reviewIndex === 1 ? "让模型读取日历并创建日程" : "从知识库中找出相近段落"}</dd></div>
              <div><dt>来源</dt><dd>昨日知识助手 · 已保存卡片</dd></div>
            </dl>
            <div className="review-card-actions">
              <button className="review-prev" type="button" onClick={() => setReviewIndex((reviewIndex - 1 + reviews.length) % reviews.length)}>← 上一张</button>
              <span>{String(reviewIndex + 1).padStart(2, "0")} / {String(reviews.length).padStart(2, "0")}</span>
              <button type="button" onClick={() => onNotify("已标记为需要再复习")}>还不熟</button>
              <button className="review-next" type="button" onClick={() => setReviewIndex((reviewIndex + 1) % reviews.length)}>理解了，下一张 →</button>
            </div>
          </article>
        </div>
      </section>

      <section className="daily-dashboard-grid">
        <article className="career-square">
          <div className="square-head"><div><span className="eyebrow">CAREER TRACK</span><h3>求职进程</h3></div><button type="button" onClick={() => onNavigate("jobs")}>↗</button></div>
          <div className="career-counts">
            <span><strong>08</strong>关注岗位</span><span><strong>03</strong>准备中</span><span><strong>02</strong>已投递</span>
          </div>
          <div className="career-flow"><i className="done" /><i className="done" /><i className="active" /><i /><i /></div>
          <div className="recent-job"><small>最近更新</small><strong>百度 · AI 产品运营实习生</strong><span>准备中 · 今天 10:20</span></div>
        </article>

        <article className="knowledge-deposit">
          <div className="square-head"><div><span className="eyebrow">TODAY DEPOSIT</span><h3>今日知识沉淀</h3></div><button type="button" onClick={() => onNavigate("knowledge")}>查看知识库 ↗</button></div>
          <p>今天共搜索 3 个概念，沉淀 2 张知识卡片，补充 1 条个人理解。</p>
          <div className="deposit-list">
            <button type="button" onClick={() => onNavigate("knowledge")}><span>01</span><strong>RAG 与微调的使用边界</strong><em>已保存</em></button>
            <button type="button" onClick={() => onNavigate("knowledge")}><span>02</span><strong>MCP 如何连接工具与数据</strong><em>已理解</em></button>
            <button type="button" onClick={() => onNavigate("knowledge")}><span>03</span><strong>Embedding 的语义距离</strong><em>待成卡</em></button>
          </div>
        </article>
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
        <button className="add-jd-round" type="button" aria-label="添加 JD" onClick={() => onNotify("打开 JD 录入")}>＋</button>
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
                  <div className="job-title-row">
                    <div>
                      <span>{job.direction} · {job.location}</span>
                      <h4>{job.title}</h4>
                      <div className="title-keywords">{job.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div>
                    </div>
                    <em>{job.status}</em>
                  </div>
                  <div className="job-facts">
                    <div><small>秋招类型</small><strong>{job.batch}</strong></div>
                    <div><small>开放日期</small><strong>{job.open}</strong></div>
                    <div className="official-link"><small>招聘官网</small><a href={job.link} target="_blank" rel="noreferrer">↗ {company.company}校园招聘</a></div>
                  </div>
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
          {cards.map((card, index) => (
            <article key={card.title} className={`topic-card pinned-card ${card.tone}`}>
              <i className="card-pin" aria-hidden="true" />
              <div className="card-number">0{index + 1}</div>
              <span>{card.level}</span>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              <button type="button">打开卡片 <b>↗</b></button>
            </article>
          ))}
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
          <article className={`resource-card resource-folder resource-${index + 1}`} key={item[0]}>
            <div className="folder-label"><span>{item[1]}</span><small>0{index + 1}</small></div>
            <div className="folder-paper">
              <div className="resource-top"><span>{item[3]}</span><button type="button" aria-label="更多操作">•••</button></div>
              <h3>{item[0]}</h3>
              <p>{index === 0 ? "理解检索、切分、向量化与生成之间的完整关系。" : index === 1 ? "用于观察一个个人 Agent 如何组织工具和状态。" : "记录值得关注的产品功能与应用变化。"}</p>
              <div className="progress-track"><span style={{ width: item[2] }} /></div>
              <div className="resource-meta"><span>阅读进度</span><em>{item[2]}</em></div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function TasksView({ done, setDone }: { done: number[]; setDone: (value: number[]) => void }) {
  const [scope, setScope] = useState<"today" | "week">("today");
  const [taskModal, setTaskModal] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState("");
  const weekTasks = [
    { id: 11, title: "完成 CareerOS 交互原型修改", meta: "周二前 · 高优先级" },
    { id: 12, title: "整理本周新增公司的招聘入口", meta: "周四前 · 求职" },
    { id: 13, title: "复习 5 张知识卡片", meta: "本周 · 知识" },
    { id: 14, title: "补全项目技术说明", meta: "周日 · 项目" },
  ];
  const visibleTasks = scope === "today" ? tasks : weekTasks;
  function toggleTask(id: number) {
    if (!done.includes(id)) {
      setDone([...done, id]);
      setCelebrate(["做得漂亮！", "又推进了一步 ✦", "完成啦，给你放个小礼花！"][id % 3]);
      window.setTimeout(() => setCelebrate(""), 2300);
    } else {
      setDone(done.filter((item) => item !== id));
    }
  }
  return (
    <div className="view-stack">
      <section className="task-board">
        <div className="task-board-head">
          <div><span className="eyebrow">REMINDERS</span><h3>任务清单</h3></div>
          <div className="task-scope">
            <button className={scope === "today" ? "active" : ""} type="button" onClick={() => setScope("today")}>今日任务</button>
            <button className={scope === "week" ? "active" : ""} type="button" onClick={() => setScope("week")}>本周任务</button>
          </div>
          <button className="new-task-button" type="button" onClick={() => { setEditing(null); setTaskModal(true); }}>＋ 新建</button>
        </div>
        <div className="reminder-list">
          {visibleTasks.map((task, index) => (
            <article className={`reminder-row ${done.includes(task.id) ? "done" : ""}`} key={task.id}>
              <button className="reminder-check" type="button" onClick={() => toggleTask(task.id)}>{done.includes(task.id) ? "✓" : ""}</button>
              <div><strong>{task.title}</strong><small>{task.meta}</small></div>
              <span className={`priority priority-${(index % 3) + 1}`} />
              <button className="edit-task" type="button" onClick={() => { setEditing(task.id); setTaskModal(true); }}>修改</button>
            </article>
          ))}
        </div>
      </section>

      <section className="week-overview">
        <div className="week-overview-head">
          <div><span className="eyebrow">WEEK OVERVIEW</span><h3>本周任务总览</h3></div>
          <div className="category-legend">
            <span><i className="work" />工作</span><span><i className="life" />生活</span><span><i className="skill" />技能</span><span><i className="career" />求职</span>
          </div>
        </div>
        <div className="week-columns">
          {[
            ["周一","27",[["整理百度 JD","career"],["RAG 阅读 30 分钟","skill"]]],
            ["周二","28",[["修改产品原型","work"],["晚间散步","life"]]],
            ["周三","29",[["项目技术总结","skill"],["查看官网岗位","career"]]],
            ["周四","30",[["简历版本整理","career"]]],
            ["周五","31",[["完成周总结","work"],["健身 40 分钟","life"]]],
            ["周六","01",[["复习知识卡片","skill"]]],
            ["周日","02",[["下周任务规划","work"]]],
          ].map(([day,date,items]) => (
            <article className="week-day" key={`${day}`}>
              <header><span>{day as string}</span><strong>{date as string}</strong></header>
              <div>
                {(items as string[][]).map(([label,type]) => <button type="button" className={`week-item ${type}`} key={label}>{label}</button>)}
              </div>
              <button className="add-week-task" type="button" onClick={() => setTaskModal(true)}>＋</button>
            </article>
          ))}
        </div>
      </section>

      <section className="task-archive">
        <div className="archive-heading"><div><span className="eyebrow">DAILY ARCHIVE</span><h3>每日任务归档</h3></div><label><span>⌕</span><input placeholder="检索历史任务…" /></label></div>
        <div className="folder-row">
          {[
            ["7月26日", "完成 4 / 5", "#dfe7ff"],
            ["7月25日", "完成 3 / 4", "#f0ddff"],
            ["7月24日", "完成 5 / 5", "#dff1e6"],
          ].map(([date, count, color]) => (
            <button className="archive-folder" type="button" key={date} style={{ "--folder-color": color } as CSSProperties}>
              <span className="folder-tab" /><strong>{date}</strong><small>{count}</small><em>打开归档 ↗</em>
            </button>
          ))}
        </div>
        <p>每天结束后，系统会把当天任务状态打包进日期文件夹，之后可以按标题、关联模块或日期检索。</p>
      </section>

      {celebrate && (
        <div className="celebration" role="status">
          <div className="confetti">{Array.from({ length: 14 }, (_, index) => <i key={index} style={{ "--i": index } as CSSProperties} />)}</div>
          <span className="companion-face"><i /><i /></span><strong>{celebrate}</strong>
        </div>
      )}

      {taskModal && (
        <div className="modal-layer task-modal-layer" role="presentation" onMouseDown={() => setTaskModal(false)}>
          <section className="task-editor" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><span className="eyebrow">REMINDER</span><h2>{editing ? "修改任务" : "新建任务"}</h2></div><button type="button" onClick={() => setTaskModal(false)}>×</button></div>
            <input className="task-title-input" autoFocus defaultValue={editing ? visibleTasks.find((task) => task.id === editing)?.title : ""} placeholder="任务名称" />
            <textarea placeholder="备注，例如这项任务为什么重要…" />
            <div className="reminder-options">
              <button type="button"><span>日期</span><strong>今天 ›</strong></button>
              <button type="button"><span>优先级</span><strong>高 ›</strong></button>
              <button type="button"><span>所属清单</span><strong>{scope === "today" ? "今日任务" : "本周任务"} ›</strong></button>
              <button type="button"><span>关联内容</span><strong>无 ›</strong></button>
            </div>
            <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setTaskModal(false)}>取消</button><button className="primary-button" type="button" onClick={() => setTaskModal(false)}><span>{editing ? "保存修改" : "添加任务"}</span><span className="button-orb">✓</span></button></div>
          </section>
        </div>
      )}
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
