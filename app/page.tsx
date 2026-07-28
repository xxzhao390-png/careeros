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
          </header>

          {workspace.loading ? <LoadingState /> : workspace.error ? <ErrorState message={workspace.error} retry={workspace.refresh} /> : (
            <>
              {view === "today" && <TodayView key={`today-${focusedItem?.id ?? ""}`} {...common} navigate={navigate} />}
              {view === "tasks" && <TasksView key={`tasks-${focusedItem?.id ?? ""}`} {...common} />}
              {view === "jobs" && <JobsView key={`jobs-${focusedItem?.id ?? ""}`} {...common} />}
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
  const tasks = items.filter((item) => item.kind === "task" && text(item, "dueDate") === date);
  const knowledge = items.filter((item) => item.kind === "knowledge").slice(0, 3);
  const jobs = items.filter((item) => item.kind === "job");
  const doneCount = tasks.filter((item) => bool(item, "done")).length;
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${date}T00:00:00`);
    const offset = (day.getDay() + 6) % 7;
    day.setDate(day.getDate() - offset + index);
    return isoForDate(day);
  });

  async function toggleTask(item: WorkspaceItem) {
    await updateItem(item.id, { data: { done: !bool(item, "done") } });
    notify(bool(item, "done") ? "任务已恢复" : "任务完成，做得漂亮");
  }

  return (
    <div className="view-stack">
      <section className="date-switcher">
        <div><span className="eyebrow">DAILY FOCUS</span><strong>{prettyDate(date)}</strong></div>
        <div className="week-pills">
          {week.map((iso) => <button type="button" key={iso} className={date === iso ? "active" : ""} aria-pressed={date === iso} onClick={() => setDate(iso)}><span>{prettyDate(iso).slice(-2)}</span><strong>{Number(iso.slice(-2))}</strong></button>)}
          <button className="calendar-trigger" type="button" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((open) => !open)}>选择日期</button>
          {calendarOpen && <DatePicker value={date} choose={(iso) => { setDate(iso); setCalendarOpen(false); }} />}
        </div>
      </section>

      <section className="today-grid">
        <article className="panel today-tasks">
          <PanelHead eyebrow="TODAY" title="今日任务" action="查看全部" onAction={() => navigate("tasks")} />
          <div className="task-list">
            {tasks.length ? tasks.map((task) => <button type="button" className={`task-row ${bool(task, "done") ? "done" : ""}`} key={task.id} onClick={() => void toggleTask(task)}><span className="check">{bool(task, "done") ? "✓" : ""}</span><span><strong>{task.title}</strong><small>{text(task, "category")} · {text(task, "priority") === "high" ? "高优先级" : "按计划推进"}</small></span></button>) : <EmptyInline text="这一天还没有任务" action="去新建" onAction={() => navigate("tasks")} />}
          </div>
        </article>

        <article className="panel progress-card">
          <PanelHead eyebrow="PROGRESS" title="今日推进" />
          <div className="progress-orbit" style={{ "--progress": `${tasks.length ? Math.round(doneCount / tasks.length * 100) : 0}%` } as CSSProperties}><span><strong>{doneCount}/{tasks.length}</strong><small>任务完成</small></span></div>
          <div className="mini-stats"><button type="button" onClick={() => navigate("jobs")}><span>求职</span><strong>{jobs.length}</strong></button><button type="button" onClick={() => navigate("knowledge")}><span>知识</span><strong>{knowledge.length}</strong></button></div>
        </article>

        <article className="panel knowledge-review">
          <PanelHead eyebrow="DAILY REVIEW" title="今日复习" action="知识库" onAction={() => navigate("knowledge")} />
          {knowledge.map((card, index) => <button type="button" key={card.id} onClick={() => navigate("knowledge")}><span>0{index + 1}</span><div><strong>{card.title}</strong><small>{text(card, "summary")}</small></div><b>→</b></button>)}
        </article>
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
  const visible = tasks.filter((item) => filter === "all" || (filter === "done" ? bool(item, "done") : !bool(item, "done")));

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
  }

  return <div className="view-stack">
    <section className="toolbar">
      <div className="segmented">{(["list","calendar"] as const).map((item) => <button type="button" key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{item === "list" ? "清单" : "月历"}</button>)}</div>
      <div className="filter-pills">{(["all","open","done"] as const).map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "all" ? "全部" : item === "open" ? "待完成" : "已完成"}</button>)}</div>
      <button className="primary-button" type="button" onClick={() => { setDraftDate(todayIso()); setEditing("new"); }}><span>新建任务</span><span className="button-orb">＋</span></button>
    </section>
    {mode === "list" ? <section className="panel task-board">
      <PanelHead eyebrow="TASKS" title={`${visible.length} 项任务`} />
      <div className="task-table">{visible.length ? visible.map((task) => <article key={task.id} className={bool(task, "done") ? "done" : ""}>
        <button className="task-check" type="button" aria-label={bool(task, "done") ? `恢复 ${task.title}` : `完成 ${task.title}`} onClick={() => void toggle(task)}>{bool(task, "done") ? "✓" : ""}</button>
        <button className="task-copy" type="button" onClick={() => setEditing(task)}><strong>{task.title}</strong><small>{text(task, "dueDate")} · {text(task, "category")} · {text(task, "priority")}</small></button>
        <span className={`priority-dot priority-${text(task, "priority", "medium")}`} />
        <button className="quiet-button" type="button" onClick={() => setEditing(task)}>编辑</button>
      </article>) : <EmptyInline text="这里还没有任务" action="新建任务" onAction={() => { setDraftDate(todayIso()); setEditing("new"); }} />}</div>
    </section> : <MonthCalendar tasks={tasks} edit={setEditing} createOnDate={(iso) => { setDraftDate(iso); setEditing("new"); }} />}
    {editing && <Drawer title={editing === "new" ? "新建任务" : "编辑任务"} close={() => setEditing(null)}>
      <form className="editor-form" onSubmit={saveTask}>
        <Field label="任务名称"><input name="title" autoFocus defaultValue={editing === "new" ? "" : editing.title} placeholder="例如：整理百度 AI 产品运营 JD" /></Field>
        <div className="form-grid"><Field label="日期"><input name="dueDate" type="date" defaultValue={editing === "new" ? draftDate : text(editing, "dueDate")} /></Field><Field label="优先级"><select name="priority" defaultValue={editing === "new" ? "medium" : text(editing, "priority")}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></Field></div>
        <Field label="分类"><select name="category" defaultValue={editing === "new" ? "工作" : text(editing, "category")}><option>工作</option><option>求职</option><option>学习</option><option>项目</option><option>生活</option></select></Field>
        <Field label="备注"><textarea name="note" defaultValue={editing === "new" ? "" : text(editing, "note")} placeholder="补充下一步动作或完成标准" /></Field>
        <div className="form-actions">{editing !== "new" && <button className="danger-button" type="button" onClick={() => void removeItem(editing.id).then(() => { setEditing(null); notify("任务已删除"); })}>删除</button>}<button className="primary-button" type="submit"><span>保存任务</span><span className="button-orb">✓</span></button></div>
      </form>
    </Drawer>}
  </div>;
}

function MonthCalendar({ tasks, edit, createOnDate }: { tasks: WorkspaceItem[]; edit: (task: WorkspaceItem) => void; createOnDate: (iso: string) => void }) {
  const [month, setMonth] = useState(new Date("2026-07-01T00:00:00"));
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return <section className="panel month-view">
    <header className="month-head"><button type="button" aria-label="上个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><div><span className="eyebrow">MONTH VIEW</span><h2>{month.getFullYear()} 年 {month.getMonth() + 1} 月</h2></div><button type="button" aria-label="下个月" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></header>
    <div className="month-week">{["周一","周二","周三","周四","周五","周六","周日"].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="month-grid">{Array.from({ length: offset + count }, (_, index) => index < offset ? <article className="empty" key={`e-${index}`} /> : (() => { const day = index - offset + 1; const iso = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`; const dayTasks = tasks.filter((task) => text(task, "dueDate") === iso); return <article key={iso} className={iso === todayIso() ? "today" : ""}><header><strong>{day}</strong>{iso === todayIso() && <span>今天</span>}</header><div>{dayTasks.slice(0,3).map((task) => <button type="button" className={`calendar-task cat-${text(task,"category")}`} key={task.id} onClick={() => edit(task)}>{task.title}</button>)}</div><button className="day-add" type="button" aria-label={`在 ${iso} 新建任务`} onClick={() => createOnDate(iso)}>＋</button></article>; })())}</div>
  </section>;
}

function JobsView({ items, createItem, updateItem, removeItem, notify, selectedItem }: WorkspaceActions & { notify: (message: string) => void; selectedItem?: WorkspaceItem }) {
  const jobs = items.filter((item) => item.kind === "job");
  const [category, setCategory] = useState("全部");
  const [selected, setSelected] = useState<WorkspaceItem | null>(selectedItem?.kind === "job" ? selectedItem : null);
  const [editing, setEditing] = useState<WorkspaceItem | "new" | null>(null);
  const categories = ["全部", "国央企", "大厂", "高校", "外企", "其他"];
  const visible = category === "全部" ? jobs : jobs.filter((job) => text(job, "category") === category);
  const stages = ["未分析", "关注中", "准备中", "已投递", "面试中", "已结束"];

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const company = String(form.get("company") || "").trim();
    if (!title || !company) return notify("请填写公司和岗位名称");
    const keywords = String(form.get("keywords") || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean);
    const data = { company, location: String(form.get("location")), batch: String(form.get("batch")), openDate: String(form.get("openDate")), status: editing && editing !== "new" ? text(editing, "status") : "未分析", category: String(form.get("category")), keywords, link: String(form.get("link")), description: String(form.get("description")) };
    const wasNew = editing === "new";
    let saved: WorkspaceItem;
    if (wasNew) saved = await createItem({ kind: "job", title, data });
    else if (editing) saved = await updateItem(editing.id, { title, data });
    else return;
    setEditing(null); setSelected(saved); notify(wasNew ? "JD 已添加" : "岗位已更新");
  }

  async function advance(job: WorkspaceItem) {
    const current = stages.indexOf(text(job, "status"));
    const next = stages[Math.min(current + 1, stages.length - 1)];
    const updated = await updateItem(job.id, { data: { status: next } });
    setSelected(updated); notify(`状态已更新为「${next}」`);
  }

  if (selected) return <div className="view-stack detail-page">
    <button className="inline-back" type="button" onClick={() => setSelected(null)}>← 返回岗位列表</button>
    <section className="detail-hero job-detail-hero"><div><span className="eyebrow">{text(selected,"category")} · {text(selected,"location")}</span><h2>{selected.title}</h2><p>{text(selected,"company")} · {text(selected,"batch")} · 开放于 {text(selected,"openDate")}</p></div><span className="status-pill">{text(selected,"status")}</span></section>
    <section className="detail-grid"><article><small>岗位描述</small><p>{text(selected,"description","暂未填写岗位描述。")}</p></article><article><small>关键词</small><div className="tag-row">{list(selected,"keywords").map((tag) => <span key={tag}>{tag}</span>)}</div></article><article className="wide"><small>下一步</small><h3>把关注变成行动</h3><p>记录投递进度、补齐关键词对应案例，并在面试前关联知识卡和项目材料。</p></article></section>
    <div className="detail-actions"><button type="button" onClick={() => setEditing(selected)}>编辑 JD</button>{text(selected,"link") && <a href={text(selected,"link")} target="_blank" rel="noreferrer">招聘官网 ↗</a>}<button className="primary-button" type="button" onClick={() => void advance(selected)}><span>推进到下一阶段</span><span className="button-orb">→</span></button></div>
    {editing && editing !== "new" && <JobEditor item={editing} save={saveJob} close={() => setEditing(null)} remove={() => void removeItem(editing.id).then(() => { setEditing(null); setSelected(null); notify("岗位已删除"); })} />}
  </div>;

  return <div className="view-stack">
    <section className="toolbar"><div className="filter-pills">{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><button className="primary-button" type="button" onClick={() => setEditing("new")}><span>添加 JD</span><span className="button-orb">＋</span></button></section>
    <section className="job-list">{visible.map((job) => <article className="job-card" key={job.id}>
      <button className="job-main" type="button" onClick={() => setSelected(job)}><span className="company-logo">{text(job,"company").slice(0,1)}</span><span><small>{text(job,"category")} · {text(job,"location")}</small><strong>{job.title}</strong><em>{text(job,"company")}</em></span></button>
      <div className="tag-row">{list(job,"keywords").map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="job-meta"><span><small>招聘批次</small><strong>{text(job,"batch")}</strong></span><span><small>开放日期</small><strong>{text(job,"openDate")}</strong></span></div>
      <button className="status-button" type="button" onClick={() => void advance(job)}>{text(job,"status")} <b>→</b></button>
    </article>)}</section>
    {!visible.length && <div className="empty-state"><strong>这个分类还没有岗位</strong><p>添加 JD 后会自动出现在对应分类中。</p><button type="button" onClick={() => setEditing("new")}>添加第一个岗位</button></div>}
    {editing && <JobEditor item={editing} save={saveJob} close={() => setEditing(null)} />}
  </div>;
}

function JobEditor({ item, save, close, remove }: { item: WorkspaceItem | "new"; save: (event: FormEvent<HTMLFormElement>) => void; close: () => void; remove?: () => void }) {
  return <Drawer title={item === "new" ? "添加 JD" : "编辑 JD"} close={close}><form className="editor-form" onSubmit={save}>
    <div className="form-grid"><Field label="公司"><input name="company" autoFocus defaultValue={item === "new" ? "" : text(item,"company")} placeholder="公司名称" /></Field><Field label="岗位名称"><input name="title" defaultValue={item === "new" ? "" : item.title} placeholder="岗位名称" /></Field></div>
    <div className="form-grid"><Field label="城市"><input name="location" defaultValue={item === "new" ? "" : text(item,"location")} placeholder="北京" /></Field><Field label="分类"><select name="category" defaultValue={item === "new" ? "大厂" : text(item,"category")}><option>国央企</option><option>大厂</option><option>高校</option><option>外企</option><option>其他</option></select></Field></div>
    <div className="form-grid"><Field label="招聘批次"><input name="batch" defaultValue={item === "new" ? "秋招正式批" : text(item,"batch")} /></Field><Field label="开放日期"><input name="openDate" type="date" defaultValue={item === "new" ? todayIso() : text(item,"openDate")} /></Field></div>
    <Field label="关键词"><input name="keywords" defaultValue={item === "new" ? "" : list(item,"keywords").join("，")} placeholder="大模型应用，用户运营，数据分析" /></Field>
    <Field label="招聘官网"><input name="link" type="url" defaultValue={item === "new" ? "" : text(item,"link")} placeholder="https://" /></Field>
    <Field label="JD 描述"><textarea name="description" defaultValue={item === "new" ? "" : text(item,"description")} placeholder="粘贴岗位职责和任职要求" /></Field>
    <div className="form-actions">{remove && <button className="danger-button" type="button" onClick={remove}>删除</button>}<button className="primary-button" type="submit"><span>保存 JD</span><span className="button-orb">✓</span></button></div>
  </form></Drawer>;
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
    <section className={`detail-hero knowledge-${text(selected,"tone","lilac")}`}><div><span className="eyebrow">KNOWLEDGE CARD</span><h2>{selected.title}</h2><p>{text(selected,"summary")}</p></div><span className="status-pill">{text(selected,"level")}</span></section>
    <section className="detail-grid"><article><small>核心解释</small><p>{text(selected,"explanation")}</p></article><article><small>标签</small><div className="tag-row">{list(selected,"tags").map((tag) => <span key={tag}>{tag}</span>)}</div></article><article className="wide"><small>复习提示</small><h3>先用自己的话回答，再核对卡片</h3><p>它解决什么问题？输入和输出是什么？在什么情况下不应该使用？</p></article></section>
    <div className="detail-actions"><button type="button" onClick={() => setEditing(selected)}>编辑卡片</button><button className="primary-button" type="button" onClick={() => void updateItem(selected.id,{data:{level:"已理解"}}).then((item)=>{setSelected(item);notify("已更新为已理解");})}><span>标记为已理解</span><span className="button-orb">✓</span></button></div>
    {editing && <Drawer title="编辑知识卡" close={() => setEditing(null)}><form className="editor-form" onSubmit={saveEdit}><Field label="标题"><input name="title" defaultValue={editing.title} /></Field><Field label="掌握程度"><select name="level" defaultValue={text(editing,"level")}><option>刚遇到</option><option>学习中</option><option>能解释</option><option>已理解</option></select></Field><Field label="摘要"><textarea name="summary" defaultValue={text(editing,"summary")} /></Field><Field label="我的解释"><textarea name="explanation" defaultValue={text(editing,"explanation")} /></Field><Field label="标签"><input name="tags" defaultValue={list(editing,"tags").join("，")} /></Field><div className="form-actions"><button className="danger-button" type="button" onClick={() => void removeItem(editing.id).then(()=>{setEditing(null);setSelected(null);notify("知识卡已删除");})}>删除</button><button className="primary-button" type="submit"><span>保存修改</span><span className="button-orb">✓</span></button></div></form></Drawer>}
  </div>;

  return <div className="view-stack">
    <section className="ask-panel"><span className="eyebrow">KNOWLEDGE ASSISTANT</span><h2>把陌生概念，变成自己的理解。</h2><div className="ask-box"><input value={question} onChange={(event)=>setQuestion(event.target.value)} onKeyDown={(event)=>{if(event.key==="Enter") explain();}} placeholder="例如：RAG 和微调有什么区别？" aria-label="知识问题" /><button className="primary-button" type="button" onClick={explain}><span>生成解释草稿</span><span className="button-orb">→</span></button></div><div className="suggestions"><span>试试：</span>{["MCP 是什么？","Agent 与 Workflow 的区别？"].map((item)=><button type="button" key={item} onClick={()=>setQuestion(item)}>{item}</button>)}</div></section>
    {draft && <section className="panel answer-panel"><PanelHead eyebrow="DRAFT" title={draft.title} /><div className="answer-grid"><article><small>一句话理解</small><p>{draft.summary}</p></article><article><small>理解路径</small><p>{draft.explanation}</p></article></div><div className="detail-actions"><button type="button" onClick={()=>setDraft(null)}>放弃草稿</button><button className="primary-button" type="button" onClick={()=>void saveDraft()}><span>保存为知识卡</span><span className="button-orb">＋</span></button></div></section>}
    <section className="knowledge-grid">{cards.map((card,index)=><button type="button" className={`knowledge-card knowledge-${text(card,"tone","lilac")}`} key={card.id} onClick={()=>setSelected(card)}><span className="card-number">0{index+1}</span><em>{text(card,"level")}</em><h3>{card.title}</h3><p>{text(card,"summary")}</p><b>打开卡片 <i>→</i></b></button>)}</section>
  </div>;
}

function ResourcesView({ items, createItem, updateItem, removeItem, uploadFile, notify, selectedItem }: WorkspaceActions & { notify: (message: string) => void; selectedItem?: WorkspaceItem }) {
  const resources = items.filter((item) => item.kind === "resource");
  const [folder, setFolder] = useState("全部资料");
  const [selected, setSelected] = useState<WorkspaceItem | null>(selectedItem?.kind === "resource" ? selectedItem : null);
  const [adding, setAdding] = useState(false);
  const folders = ["全部资料", ...Array.from(new Set(resources.map((item) => text(item,"folder","未分类"))))];
  const visible = folder === "全部资料" ? resources : resources.filter((item)=>text(item,"folder")===folder);

  async function addResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get("title")||"").trim();
    if(!title) return notify("请输入资料名称");
    const file = form.get("file");
    let fileData: Record<string, unknown> = {};
    if(file instanceof File && file.size) {
      notify("正在上传文件…");
      fileData = await uploadFile(file);
    }
    const item = await createItem({kind:"resource",title,data:{folder:String(form.get("folder")||"未分类"),type:String(form.get("type")),status:"待读",progress:0,url:String(form.get("url")||""),...fileData}});
    setAdding(false); setSelected(item); notify("资料已保存");
  }

  if(selected) {
    const fileKey=text(selected,"key");
    const url=fileKey?`/api/files/${encodeURIComponent(fileKey)}`:text(selected,"url");
    return <div className="view-stack detail-page"><button className="inline-back" type="button" onClick={()=>setSelected(null)}>← 返回资料库</button><section className="detail-hero resource-detail-hero"><div><span className="eyebrow">{text(selected,"folder")} · {text(selected,"type")}</span><h2>{selected.title}</h2><p>{text(selected,"name")||text(selected,"url")||"个人资料条目"}</p></div><span className="status-pill">{numberValue(selected,"progress")}%</span></section><section className="detail-grid"><article><small>阅读状态</small><h3>{text(selected,"status")}</h3><input className="progress-range" type="range" min="0" max="100" value={numberValue(selected,"progress")} onChange={(event)=>void updateItem(selected.id,{data:{progress:Number(event.target.value)}}).then(setSelected)} aria-label="阅读进度" /></article><article><small>所属文件夹</small><h3>{text(selected,"folder")}</h3><p>利用文件夹和搜索快速重新找到这份资料。</p></article></section><div className="detail-actions"><button className="danger-button" type="button" onClick={()=>void removeItem(selected.id).then(()=>{setSelected(null);notify("资料已删除");})}>删除</button>{url?<a className="primary-link" href={url} target="_blank" rel="noreferrer">打开资料 ↗</a>:<button type="button" disabled>暂无可打开内容</button>}</div></div>;
  }

  return <div className="view-stack"><section className="toolbar"><div className="filter-pills">{folders.map((item)=><button type="button" key={item} className={folder===item?"active":""} onClick={()=>setFolder(item)}>{item}</button>)}</div><button className="primary-button" type="button" onClick={()=>setAdding(true)}><span>添加资料</span><span className="button-orb">＋</span></button></section><section className="resource-list">{visible.map((item,index)=><button type="button" className={`resource-card resource-${index%4+1}`} key={item.id} onClick={()=>setSelected(item)}><span className="resource-icon">{text(item,"type")==="PDF"?"P":text(item,"type")==="网页"?"↗":text(item,"type")==="文件"?"F":"N"}</span><span><small>{text(item,"folder")} · {text(item,"type")}</small><strong>{item.title}</strong><em>{text(item,"status")}</em></span><div className="progress-line"><i style={{width:`${numberValue(item,"progress")}%`}} /></div><b>{numberValue(item,"progress")}%</b></button>)}</section>{!visible.length&&<EmptyInline text="这个文件夹还没有资料" action="添加资料" onAction={()=>setAdding(true)} />}{adding&&<Drawer title="添加资料" close={()=>setAdding(false)}><form className="editor-form" onSubmit={addResource}><Field label="资料名称"><input name="title" autoFocus placeholder="例如：RAG 产品实践手册" /></Field><div className="form-grid"><Field label="类型"><select name="type"><option>文件</option><option>PDF</option><option>网页</option><option>笔记</option></select></Field><Field label="文件夹"><input name="folder" list="folder-options" placeholder="RAG 与检索增强" /><datalist id="folder-options">{folders.slice(1).map((item)=><option key={item} value={item} />)}</datalist></Field></div><Field label="上传文件（最大 15MB）"><input name="file" type="file" /></Field><Field label="或填写网页链接"><input name="url" type="url" placeholder="https://" /></Field><div className="form-actions"><button className="primary-button" type="submit"><span>保存资料</span><span className="button-orb">✓</span></button></div></form></Drawer>}</div>;
}

function ThoughtsView({ items, createItem, updateItem, removeItem, notify, selectedItem }: WorkspaceActions & { notify:(message:string)=>void; selectedItem?: WorkspaceItem }) {
  const thoughts=items.filter((item)=>item.kind==="thought");
  const [editing,setEditing]=useState<WorkspaceItem|"new"|null>(selectedItem?.kind === "thought" ? selectedItem : null);
  async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const title=String(form.get("title")||"").trim();if(!title)return notify("请输入思考标题");const data={content:String(form.get("content")||""),status:String(form.get("status")),date:String(form.get("date"))};if(editing==="new")await createItem({kind:"thought",title,data});else if(editing)await updateItem(editing.id,{title,data});setEditing(null);notify("思考记录已保存");}
  return <div className="view-stack"><section className="thought-hero"><div><span className="eyebrow">THINKING SPACE</span><h2>先保留原始想法，<br/>再慢慢形成自己的判断。</h2><p>好的思考空间不会催你立刻得出结论，而是让问题可以被重新看见。</p></div><button className="primary-button" type="button" onClick={()=>setEditing("new")}><span>记录一个想法</span><span className="button-orb">＋</span></button></section><section className="thought-list">{thoughts.map((item)=><article key={item.id}><span>{text(item,"status")} · {text(item,"date")}</span><h3>{item.title}</h3><p>{text(item,"content")}</p><button type="button" onClick={()=>setEditing(item)}>{text(item,"status")==="已形成结论"?"查看并编辑":"继续思考"} <b>→</b></button></article>)}</section>{editing&&<Drawer title={editing==="new"?"记录想法":"继续思考"} close={()=>setEditing(null)}><form className="editor-form" onSubmit={save}><Field label="问题或标题"><input name="title" autoFocus defaultValue={editing==="new"?"":editing.title} /></Field><Field label="当前想法"><textarea name="content" defaultValue={editing==="new"?"":text(editing,"content")} /></Field><div className="form-grid"><Field label="状态"><select name="status" defaultValue={editing==="new"?"待继续":text(editing,"status")}><option>待继续</option><option>正在形成</option><option>已形成结论</option></select></Field><Field label="日期"><input name="date" type="date" defaultValue={editing==="new"?todayIso():text(editing,"date")} /></Field></div><div className="form-actions">{editing!=="new"&&<button className="danger-button" type="button" onClick={()=>void removeItem(editing.id).then(()=>{setEditing(null);notify("思考记录已删除");})}>删除</button>}<button className="primary-button" type="submit"><span>保存记录</span><span className="button-orb">✓</span></button></div></form></Drawer>}</div>;
}

function QuickCapture({ workspace, close, notify }: { workspace: WorkspaceActions; close:()=>void; notify:(message:string)=>void }) {
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const kind=String(form.get("kind")) as ItemKind;const title=String(form.get("title")||"").trim();if(!title)return notify("请输入要收集的内容");const defaults:Record<ItemKind,Record<string,unknown>>={task:{dueDate:todayIso(),priority:"medium",category:"收集箱",done:false,note:String(form.get("note")||"")},job:{company:"待整理",location:"",batch:"",openDate:todayIso(),status:"未分析",category:"其他",keywords:[],description:String(form.get("note")||"")},knowledge:{level:"刚遇到",tone:"lilac",summary:String(form.get("note")||"待整理"),explanation:"",tags:["收集箱"]},resource:{folder:"待整理",type:"网页",status:"待读",progress:0,url:String(form.get("url")||"")},thought:{status:"待继续",content:String(form.get("note")||""),date:todayIso()}};await workspace.createItem({kind,title,data:defaults[kind]});close();notify("已存入工作台");}
  return <Drawer title="快速收集" close={close}><form className="editor-form" onSubmit={submit}><Field label="收集到哪里"><select name="kind"><option value="task">任务</option><option value="job">求职 JD</option><option value="knowledge">知识卡</option><option value="resource">资料</option><option value="thought">思考</option></select></Field><Field label="标题"><input name="title" autoFocus placeholder="先记下来，之后再整理" /></Field><Field label="链接（可选）"><input name="url" type="url" placeholder="https://" /></Field><Field label="补充说明"><textarea name="note" placeholder="为什么值得保存？下一步是什么？" /></Field><div className="form-actions"><button className="primary-button" type="submit"><span>保存到工作台</span><span className="button-orb">✓</span></button></div></form></Drawer>;
}

function SettingsDrawer({items,close,notify}:{items:WorkspaceItem[];close:()=>void;notify:(message:string)=>void}){
  function exportData(){const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),items},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="careeros-backup.json";anchor.click();URL.revokeObjectURL(url);notify("备份已下载");}
  return <Drawer title="工作台设置" close={close}><div className="settings-panel"><section><span className="setting-icon">✓</span><div><strong>云端数据已启用</strong><p>任务、岗位、知识、资料与思考会在刷新后保留。</p></div></section><section><span className="setting-icon">⌘</span><div><strong>快捷键</strong><p><kbd>Ctrl K</kbd> 搜索　<kbd>Q</kbd> 快速收集</p></div></section><button className="secondary-button" type="button" onClick={exportData}>导出 JSON 备份</button></div></Drawer>;
}

function Drawer({title,close,children}:{title:string;close:()=>void;children:ReactNode}){
  useEffect(()=>{function escape(event:KeyboardEvent){if(event.key==="Escape")close();}window.addEventListener("keydown",escape);return()=>window.removeEventListener("keydown",escape);},[close]);
  return <div className="drawer-layer" role="presentation" onMouseDown={close}><section className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" onMouseDown={(event)=>event.stopPropagation()}><header><div><span className="eyebrow">CAREEROS</span><h2 id="drawer-title">{title}</h2></div><button type="button" aria-label="关闭" onClick={close}>×</button></header>{children}</section></div>;
}

function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>;}
function PanelHead({eyebrow,title,action,onAction}:{eyebrow:string;title:string;action?:string;onAction?:()=>void}){return <header className="panel-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action&&<button type="button" onClick={onAction}>{action} →</button>}</header>;}
function EmptyInline({text:copy,action,onAction}:{text:string;action:string;onAction:()=>void}){return <div className="empty-inline"><span>○</span><div><strong>{copy}</strong><button type="button" onClick={onAction}>{action} →</button></div></div>;}
