"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import type { ItemKind, WorkspaceItem } from "../lib/workspace";
import { useWorkspace } from "./use-workspace";

type View = "today" | "tasks" | "jobs" | "knowledge" | "resources" | "thoughts";
type WorkspaceActions = ReturnType<typeof useWorkspace>;

const navigation: { id: View; label: string; mark: string }[] = [
  { id: "today", label: "今日", mark: "⌂" },
  { id: "tasks", label: "任务", mark: "✓" },
  { id: "jobs", label: "求职", mark: "●" },
  { id: "knowledge", label: "知识", mark: "✦" },
  { id: "resources", label: "资料", mark: "▰" },
  { id: "thoughts", label: "思考", mark: "⌁" },
];

const viewForKind: Record<ItemKind, View> = {
  task: "tasks", job: "jobs", knowledge: "knowledge", resource: "resources", thought: "thoughts",
};

const text = (item: WorkspaceItem, key: string, fallback = "") => typeof item.data[key] === "string" ? String(item.data[key]) : fallback;
const numberValue = (item: WorkspaceItem, key: string, fallback = 0) => typeof item.data[key] === "number" ? Number(item.data[key]) : fallback;
const bool = (item: WorkspaceItem, key: string) => Boolean(item.data[key]);
const list = (item: WorkspaceItem, key: string) => Array.isArray(item.data[key]) ? (item.data[key] as string[]) : [];
const isoForDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const todayIso = () => isoForDate(new Date());
const prettyDate = (iso: string) => new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${iso}T00:00:00`));
const encouragements = [
  "把今天过好，已经是一件很棒的事。",
  "慢一点也没关系，你一直在向前。",
  "完成一件小事，也是在靠近想去的地方。",
  "给专注留一点空间，答案会慢慢出现。",
  "今天的努力，会成为未来的底气。",
  "允许自己休息，节奏比速度更重要。",
  "新的一周，从相信自己开始。",
];

const weekStartFor = (iso: string) => {
  const day = new Date(`${iso}T00:00:00`);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return isoForDate(day);
};

function parseJdText(raw: string) {
  const content = raw.trim();
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const labeled = (labels: string[]) => {
    const pattern = new RegExp(`^(?:${labels.join("|")})\\s*[：:]\\s*(.+)$`, "i");
    return lines.map((line) => line.match(pattern)?.[1]).find(Boolean) || "";
  };
  const dateMatches = content.match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}日?/g) || [];
  const normalizeDate = (value = "") => {
    const parts = value.replace(/[年月/.]/g, "-").replace("日", "").split("-");
    return parts.length === 3 ? `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}` : "";
  };
  const knownKeywords = ["产品运营","产品经理","大模型","AIGC","AI","数据分析","用户研究","内容策略","项目管理","行业研究","商业分析","Python","SQL","RAG","Agent"];
  const city = ["北京","上海","深圳","广州","杭州","成都","南京","武汉","西安","苏州","重庆"].find((item) => content.includes(item)) || "";
  const batch = ["秋招提前批","秋招正式批","春招","暑期实习","日常实习","校园招聘","社会招聘"].find((item) => content.includes(item)) || "待确认";
  const link = content.match(/https?:\/\/[^\s，。]+/)?.[0] || "";
  const explicitTitle = labeled(["岗位名称","职位名称","招聘岗位","职位","岗位"]);
  const explicitCompany = labeled(["公司名称","招聘单位","公司","单位"]);
  const likelyTitle = lines.find((line) => /(产品|运营|经理|实习|工程师|设计师|分析师|顾问|专员|研究)/.test(line) && line.length <= 40) || "";
  return {
    title: explicitTitle || likelyTitle || "待整理岗位",
    company: explicitCompany || "待识别公司",
    location: labeled(["工作地点","地点","城市"]) || city || "待确认",
    batch,
    openDate: normalizeDate(dateMatches[0]),
    deadline: normalizeDate(dateMatches[1]),
    category: content.includes("国企") || content.includes("央企") ? "国央企" : content.includes("外企") ? "外企" : "其他",
    keywords: knownKeywords.filter((item) => content.toLowerCase().includes(item.toLowerCase())).slice(0, 8),
    link,
    description: content,
  };
}

export default function Home() {
  const workspace = useWorkspace();
  const [view, setView] = useState<View>("today");
  const [query, setQuery] = useState("");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusedItem, setFocusedItem] = useState<WorkspaceItem | null>(null);
  const [toast, setToast] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const title = navigation.find((item) => item.id === view)?.label || "今日";
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return workspace.items.filter((item) => `${item.title} ${JSON.stringify(item.data)}`.toLowerCase().includes(q)).slice(0, 8);
  }, [query, workspace.items]);

  useEffect(() => {
    function shortcuts(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key.toLowerCase() === "q" && !["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement).tagName)) {
        event.preventDefault();
        setCaptureOpen(true);
      }
    }
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, []);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function navigate(next: View) {
    setFocusedItem(null);
    setView(next);
  }

  const common = { ...workspace, notify, selectedItem: focusedItem ?? undefined };

  return (
    <main className="workspace">
      <div className="ambient ambient-a" /><div className="ambient ambient-b" />
      <section className="app-shell">
        <aside className="sidebar">
          <div className="brand"><span className="brand-glyph">C</span><div><strong>CareerOS</strong><span>AI growth desk</span></div></div>
          <nav aria-label="主导航">
            {navigation.map((item) => (
              <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} type="button" onClick={() => navigate(item.id)} aria-current={view === item.id ? "page" : undefined}>
                <span className="nav-mark">{item.mark}</span><span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
          <button className="collect-button" type="button" onClick={() => setCaptureOpen(true)}>
            <span>快速收集</span><span className="button-orb">＋</span>
          </button>
          <div className="sidebar-foot"><span className="profile">Z</span><div><strong>赵新玥</strong><span>秋招进行中</span></div><button type="button" aria-label="打开设置" onClick={() => setSettingsOpen(true)}>···</button></div>
        </aside>

        <section className="content">
          <header className="topbar">
            <div><span className="eyebrow">PERSONAL WORKSPACE · 2026</span><h1>{title}</h1></div>
            <div className="top-tools">
              <div className="search-island">
                <button className="site-mascot" type="button" aria-label="展开全局搜索" onClick={() => searchRef.current?.focus()}>
                  <span className="mascot-eye eye-left" /><span className="mascot-eye eye-right" />
                </button>
                <div className="global-search">
                  <span aria-hidden="true">⌕</span>
                  <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="全局搜索" placeholder="搜索岗位、知识、资料…  Ctrl K" />
                  {query && <button type="button" aria-label="清除搜索" onClick={() => setQuery("")}>×</button>}
                  {query && (
                    <section className="search-results" aria-label="搜索结果">
                      <header><strong>搜索结果</strong><span>{results.length} 项</span></header>
                      {results.length ? results.map((item) => (
                        <button type="button" key={item.id} onClick={() => { setFocusedItem(item); setView(viewForKind[item.kind]); setQuery(""); }}>
                          <span className={`result-kind kind-${item.kind}`}>{item.kind.slice(0, 1).toUpperCase()}</span>
                          <span><strong>{item.title}</strong><small>{navigation.find((nav) => nav.id === viewForKind[item.kind])?.label}</small></span><b>→</b>
                        </button>
                      )) : <p>没有找到匹配内容，试试公司、技术名词或任务关键词。</p>}
                    </section>
                  )}
                </div>
              </div>
            </div>
          </header>

          {workspace.loading ? <LoadingState /> : workspace.error ? <ErrorState message={workspace.error} retry={workspace.refresh} /> : (
            <>
              {view === "today" && <TodayView key={`today-${focusedItem?.id ?? ""}`} {...common} navigate={navigate} />}
              {view === "tasks" && <TasksView key={`tasks-${focusedItem?.id ?? ""}`} {...common} />}
              {view === "jobs" && <JobsView key={`jobs-${focusedItem?.id ?? ""}`} {...common} navigate={navigate} />}
              {view === "knowledge" && <KnowledgeView key={`knowledge-${focusedItem?.id ?? ""}`} {...common} />}
              {view === "resources" && <ResourcesView key={`resources-${focusedItem?.id ?? ""}`} {...common} />}
              {view === "thoughts" && <ThoughtsView key={`thoughts-${focusedItem?.id ?? ""}`} {...common} />}
            </>
          )}
        </section>
      </section>

      {captureOpen && <QuickCapture workspace={workspace} close={() => setCaptureOpen(false)} notify={notify} />}
      {settingsOpen && <SettingsDrawer items={workspace.items} close={() => setSettingsOpen(false)} notify={notify} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function LoadingState() {
  return <div className="loading-state" role="status"><i /><strong>正在整理你的工作台</strong><span>任务、岗位与知识正在加载</span></div>;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="empty-state"><strong>暂时无法读取数据</strong><p>{message}</p><button type="button" onClick={retry}>重新加载</button></div>;
}

function TodayView({ items, updateItem, navigate, notify }: WorkspaceActions & { navigate: (view: View) => void; notify: (message: string) => void }) {
  const [date, setDate] = useState(todayIso());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const tasks = items.filter((item) => item.kind === "task" && text(item, "dueDate") === date);
  const knowledge = items.filter((item) => item.kind === "knowledge");
  const jobs = items.filter((item) => item.kind === "job");
  const doneCount = tasks.filter((item) => bool(item, "done")).length;
  const review = knowledge[reviewIndex % Math.max(knowledge.length, 1)];

  async function toggleTask(item: WorkspaceItem) {
    await updateItem(item.id, { data: { done: !bool(item, "done") } });
    notify(bool(item, "done") ? "任务已恢复" : "任务完成，做得漂亮");
  }

  return (
    <div className="view-stack today-dashboard">
      <section className="today-first-row">
        <div className="daily-paper-shell">
          <article className="daily-paper">
            <span className="paper-clip" aria-hidden="true" />
            <header><span>{String(new Date(`${date}T00:00:00`).getMonth()+1).padStart(2,"0")} 月</span><small>{new Date(`${date}T00:00:00`).getFullYear()}</small></header>
            <div className="paper-date"><strong>{String(new Date(`${date}T00:00:00`).getDate()).padStart(2,"0")}</strong><span>{prettyDate(date).split("周").pop()}</span></div>
            <p>{encouragements[new Date(`${date}T00:00:00`).getDay()]}</p>
            <footer><span>{tasks.length} 项计划</span><i>{doneCount} 项完成</i></footer>
          </article>
          <div className="daily-date-control"><button type="button" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((open)=>!open)}>选择日期 <span>→</span></button>{calendarOpen&&<DatePicker value={date} choose={(iso)=>{setDate(iso);setCalendarOpen(false);}} />}</div>
        </div>

        <article className="panel today-tasks">
          <PanelHead eyebrow="TODAY" title="今日任务" action="查看全部" onAction={() => navigate("tasks")} />
          <div className="task-list">
            {tasks.length ? tasks.map((task) => <button type="button" className={`task-row ${bool(task, "done") ? "done" : ""}`} key={task.id} onClick={() => void toggleTask(task)}><span className="check">{bool(task, "done") ? "✓" : ""}</span><span><strong>{task.title}</strong><small>{text(task, "category")} · {text(task, "priority") === "high" ? "高优先级" : "按计划推进"}</small></span></button>) : <EmptyInline text="这一天还没有任务" action="去新建" onAction={() => navigate("tasks")} />}
          </div>
        </article>
      </section>

      {review && <section className="review-section restored-review">
        <div className="review-copy"><span className="eyebrow">DAILY REVIEW</span><h2>每日复习知识</h2><p>不是只看一句定义，而是重新理解它解决的问题、适用场景与边界。</p><div className="review-progress"><strong>0{reviewIndex+1}</strong><span>/ 0{knowledge.length}</span></div></div>
        <div className="review-deck">
          <div className="review-card ghost ghost-two" /><div className="review-card ghost ghost-one" />
          <article className={`review-card active knowledge-${text(review,"tone","lilac")}`}>
            <header><span className="review-term">{review.title}</span><em>{text(review,"level")}</em></header>
            <h3>{text(review,"summary")}</h3>
            <p>{text(review,"explanation")}</p>
            <dl><div><dt>先问自己</dt><dd>它解决什么问题？什么情况下不适合使用？</dd></div><div><dt>关联标签</dt><dd>{list(review,"tags").join(" · ")}</dd></div></dl>
            <div className="review-card-actions"><button type="button" onClick={()=>setReviewIndex((reviewIndex-1+knowledge.length)%knowledge.length)}>← 上一张</button><button type="button" onClick={()=>setReviewIndex((reviewIndex+1)%knowledge.length)}>理解了，下一张 →</button></div>
          </article>
        </div>
      </section>}

      <section className="today-insight-grid">
        <article className="panel warm-note"><span className="eyebrow">TODAY NOTE</span><h3>{tasks.length ? `今天有 ${tasks.length} 件事值得认真完成` : "今天暂时没有安排"}</h3><p>{tasks.length ? `已经完成 ${doneCount} 件。不要急着填满时间，先把最重要的一件做好。` : "空白不是浪费，它也可以用来恢复能量、整理方向。"}</p></article>
        <article className="panel next-step"><span className="eyebrow">NEXT STEP</span><h3>{jobs.filter((item)=>text(item,"status")==="准备中").length} 个岗位正在准备</h3><p>把岗位关键词和自己的项目案例连起来，会比重复收藏更接近机会。</p><button type="button" onClick={()=>navigate("jobs")}>查看求职进度 →</button></article>
      </section>
    </div>
  );
}

function DatePicker({ value, choose }: { value: string; choose: (date: string) => void }) {
  const [month, setMonth] = useState(new Date(`${value.slice(0, 7)}-01T00:00:00`));
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return <section className="date-popover" aria-label="日期选择器">
    <header><button type="button" aria-label="上个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><strong>{month.getFullYear()}年 {month.getMonth() + 1}月</strong><button type="button" aria-label="下个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></header>
    <div className="date-week">{["一","二","三","四","五","六","日"].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="date-grid">{Array.from({ length: offset + count }, (_, index) => index < offset ? <span key={`e-${index}`} /> : (() => { const day = index - offset + 1; const iso = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; return <button type="button" key={iso} className={value === iso ? "active" : ""} aria-pressed={value === iso} onClick={() => choose(iso)}>{day}</button>; })())}</div>
    <button className="today-button" type="button" onClick={() => choose(todayIso())}>回到今天</button>
  </section>;
}

function TasksView({ items, createItem, updateItem, removeItem, notify, selectedItem }: WorkspaceActions & { notify: (message: string) => void; selectedItem?: WorkspaceItem }) {
  const tasks = items.filter((item) => item.kind === "task");
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const [editing, setEditing] = useState<WorkspaceItem | "new" | null>(selectedItem?.kind === "task" ? selectedItem : null);
  const [draftDate, setDraftDate] = useState(todayIso());
  const [draftCategory, setDraftCategory] = useState("工作");
  const [celebrating, setCelebrating] = useState(false);
  const years = Array.from(new Set(tasks.map((item)=>text(item,"dueDate").slice(0,4)).filter(Boolean))).sort().reverse();
  const [archiveYear, setArchiveYear] = useState(years[0] || String(new Date().getFullYear()));
  const [archiveMonth, setArchiveMonth] = useState("全部");
  const visible = tasks.filter((item) => filter === "all" || (filter === "done" ? bool(item, "done") : !bool(item, "done")));
  const dimensions = ["工作","求职","学习","项目","生活"];
  const taskSections = [
    {name:"工作",eyebrow:"WORK",hint:"项目任务也归在这里",tone:"work"},
    {name:"生活",eyebrow:"LIFE",hint:"照顾生活与自己的节奏",tone:"life"},
    {name:"求职",eyebrow:"CAREER",hint:"投递、准备与复盘",tone:"career"},
    {name:"学习",eyebrow:"LEARN",hint:"课程、阅读与知识复习",tone:"learn"},
  ];
  const weekStart = new Date(`${todayIso()}T00:00:00`);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay()+6)%7));
  const weekDates = Array.from({length:7},(_,index)=>{const date=new Date(weekStart);date.setDate(date.getDate()+index);return isoForDate(date);});
  const archived = tasks.filter((item)=>bool(item,"done") && text(item,"dueDate").startsWith(`${archiveYear}-${archiveMonth==="全部"?"":archiveMonth}`));
  const archiveGroups = archived.reduce<Record<string,WorkspaceItem[]>>((groups,item)=>{const week=weekStartFor(text(item,"dueDate"));(groups[week]??=[]).push(item);return groups;},{});

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) return notify("请输入任务名称");
    const data = { dueDate: String(form.get("dueDate")), priority: String(form.get("priority")), category: String(form.get("category")), note: String(form.get("note") || ""), done: editing !== "new" && editing ? bool(editing, "done") : false };
    if (editing === "new") await createItem({ kind: "task", title, data });
    else if (editing) await updateItem(editing.id, { title, data });
    setEditing(null); notify(editing === "new" ? "任务已添加" : "任务已更新");
  }

  async function toggle(task: WorkspaceItem) {
    await updateItem(task.id, { data: { done: !bool(task, "done") } });
    if (!bool(task,"done")) {
      setCelebrating(true);
      window.setTimeout(()=>setCelebrating(false),1800);
    }
  }

  return <div className="view-stack">
    <section className="toolbar">
      <div className="segmented">{(["list","calendar"] as const).map((item) => <button type="button" key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item === "list" ? "清单" : "月历"}</button>)}</div>
      {mode === "list" && <><div className="filter-pills">{(["all","open","done"] as const).map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "all" ? "全部" : item === "open" ? "待完成" : "已完成"}</button>)}</div>
      <button className="primary-button" type="button" onClick={() => { setDraftDate(todayIso()); setDraftCategory("工作"); setEditing("new"); }}><span>新建任务</span><span className="button-orb">＋</span></button></>}
    </section>
    {mode === "list" ? <><section className="task-quadrants">
      {taskSections.map((section)=>{const sectionTasks=visible.filter((task)=>section.name==="工作"?["工作","项目"].includes(text(task,"category")):text(task,"category")===section.name);return <article className={`task-section task-section-${section.tone}`} key={section.name}>
        <header><div><span className="eyebrow">{section.eyebrow}</span><h2>{section.name}</h2><p>{section.hint}</p></div><strong>{sectionTasks.filter((item)=>bool(item,"done")).length}/{sectionTasks.length}</strong></header>
        <div className="section-task-list">{sectionTasks.map((task)=><article className={bool(task,"done")?"done":""} key={task.id}>
          <button className="task-check" type="button" aria-label={bool(task,"done")?`恢复 ${task.title}`:`完成 ${task.title}`} onClick={()=>void toggle(task)}>{bool(task,"done")?"✓":""}</button>
          <button className="section-task-copy" type="button" onClick={()=>setEditing(task)}><strong>{task.title}</strong><small>{text(task,"dueDate")} · {text(task,"priority")}</small></button>
          <button className="section-task-delete" type="button" aria-label={`删除 ${task.title}`} onClick={()=>void removeItem(task.id).then(()=>notify("任务已删除"))}>×</button>
        </article>)}</div>
        <button className="section-add-task" type="button" onClick={()=>{setDraftDate(todayIso());setDraftCategory(section.name);setEditing("new");}}>＋ 添加{section.name}任务</button>
      </article>})}
    </section>

    <section className="panel week-overview">
      <header className="week-overview-head"><div><span className="eyebrow">WEEK OVERVIEW</span><h2>本周任务总览</h2><p>按不同维度查看这一周的投入，避免所有事情挤在同一天。</p></div><div className="category-legend">{dimensions.map((item,index)=><span key={item}><i className={`dimension-${index+1}`} />{item}</span>)}</div></header>
      <div className="week-columns">{weekDates.map((iso)=><article className="week-day" key={iso}><header><span>{prettyDate(iso).slice(-2)}</span><strong>{Number(iso.slice(-2))}</strong></header><div>{tasks.filter((item)=>text(item,"dueDate")===iso).map((item)=><button className={`week-item category-bg-${text(item,"category")}`} type="button" key={item.id} onClick={()=>setEditing(item)}><i>{bool(item,"done")?"✓":"○"}</i>{item.title}</button>)}</div><button className="add-week-task" type="button" onClick={()=>{setDraftDate(iso);setEditing("new");}}>＋ 添加</button></article>)}</div>
    </section>

    <section className="panel task-archive">
      <header className="archive-heading"><div><span className="eyebrow">WEEKLY ARCHIVE</span><h2>每周任务归档</h2><p>按周回看完成记录，更容易看见一段时间里的投入与节奏。</p></div><div className="archive-selectors"><select aria-label="归档年份" value={archiveYear} onChange={(event)=>setArchiveYear(event.target.value)}>{years.map((year)=><option key={year}>{year}</option>)}</select><select aria-label="归档月份" value={archiveMonth} onChange={(event)=>setArchiveMonth(event.target.value)}><option>全部</option>{Array.from({length:12},(_,index)=>String(index+1).padStart(2,"0")).map((month)=><option key={month} value={month}>{Number(month)}月</option>)}</select></div></header>
      <div className="archive-folders">{Object.entries(archiveGroups).sort(([a],[b])=>b.localeCompare(a)).map(([week,dateTasks],index)=>{const end=new Date(`${week}T00:00:00`);end.setDate(end.getDate()+6);return <article className={`archive-folder archive-${index%4+1}`} key={week}><span className="folder-tab" /><strong>{prettyDate(week).replace(/周.+/,"")} — {prettyDate(isoForDate(end)).replace(/周.+/,"")}</strong><small>这一周完成 {dateTasks.length} 项</small><div>{dateTasks.sort((a,b)=>text(a,"dueDate").localeCompare(text(b,"dueDate"))).map((item)=><button type="button" key={item.id} onClick={()=>setEditing(item)}><span>{Number(text(item,"dueDate").slice(-2))}日</span> ✓ {item.title}</button>)}</div></article>})}</div>
      {!archived.length&&<div className="archive-empty"><span>○</span><div><strong>这个时间段还没有已完成任务</strong><p>完成任务后，它会自动进入这里，成为可以回看的成长记录。</p></div></div>}
    </section>
    </> : <MonthCalendar tasks={tasks} edit={setEditing} createOnDate={(iso) => { setDraftDate(iso); setEditing("new"); }} />}

    {celebrating&&<div className="celebration" role="status"><div className="confetti">{Array.from({length:18},(_,index)=><i key={index} style={{"--i":index} as CSSProperties} />)}</div><div className="celebration-core"><span>✓</span><strong>完成一件，离目标更近一点</strong></div></div>}
    {editing && <Modal title={editing === "new" ? "新建任务" : "编辑任务"} close={() => setEditing(null)}>
      <form className="editor-form compact-task-form" onSubmit={saveTask}>
        <Field label="任务名称"><input name="title" autoFocus defaultValue={editing === "new" ? "" : editing.title} placeholder="例如：整理百度 AI 产品运营 JD" /></Field>
        <div className="form-grid"><Field label="日期"><input name="dueDate" type="date" defaultValue={editing === "new" ? draftDate : text(editing, "dueDate")} /></Field><Field label="优先级"><select name="priority" defaultValue={editing === "new" ? "medium" : text(editing, "priority")}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></Field></div>
        <Field label="分类"><select name="category" defaultValue={editing === "new" ? draftCategory : text(editing, "category")}><option>工作</option><option>求职</option><option>学习</option><option>项目</option><option>生活</option></select></Field>
        <Field label="备注"><textarea name="note" defaultValue={editing === "new" ? "" : text(editing, "note")} placeholder="补充下一步动作或完成标准" /></Field>
        <div className="form-actions">{editing !== "new" && <button className="danger-button" type="button" onClick={() => void removeItem(editing.id).then(() => { setEditing(null); notify("任务已删除"); })}>删除</button>}<button className="primary-button" type="submit"><span>保存任务</span><span className="button-orb">✓</span></button></div>
      </form>
    </Modal>}
  </div>;
}

function MonthCalendar({ tasks, edit, createOnDate }: { tasks: WorkspaceItem[]; edit: (task: WorkspaceItem) => void; createOnDate: (iso: string) => void }) {
  const [month, setMonth] = useState(new Date("2026-07-01T00:00:00"));
  const taskYears = tasks.map((item)=>Number(text(item,"dueDate").slice(0,4))).filter(Boolean);
  const calendarYears = Array.from(new Set([month.getFullYear()-2,month.getFullYear()-1,month.getFullYear(),month.getFullYear()+1,...taskYears])).sort();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`;
  const monthTasks = tasks.filter((item)=>text(item,"dueDate").startsWith(monthPrefix));
  const monthDone = monthTasks.filter((item)=>bool(item,"done")).length;
  const categories = ["工作","求职","学习","项目","生活"];
  return <div className="month-focus"><section className="month-plan-summary">
    <div><span className="eyebrow">MONTH PLAN</span><h2>{month.getMonth()+1} 月计划汇总</h2><p>共 {monthTasks.length} 项，已完成 {monthDone} 项，完成率 {monthTasks.length?Math.round(monthDone/monthTasks.length*100):0}%</p></div>
    <div>{categories.map((category,index)=><span className={`summary-category dimension-${index+1}`} key={category}><i />{category}<strong>{monthTasks.filter((item)=>text(item,"category")===category).length}</strong></span>)}</div>
  </section><section className="panel month-view">
    <header className="month-head"><button type="button" aria-label="上个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><div><span className="eyebrow">MONTH VIEW</span><span className="month-jump"><select aria-label="选择年份" value={month.getFullYear()} onChange={(event)=>setMonth(new Date(Number(event.target.value),month.getMonth(),1))}>{calendarYears.map((year)=><option key={year} value={year}>{year} 年</option>)}</select><select aria-label="选择月份" value={month.getMonth()} onChange={(event)=>setMonth(new Date(month.getFullYear(),Number(event.target.value),1))}>{Array.from({length:12},(_,index)=><option key={index} value={index}>{index+1} 月</option>)}</select></span></div><button type="button" aria-label="下个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></header>
    <div className="month-week">{["周一","周二","周三","周四","周五","周六","周日"].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="month-grid">{Array.from({ length: offset + count }, (_, index) => index < offset ? <article className="empty" key={`e-${index}`} /> : (() => { const day = index - offset + 1; const iso = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`; const dayTasks = tasks.filter((task) => text(task, "dueDate") === iso); return <article key={iso} className={iso === todayIso() ? "today" : ""}><header><strong>{day}</strong>{iso === todayIso() && <span>今天</span>}</header><div>{dayTasks.slice(0,3).map((task) => <button type="button" className={`calendar-task cat-${text(task,"category")}`} key={task.id} onClick={() => edit(task)}>{task.title}</button>)}</div><button className="day-add" type="button" aria-label={`在 ${iso} 新建任务`} onClick={() => createOnDate(iso)}>＋</button></article>; })())}</div>
  </section></div>;
}

function JobsView({ items, createItem, updateItem, removeItem, uploadFile, notify, selectedItem, navigate }: WorkspaceActions & { notify: (message: string) => void; selectedItem?: WorkspaceItem; navigate: (view: View) => void }) {
  const jobs = items.filter((item) => item.kind === "job");
  const [category, setCategory] = useState("全部");
  const [selected, setSelected] = useState<WorkspaceItem | null>(selectedItem?.kind === "job" ? selectedItem : null);
  const [editing, setEditing] = useState<WorkspaceItem | "new" | null>(null);
  const categories = ["全部", "国央企", "大厂", "高校", "外企", "其他"];
  const visible = category === "全部" ? jobs : jobs.filter((job) => text(job, "category") === category);
  const stages = ["未分析", "关注中", "准备中", "已投递", "面试中", "已结束"];
  const companyGroups = Array.from(visible.reduce<Map<string,WorkspaceItem[]>>((groups,job)=>{const company=text(job,"company","待整理公司");groups.set(company,[...(groups.get(company)||[]),job]);return groups;},new Map()));
  const techStack = Array.from(new Set(visible.flatMap((job)=>list(job,"keywords"))));

  async function saveJob(event: FormEvent<HTMLFormElement>, pastedImage?: File | null) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const raw = String(form.get("rawJd") || "");
    const chosen = form.get("jdImage");
    const image = pastedImage || (chosen instanceof File && chosen.size ? chosen : null);
    if (!raw.trim() && !image) return notify("请粘贴 JD 文字或放入一张岗位截图");
    const parsed = parseJdText(raw);
    let imageKey = "";
    if (image) imageKey = (await uploadFile(image)).key;
    const data = { ...parsed, status: "未分析", sourceImageKey: imageKey, sourceImageName: image?.name || "" };
    const saved = await createItem({ kind: "job", title: parsed.title, data });
    setEditing(null); setSelected(saved); notify(image && !raw.trim() ? "岗位截图已保存，可在详情页继续补充" : "JD 已自动整理");
  }

  async function saveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim() || "待整理岗位";
    const data = {
      company: String(form.get("company") || "待识别公司"), location: String(form.get("location") || "待确认"),
      batch: String(form.get("batch") || "待确认"), openDate: String(form.get("openDate") || ""),
      deadline: String(form.get("deadline") || ""), status: String(form.get("status") || "未分析"),
      category: String(form.get("category") || "其他"),
      keywords: String(form.get("keywords") || "").split(/[,，]/).map((item)=>item.trim()).filter(Boolean),
      link: String(form.get("link") || ""), description: String(form.get("description") || ""),
      sourceImageKey: text(selected,"sourceImageKey"), sourceImageName: text(selected,"sourceImageName"),
    };
    const saved = await updateItem(selected.id,{title,data});
    setSelected(saved);
    notify("JD 详情已保存");
  }

  if (selected) return <div className="view-stack detail-page">
    <button className="inline-back" type="button" onClick={() => setSelected(null)}>← 返回岗位列表</button>
    <form className="job-document editable-paper" onSubmit={saveDocument}>
      <header><span className="eyebrow">JOB DESCRIPTION · 点击内容即可编辑</span><input className="paper-title-input" name="title" defaultValue={selected.title} aria-label="岗位名称" /><div className="paper-company-line"><input name="company" defaultValue={text(selected,"company")} aria-label="公司" /><span>·</span><input name="location" defaultValue={text(selected,"location")} aria-label="地点" /><span>·</span><input name="batch" defaultValue={text(selected,"batch")} aria-label="招聘批次" /></div>
      <div className="paper-meta-grid"><label>开放日期<input name="openDate" type="date" defaultValue={text(selected,"openDate")} /></label><label>截止日期<input name="deadline" type="date" defaultValue={text(selected,"deadline")} /></label><label>进度<select name="status" defaultValue={text(selected,"status")}>{stages.map((stage)=><option key={stage}>{stage}</option>)}</select></label><label>分类<select name="category" defaultValue={text(selected,"category")}><option>国央企</option><option>大厂</option><option>高校</option><option>外企</option><option>其他</option></select></label></div></header>
      <label className="paper-field">岗位关键词<input name="keywords" defaultValue={list(selected,"keywords").join("，")} placeholder="用逗号分隔关键词" /></label>
      <label className="paper-field">招聘网页<input name="link" type="url" defaultValue={text(selected,"link")} placeholder="https://" /></label>
      {text(selected,"sourceImageKey") && <figure className="jd-source-image"><img src={`/api/files/${encodeURIComponent(text(selected,"sourceImageKey"))}`} alt={text(selected,"sourceImageName","岗位截图")} /><figcaption>原始岗位截图</figcaption></figure>}
      <label className="paper-field paper-description">岗位信息<textarea name="description" defaultValue={text(selected,"description")} placeholder="在这里继续粘贴、修改岗位职责与任职要求……" /></label>
      <div className="paper-savebar"><span>所有文字都可以直接选择、复制、粘贴和修改。</span><div><button className="danger-button" type="button" onClick={() => void removeItem(selected.id).then(() => { setSelected(null); notify("岗位已删除"); })}>删除</button><button className="primary-button" type="submit"><span>保存修改</span><span className="button-orb">✓</span></button></div></div>
    </form>
  </div>;

  return <div className="view-stack">
    <section className="toolbar"><div className="filter-pills">{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><button className="primary-button" type="button" onClick={() => setEditing("new")}><span>添加 JD</span><span className="button-orb">＋</span></button></section>
    <section className="company-groups">{companyGroups.map(([company,companyJobs])=><article className="company-group" key={company}><header className="company-head"><span className="company-logo">{company.slice(0,1)}</span><div><small>{text(companyJobs[0],"category")} · {text(companyJobs[0],"location")}</small><h2>{company}</h2><p>{companyJobs.length} 个关注岗位</p></div></header><div className="job-cards">{companyJobs.map((job)=><article className="job-card grouped" key={job.id}>
      <button className="job-main" type="button" onClick={() => setSelected(job)}><span><small>{text(job,"batch")} · {text(job,"location")}</small><strong>{job.title}</strong></span></button>
      <div className="tag-row">{list(job,"keywords").map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="job-facts"><span><small>开放日期</small><strong>{text(job,"openDate","待确认")}</strong></span><span><small>截止日期</small><strong>{text(job,"deadline","待确认")}</strong></span>{text(job,"link")?<a href={text(job,"link")} target="_blank" rel="noreferrer">招聘官网 ↗</a>:<span><small>招聘官网</small><strong>待补充</strong></span>}</div>
      <label className="job-stage"><span>当前进度</span><select value={text(job,"status")} onChange={(event)=>void updateItem(job.id,{data:{status:event.target.value}}).then(()=>notify(`状态已更新为「${event.target.value}」`))}>{stages.map((stage)=><option key={stage}>{stage}</option>)}</select></label>
    </article>)}</div></article>)}</section>
    <section className="tech-stack-panel"><div><span className="eyebrow">TECH STACK FROM JD</span><h2>从岗位要求中提取的关键词</h2><p>用这些关键词检查知识储备，也可以直接进入知识库继续整理。</p></div><div className="tech-links">{techStack.map((keyword)=><button type="button" key={keyword} onClick={()=>navigate("knowledge")}>{keyword} <span>→</span></button>)}</div></section>
    {!visible.length && <div className="empty-state"><strong>这个分类还没有岗位</strong><p>添加 JD 后会自动出现在对应分类中。</p><button type="button" onClick={() => setEditing("new")}>添加第一个岗位</button></div>}
    {editing && <JobEditor save={saveJob} close={() => setEditing(null)} />}
  </div>;
}

function JobEditor({ save, close }: { save: (event: FormEvent<HTMLFormElement>, pastedImage?: File | null) => void; close: () => void }) {
  const [pastedImage,setPastedImage]=useState<File|null>(null);
  return <Modal title="一键导入 JD" close={close}><p className="jd-import-intro">把招聘网页里的整段文字直接粘贴进来，或放入一张岗位截图。系统会先整理成详情页，你再按需要修改。</p><form className="editor-form jd-import-form" onSubmit={(event)=>save(event,pastedImage)}>
    <label className="jd-dropzone" onDragOver={(event)=>event.preventDefault()} onDrop={(event)=>{event.preventDefault();const file=event.dataTransfer.files[0];if(file?.type.startsWith("image/"))setPastedImage(file);}}>
      <span>粘贴 JD 文字</span>
      <textarea name="rawJd" autoFocus placeholder={"示例：\n公司：百度\n岗位：AI 产品运营实习生\n工作地点：北京\n\n也可以直接粘贴完整的岗位职责和任职要求。"} onPaste={(event)=>{const file=Array.from(event.clipboardData.files).find((item)=>item.type.startsWith("image/"));if(file)setPastedImage(file);}} />
      <small>支持粘贴文字、粘贴截图或把图片拖到这里</small>
    </label>
    <label className={`jd-image-picker ${pastedImage?"has-image":""}`}><input name="jdImage" type="file" accept="image/*" onChange={(event)=>setPastedImage(event.target.files?.[0]||null)} /><span>{pastedImage?`已放入：${pastedImage.name}`:"＋ 选择一张岗位截图"}</span></label>
    <div className="form-actions"><button className="primary-button" type="submit"><span>整理成详情页</span><span className="button-orb">→</span></button></div>
  </form></Modal>;
}

function KnowledgeView({ items, createItem, updateItem, removeItem, notify, selectedItem }: WorkspaceActions & { notify: (message: string) => void; selectedItem?: WorkspaceItem }) {
  const cards = items.filter((item) => item.kind === "knowledge");
  const [selected, setSelected] = useState<WorkspaceItem | null>(selectedItem?.kind === "knowledge" ? selectedItem : null);
  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState<{ title: string; summary: string; explanation: string } | null>(null);
  const [editing, setEditing] = useState<WorkspaceItem | null>(null);

  function explain() {
    const value = question.trim();
    if (!value) return notify("先输入你想理解的概念");
    const title = value.replace(/[？?].*$/, "").slice(0, 28);
    setDraft({ title, summary: `${title} 可以从“它解决什么问题、在什么场景使用、有什么边界”三个角度理解。`, explanation: `先明确 ${title} 的输入、处理过程与输出，再把它放进一个真实产品场景中验证。这个草稿可继续编辑后保存为知识卡。` });
  }

  async function saveDraft() {
    if (!draft) return;
    const item = await createItem({ kind: "knowledge", title: draft.title, data: { level: "刚遇到", tone: "lilac", summary: draft.summary, explanation: draft.explanation, tags: ["待整理"] } });
    setDraft(null); setQuestion(""); setSelected(item); notify("知识卡已保存");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const updated = await updateItem(editing.id, { title: String(form.get("title")), data: { level: String(form.get("level")), summary: String(form.get("summary")), explanation: String(form.get("explanation")), tags: String(form.get("tags")).split(/[,，]/).filter(Boolean) } });
    setEditing(null); setSelected(updated); notify("知识卡已更新");
  }

  if (selected) return <div className="view-stack detail-page">
    <button className="inline-back" type="button" onClick={() => setSelected(null)}>← 返回知识库</button>
    <article className="knowledge-document">
      <header><span className="eyebrow">KNOWLEDGE NOTE</span><h2>{selected.title}</h2><p>{text(selected,"summary")}</p><div><span>{text(selected,"level")}</span>{list(selected,"tags").map((tag)=><span key={tag}>#{tag}</span>)}</div></header>
      <section><h3>概念解析</h3><p>{text(selected,"explanation") || `${selected.title} 是一个需要继续补充的知识概念。建议从定义、输入输出和应用场景三个方面建立完整理解。`}</p><p>{selected.title} 的价值不只在于记住定义，而是能够判断它解决什么问题、需要哪些前提，以及如何与真实产品或工作流程连接。</p></section>
      <section><h3>什么时候使用</h3><ul><li>当问题与它的核心能力和输入条件相匹配时。</li><li>当它能比现有方案更清晰地降低成本、提高质量或改善体验时。</li><li>当团队能够验证输出，并为错误结果准备兜底方式时。</li></ul></section>
      <section><h3>理解边界</h3><blockquote>不要只问“它能做什么”，还要问“它依赖什么、不能保证什么、失败时会发生什么”。</blockquote><p>学习一个技术概念时，把适用条件和限制一起记录，才能把知识真正用于产品判断。</p></section>
      <section><h3>复习问题</h3><ol><li>请用自己的话解释 {selected.title}。</li><li>它的输入、处理过程和输出分别是什么？</li><li>在什么情况下不应该使用它？</li><li>你能想到哪个真实产品场景？</li></ol></section>
    </article>
    <div className="detail-actions"><button type="button" onClick={() => setEditing(selected)}>编辑卡片</button><button className="primary-button" type="button" onClick={() => void updateItem(selected.id,{data:{level:"已理解"}}).then((item)=>{setSelected(item);notify("已更新为已理解");})}><span>标记为已理解</span><span className="button-orb">✓</span></button></div>
    {editing && <Drawer title="编辑知识卡" close={() => setEditing(null)}><form className="editor-form" onSubmit={saveEdit}><Field label="标题"><input name="title" defaultValue={editing.title} /></Field><Field label="掌握程度"><select name="level" defaultValue={text(editing,"level")}><option>刚遇到</option><option>学习中</option><option>能解释</option><option>已理解</option></select></Field><Field label="摘要"><textarea name="summary" defaultValue={text(editing,"summary")} /></Field><Field label="我的解释"><textarea name="explanation" defaultValue={text(editing,"explanation")} /></Field><Field label="标签"><input name="tags" defaultValue={list(editing,"tags").join("，")} /></Field><div className="form-actions"><button className="danger-button" type="button" onClick={() => void removeItem(editing.id).then(()=>{setEditing(null);setSelected(null);notify("知识卡已删除");})}>删除</button><button className="primary-button" type="submit"><span>保存修改</span><span className="button-orb">✓</span></button></div></form></Drawer>}
  </div>;

  return <div className="view-stack">
    <section className="ask-panel knowledge-search-panel"><div className="knowledge-search-copy"><span className="eyebrow">KNOWLEDGE ASSISTANT</span><h2>想理解什么？</h2><p>输入一个概念或问题，从定义、场景和边界开始梳理。</p></div><div className="knowledge-search-side"><div className="ask-box"><span className="ask-symbol" aria-hidden="true">?</span><input value={question} onChange={(event)=>setQuestion(event.target.value)} onKeyDown={(event)=>{if(event.key==="Enter") explain();}} placeholder="输入概念，例如：RAG 和微调有什么区别？" aria-label="知识问题" />{question&&<button className="ask-clear" type="button" aria-label="清空问题" onClick={()=>setQuestion("")}>×</button>}<button className="ask-submit" type="button" onClick={explain} aria-label="生成解释草稿"><span>开始理解</span><i>→</i></button></div><div className="suggestions"><span>可以试试</span>{["MCP 是什么？","Agent 与 Workflow 的区别？"].map((item)=><button type="button" key={item} onClick={()=>setQuestion(item)}>{item}</button>)}</div></div></section>
    {draft && <section className="panel answer-panel"><PanelHead eyebrow="DRAFT" title={draft.title} /><div className="answer-grid"><article><small>一句话理解</small><p>{draft.summary}</p></article><article><small>理解路径</small><p>{draft.explanation}</p></article></div><div className="detail-actions"><button type="button" onClick={()=>setDraft(null)}>放弃草稿</button><button className="primary-button" type="button" onClick={()=>void saveDraft()}><span>保存为知识卡</span><span className="button-orb">＋</span></button></div></section>}
    <section className="knowledge-grid">{cards.map((card,index)=><button type="button" className={`knowledge-card knowledge-${text(card,"tone","lilac")}`} key={card.id} onClick={()=>setSelected(card)}><header><span className="card-number">0{index+1}</span><em>{text(card,"level")}</em></header><h3>{card.title}</h3><p>{text(card,"summary")}</p><div className="knowledge-card-tags">{list(card,"tags").map((tag)=><span key={tag}>{tag}</span>)}</div><small>{text(card,"explanation")}</small><b>阅读解析 <i>→</i></b></button>)}</section>
  </div>;
}

function ResourcesView({ items, createItem, updateItem, removeItem, uploadFile, notify, selectedItem }: WorkspaceActions & { notify: (message: string) => void; selectedItem?: WorkspaceItem }) {
  const resources = items.filter((item) => item.kind === "resource");
  const [folder, setFolder] = useState("全部资料");
  const [selected, setSelected] = useState<WorkspaceItem | null>(selectedItem?.kind === "resource" ? selectedItem : null);
  const [adding, setAdding] = useState(false);
  const [addMode,setAddMode]=useState<"file"|"note">("file");
  const [uploadName,setUploadName]=useState("");
  const [uploading,setUploading]=useState(false);
  const folders = ["全部资料", ...Array.from(new Set(["网课笔记",...resources.map((item) => text(item,"folder","未分类"))]))];
  const visible = folder === "全部资料" ? resources : resources.filter((item)=>text(item,"folder")===folder);
  const folderGroups = folders.slice(1).map((name)=>({name,items:resources.filter((item)=>text(item,"folder","未分类")===name)}));

  async function addResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title")||"").trim();
    if(!title) return notify("请输入资料名称");
    if(addMode==="note") {
      const content=String(form.get("content")||"").trim();
      if(!content)return notify("请先写下网课笔记内容");
      const item=await createItem({kind:"resource",title,data:{folder:"网课笔记",type:"笔记",status:"已记录",progress:100,content,courseDate:String(form.get("courseDate")||todayIso())}});
      setAdding(false);setSelected(item);notify("网课笔记已保存");return;
    }
    const file = form.get("file");
    const url=String(form.get("url")||"").trim();
    if(!(file instanceof File&&file.size)&&!url)return notify("请选择本地文件，或填写一个网页链接");
    let fileData: Record<string, unknown> = {};
    let resourceType="网页";
    try {
      if(file instanceof File && file.size) {
        setUploading(true);notify("正在上传本地文件…");
        const uploaded=await uploadFile(file);
        fileData={key:uploaded.key,name:uploaded.name,size:uploaded.size,mimeType:uploaded.type};
        const extension=file.name.split(".").pop()?.toLowerCase();
        resourceType=extension==="pdf"?"PDF":extension&&["doc","docx","ppt","pptx","xls","xlsx"].includes(extension)?"文件":"文件";
      }
      const item = await createItem({kind:"resource",title,data:{folder:String(form.get("folder")||"未分类"),type:resourceType,status:"待读",progress:0,url,...fileData}});
      setAdding(false);setUploadName("");setSelected(item);notify(file instanceof File&&file.size?"文件已上传并保存":"网页资料已保存");
    } catch(cause) {
      notify(cause instanceof Error?cause.message:"上传失败，请重试");
    } finally {
      setUploading(false);
    }
  }

  async function saveNote(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!selected)return;
    const form=new FormData(event.currentTarget);
    const title=String(form.get("title")||"").trim();const content=String(form.get("content")||"").trim();
    if(!title||!content)return notify("请填写笔记标题和内容");
    const item=await updateItem(selected.id,{title,data:{folder:"网课笔记",type:"笔记",status:text(selected,"status","已记录"),progress:100,content,courseDate:String(form.get("courseDate")||todayIso())}});
    setSelected(item);notify("笔记已保存");
  }

  if(selected) {
    const fileKey=text(selected,"key");
    const url=fileKey?`/api/files/${encodeURIComponent(fileKey)}`:text(selected,"url");
    if(text(selected,"type")==="笔记")return <div className="view-stack resource-detail-page"><button className="inline-back" type="button" onClick={()=>setSelected(null)}>← 返回「网课笔记」</button><form className="course-note-paper" onSubmit={saveNote}><header><div><span className="eyebrow">COURSE NOTE</span><input name="title" defaultValue={selected.title} aria-label="笔记标题" /></div><label>上课日期<input name="courseDate" type="date" defaultValue={text(selected,"courseDate",todayIso())} /></label></header><textarea name="content" defaultValue={text(selected,"content")} aria-label="笔记内容" placeholder={"在这里记录课程重点、自己的理解和下一步行动……\n\n一、今天学到了什么\n\n二、哪些内容还没理解\n\n三、课后要做什么"} /><footer><span>内容会随工作台数据一起保存。</span><div><button className="danger-button" type="button" onClick={()=>void removeItem(selected.id).then(()=>{setSelected(null);notify("笔记已删除");})}>删除笔记</button><button className="primary-button" type="submit"><span>保存笔记</span><span className="button-orb">✓</span></button></div></footer></form></div>;
    return <div className="view-stack resource-detail-page"><button className="inline-back" type="button" onClick={()=>setSelected(null)}>← 返回「{text(selected,"folder")}」</button><section className={`resource-detail-hero resource-${(resources.indexOf(selected)%4)+1}`}><div><span className="eyebrow">{text(selected,"folder")} · {text(selected,"type")}</span><h2>{selected.title}</h2><p>{text(selected,"name")||text(selected,"url")||"集中保存的个人资料条目"}</p></div><div className="resource-detail-progress"><strong>{numberValue(selected,"progress")}%</strong><span>阅读进度</span></div></section><section className="resource-entry-list"><article><span className="entry-icon">{text(selected,"type")==="PDF"?"P":text(selected,"type")==="网页"?"↗":text(selected,"type")==="文件"?"F":"N"}</span><div><small>阅读状态</small><h3>{text(selected,"status")}</h3><input className="progress-range" type="range" min="0" max="100" value={numberValue(selected,"progress")} onChange={(event)=>void updateItem(selected.id,{data:{progress:Number(event.target.value)}}).then(setSelected)} aria-label="阅读进度" /></div></article></section><div className="detail-actions"><button className="danger-button" type="button" onClick={()=>void removeItem(selected.id).then(()=>{setSelected(null);notify("资料已删除");})}>删除</button>{url?<a className="primary-link" href={url} target="_blank" rel="noreferrer">打开资料 ↗</a>:<button type="button" disabled>暂无可打开内容</button>}</div></div>;
  }

  return <div className="view-stack"><section className="toolbar">{folder==="全部资料"?<div><span className="eyebrow">RESOURCE LIBRARY</span><strong className="toolbar-title">主题文件夹</strong></div>:<button className="inline-back" type="button" onClick={()=>setFolder("全部资料")}>← 返回全部文件夹</button>}<div className="resource-toolbar-actions">{folder==="网课笔记"&&<button className="secondary-button" type="button" onClick={()=>{setAddMode("note");setAdding(true);}}>写网课笔记</button>}<button className="primary-button" type="button" onClick={()=>{setAddMode(folder==="网课笔记"?"note":"file");setAdding(true);}}><span>{folder==="网课笔记"?"新建笔记":"添加资料"}</span><span className="button-orb">＋</span></button></div></section><p className="resource-guide">本地文件会上传到你的云端资料库；“网课笔记”用于记录课程重点、理解和课后行动。</p>{folder==="全部资料"?<section className="resource-folder-grid">{folderGroups.map(({name,items:folderItems},index)=>{const progress=folderItems.length?Math.round(folderItems.reduce((sum,item)=>sum+numberValue(item,"progress"),0)/folderItems.length):0;return <button type="button" className={`resource-folder-card resource-${index%4+1} ${name==="网课笔记"?"course-note-folder":""}`} key={name} onClick={()=>setFolder(name)}><span className="folder-tab" /><span className="folder-label"><strong>{folderItems.length} 项</strong><small>0{index+1}</small></span><span className="folder-sheet"><em>{name==="网课笔记"?"NOTE":"•••"}</em><h3>{name}</h3><p>{folderItems.length?folderItems.map((item)=>item.title).slice(0,2).join(" · "):name==="网课笔记"?"记录每一节网课的重点与思考":"这个文件夹还没有资料"}</p><div className="progress-track"><i style={{width:`${progress}%`}} /></div><small>{name==="网课笔记"?"笔记整理度":"阅读进度"} <b>{progress}%</b></small></span></button>;})}</section>:<section className="resource-folder-entries"><header><span className="folder-tab" /><div><span className="eyebrow">{folder==="网课笔记"?"COURSE NOTES":"OPEN FOLDER"}</span><h2>{folder}</h2><p>{visible.length} 份{folder==="网课笔记"?"笔记":"资料"}</p></div></header><div>{visible.map((item,index)=><button type="button" className={`resource-entry resource-${index%4+1}`} key={item.id} onClick={()=>setSelected(item)}><span className="resource-icon">{text(item,"type")==="PDF"?"P":text(item,"type")==="网页"?"↗":text(item,"type")==="文件"?"F":"N"}</span><span><small>{text(item,"type")} · {text(item,"status")}</small><strong>{item.title}</strong></span><div className="progress-line"><i style={{width:`${numberValue(item,"progress")}%`}} /></div><b>{numberValue(item,"progress")}%</b></button>)}</div></section>}{folder!=="全部资料"&&!visible.length&&<EmptyInline text={folder==="网课笔记"?"还没有网课笔记":"这个文件夹还没有资料"} action={folder==="网课笔记"?"写第一篇笔记":"添加资料"} onAction={()=>{setAddMode(folder==="网课笔记"?"note":"file");setAdding(true);}} />}{adding&&<Modal title={addMode==="note"?"新建网课笔记":"上传本地资料"} close={()=>{if(!uploading)setAdding(false);}}><div className="resource-add-tabs"><button type="button" className={addMode==="file"?"active":""} onClick={()=>setAddMode("file")}>上传文件</button><button type="button" className={addMode==="note"?"active":""} onClick={()=>setAddMode("note")}>写网课笔记</button></div><form className="editor-form resource-add-form" onSubmit={addResource}><Field label={addMode==="note"?"笔记标题":"资料名称"}><input name="title" autoFocus placeholder={addMode==="note"?"例如：AI 产品经理课程第 3 讲":"例如：RAG 产品实践手册"} /></Field>{addMode==="note"?<><Field label="上课日期"><input name="courseDate" type="date" defaultValue={todayIso()} /></Field><Field label="笔记内容"><textarea className="course-note-input" name="content" placeholder={"记录课程重点、自己的理解和课后行动……\n\n可以直接粘贴你已有的网课笔记。"} /></Field></>:<><Field label="保存到文件夹"><input name="folder" list="folder-options" defaultValue={folder==="全部资料"?"":folder} placeholder="例如：RAG 与检索增强" /><datalist id="folder-options">{folders.slice(1).filter((item)=>item!=="网课笔记").map((item)=><option key={item} value={item} />)}</datalist></Field><label className={`local-file-picker ${uploadName?"selected":""}`}><input name="file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.zip,image/*" onChange={(event)=>setUploadName(event.target.files?.[0]?.name||"")} /><span className="file-picker-icon">↑</span><span><strong>{uploadName||"选择电脑里的文件"}</strong><small>{uploadName?"已选择，保存后开始上传":"PDF、Office、图片、压缩包等，最大 15MB"}</small></span><b>浏览文件</b></label><div className="upload-divider"><span>或</span></div><Field label="网页链接"><input name="url" type="url" placeholder="https://" /></Field></>}<div className="form-actions"><button className="primary-button" type="submit" disabled={uploading}><span>{uploading?"正在上传…":addMode==="note"?"保存笔记":"上传并保存"}</span><span className="button-orb">{uploading?"…":"✓"}</span></button></div></form></Modal>}</div>;
}

function ThoughtsView({ items, createItem, updateItem, removeItem, notify, selectedItem }: WorkspaceActions & { notify:(message:string)=>void; selectedItem?: WorkspaceItem }) {
  const thoughts=items.filter((item)=>item.kind==="thought");
  const [editing,setEditing]=useState<WorkspaceItem|"new"|null>(selectedItem?.kind === "thought" ? selectedItem : null);
  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const title=String(form.get("title")||"").trim();if(!title)return notify("请输入思考标题");const data={content:String(form.get("content")||""),status:String(form.get("status")),date:String(form.get("date"))};if(editing==="new")await createItem({kind:"thought",title,data});else if(editing)await updateItem(editing.id,{title,data});setEditing(null);notify("思考记录已保存");}
  return <div className="view-stack"><section className="thought-hero"><div><span className="eyebrow">THINKING SPACE</span><h2>先保留原始想法，<br/>再慢慢形成自己的判断。</h2><p>好的思考空间不会催你立刻得出结论，而是让问题可以被重新看见。</p></div><button className="primary-button" type="button" onClick={()=>setEditing("new")}><span>记录一个想法</span><span className="button-orb">＋</span></button></section><section className="thought-list">{thoughts.map((item)=><article key={item.id}><span>{text(item,"status")} · {text(item,"date")}</span><h3>{item.title}</h3><p>{text(item,"content")}</p><button type="button" onClick={()=>setEditing(item)}>{text(item,"status")==="已形成结论"?"查看并编辑":"继续思考"} <b>→</b></button></article>)}</section>{editing&&<Drawer title={editing==="new"?"记录想法":"继续思考"} close={()=>setEditing(null)}><form className="editor-form" onSubmit={save}><Field label="问题或标题"><input name="title" autoFocus defaultValue={editing==="new"?"":editing.title} /></Field><Field label="当前想法"><textarea name="content" defaultValue={editing==="new"?"":text(editing,"content")} /></Field><div className="form-grid"><Field label="状态"><select name="status" defaultValue={editing==="new"?"待继续":text(editing,"status")}><option>待继续</option><option>正在形成</option><option>已形成结论</option></select></Field><Field label="日期"><input name="date" type="date" defaultValue={editing==="new"?todayIso():text(editing,"date")} /></Field></div><div className="form-actions">{editing!=="new"&&<button className="danger-button" type="button" onClick={()=>void removeItem(editing.id).then(()=>{setEditing(null);notify("思考记录已删除");})}>删除</button>}<button className="primary-button" type="submit"><span>保存记录</span><span className="button-orb">✓</span></button></div></form></Drawer>}</div>;
}

function QuickCapture({ workspace, close, notify }: { workspace: WorkspaceActions; close:()=>void; notify:(message:string)=>void }) {
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const kind=String(form.get("kind")) as ItemKind;const title=String(form.get("title")||"").trim();if(!title)return notify("请输入要收集的内容");const defaults:Record<ItemKind,Record<string,unknown>>={task:{dueDate:todayIso(),priority:"medium",category:"收集箱",done:false,note:String(form.get("note")||"")},job:{company:"待整理",location:"",batch:"",openDate:todayIso(),status:"未分析",category:"其他",keywords:[],description:String(form.get("note")||"")},knowledge:{level:"刚遇到",tone:"lilac",summary:String(form.get("note")||"待整理"),explanation:"",tags:["收集箱"]},resource:{folder:"待整理",type:"网页",status:"待读",progress:0,url:String(form.get("url")||"")},thought:{status:"待继续",content:String(form.get("note")||""),date:todayIso()}};await workspace.createItem({kind,title,data:defaults[kind]});close();notify("已存入工作台");}
  return <Modal title="快速收集" close={close}><p className="capture-intro">先把灵感和待办接住，不要求现在就整理完整。</p><form className="editor-form" onSubmit={submit}><Field label="收集到哪里"><select name="kind"><option value="task">任务</option><option value="job">求职 JD</option><option value="knowledge">知识卡</option><option value="resource">资料</option><option value="thought">思考</option></select></Field><Field label="标题"><input name="title" autoFocus placeholder="先记下来，之后再整理" /></Field><Field label="链接（可选）"><input name="url" type="url" placeholder="https://" /></Field><Field label="补充说明"><textarea name="note" placeholder="为什么值得保存？下一步是什么？" /></Field><div className="form-actions"><button className="primary-button" type="submit"><span>保存到工作台</span><span className="button-orb">✓</span></button></div></form></Modal>;
}

function SettingsDrawer({items,close,notify}:{items:WorkspaceItem[];close:()=>void;notify:(message:string)=>void}){
  function exportData(){const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),items},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="careeros-backup.json";anchor.click();URL.revokeObjectURL(url);notify("备份已下载");}
  return <Drawer title="工作台设置" close={close}><div className="settings-panel"><section><span className="setting-icon">✓</span><div><strong>云端数据已启用</strong><p>任务、岗位、知识、资料与思考会在刷新后保留。</p></div></section><section><span className="setting-icon">⌘</span><div><strong>快捷键</strong><p><kbd>Ctrl K</kbd> 搜索　<kbd>Q</kbd> 快速收集</p></div></section><button className="secondary-button" type="button" onClick={exportData}>导出 JSON 备份</button></div></Drawer>;
}

function Drawer({title,close,children}:{title:string;close:()=>void;children:ReactNode}){
  useEffect(()=>{function escape(event:KeyboardEvent){if(event.key==="Escape")close();}window.addEventListener("keydown",escape);return()=>window.removeEventListener("keydown",escape);},[close]);
  return <div className="drawer-layer" role="presentation" onMouseDown={close}><section className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" onMouseDown={(event)=>event.stopPropagation()}><header><div><span className="eyebrow">CAREEROS</span><h2 id="drawer-title">{title}</h2></div><button type="button" aria-label="关闭" onClick={close}>×</button></header>{children}</section></div>;
}

function Modal({title,close,children}:{title:string;close:()=>void;children:ReactNode}){
  useEffect(()=>{function escape(event:KeyboardEvent){if(event.key==="Escape")close();}window.addEventListener("keydown",escape);return()=>window.removeEventListener("keydown",escape);},[close]);
  return <div className="modal-layer" role="presentation" onMouseDown={close}><section className="center-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event)=>event.stopPropagation()}><header><div><span className="eyebrow">CAPTURE FIRST</span><h2 id="modal-title">{title}</h2></div><button type="button" aria-label="关闭" onClick={close}>×</button></header>{children}</section></div>;
}

function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>;}
function PanelHead({eyebrow,title,action,onAction}:{eyebrow:string;title:string;action?:string;onAction?:()=>void}){return <header className="panel-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action&&<button type="button" onClick={onAction}>{action} →</button>}</header>;}
function EmptyInline({text:copy,action,onAction}:{text:string;action:string;onAction:()=>void}){return <div className="empty-inline"><span>○</span><div><strong>{copy}</strong><button type="button" onClick={onAction}>{action} →</button></div></div>;}
