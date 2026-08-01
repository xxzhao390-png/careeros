"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
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
  { id: "thoughts", label: "随手记", mark: "✎" },
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

async function requestAi<T>(path: string, input: string): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: input }) });
  const body = await response.json() as { result?: T; error?: string };
  if (!response.ok || !body.result) throw new Error(body.error || "AI 整理失败，请稍后重试");
  return body.result;
}

type JdAiResult = ReturnType<typeof parseJdText> & { salary?: string; education?: string; experience?: string; responsibilities?: string[]; requirements?: string[]; bonusPoints?: string[]; preparation?: string[] };
type TaskCandidate = { title:string; description:string; dueAt:string; priority:"low"|"medium"|"high"; category:"工作"|"求职"|"学习"|"项目"|"生活"; confidence:"explicit"|"potential"; evidenceText:string };
type NoteAiResult = { title: string; summary: string; type: NoteType; tags: string[]; keyPoints: string[]; actionItems: string[]; taskCandidates:TaskCandidate[] };
type KnowledgeAiResult = { title:string; oneLineDefinition:string; category:string; whyItMatters:string; coreConcepts:Array<{name:string;explanation:string}>; howItWorks:string[]; useCases:string[]; example:string; advantages:string[]; limitations:string[]; commonMistakes:string[]; interviewQuestions:string[]; relatedTopics:string[]; reviewCards:Array<{question:string;answer:string}>; tags:string[]; needsVerification:string[] };

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

  function openItem(item: WorkspaceItem) {
    setFocusedItem(item);
    setView(viewForKind[item.kind]);
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
              {view === "tasks" && <TasksView key={`tasks-${focusedItem?.id ?? ""}`} {...common} openItem={openItem} />}
              {view === "jobs" && <JobsView key={`jobs-${focusedItem?.id ?? ""}`} {...common} navigate={navigate} />}
              {view === "knowledge" && <KnowledgeView key={`knowledge-${focusedItem?.id ?? ""}`} {...common} />}
              {view === "resources" && <ResourcesView key={`resources-${focusedItem?.id ?? ""}`} {...common} />}
              {view === "thoughts" && <ThoughtsView key={`thoughts-${focusedItem?.id ?? ""}`} {...common} openItem={openItem} />}
            </>
          )}
        </section>
      </section>

      {captureOpen && <QuickCapture workspace={workspace} close={() => setCaptureOpen(false)} notify={notify} openNote={openItem} />}
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

function TasksView({ items, createItem, updateItem, removeItem, notify, selectedItem, openItem }: WorkspaceActions & { notify: (message: string) => void; selectedItem?: WorkspaceItem; openItem: (item: WorkspaceItem) => void }) {
  const tasks = items.filter((item) => item.kind === "task");
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const [editing, setEditing] = useState<WorkspaceItem | "new" | null>(selectedItem?.kind === "task" ? selectedItem : null);
  const [draftDate, setDraftDate] = useState(todayIso());
  const [draftCategory, setDraftCategory] = useState("工作");
  const [inlineSection,setInlineSection]=useState<string|null>(null);
  const [inlinePriority,setInlinePriority]=useState<"low"|"medium"|"high">("medium");
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

  async function addInlineTask(event:FormEvent<HTMLFormElement>,category:string){
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const title=String(form.get("inlineTitle")||"").trim();
    if(!title){setInlineSection(null);return;}
    await createItem({kind:"task",title,data:{dueDate:todayIso(),priority:inlinePriority,category,note:"",done:false}});
    setInlineSection(null);setInlinePriority("medium");notify("任务已添加");
  }

  function cycleInlinePriority(){
    setInlinePriority((current)=>current==="low"?"medium":current==="medium"?"high":"low");
  }

  return <div className="view-stack">
    <section className="toolbar">
      <div className="segmented">{(["list","calendar"] as const).map((item) => <button type="button" key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item === "list" ? "清单" : "月历"}</button>)}</div>
      {mode === "list" && <div className="filter-pills">{(["all","open","done"] as const).map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "all" ? "全部" : item === "open" ? "待完成" : "已完成"}</button>)}</div>}
    </section>
    {mode === "list" ? <><section className="task-quadrants">
      {taskSections.map((section)=>{const sectionTasks=visible.filter((task)=>section.name==="工作"?["工作","项目"].includes(text(task,"category")):text(task,"category")===section.name);return <article className={`task-section task-section-${section.tone}`} key={section.name}>
        <header><div><span className="eyebrow">{section.eyebrow}</span><h2>{section.name}</h2><p>{section.hint}</p></div><strong>{sectionTasks.filter((item)=>bool(item,"done")).length}/{sectionTasks.length}</strong></header>
        <div className="section-task-list">{sectionTasks.map((task)=><article className={bool(task,"done")?"done":""} key={task.id}>
          <button className="task-check" type="button" aria-label={bool(task,"done")?`恢复 ${task.title}`:`完成 ${task.title}`} onClick={()=>void toggle(task)}>{bool(task,"done")?"✓":""}</button>
          <span className={`line-priority priority-${text(task,"priority","medium")}`} aria-label={`${text(task,"priority","medium")} 优先级`} />
          <button className="section-task-copy" type="button" onClick={()=>setEditing(task)}><strong>{task.title}</strong></button>
          <button className="section-task-delete" type="button" aria-label={`删除 ${task.title}`} onClick={()=>void removeItem(task.id).then(()=>notify("任务已删除"))}>×</button>
        </article>)}{inlineSection===section.name&&<form className="inline-task-entry" onSubmit={(event)=>void addInlineTask(event,section.name)}><span className="inline-check" /><button className={`line-priority priority-${inlinePriority}`} type="button" aria-label="切换优先级颜色" onClick={cycleInlinePriority} /><input name="inlineTitle" autoFocus aria-label={`输入${section.name}任务`} placeholder="直接输入任务，按回车保存" onKeyDown={(event)=>{if(event.key==="Escape")setInlineSection(null);}} /><button type="submit" aria-label="保存任务">↵</button></form>}</div>
        <button className="section-add-task" type="button" onClick={()=>{setInlinePriority("medium");setInlineSection(section.name);}}>＋ 添加{section.name}任务</button>
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

    {celebrating && typeof document !== "undefined" && createPortal(
      <div className="celebration" role="status" aria-live="polite">
        <div className="confetti">{Array.from({length:18},(_,index)=><i key={index} style={{"--i":index} as CSSProperties} />)}</div>
        <div className="celebration-core"><span>✓</span><strong>完成一件，离目标更近一点</strong></div>
      </div>,
      document.body,
    )}
    {editing && <Modal title={editing === "new" ? "新建任务" : "编辑任务"} close={() => setEditing(null)}>
      <form className="editor-form compact-task-form" onSubmit={saveTask}>
        <Field label="任务名称"><input name="title" autoFocus defaultValue={editing === "new" ? "" : editing.title} placeholder="例如：整理百度 AI 产品运营 JD" /></Field>
        <div className="form-grid"><Field label="日期"><input name="dueDate" type="date" defaultValue={editing === "new" ? draftDate : text(editing, "dueDate")} /></Field><Field label="优先级"><select name="priority" defaultValue={editing === "new" ? "medium" : text(editing, "priority")}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></Field></div>
        <Field label="分类"><select name="category" defaultValue={editing === "new" ? draftCategory : text(editing, "category")}><option>工作</option><option>求职</option><option>学习</option><option>项目</option><option>生活</option></select></Field>
        <Field label="备注"><textarea name="note" defaultValue={editing === "new" ? "" : text(editing, "note")} placeholder="补充下一步动作或完成标准" /></Field>
        {editing !== "new" && text(editing, "sourceNoteId") && (() => { const note = items.find((item) => item.id === text(editing, "sourceNoteId")); return <button className="task-source-link" type="button" disabled={!note} onClick={() => note && openItem(note)}>来源：{note ? `${new Date(note.createdAt).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}《${note.title}》` : "关联记录已删除"} →</button>; })()}
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
    let parsed: JdAiResult = parseJdText(raw);
    if (raw.trim().length >= 20) {
      try {
        const ai = await requestAi<JdAiResult>("/api/v1/ai/jd", raw);
        parsed = { ...parsed, ...ai, description: raw, keywords: ai.keywords || parsed.keywords };
      } catch (cause) {
        notify(cause instanceof Error ? `${cause.message}，已改用基础整理` : "AI 暂不可用，已改用基础整理");
      }
    }
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
  const [draft, setDraft] = useState<KnowledgeAiResult | null>(null);
  const [editing, setEditing] = useState<WorkspaceItem | null>(null);
  const [generating,setGenerating]=useState(false); const [importing,setImporting]=useState(false);

  async function explain() {
    const value = question.trim();
    if (!value) return notify("先输入你想理解的概念");
    setGenerating(true);
    try{setDraft(await requestAi<KnowledgeAiResult>("/api/v1/ai/knowledge/generate",value));}
    catch(cause){notify(cause instanceof Error?cause.message:"AI 知识整理失败");}
    finally{setGenerating(false);}
  }

  async function importKnowledge(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const source=String(form.get("source")||"").trim();if(source.length<20)return notify("请至少粘贴 20 个字");setGenerating(true);try{setDraft(await requestAi<KnowledgeAiResult>("/api/v1/ai/knowledge/import",source));setImporting(false);notify("已整理为知识卡草稿");}catch(cause){notify(cause instanceof Error?cause.message:"AI 知识整理失败");}finally{setGenerating(false);}}

  async function saveDraft() {
    if (!draft) return;
    const item = await createItem({ kind: "knowledge", title: draft.title, data: { level: "刚遇到", tone: "lilac", summary: draft.oneLineDefinition, explanation: draft.whyItMatters, ...draft } });
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
      <section><h3>为什么重要</h3><p>{text(selected,"whyItMatters")||text(selected,"explanation")}</p></section>
      {Array.isArray(selected.data.coreConcepts)&&<section><h3>核心概念</h3>{(selected.data.coreConcepts as Array<{name:string;explanation:string}>).map((item)=><div key={item.name}><strong>{item.name}</strong><p>{item.explanation}</p></div>)}</section>}
      {list(selected,"howItWorks").length>0&&<section><h3>工作原理</h3><ol>{list(selected,"howItWorks").map((item)=><li key={item}>{item}</li>)}</ol></section>}
      {list(selected,"useCases").length>0&&<section><h3>使用场景</h3><ul>{list(selected,"useCases").map((item)=><li key={item}>{item}</li>)}</ul></section>}
      {text(selected,"example")&&<section><h3>实际例子</h3><p>{text(selected,"example")}</p></section>}
      <section><h3>优点与限制</h3><div className="answer-grid"><article><small>优点</small><ul>{list(selected,"advantages").map((item)=><li key={item}>{item}</li>)}</ul></article><article><small>限制</small><ul>{list(selected,"limitations").map((item)=><li key={item}>{item}</li>)}</ul></article></div></section>
      {list(selected,"commonMistakes").length>0&&<section><h3>常见误区</h3><ul>{list(selected,"commonMistakes").map((item)=><li key={item}>{item}</li>)}</ul></section>}
      {Array.isArray(selected.data.reviewCards)&&<section><h3>复习卡片</h3><ol>{(selected.data.reviewCards as Array<{question:string;answer:string}>).map((item)=><li key={item.question}><strong>{item.question}</strong><p>{item.answer}</p></li>)}</ol></section>}
    </article>
    <div className="detail-actions"><button type="button" onClick={() => setEditing(selected)}>编辑卡片</button><button className="primary-button" type="button" onClick={() => void updateItem(selected.id,{data:{level:"已理解"}}).then((item)=>{setSelected(item);notify("已更新为已理解");})}><span>标记为已理解</span><span className="button-orb">✓</span></button></div>
    {editing && <Drawer title="编辑知识卡" close={() => setEditing(null)}><form className="editor-form" onSubmit={saveEdit}><Field label="标题"><input name="title" defaultValue={editing.title} /></Field><Field label="掌握程度"><select name="level" defaultValue={text(editing,"level")}><option>刚遇到</option><option>学习中</option><option>能解释</option><option>已理解</option></select></Field><Field label="摘要"><textarea name="summary" defaultValue={text(editing,"summary")} /></Field><Field label="我的解释"><textarea name="explanation" defaultValue={text(editing,"explanation")} /></Field><Field label="标签"><input name="tags" defaultValue={list(editing,"tags").join("，")} /></Field><div className="form-actions"><button className="danger-button" type="button" onClick={() => void removeItem(editing.id).then(()=>{setEditing(null);setSelected(null);notify("知识卡已删除");})}>删除</button><button className="primary-button" type="submit"><span>保存修改</span><span className="button-orb">✓</span></button></div></form></Drawer>}
  </div>;

  return <div className="view-stack">
    <section className="ask-panel knowledge-search-panel"><div className="knowledge-search-copy"><span className="eyebrow">KNOWLEDGE ASSISTANT</span><h2>想理解什么？</h2><p>输入一个概念或问题，AI 会从定义、场景、原理、边界和复习题完整梳理。</p><button className="secondary-button" type="button" onClick={()=>setImporting(true)}>＋ 粘贴资料整理知识</button></div><div className="knowledge-search-side"><div className="ask-box"><span className="ask-symbol" aria-hidden="true">?</span><input value={question} onChange={(event)=>setQuestion(event.target.value)} onKeyDown={(event)=>{if(event.key==="Enter")void explain();}} placeholder="输入概念，例如：RAG 和微调有什么区别？" aria-label="知识问题" />{question&&<button className="ask-clear" type="button" aria-label="清空问题" onClick={()=>setQuestion("")}>×</button>}<button className="ask-submit" disabled={generating} type="button" onClick={()=>void explain()} aria-label="生成解释草稿"><span>{generating?"正在整理…":"开始理解"}</span><i>→</i></button></div><div className="suggestions"><span>可以试试</span>{["MCP 是什么？","Agent 与 Workflow 的区别？"].map((item)=><button type="button" key={item} onClick={()=>setQuestion(item)}>{item}</button>)}</div></div></section>
    {draft && <section className="panel answer-panel"><PanelHead eyebrow="AI DRAFT" title={draft.title} /><div className="answer-grid"><article><small>一句话理解</small><p>{draft.oneLineDefinition}</p></article><article><small>为什么重要</small><p>{draft.whyItMatters}</p></article></div><div className="detail-actions"><button type="button" onClick={()=>setDraft(null)}>放弃草稿</button><button className="primary-button" type="button" onClick={()=>void saveDraft()}><span>保存为知识卡</span><span className="button-orb">＋</span></button></div></section>}
    <section className="knowledge-grid">{cards.map((card,index)=><button type="button" className={`knowledge-card knowledge-${text(card,"tone","lilac")}`} key={card.id} onClick={()=>setSelected(card)}><header><span className="card-number">0{index+1}</span><em>{text(card,"level")}</em></header><h3>{card.title}</h3><p>{text(card,"summary")}</p><div className="knowledge-card-tags">{list(card,"tags").map((tag)=><span key={tag}>{tag}</span>)}</div><small>{text(card,"explanation")}</small><b>阅读解析 <i>→</i></b></button>)}</section>
    {importing&&<Modal title="新建知识" close={()=>setImporting(false)}><form className="editor-form" onSubmit={importKnowledge}><p>粘贴你从文章、课程或聊天中收集的原始文字，AI 会保留原意并整理成结构化知识卡。</p><Field label="原始资料"><textarea name="source" autoFocus rows={14} placeholder="在这里粘贴文字，至少 20 个字……" /></Field><div className="form-actions"><button className="secondary-button" type="button" onClick={()=>setImporting(false)}>取消</button><button className="primary-button" disabled={generating} type="submit"><span>{generating?"正在整理…":"AI 一键整理"}</span><span className="button-orb">✦</span></button></div></form></Modal>}
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

type NoteStatus = "inbox" | "organized" | "archived" | "trashed";
type NoteType = "quick" | "meeting" | "course" | "inspiration";
const noteTypeLabels: Record<NoteType,string> = { quick:"普通记录", meeting:"会议记录", course:"网课笔记", inspiration:"灵感记录" };
const noteStatusLabels: Record<NoteStatus,string> = { inbox:"待整理", organized:"已整理", archived:"已归档", trashed:"回收站" };
const noteTemplates: Record<NoteType,string> = {
  quick:"",
  meeting:"会议主题：\n参会人员：\n会议时间：\n\n讨论内容：\n\n会议结论：\n\n后续任务：\n- ",
  course:"课程名称：\n课程章节：\n课程链接：\n\n核心知识点：\n\n我的理解：\n\n需要复习的内容：\n\n行动项：\n- ",
  inspiration:"灵感来源：\n适用项目：\n视觉关键词：\n\n核心想法：\n\n需要进一步验证：",
};

function ThoughtsView({ items, createItem, updateItem, removeItem, uploadFile, notify, selectedItem, openItem }: WorkspaceActions & { notify:(message:string)=>void; selectedItem?: WorkspaceItem; openItem:(item:WorkspaceItem)=>void }) {
  const notes=items.filter((item)=>item.kind==="thought");
  const [activeId,setActiveId]=useState(selectedItem?.kind==="thought"?selectedItem.id:notes.find((item)=>text(item,"status","inbox")!=="trashed")?.id||"");
  const active=notes.find((item)=>item.id===activeId)||null;
  const [title,setTitle]=useState(""); const [content,setContent]=useState("");
  const [noteType,setNoteType]=useState<NoteType>("quick"); const [status,setStatus]=useState<NoteStatus>("inbox");
  const [tags,setTags]=useState<string[]>([]); const [tagDraft,setTagDraft]=useState("");
  const [saving,setSaving]=useState<"idle"|"saving"|"saved"|"error">("idle");
  const [aiOrganizing,setAiOrganizing]=useState(false);
  const [taskCandidates,setTaskCandidates]=useState<TaskCandidate[]>([]);
  const [search,setSearch]=useState(""); const [statusFilter,setStatusFilter]=useState<NoteStatus|"all">("all"); const [typeFilter,setTypeFilter]=useState<NoteType|"all">("all");
  const [mobileEditor,setMobileEditor]=useState(Boolean(selectedItem));
  const [selection,setSelection]=useState<{text:string;start:number;end:number;x:number;y:number}|null>(null);
  const [taskDialog,setTaskDialog]=useState(false); const [trashOpen,setTrashOpen]=useState(false); const titleRef=useRef<HTMLInputElement>(null); const searchRef=useRef<HTMLInputElement>(null); const initializedIdRef=useRef("");

  useEffect(()=>{if(!active||initializedIdRef.current===active.id)return;initializedIdRef.current=active.id;queueMicrotask(()=>{setTitle(active.title==="无标题记录"?"":active.title);setContent(text(active,"content"));setNoteType(text(active,"type","quick") as NoteType);setStatus(text(active,"status","inbox") as NoteStatus);setTags(list(active,"tags"));setSaving("saved");});},[active?.id]);
  useEffect(()=>{if(!active)return;queueMicrotask(()=>setSaving("saving"));const timer=window.setTimeout(async()=>{try{const fallback=content.split(/\r?\n/).find(Boolean)?.slice(0,60)||"无标题记录";await updateItem(active.id,{title:title.trim()||fallback,data:{content,plainText:content,type:noteType,status,tags,isPinned:bool(active,"isPinned")}});setSaving("saved");}catch{setSaving("error");}},700);return()=>window.clearTimeout(timer);},[title,content,noteType,status,tags,active?.id]);
  async function newNote(type:NoteType,initial=""){const body=initial||noteTemplates[type];const item=await createItem({kind:"thought",title:body.split(/\r?\n/).find(Boolean)?.slice(0,60)||"无标题记录",data:{content:body,plainText:body,type,status:"inbox",tags:[],isPinned:false,linkedTaskIds:[]}});initializedIdRef.current=item.id;setTitle(item.title==="无标题记录"?"":item.title);setContent(body);setNoteType(type);setStatus("inbox");setTags([]);setSaving("saved");setActiveId(item.id);setMobileEditor(true);window.setTimeout(()=>titleRef.current?.focus(),30);return item;}
  useEffect(()=>{function keys(event:KeyboardEvent){const modifier=event.ctrlKey||event.metaKey;if(modifier&&event.key.toLowerCase()==="n"&&!(["INPUT","TEXTAREA","SELECT"].includes((event.target as HTMLElement).tagName))){event.preventDefault();void newNote("quick");}if(modifier&&event.key.toLowerCase()==="k"&&!(["INPUT","TEXTAREA"].includes((event.target as HTMLElement).tagName))){event.preventDefault();searchRef.current?.focus();}}window.addEventListener("keydown",keys);return()=>window.removeEventListener("keydown",keys);});
  async function patchNote(data:Record<string,unknown>){if(!active)return;await updateItem(active.id,{data});}
  async function softDelete(){if(!active||!window.confirm("删除记录不会删除已创建的任务。确定移入回收站吗？"))return;await patchNote({status:"trashed",deletedAt:new Date().toISOString()});setActiveId("");setMobileEditor(false);notify("记录已移入回收站");}
  async function deleteListNote(item:WorkspaceItem){if(!window.confirm(`确定将《${item.title||"无标题记录"}》移入回收站吗？`))return;await updateItem(item.id,{data:{status:"trashed",deletedAt:new Date().toISOString()}});if(activeId===item.id){setActiveId("");setMobileEditor(false);}notify("记录已移入回收站");}
  async function restoreNote(item:WorkspaceItem){await updateItem(item.id,{data:{status:"inbox",deletedAt:null}});notify("记录已恢复到随手记");}
  async function permanentlyDelete(item:WorkspaceItem){if(!window.confirm(`永久删除《${item.title||"无标题记录"}》后将无法恢复，确定继续吗？`))return;await removeItem(item.id);notify("记录已永久删除");}
  function selectText(event:React.SyntheticEvent<HTMLTextAreaElement>){const target=event.currentTarget;const value=target.value.slice(target.selectionStart,target.selectionEnd).trim();if(!value)return setSelection(null);const mouse=event.nativeEvent as MouseEvent;setSelection({text:value,start:target.selectionStart,end:target.selectionEnd,x:mouse.clientX||window.innerWidth*.68,y:(mouse.clientY||260)-52});}
  async function createLinkedTask(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!active||!selection)return;const form=new FormData(event.currentTarget);const taskTitle=String(form.get("title")||"").trim();if(!taskTitle)return;const existing=(active.data.taskLinks as Array<Record<string,string>>|undefined)||[];if(existing.some((link)=>link.sourceText===selection.text)){notify("这段文字已经关联任务");return;}try{const task=await createItem({kind:"task",title:taskTitle,data:{dueDate:String(form.get("dueDate")||""),priority:String(form.get("priority")||"medium"),category:String(form.get("category")||"工作"),note:"",done:false,sourceNoteId:active.id,sourceText:selection.text}});await patchNote({linkedTaskIds:[...list(active,"linkedTaskIds"),task.id],taskLinks:[...existing,{taskId:task.id,sourceText:selection.text,createdAt:new Date().toISOString()}]});setTaskDialog(false);setSelection(null);notify("已加入任务");}catch(cause){notify(cause instanceof Error?cause.message:"创建任务失败");}}
  async function createAiTask(candidate:TaskCandidate){if(!active)return;try{const task=await createItem({kind:"task",title:candidate.title,data:{dueDate:candidate.dueAt,priority:candidate.priority,category:candidate.category,note:candidate.description,done:false,sourceNoteId:active.id,sourceText:candidate.evidenceText,aiGenerated:true}});const existing=(active.data.taskLinks as Array<Record<string,string>>|undefined)||[];await patchNote({linkedTaskIds:[...list(active,"linkedTaskIds"),task.id],taskLinks:[...existing,{taskId:task.id,sourceText:candidate.evidenceText,createdAt:new Date().toISOString()}]});setTaskCandidates((items)=>items.filter((item)=>item!==candidate));notify("任务已创建，并关联原随手记");}catch(cause){notify(cause instanceof Error?cause.message:"创建任务失败");}}
  async function organizeNote(){
    if(!active||content.trim().length<10)return notify("请先输入至少 10 个字，再使用 AI 整理");
    setAiOrganizing(true);
    try{
      const result=await requestAi<NoteAiResult>("/api/v1/ai/notes",content);
      const preview=[`建议标题：${result.title}`,`摘要：${result.summary||"无"}`,`标签：${result.tags.join("、")||"无"}`,`发现任务候选：${result.taskCandidates.length} 个`].join("\n\n");
      if(!window.confirm(`${preview}\n\n确认应用这些整理建议吗？原文不会被删除。`))return;
      setTitle(result.title);setNoteType(result.type);setTags(result.tags);
      await updateItem(active.id,{title:result.title,data:{aiSummary:result.summary,aiKeyPoints:result.keyPoints,aiActionItems:result.actionItems,tags:result.tags,type:result.type}});
      setTaskCandidates(result.taskCandidates||[]);
      notify("AI 整理结果已应用，原文保持不变");
    }catch(cause){notify(cause instanceof Error?cause.message:"AI 整理失败");}
    finally{setAiOrganizing(false);}
  }
  function highlightSelection(){if(!selection)return;setContent((value)=>`${value.slice(0,selection.start)}==${value.slice(selection.start,selection.end)}==${value.slice(selection.end)}`);setSelection(null);}
  function formatNote(kind:"heading"|"bold"|"italic"|"bullet"|"number"|"quote"|"link"|"clear"){
    const editor=document.querySelector<HTMLTextAreaElement>(".note-body-editor");if(!editor)return;const start=editor.selectionStart;const end=editor.selectionEnd;const selected=content.slice(start,end);let replacement=selected;let cursorStart=start;let cursorEnd=end;
    if(kind==="bold"||kind==="italic"){const mark=kind==="bold"?"**":"*";replacement=`${mark}${selected||"文字"}${mark}`;cursorStart=start+mark.length;cursorEnd=start+replacement.length-mark.length;}
    else if(kind==="link"){replacement=`[${selected||"链接文字"}](https://)`;cursorStart=start+1;cursorEnd=start+1+(selected||"链接文字").length;}
    else if(kind==="clear"){replacement=(selected||content).replace(/(^|\n)#{1,6}\s|(^|\n)(?:[-*+]|\d+\.|>)\s/g,"$1").replace(/(\*\*|__|\*|_|==|~~)/g,"");if(!selected){cursorStart=0;cursorEnd=replacement.length;}}
    else {const prefix=kind==="heading"?"## ":kind==="bullet"?"- ":kind==="number"?"1. ":"> ";replacement=(selected||"内容").split("\n").map((line,index)=>kind==="number"?`${index+1}. ${line.replace(/^\d+\.\s/,"")}`:`${prefix}${line}`).join("\n");cursorStart=start;cursorEnd=start+replacement.length;}
    const next=selected?`${content.slice(0,start)}${replacement}${content.slice(end)}`:`${content.slice(0,start)}${replacement}${content.slice(end)}`;setContent(next);setSelection(null);requestAnimationFrame(()=>{editor.focus();editor.setSelectionRange(cursorStart,cursorEnd);});
  }
  async function insertImage(file:File){try{setSaving("saving");const uploaded=await uploadFile(file);setContent((value)=>`${value}${value.endsWith("\n")?"":"\n"}![${uploaded.name}](/api/files/${encodeURIComponent(uploaded.key)})\n`);notify("图片已插入记录");}catch(cause){setSaving("error");notify(cause instanceof Error?cause.message:"图片上传失败");}}
  const visible=notes.filter((item)=>{const itemStatus=text(item,"status","inbox") as NoteStatus;if(statusFilter==="all"&&itemStatus==="trashed")return false;if(statusFilter!=="all"&&itemStatus!==statusFilter)return false;if(typeFilter!=="all"&&text(item,"type","quick")!==typeFilter)return false;const hay=`${item.title} ${text(item,"plainText",text(item,"content"))} ${list(item,"tags").join(" ")} ${item.createdAt}`.toLowerCase();return hay.includes(search.toLowerCase());}).sort((a,b)=>Number(bool(b,"isPinned"))-Number(bool(a,"isPinned"))||b.createdAt.localeCompare(a.createdAt));
  // eslint-disable-next-line react-hooks/purity -- Group labels intentionally use the current local date.
  const groups=visible.reduce<Record<string,WorkspaceItem[]>>((result,item)=>{const created=new Date(item.createdAt);const today=new Date();const yesterday=new Date();yesterday.setDate(today.getDate()-1);const key=created.toDateString()===today.toDateString()?"今天":created.toDateString()===yesterday.toDateString()?"昨天":Date.now()-created.getTime()<7*86400000?"本周":`${created.getFullYear()}年${created.getMonth()+1}月`;(result[key]??=[]).push(item);return result;},{});
  const linkedTasks=active?list(active,"linkedTaskIds").map((id)=>items.find((item)=>item.id===id)).filter(Boolean) as WorkspaceItem[]:[];
  const trashedNotes=notes.filter((item)=>text(item,"status","inbox")==="trashed").sort((a,b)=>text(b,"deletedAt",b.updatedAt).localeCompare(text(a,"deletedAt",a.updatedAt)));
  return <div className="view-stack notes-page">
    {active&&mobileEditor&&<div className="note-format-toolbar" role="toolbar" aria-label="文档编辑工具"><button type="button" onClick={()=>formatNote("heading")} title="二级标题">H2</button><button type="button" onClick={()=>formatNote("bold")} title="加粗"><strong>B</strong></button><button type="button" onClick={()=>formatNote("italic")} title="斜体"><em>I</em></button><span/><button type="button" onClick={()=>formatNote("bullet")} title="项目符号">• 列表</button><button type="button" onClick={()=>formatNote("number")} title="编号列表">1. 列表</button><button type="button" onClick={()=>formatNote("quote")} title="引用">“ 引用</button><button type="button" onClick={()=>formatNote("link")} title="插入链接">链接</button><button type="button" onClick={()=>formatNote("clear")} title="清除格式">清除格式</button></div>}
    <section className="notes-heading"><div className="new-note-actions"><button className="trash-trigger" type="button" onClick={()=>setTrashOpen(true)}><span>回收站</span>{trashedNotes.length>0&&<b>{trashedNotes.length}</b>}</button><button className="primary-button" type="button" onClick={()=>void newNote("quick")}><span>＋ 新建记录</span></button><select aria-label="从模板新建" value="" onChange={(event)=>event.target.value&&void newNote(event.target.value as NoteType)}><option value="">模板</option><option value="meeting">会议记录</option><option value="course">网课笔记</option><option value="inspiration">灵感记录</option></select></div></section>
    <section className={`notes-workspace ${mobileEditor?"show-editor":""}`}><aside className="notes-list-panel"><div className="notes-tools"><input ref={searchRef} value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="搜索标题、正文、标签或日期"/><div><select value={statusFilter} onChange={(event)=>setStatusFilter(event.target.value as NoteStatus|"all")}><option value="all">全部状态</option>{Object.entries(noteStatusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><select value={typeFilter} onChange={(event)=>setTypeFilter(event.target.value as NoteType|"all")}><option value="all">全部类型</option>{Object.entries(noteTypeLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div></div><div className="notes-scroll">{Object.entries(groups).map(([group,groupNotes])=><section className="note-group" key={group}><h3>{group}</h3>{groupNotes.map((item)=><article className={`note-list-row type-${text(item,"type","quick")} ${activeId===item.id?"active":""}`} key={item.id}><button type="button" className="note-list-item" onClick={()=>{setActiveId(item.id);setMobileEditor(true);}}><span><b>{bool(item,"isPinned")?"⌖ ":""}{item.title||"无标题记录"}</b><small>{text(item,"content").slice(0,90)||"空白记录"}</small></span><i>{noteTypeLabels[text(item,"type","quick") as NoteType]} · {noteStatusLabels[text(item,"status","inbox") as NoteStatus]}</i></button><button className="note-row-delete" type="button" aria-label={`删除${item.title}`} onClick={()=>void deleteListNote(item)}>×</button></article>)}</section>)}{!visible.length&&<div className="notes-empty"><strong>{notes.length?"没有找到相关记录":"还没有随手记"}</strong><p>{notes.length?"试试其他关键词或清除筛选条件。":"会议内容、课程重点或突然出现的想法，都可以先记在这里。"}</p><button type="button" onClick={()=>void newNote("quick")}>新建第一条记录</button></div>}</div></aside>
      <article className="note-editor-panel">{active?<><header><button className="mobile-note-back" type="button" onClick={()=>setMobileEditor(false)}>← 返回</button><select value={noteType} onChange={(event)=>setNoteType(event.target.value as NoteType)}>{Object.entries(noteTypeLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><span>{new Date(active.createdAt).toLocaleString("zh-CN",{month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span><span className={`save-state save-${saving}`}>{saving==="saving"?"正在保存…":saving==="error"?"保存失败，继续输入后重试":"✓ 已保存"}</span><button className="ai-organize-button" type="button" disabled={aiOrganizing} onClick={()=>void organizeNote()}>{aiOrganizing?"AI 整理中…":"✦ AI 整理"}</button><button type="button" aria-label="置顶记录" onClick={()=>void patchNote({isPinned:!bool(active,"isPinned")})}>{bool(active,"isPinned")?"取消置顶":"置顶"}</button></header><input ref={titleRef} className="note-title-input" value={title} onChange={(event)=>setTitle(event.target.value)} placeholder="输入标题"/><textarea className="note-body-editor" value={content} onChange={(event)=>setContent(event.target.value)} onMouseUp={selectText} onKeyUp={selectText} onDrop={(event)=>{const file=event.dataTransfer.files[0];if(file?.type.startsWith("image/")){event.preventDefault();void insertImage(file);}}} onPaste={(event)=>{const file=Array.from(event.clipboardData.files).find((item)=>item.type.startsWith("image/"));if(file){event.preventDefault();void insertImage(file);}}} placeholder="从这里开始记录……"/>{linkedTasks.length>0&&<div className="linked-tasks"><strong>关联任务</strong>{linkedTasks.map((task)=><button type="button" key={task.id} onClick={()=>openItem(task)}>{bool(task,"done")?"✓ 已完成":"○ 待完成"} · {task.title}</button>)}</div>}<footer><span>{content.replace(/\s/g,"").length} 字</span><span>创建于 {new Date(active.createdAt).toLocaleString("zh-CN")}</span><span>最后修改 {new Date(active.updatedAt).toLocaleString("zh-CN")}</span><span>{linkedTasks.length} 个关联任务</span><div className="note-tags">{tags.map((tag)=><button type="button" key={tag} onClick={()=>setTags(tags.filter((item)=>item!==tag))}>#{tag} ×</button>)}<input value={tagDraft} onChange={(event)=>setTagDraft(event.target.value)} onKeyDown={(event)=>{if(event.key==="Enter"&&tagDraft.trim()){event.preventDefault();setTags([...new Set([...tags,tagDraft.trim()])]);setTagDraft("");}}} placeholder="添加标签"/></div><div className="note-manage"><select value={status} onChange={(event)=>setStatus(event.target.value as NoteStatus)}>{Object.entries(noteStatusLabels).filter(([value])=>value!=="trashed").map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><button type="button" onClick={softDelete}>删除</button></div></footer></>:<div className="editor-empty"><strong>选择一条记录开始编辑</strong><button type="button" onClick={()=>void newNote("quick")}>＋ 新建记录</button></div>}</article></section>
    {selection&&<div className="selection-toolbar" style={{left:Math.min(selection.x,window.innerWidth-310),top:Math.max(selection.y,90)}}><button type="button" onClick={()=>setTaskDialog(true)}>＋ 加入任务</button><button type="button" onClick={highlightSelection}>高亮</button><button type="button" onClick={()=>void navigator.clipboard.writeText(selection.text).then(()=>notify("已复制"))}>复制</button></div>}
    {trashOpen&&<Modal title="随手记回收站" close={()=>setTrashOpen(false)}><div className="trash-panel"><p>删除的记录保留在这里；恢复后会回到“待整理”，永久删除后无法找回。</p>{trashedNotes.length?<div className="trash-list">{trashedNotes.map((item)=><article key={item.id}><div><strong>{item.title||"无标题记录"}</strong><span>{text(item,"content").slice(0,100)||"空白记录"}</span><small>删除于 {new Date(text(item,"deletedAt",item.updatedAt)).toLocaleString("zh-CN")}</small></div><div><button type="button" onClick={()=>void restoreNote(item)}>恢复</button><button className="permanent-delete" type="button" onClick={()=>void permanentlyDelete(item)}>永久删除</button></div></article>)}</div>:<div className="trash-empty"><span>○</span><strong>回收站是空的</strong><p>删除的随手记会暂存在这里。</p></div>}</div></Modal>}
    {taskDialog&&selection&&active&&<Modal title="从记录加入任务" close={()=>setTaskDialog(false)}><form className="editor-form" onSubmit={createLinkedTask}><Field label="任务名称"><input name="title" autoFocus defaultValue={selection.text}/></Field><div className="form-grid"><Field label="截止日期"><input name="dueDate" type="date"/></Field><Field label="优先级"><select name="priority" defaultValue="medium"><option value="low">普通</option><option value="medium">重要</option><option value="high">紧急</option></select></Field></div><Field label="所属项目"><select name="category"><option>工作</option><option>求职</option><option>学习</option><option>项目</option><option>生活</option></select></Field><p className="note-source-preview">来源记录：《{active.title}》</p><div className="form-actions"><button type="button" className="secondary-button" onClick={()=>setTaskDialog(false)}>取消</button><button className="primary-button" type="submit"><span>加入任务</span><span className="button-orb">✓</span></button></div></form></Modal>}
    {taskCandidates.length>0&&active&&<Modal title={`发现 ${taskCandidates.length} 个任务候选`} close={()=>setTaskCandidates([])}><div className="trash-panel"><p>AI 只提供建议。请检查标题、日期和优先级后逐条确认；没有明确日期时不会自动填写。</p><div className="trash-list">{taskCandidates.map((candidate,index)=><article key={`${candidate.title}-${index}`}><div><strong>{candidate.title}</strong><span>{candidate.description||candidate.evidenceText}</span><small>{candidate.confidence==="explicit"?"明确任务":"潜在任务"} · {candidate.category} · {candidate.dueAt||"无截止日期"}</small></div><div><button type="button" onClick={()=>setTaskCandidates((items)=>items.filter((item)=>item!==candidate))}>忽略</button><button className="primary-button" type="button" onClick={()=>void createAiTask(candidate)}>确认创建</button></div></article>)}</div></div></Modal>}
  </div>;
}

function QuickCapture({ workspace, close, notify, openNote }: { workspace: WorkspaceActions; close:()=>void; notify:(message:string)=>void; openNote:(item:WorkspaceItem)=>void }) {
  const [draft,setDraft]=useState(()=>typeof window==="undefined"?"":localStorage.getItem("careeros-quick-note-draft")||"");
  useEffect(()=>{localStorage.setItem("careeros-quick-note-draft",draft);},[draft]);
  async function pasteImage(file:File){try{notify("正在保存图片…");const uploaded=await workspace.uploadFile(file);setDraft((value)=>`${value}${value&& !value.endsWith("\n")?"\n":""}![${uploaded.name}](/api/files/${encodeURIComponent(uploaded.key)})\n`);notify("图片已加入快速记录");}catch(cause){notify(cause instanceof Error?cause.message:"图片粘贴失败");}}
  async function save(expand=false){const value=draft.trim();if(!value)return notify("请先写下一点内容");const item=await workspace.createItem({kind:"thought",title:value.split(/\r?\n/)[0].slice(0,60)||"无标题记录",data:{content:value,plainText:value,type:"quick",status:"inbox",tags:[],isPinned:false,linkedTaskIds:[]}});setDraft("");localStorage.removeItem("careeros-quick-note-draft");close();notify("已保存到随手记");if(expand)openNote(item);}
  return <Modal title="快速记录" close={close}><p className="capture-intro">{new Date().toLocaleString("zh-CN",{month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})} · 草稿会自动保留 · 支持粘贴文字和图片</p><textarea className="capture-note-input" autoFocus value={draft} onChange={(event)=>setDraft(event.target.value)} onPaste={(event)=>{const file=Array.from(event.clipboardData.files).find((item)=>item.type.startsWith("image/"));if(file){event.preventDefault();void pasteImage(file);}}} onKeyDown={(event)=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){event.preventDefault();void save();}}} placeholder="记下此刻的想法、会议内容或待办事项……"/><div className="form-actions"><button className="secondary-button" type="button" onClick={close}>取消</button><button className="secondary-button" type="button" disabled={!draft.trim()} onClick={()=>void save(true)}>展开编辑</button><button className="primary-button" type="button" disabled={!draft.trim()} onClick={()=>void save()}><span>保存到随手记</span><span className="button-orb">✓</span></button></div></Modal>;
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
  useEffect(()=>{function escape(event:KeyboardEvent){if(event.key==="Escape")close();}const previousOverflow=document.body.style.overflow;document.body.style.overflow="hidden";window.addEventListener("keydown",escape);return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener("keydown",escape);};},[close]);
  if(typeof document==="undefined")return null;
  return createPortal(<div className="modal-layer" role="presentation" onMouseDown={close}><section className="center-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event)=>event.stopPropagation()}><header><div><span className="eyebrow">CAPTURE FIRST</span><h2 id="modal-title">{title}</h2></div><button type="button" aria-label="关闭" onClick={close}>×</button></header>{children}</section></div>,document.body);
}

function Field({label,children}:{label:string;children:ReactNode}){const folderField=label==="保存到文件夹";return <label className={`field ${folderField?"folder-name-field":""}`}><span>{label}</span>{folderField&&<button type="button" className="new-folder-button" onClick={(event)=>{event.preventDefault();const input=event.currentTarget.parentElement?.querySelector("input");if(input){input.value="";input.focus();}}}>＋ 新建文件夹</button>}{children}{folderField&&<small className="folder-field-hint">输入新名称后保存资料，文件夹会自动创建。</small>}</label>;}
function PanelHead({eyebrow,title,action,onAction}:{eyebrow:string;title:string;action?:string;onAction?:()=>void}){return <header className="panel-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action&&<button type="button" onClick={onAction}>{action} →</button>}</header>;}
function EmptyInline({text:copy,action,onAction}:{text:string;action:string;onAction:()=>void}){return <div className="empty-inline"><span>○</span><div><strong>{copy}</strong><button type="button" onClick={onAction}>{action} →</button></div></div>;}
