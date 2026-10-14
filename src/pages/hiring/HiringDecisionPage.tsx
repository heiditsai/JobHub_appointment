/**
 * JobHub 任用工作空間（桌面版高擬真原型，1440 × 1000）
 *
 * 每個對話圍繞一位任用人選；HR、面試官、用人主管、決策者與 Agent 一起解任務。
 * - 左側：任用案件紀錄　中央：多人對話（主要工作區）　右側：任務日誌（可關閉，首次進入預設收合）
 * - 任務：開始處理 → 在對話中補充 → Agent 區分已收到／仍待補充 → 指定角色確認 → 完成與接棒事件 → 前置解鎖
 * - 正式核准只在「確認任用方案」完成；聊天中的同意或完成動畫都不算核准
 * 所有資料與動作皆為原型示意；側欄底部可切換檢視身分，用來走完多角色情境。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanelLeftClose, PanelLeftOpen, SquarePen, Sparkles, MessageSquare, Search, X, UserPlus, Paperclip, AtSign, ArrowUp,
  FileSearch, ChevronDown, ChevronUp, MessageSquareReply, CornerDownRight, FileText, Check, ExternalLink,
  ChevronsUpDown, ArrowRight, Play, CircleCheck, Lightbulb, ShieldCheck, Crosshair, Upload, Info, HandHelping,
} from 'lucide-react';
import {
  PARTICIPANTS, DEFAULT_USER_ID, HiringCase, CaseStatus, SourceDoc, ChatMessage, PlanOption, CaseTask, MessageAction,
  DRAFT_SUGGESTIONS, personOf, makeDraftCase, openTaskCount, isReadyToConfirm,
} from './hiringMock';
import {
  SEED_CASES, agentTurn, startTask, confirmTask, approve, adoptSuggestion, dismissSuggestion, suggestionsFor, Suggestion,
  provideDoc, nextStepFor,
} from './caseFlow';
import { Avatar, MarkerBadge, IconButton, SourceRecordModal } from './hiringUi';
import ConsensusPanel, { ConfirmDecisionModal, ConsensusModal, SourcesModal, ChangeLogModal } from './ConsensusPanel';
import ProgressPanel, { HistoryModal } from './ProgressPanel';
import { CriteriaList, DocsPanel, ProvidePanel, DraftPanel } from './WorkPanels';

const nowLabel = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

let seq = 0;
const newId = (prefix = 'm') => `${prefix}-${Date.now()}-${seq++}`;

const STATUS_TONE: Record<CaseStatus, string> = {
  討論草稿: 'bg-bg-base text-text-sub',
  任用評估中: 'bg-warning-light text-text-main',
  等待候選人回覆: 'bg-primary-light text-blue-700',
  已核准任用: 'bg-success-light text-success',
};

const STATUS_GROUPS: CaseStatus[] = ['討論草稿', '任用評估中', '等待候選人回覆', '已核准任用'];

const caseTitle = (c: HiringCase) => (c.position ? `${c.candidate}｜${c.position}` : c.candidate);

const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  const i = text.indexOf(query);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="bg-yellow-100 text-text-main rounded-sm">{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>;
};

// ─────────────────────────────────────────────────────────────────────────────
// 左側：任用案件紀錄
// ─────────────────────────────────────────────────────────────────────────────

interface SearchHit { c: HiringCase; snippet?: string }

/** 側欄底部：目前模擬角色（切換在頁首） */
const CurrentUser: React.FC<{ userId: string }> = ({ userId }) => {
  const me = personOf(userId);
  return (
    <div className="shrink-0 border-t border-neutral-border-light p-3 flex items-center gap-2">
      <Avatar person={me} />
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="text-sm text-text-main truncate">{me.name}</span>
        <span className="text-xs text-text-sub">模擬角色・{me.role}</span>
      </span>
    </div>
  );
};

/** 頁首：原型用的模擬角色切換。切換後保留同一案件與進度，只改變個人工作與可操作動作 */
const PRIMARY_ROLES = ['yun', 'zhe'];
const RoleSwitcher: React.FC<{ userId: string; onChange: (id: string) => void }> = ({ userId, onChange }) => {
  const [more, setMore] = useState(false);
  useEffect(() => {
    if (!more) return;
    const close = () => setMore(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [more]);
  const others = PARTICIPANTS.filter(p => p.roleKey !== 'agent' && !PRIMARY_ROLES.includes(p.id));
  const otherActive = !PRIMARY_ROLES.includes(userId);
  return (
    <div className="relative shrink-0 whitespace-nowrap flex items-center gap-1 h-9 px-1 rounded-full bg-bg-base border border-neutral-border-light" onClick={e => e.stopPropagation()} role="group" aria-label="模擬角色">
      <span className="hidden xl:inline pl-2 pr-1 text-xs text-text-sub">模擬角色</span>
      {PRIMARY_ROLES.map(id => {
        const p = personOf(id);
        const active = userId === id;
        return (
          <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={active}
            className={`h-7 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1 ${active ? 'bg-bg-card text-text-main shadow-sm' : 'text-text-sub hover:text-text-main'}`}>
            <Avatar person={p} size="xs" /><span className="hidden xl:inline">{p.role}</span>{p.name}
          </button>
        );
      })}
      <button type="button" onClick={() => setMore(v => !v)} aria-expanded={more}
        className={`h-7 px-2 rounded-full text-xs inline-flex items-center gap-1 ${otherActive ? 'bg-bg-card text-text-main shadow-sm font-medium' : 'text-text-sub hover:text-text-main'}`}>
        {otherActive ? personOf(userId).name : '其他'}<ChevronsUpDown className="w-3 h-3" />
      </button>
      {more && (
        <div className="absolute right-0 top-full mt-2 z-30 w-48 rounded-md border border-neutral-border-light bg-bg-card shadow-lg py-1">
          {others.map(p => (
            <button key={p.id} type="button" onClick={() => { onChange(p.id); setMore(false); }} className="w-full h-9 px-3 flex items-center gap-2 text-sm text-text-main hover:bg-bg-base">
              <Avatar person={p} size="sm" />{p.name}<span className="text-xs text-text-sub">{p.role}</span>
              {p.id === userId && <Check className="w-4 h-4 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const RecordSidebar: React.FC<{
  collapsed: boolean;
  cases: HiringCase[];
  activeId: string;
  userId: string;
  focusSearchSignal: number;
  onToggle: () => void;
  onSearchFromRail: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
}> = ({ collapsed, cases, activeId, userId, focusSearchSignal, onToggle, onSearchFromRail, onNew, onSelect }) => {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const q = query.trim();

  useEffect(() => {
    if (focusSearchSignal) searchRef.current?.focus();
  }, [focusSearchSignal]);

  const hits = useMemo<SearchHit[]>(() => {
    const sorted = [...cases].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted.map(c => ({ c }));
    return sorted.flatMap(c => {
      const meta = `${c.candidate}${c.position}${c.status}${c.participantIds.map(id => personOf(id).name).join('')}${c.tasks.map(t => t.title).join('')}`;
      const msg = c.messages.find(m => m.text.includes(q) || m.followUp?.text.includes(q));
      if (msg) {
        const text = msg.text.includes(q) ? msg.text : msg.followUp!.text;
        const i = text.indexOf(q);
        const start = Math.max(0, i - 8);
        return [{ c, snippet: `${personOf(msg.authorId).name}：${start > 0 ? '…' : ''}${text.slice(start, i + q.length + 24)}` }];
      }
      return meta.includes(q) ? [{ c }] : [];
    });
  }, [cases, q]);

  const groups = STATUS_GROUPS.map(status => ({ status, items: hits.filter(h => h.c.status === status) })).filter(g => g.items.length > 0);

  if (collapsed) {
    return (
      <aside className="h-full w-14 shrink-0 bg-bg-base border-r border-neutral-border-light flex flex-col items-center py-3 gap-2">
        <IconButton label="展開側欄" onClick={onToggle}><PanelLeftOpen className="w-5 h-5" /></IconButton>
        <IconButton label="新增任用討論" onClick={onNew}><SquarePen className="w-5 h-5" /></IconButton>
        <IconButton label="搜尋任用紀錄（⌘K）" onClick={onSearchFromRail}><Search className="w-5 h-5" /></IconButton>
        <div className="flex-1" />
        <Avatar person={personOf(userId)} />
      </aside>
    );
  }

  return (
    <aside className="h-full w-64 shrink-0 bg-bg-base border-r border-neutral-border-light flex flex-col">
      <div className="h-14 shrink-0 flex items-center justify-between px-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4" /></div>
          <span className="text-base font-medium text-text-main truncate">JobHub</span>
        </div>
        <IconButton label="收合側欄" onClick={onToggle}><PanelLeftClose className="w-5 h-5" /></IconButton>
      </div>

      <div className="px-3 flex flex-col gap-2">
        <button type="button" onClick={onNew} className="w-full h-9 px-3 rounded-md flex items-center gap-2 text-sm font-medium text-text-main hover:bg-neutral-border-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <SquarePen className="w-4 h-4 text-text-sub" />新增任用討論
        </button>
        <label className="h-9 px-3 rounded-md flex items-center gap-2 bg-bg-input border border-neutral-border-light focus-within:border-primary">
          <Search className="w-4 h-4 text-text-sub shrink-0" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') { setQuery(''); searchRef.current?.blur(); }
              if (e.key === 'Enter' && hits[0]) onSelect(hits[0].c.id);
            }}
            placeholder="搜尋人選、職位、任務、對話"
            aria-label="搜尋任用紀錄"
            className="flex-1 min-w-0 bg-transparent text-sm text-text-main placeholder:text-text-hint outline-none"
          />
          {query
            ? <button type="button" onClick={() => setQuery('')} aria-label="清除搜尋" className="text-text-sub hover:text-text-main"><X className="w-4 h-4" /></button>
            : <span className="text-xs text-text-muted">⌘K</span>}
        </label>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-4" aria-label="任用紀錄">
        {q && hits.length > 0 && <p className="px-2 text-xs text-text-sub">找到 {hits.length} 筆任用紀錄</p>}
        {groups.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <MessageSquare className="w-6 h-6 text-text-muted" />
            <p className="text-xs text-text-sub">找不到「{q}」相關的任用紀錄</p>
          </div>
        )}
        {groups.map(g => (
          <section key={g.status} className="flex flex-col gap-1">
            <h3 className="px-2 text-xs font-medium text-text-sub">{g.status}</h3>
            <ul className="flex flex-col">
              {g.items.map(({ c, snippet }) => {
                const active = c.id === activeId;
                const open = openTaskCount(c.tasks);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      aria-current={active ? 'page' : undefined}
                      title={`${caseTitle(c)}・${c.status}`}
                      className={`w-full min-h-9 px-2 py-2 rounded-md text-left flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${active ? 'bg-neutral-border-light' : 'hover:bg-neutral-border-light'}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`flex-1 min-w-0 text-sm text-text-main truncate ${active ? 'font-medium' : ''}`}><Highlight text={caseTitle(c)} query={q} /></span>
                        {open > 0 && <span className="text-xs text-text-sub shrink-0">{open} 項任務</span>}
                      </span>
                      {snippet && <span className="text-xs text-text-sub line-clamp-2"><Highlight text={snippet} query={q} /></span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      <CurrentUser userId={userId} />
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 對話：訊息、事件、條件整理、依據、方案卡
// ─────────────────────────────────────────────────────────────────────────────

const renderWithMentions = (text: string) => {
  const names = PARTICIPANTS.map(p => p.name);
  const parts = text.split(new RegExp(`(@(?:${names.join('|')}))`, 'g'));
  return parts.map((part, i) =>
    part.startsWith('@') && names.includes(part.slice(1))
      ? <span key={i} className="text-primary font-medium">{part}</span>
      : <React.Fragment key={i}>{part}</React.Fragment>,
  );
};

const EvidenceList: React.FC<{ sources: SourceDoc[]; onOpen: (s: SourceDoc) => void }> = ({ sources, onOpen }) => (
  <ul className="mt-2 flex flex-col gap-1 border-l-2 border-neutral-border-light pl-3">
    {sources.map(s => (
      <li key={s.id}>
        <button type="button" onClick={() => onOpen(s)} className="group w-full text-left rounded-md px-2 py-2 hover:bg-bg-base flex flex-col gap-1">
          <span className="flex items-center gap-2 text-sm font-medium text-text-main">
            <FileText className="w-4 h-4 text-text-sub" />{s.title}
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-normal text-text-sub group-hover:text-primary">查看原始紀錄<ExternalLink className="w-3 h-3" /></span>
          </span>
          <span className="text-xs text-text-sub">{s.meta}</span>
          <span className="text-sm text-text-main">{s.excerpt}</span>
        </button>
      </li>
    ))}
  </ul>
);

const PlanCards: React.FC<{ hiringCase: HiringCase; plans: PlanOption[]; replyingPlan: string | null; onDiscuss: (p: PlanOption) => void }> = ({ hiringCase: c, plans, replyingPlan, onDiscuss }) => (
  <div className={`mt-3 grid gap-3 ${plans.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
    {plans.map(p => {
      const active = replyingPlan === p.id;
      const approved = p.marker === 'approved';
      return (
        <div key={p.id} className={`rounded-lg border bg-bg-card flex flex-col ${active ? 'border-primary' : 'border-neutral-border-light'}`}>
          <div className="flex items-center justify-between gap-2 px-4 pt-3">
            <span className="text-sm font-medium text-text-main">{p.title}</span>
            {approved ? <MarkerBadge marker="approved" label={`已核准 ${c.decision?.version ?? ''}`} /> : <MarkerBadge marker="agent" label={p.confirmable ? 'Agent 建議／可送核准' : 'Agent 建議／未核准'} />}
          </div>
          <dl className="px-4 pt-3 flex flex-col gap-2 text-sm">
            <div className="flex gap-3"><dt className="w-12 shrink-0 text-text-sub">職位</dt><dd className="text-text-main">{p.position}</dd></div>
            <div className="flex gap-3"><dt className="w-12 shrink-0 text-text-sub">薪酬</dt><dd className="text-text-main">{p.salary}</dd></div>
            <div className="flex gap-3"><dt className="w-12 shrink-0 text-text-sub">責任</dt><dd className="text-text-main">{p.scope}</dd></div>
          </dl>
          <dl className="mx-4 my-3 pt-3 border-t border-dashed border-neutral-border-light flex flex-col gap-2 text-sm">
            <div className="flex gap-3"><dt className="w-16 shrink-0 text-text-sub">能解決</dt><dd className="text-text-main">{p.solves}</dd></div>
            <div className="flex gap-3"><dt className="w-16 shrink-0 text-text-sub">需要配套</dt><dd className="text-text-main">{p.support}</dd></div>
            <div className="flex gap-3"><dt className="w-16 shrink-0 text-text-sub">仍待解決</dt><dd className="text-text-main">{p.openIssues}</dd></div>
          </dl>
          <div className="mt-auto border-t border-neutral-border-light px-2 py-1">
            <button type="button" onClick={() => onDiscuss(p)} className={`h-8 px-2 rounded-md text-xs font-medium inline-flex items-center gap-1 hover:bg-bg-base ${active ? 'text-primary' : 'text-text-sub hover:text-text-main'}`}>
              <MessageSquareReply className="w-4 h-4" />{active ? '正在回覆此方案' : '針對此方案討論'}
            </button>
          </div>
        </div>
      );
    })}
  </div>
);

/** 對話事件：開始處理、完成、接棒、採納、核准 */
const EventRow: React.FC<{ msg: ChatMessage; fresh: boolean; onViewEvidence: (ids: string[]) => void }> = ({ msg, fresh, onViewEvidence }) => {
  const e = msg.event!;
  if (e.tone === 'start' || e.tone === 'adopt' || e.tone === 'submit') {
    const Icon = e.tone === 'start' ? Play : e.tone === 'submit' ? Upload : Lightbulb;
    return (
      <div className="flex items-center gap-2 text-xs text-text-sub jh-rise">
        <span className="w-6 h-6 rounded-full bg-primary-light text-primary flex items-center justify-center"><Icon className="w-3 h-3" /></span>
        <span className="text-text-main">{e.title}</span>{e.detail && <span>{e.detail}</span>}<span className="text-text-muted">{msg.time}</span>
        {e.tone === 'submit' && <span className="sr-only">資料提交不等於檢核通過</span>}
      </div>
    );
  }
  const Icon = e.tone === 'approve' ? ShieldCheck : CircleCheck;
  return (
    <div className={`rounded-lg border border-green-100 bg-success-light px-4 py-3 flex items-start gap-3 jh-rise ${fresh ? 'jh-glow' : ''}`}>
      <span className={`w-8 h-8 shrink-0 rounded-full bg-success text-white flex items-center justify-center ${fresh ? 'jh-check-pop' : ''}`}><Icon className="w-4 h-4" /></span>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="flex items-baseline gap-2">
          <span className="text-base font-medium text-text-main">{e.title}</span>
          <span className="text-xs text-text-sub">{personOf(msg.authorId).name}・{msg.time}</span>
        </span>
        {e.detail && <span className="text-sm text-text-main">{e.detail}</span>}
        {e.next && <span className="inline-flex items-center gap-1 text-sm font-medium text-text-main"><ArrowRight className="w-4 h-4 text-success" />{e.next}</span>}
        {e.evidenceMsgIds && e.evidenceMsgIds.length > 0 && (
          <button type="button" onClick={() => onViewEvidence(e.evidenceMsgIds!)} className="self-start h-7 px-2 -ml-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-bg-card inline-flex items-center gap-1">
            <FileSearch className="w-4 h-4" />回查依據
          </button>
        )}
      </div>
    </div>
  );
};

const MessageItem: React.FC<{
  hiringCase: HiringCase;
  msg: ChatMessage;
  userId: string;
  replyingPlan: string | null;
  highlighted: boolean;
  fresh: boolean;
  onDiscuss: (p: PlanOption) => void;
  onOpenSource: (s: SourceDoc) => void;
  onConfirmTask: (id: string) => void;
  onViewEvidence: (ids: string[]) => void;
  onAction: (anchor: string, a: MessageAction) => void;
  panel: React.ReactNode;
}> = ({ hiringCase: c, msg, userId, replyingPlan, highlighted, fresh, onDiscuss, onOpenSource, onConfirmTask, onViewEvidence, onAction, panel }) => {
  const [showEvidence, setShowEvidence] = useState(false);
  if (msg.event) {
    return <div id={`msg-${msg.id}`} className={`rounded-lg transition-colors duration-500 ${highlighted ? 'bg-primary-light p-2 -m-2' : ''}`}><EventRow msg={msg} fresh={fresh} onViewEvidence={onViewEvidence} /></div>;
  }
  const author = personOf(msg.authorId);
  const isAgent = author.roleKey === 'agent';
  const sources = (msg.sources ?? []).map(id => c.sources.find(s => s.id === id)).filter((s): s is SourceDoc => !!s);
  const liveTask = msg.checklist ? c.tasks.find(t => t.id === msg.checklist!.taskId) : null;
  const isLatestChecklist = msg.checklist && [...c.messages].reverse().find(m => m.checklist?.taskId === msg.checklist!.taskId)?.id === msg.id;

  return (
    <article id={`msg-${msg.id}`} className={`flex gap-3 -mx-3 px-3 py-2 rounded-lg transition-colors duration-500 ${highlighted ? 'bg-primary-light' : ''}`}>
      <Avatar person={author} />
      <div className="flex-1 min-w-0">
        <header className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-main">{author.name}</span>
          <span className={`text-xs ${isAgent ? 'text-primary' : 'text-text-sub'}`}>{author.role}</span>
          <span className="text-xs text-text-muted">{msg.time}</span>
          {msg.taskRef && <span className="h-5 px-2 rounded-full bg-bg-base text-xs text-text-sub inline-flex items-center gap-1"><Crosshair className="w-3 h-3" />{msg.taskRef.title}</span>}
        </header>

        {msg.replyToPlan && <div className="mt-1 inline-flex items-center gap-1 text-xs text-text-sub"><CornerDownRight className="w-3 h-3" />回覆 {msg.replyToPlan.label}</div>}

        <p className="mt-1 text-base leading-7 text-text-main whitespace-pre-wrap break-words">{renderWithMentions(msg.text)}</p>

        {msg.checklist && (
          <div className="mt-3 rounded-lg border border-neutral-border-light bg-bg-base p-3 flex flex-col gap-3">
            <span className="text-xs font-medium text-text-sub">完成條件・{msg.taskRef?.title}</span>
            <CriteriaList items={msg.checklist.items.map(i => ({ ...i, hint: i.state === '仍待補充' ? liveTask?.criteria?.find(cr => cr.label === i.label)?.hint : undefined }))} />
            {isLatestChecklist && liveTask && (
              liveTask.status === '已完成'
                ? <span className="inline-flex items-center gap-1 text-sm text-success"><CircleCheck className="w-4 h-4" />已完成</span>
                : isReadyToConfirm(liveTask)
                  ? (liveTask.confirmerId === userId
                    ? <button type="button" onClick={() => onConfirmTask(liveTask.id)} className="self-start h-9 px-4 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-hover inline-flex items-center gap-1"><Check className="w-4 h-4" />確認完成</button>
                    : <span className="text-sm text-text-sub">已符合完成條件，等待{personOf(liveTask.confirmerId ?? liveTask.ownerId).name}確認</span>)
                  : null
            )}
          </div>
        )}

        {sources.length > 0 && (
          <>
            <button type="button" onClick={() => setShowEvidence(v => !v)} aria-expanded={showEvidence} className="mt-1 h-7 -ml-2 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-bg-base inline-flex items-center gap-1">
              <FileSearch className="w-4 h-4" />查看依據（{sources.length}）{showEvidence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showEvidence && <EvidenceList sources={sources} onOpen={onOpenSource} />}
          </>
        )}

        {msg.plans && <PlanCards hiringCase={c} plans={msg.plans} replyingPlan={replyingPlan} onDiscuss={onDiscuss} />}

        {msg.followUp && (
          <p className="mt-4 text-base leading-7 text-text-main"><span className="text-primary font-medium">@{personOf(msg.followUp.mentionId).name}</span>，{msg.followUp.text}</p>
        )}

        {msg.actions && msg.actions.length > 0 && <ActionButtons actions={msg.actions} onAction={a => onAction(msg.id, a)} />}
        {panel}
      </div>
    </article>
  );
};

/** Agent 訊息內的具體動作按鈕 */
const ActionButtons: React.FC<{ actions: MessageAction[]; onAction: (a: MessageAction) => void }> = ({ actions, onAction }) => (
  <div className="mt-3 flex flex-wrap gap-2">
    {actions.map((a, i) => (
      <button
        key={a.label}
        type="button"
        onClick={() => onAction(a)}
        className={`h-9 px-4 rounded-full text-sm font-medium inline-flex items-center gap-1 ${i === 0 ? 'bg-primary text-white hover:bg-primary-hover' : 'border border-neutral-border text-text-main hover:bg-bg-base'}`}
      >
        {a.kind === 'confirm' && <Check className="w-4 h-4" />}
        {a.kind === 'assist' && <HandHelping className="w-4 h-4" />}
        {a.label}
      </button>
    ))}
  </div>
);

/** Agent 給目前使用者的下一步：固定在對話最後，依角色與案件狀況即時產生 */
const NextStepMessage: React.FC<{
  userId: string;
  step: { text: string; actions: MessageAction[] };
  highlighted: boolean;
  onAction: (anchor: string, a: MessageAction) => void;
  panel: React.ReactNode;
}> = ({ userId, step, highlighted, onAction, panel }) => (
  <article id="msg-next" className={`flex gap-3 -mx-3 px-3 py-3 rounded-lg border border-dashed transition-colors duration-500 ${highlighted ? 'bg-primary-light border-primary' : 'border-neutral-border-light'}`}>
    <Avatar person={personOf('agent')} />
    <div className="flex-1 min-w-0">
      <header className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm font-medium text-text-main">Agent</span>
        <span className="text-xs text-primary">給{personOf(userId).name}的下一步</span>
        <span className="text-xs text-text-muted">依你的角色與目前進度更新</span>
      </header>
      <p className="mt-1 text-base leading-7 text-text-main">{step.text}</p>
      {step.actions.length > 0 && <ActionButtons actions={step.actions} onAction={a => onAction('next', a)} />}
      {panel}
    </div>
  </article>
);

// ─────────────────────────────────────────────────────────────────────────────
// 輸入框
// ─────────────────────────────────────────────────────────────────────────────

const Composer: React.FC<{
  hiringCase: HiringCase;
  userId: string;
  draft: string;
  onDraft: (v: string) => void;
  busy: boolean;
  replyPlan: PlanOption | null;
  workingTitle: string | null;
  /** 協助他人任務（不是負責人） */
  assisting: boolean;
  showFirstHint: boolean;
  onDismissHint: () => void;
  onCancelPlan: () => void;
  onExitTask: () => void;
  onSend: () => void;
  onToast: (t: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}> = ({ hiringCase: c, userId, draft, onDraft, busy, replyPlan, workingTitle, assisting, showFirstHint, onDismissHint, onCancelPlan, onExitTask, onSend, onToast, inputRef }) => {
  const [focused, setFocused] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft, inputRef]);

  useEffect(() => {
    if (!mentionOpen) return;
    const close = () => setMentionOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [mentionOpen]);

  const insertMention = (name: string) => {
    onDraft(`${draft}${draft && !draft.endsWith(' ') ? ' ' : ''}@${name} `);
    setMentionOpen(false);
    inputRef.current?.focus();
  };


  return (
    <div>
      {showFirstHint && (focused || draft) && (
        <div className="mb-2 flex items-center gap-2 rounded-full bg-bg-base px-3 py-1 text-xs text-text-sub jh-rise" role="note">
          <Info className="w-4 h-4 text-primary shrink-0" />訊息會分享給本案成員；@Agent 可請它分析。
          <button type="button" onClick={onDismissHint} className="ml-auto font-medium hover:text-text-main">知道了</button>
        </div>
      )}
      <div className={`rounded-xl border bg-bg-input shadow-sm focus-within:border-primary px-4 pt-3 pb-2 flex flex-col gap-2 ${workingTitle ? 'border-primary' : 'border-neutral-border'}`}>
        {workingTitle && (
          <div className="flex items-center gap-2 text-xs">
            <span className="h-6 px-2 rounded-full bg-primary-light text-blue-700 font-medium inline-flex items-center gap-1">
              {assisting ? <HandHelping className="w-3 h-3" /> : <Crosshair className="w-3 h-3" />}{assisting ? '正在協助' : '正在處理'}：{workingTitle}
            </span>
            <span className="text-text-sub">{assisting ? '你提供的內容會交由負責人確認' : '可自由描述、上傳資料或請 Agent 分析'}</span>
            <button type="button" onClick={onExitTask} className="ml-auto h-6 px-2 rounded-md text-text-sub hover:text-text-main hover:bg-bg-base">退出</button>
          </div>
        )}
        {replyPlan && (
          <div className="flex items-center gap-2 text-xs text-text-sub">
            <CornerDownRight className="w-3 h-3" />回覆 <span className="font-medium text-text-main">{replyPlan.title}：{replyPlan.position}</span>
            {replyPlan.marker === 'approved' ? <MarkerBadge marker="approved" label={`已核准 ${c.decision?.version ?? ''}`} /> : <MarkerBadge marker="agent" label="Agent 建議／未核准" />}
            <button type="button" onClick={onCancelPlan} aria-label="取消回覆方案" className="ml-auto text-text-sub hover:text-text-main"><X className="w-4 h-4" /></button>
          </div>
        )}
        <textarea
          ref={inputRef}
          rows={2}
          value={draft}
          onChange={e => onDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSend(); }
          }}
          placeholder={c.status === '討論草稿' ? '輸入人選姓名與職位，或貼上面試紀錄…' : workingTitle ? `補充「${workingTitle}」需要的資訊…` : '補充資訊、討論方案，或 @Agent 分析…'}
          aria-label="輸入訊息"
          className="w-full resize-none bg-transparent text-base text-text-main placeholder:text-text-hint outline-none leading-6"
        />
        <div className="flex items-center gap-1">
          <IconButton label="附件" onClick={() => onToast('附件上傳（原型示意）')}><Paperclip className="w-4 h-4" /></IconButton>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <IconButton label="@參與者" onClick={() => setMentionOpen(v => !v)} active={mentionOpen}><AtSign className="w-4 h-4" /></IconButton>
            {mentionOpen && (
              <ul className="absolute left-0 bottom-full mb-2 z-30 w-56 rounded-md border border-neutral-border-light bg-bg-card shadow-lg py-1">
                {c.participantIds.filter(id => id !== userId).map(id => {
                  const p = personOf(id);
                  return (
                    <li key={id}>
                      <button type="button" onClick={() => insertMention(p.name)} className="w-full h-9 px-3 flex items-center gap-2 text-sm text-text-main hover:bg-bg-base">
                        <Avatar person={p} size="sm" />{p.name}<span className="text-xs text-text-sub">{p.role}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <button type="button" onClick={onSend} disabled={!draft.trim() || busy} aria-label="送出" className="ml-auto w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover disabled:bg-neutral-border-light disabled:text-text-muted">
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-text-sub">Enter 送出、Shift + Enter 換行。對話中的同意或任務完成都不等於核准，正式決策需由授權者核准。</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 頁面
// ─────────────────────────────────────────────────────────────────────────────

const HiringDecisionPage: React.FC = () => {
  const [cases, setCases] = useState<HiringCase[]>(SEED_CASES);
  const [activeId, setActiveId] = useState(SEED_CASES[0].id);
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [collapsed, setCollapsed] = useState(false);
  const [focusSearchSignal, setFocusSearchSignal] = useState(0);
  /** 任務日誌：首次進入預設收合 */
  /** 本案進展：寬螢幕預設展開，窄螢幕按需開啟 */
  const [progressOpen, setProgressOpen] = useState(() => window.innerWidth >= 1280);
  /** 中央工作面板：掛在哪則訊息下（'next' = Agent 下一步） */
  const [panel, setPanel] = useState<{ anchor: string; kind: 'docs' | 'provide' | 'draft'; taskId: string; preset?: string } | null>(null);
  /** 草稿內容：依任務、條件保存，部分送出後保留 */
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [workingTaskId, setWorkingTaskId] = useState<string | null>(null);
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const [freshEventId, setFreshEventId] = useState<string | null>(null);
  const [summaryPulse, setSummaryPulse] = useState(false);
  const [modal, setModal] = useState<'confirm' | 'consensus' | 'sources' | 'log' | 'history' | null>(null);
  const [sourceView, setSourceView] = useState<SourceDoc | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [draft, setDraft] = useState('');
  const [replyingPlan, setReplyingPlan] = useState<PlanOption | null>(null);
  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);
  const [typingCaseId, setTypingCaseId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [firstHint, setFirstHint] = useState(() => {
    try { return localStorage.getItem('jh-first-hint') !== 'done'; } catch { return true; }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<number | null>(null);

  const active = cases.find(c => c.id === activeId)!;
  const isEmptyDraft = active.status === '討論草稿' && active.messages.length === 0;
  const workingTask = workingTaskId ? active.tasks.find(t => t.id === workingTaskId && t.status === '進行中') ?? null : null;
  const suggestions = suggestionsFor(active, userId, workingTask?.id ?? null);
  const nextStep = nextStepFor(active, userId);
  const busy = typingCaseId !== null;

  const dismissHint = () => {
    setFirstHint(false);
    try { localStorage.setItem('jh-first-hint', 'done'); } catch { /* 無痕模式略過 */ }
  };

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  const patchCase = (id: string, fn: (c: HiringCase) => HiringCase) => setCases(prev => prev.map(c => (c.id === id ? fn(c) : c)));

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [activeId]);

  const seen = useRef({ id: activeId, count: active.messages.length });
  useEffect(() => {
    const count = active.messages.length;
    const grew = seen.current.id === activeId && count > seen.current.count;
    seen.current = { id: activeId, count };
    if ((grew || typingCaseId === activeId) && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active.messages.length, activeId, typingCaseId]);

  const openSearch = () => { setCollapsed(false); setFocusSearchSignal(n => n + 1); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!inviteOpen) return;
    const close = () => setInviteOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [inviteOpen]);

  const select = (id: string) => {
    setActiveId(id);
    setReplyingPlan(null);
    setDraft('');
    setWorkingTaskId(null);
    setPanel(null);
  };

  const startNew = () => {
    const emptyDraft = cases.find(c => c.status === '討論草稿' && c.messages.length === 0);
    if (emptyDraft) { select(emptyDraft.id); return; }
    const created = makeDraftCase(newId('draft'), userId);
    setCases(prev => [created, ...prev]);
    select(created.id);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const toggleProgress = () => {
    if (!progressOpen && window.innerWidth < 1280) setCollapsed(true);
    setProgressOpen(v => !v);
  };

  const switchRole = (id: string) => {
    if (id === userId) return;
    setUserId(id);
    setWorkingTaskId(null);
    setPanel(null);
    setDraft('');
    setReplyingPlan(null);
    showToast(`已切換為${personOf(id).name}（${personOf(id).role}），案件與進度不變`);
  };

  const viewDiscussion = (task: CaseTask) => {
    const kw = task.discussKeyword;
    const hit = (m: ChatMessage) => m.taskRef?.id === task.id || (!!kw && [m.text, m.followUp?.text, m.event?.title, m.event?.detail].some(x => x?.includes(kw)));
    const msg = [...active.messages].reverse().find(hit);
    if (msg) flash(msg.id); else showToast('對話中還沒有這項任務的討論');
  };

  const provide = (taskId: string, name: string) => {
    patchCase(active.id, c => provideDoc(c, taskId, name, userId, nowLabel(), () => newId()));
    showToast(`已提交「${name}」：已收到，待檢核`);
  };

  const flash = (msgId: string) => {
    document.getElementById(`msg-${msgId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightMsgId(msgId);
    window.setTimeout(() => setHighlightMsgId(id => (id === msgId ? null : id)), 2000);
  };

  const viewEvidence = (ids: string[]) => {
    const target = ids.find(id => active.messages.some(m => m.id === id));
    if (target) flash(target); else showToast('找不到對應的訊息');
  };

  /** 開始／繼續處理任務：對話成為焦點，輸入框顯示「正在處理」 */
  const startWork = (taskId: string) => {
    const task = active.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.confirmVia === 'decision') { setModal('confirm'); return; }
    setWorkingTaskId(taskId);
    if (task.status === '進行中') {
      const last = [...active.messages].reverse().find(m => m.taskRef?.id === taskId);
      if (last) flash(last.id);
    } else {
      patchCase(active.id, c => startTask(c, taskId, userId, nowLabel(), () => newId()));
    }
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  const celebrate = (taskId: string, before: HiringCase, after: HiringCase) => {
    const event = after.messages.slice(before.messages.length).find(m => m.event);
    setJustCompletedId(taskId);
    setFreshEventId(event?.id ?? null);
    setSummaryPulse(true);
    window.setTimeout(() => { setJustCompletedId(null); setFreshEventId(null); setSummaryPulse(false); }, 2600);
  };

  const confirmWork = (taskId: string) => {
    const before = active;
    const after = confirmTask(before, taskId, userId, nowLabel(), () => newId());
    if (after === before) { showToast('只有指定的確認角色能確認完成'); return; }
    patchCase(active.id, () => after);
    if (workingTaskId === taskId) setWorkingTaskId(null);
    celebrate(taskId, before, after);
  };

  const doApprove = () => {
    const before = active;
    const after = approve(before, userId, nowLabel(), () => newId());
    setModal(null);
    if (after === before) return;
    patchCase(active.id, () => after);
    const decided = before.tasks.find(t => t.confirmVia === 'decision' && t.status !== '已完成');
    if (decided) celebrate(decided.id, before, after);
  };

  const send = (raw: string, extra?: { taskId?: string; criteriaIds?: string[] }) => {
    const text = raw.trim();
    if (!text || typingCaseId) return;
    const caseId = active.id;
    const plan = replyingPlan;
    const task = extra?.taskId ? active.tasks.find(t => t.id === extra.taskId) ?? null : workingTask;
    const author = userId;
    const time = nowLabel();
    const userMsgId = newId();
    patchCase(caseId, c => ({
      ...c,
      candidate: c.status === '討論草稿' && c.messages.length === 0 ? (text.length > 16 ? `${text.slice(0, 16)}…` : text) : c.candidate,
      participantIds: c.participantIds.includes(author) ? c.participantIds : [...c.participantIds, author],
      updatedLabel: '剛剛',
      updatedAt: Date.now(),
      messages: [...c.messages, {
        id: userMsgId, authorId: author, time, text,
        taskRef: task ? { id: task.id, title: task.title } : undefined,
        replyToPlan: plan ? { id: plan.id, label: `${plan.title}：${plan.position}` } : undefined,
      }],
    }));
    setDraft('');
    setReplyingPlan(null);
    if (firstHint) dismissHint();
    setTypingCaseId(caseId);
    window.setTimeout(() => {
      setTypingCaseId(null);
      setCases(prev => prev.map(c => {
        if (c.id !== caseId) return c;
        const { next, reply } = agentTurn(c, author, text, time, { planId: plan?.id, taskId: task?.id, userMsgId, criteriaIds: extra?.criteriaIds });
        return { ...next, messages: [...next.messages, { id: newId(), authorId: 'agent', time: nowLabel(), ...reply }] };
      }));
    }, 1100);
  };

  /** 開啟草稿：負責人尚未開始時先記錄開始；協助者不改變負責人 */
  const openDraft = (anchor: string, taskId: string) => {
    const task = active.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.status !== '進行中') patchCase(active.id, c => startTask(c, taskId, userId, nowLabel(), () => newId()));
    setWorkingTaskId(taskId);
    setPanel({ anchor, kind: 'draft', taskId });
  };

  /** Agent 訊息按鈕：與右側進展、自然語言操作指向同一筆任務 */
  const handleAction = (anchor: string, a: MessageAction) => {
    if (a.kind === 'docs' || a.kind === 'provide') setPanel(p => (p && p.anchor === anchor && p.kind === a.kind ? null : { anchor, kind: a.kind as 'docs' | 'provide', taskId: a.taskId }));
    if (a.kind === 'ask') send('@Agent 任用資料的要求是什麼？', { taskId: a.taskId });
    if (a.kind === 'draft' || a.kind === 'assist') openDraft(anchor, a.taskId);
    if (a.kind === 'confirm') confirmWork(a.taskId);
    if (a.kind === 'approve') setModal('confirm');
    if (a.kind === 'start') startWork(a.taskId);
    if (a.kind === 'discuss') { const t = active.tasks.find(x => x.id === a.taskId); if (t) viewDiscussion(t); }
  };

  const submitDraft = (taskId: string, ids: string[]) => {
    const task = active.tasks.find(t => t.id === taskId);
    if (!task?.criteria) return;
    const values = drafts[taskId] ?? {};
    const text = task.criteria.filter(cr => ids.includes(cr.id)).map(cr => `${cr.label}：${values[cr.id].trim()}`).join('\n');
    send(text, { taskId, criteriaIds: ids });
    const missing = task.criteria.filter(cr => cr.state === '仍待補充').map(cr => cr.id);
    if (missing.every(id => ids.includes(id))) setPanel(null);
  };

  const renderPanel = (anchor: string) => {
    if (!panel || panel.anchor !== anchor) return null;
    const task = active.tasks.find(t => t.id === panel.taskId);
    if (!task) return null;
    const close = () => setPanel(null);
    if (panel.kind === 'docs' && task.docs) {
      return (
        <DocsPanel
          task={task}
          onClose={close}
          onProvide={name => setPanel({ anchor, kind: 'provide', taskId: task.id, preset: name })}
          onAsk={name => send(`@Agent 請解釋「${name}」的要求`, { taskId: task.id })}
          onException={name => { setDraft(`@林主管 想就「${name}」提出例外：`); inputRef.current?.focus(); }}
        />
      );
    }
    if (panel.kind === 'provide' && task.docs) {
      return <ProvidePanel key={panel.preset ?? 'p'} task={task} preset={panel.preset} onClose={close} onSubmit={name => provide(task.id, name)} />;
    }
    if (panel.kind === 'draft' && task.criteria) {
      return (
        <DraftPanel
          task={task}
          values={drafts[task.id] ?? {}}
          assisting={task.ownerId !== userId}
          busy={busy}
          onChange={(id, v) => setDrafts(d => ({ ...d, [task.id]: { ...(d[task.id] ?? {}), [id]: v } }))}
          onClose={close}
          onSubmit={ids => submitDraft(task.id, ids)}
        />
      );
    }
    return null;
  };

  /** 點右側進展：定位中央相關工作內容或討論 */
  const locate = (task: CaseTask) => {
    if (nextStep?.actions.some(a => a.taskId === task.id)) { flash('next'); return; }
    viewDiscussion(task);
  };

  const runSuggestion = (s: Suggestion) => {
    if (s.action === 'send' && s.text) send(s.text);
    if (s.action === 'fill' && s.text) { setDraft(s.text); inputRef.current?.focus(); }
    if (s.action === 'confirm') setModal('confirm');
    if (s.action === 'start' && s.taskId) startWork(s.taskId);
    if (s.action === 'confirmTask' && s.taskId) confirmWork(s.taskId);
    if (s.action === 'upload') showToast('上傳資料（原型示意）');
    if (s.action === 'docs' && s.taskId) setPanel({ anchor: 'next', kind: 'docs', taskId: s.taskId });
  };

  const composer = (
    <Composer
      key={active.id}
      hiringCase={active}
      userId={userId}
      draft={draft}
      onDraft={setDraft}
      busy={busy}
      replyPlan={replyingPlan}
      workingTitle={workingTask?.title ?? null}
      assisting={!!workingTask && workingTask.ownerId !== userId}
      showFirstHint={firstHint}
      onDismissHint={dismissHint}
      onCancelPlan={() => setReplyingPlan(null)}
      onExitTask={() => setWorkingTaskId(null)}
      onSend={() => send(draft)}
      onToast={showToast}
      inputRef={inputRef}
    />
  );

  return (
    <div className="h-screen w-screen flex bg-bg-card text-text-main overflow-hidden">
      <RecordSidebar
        collapsed={collapsed}
        cases={cases}
        activeId={activeId}
        userId={userId}
        focusSearchSignal={focusSearchSignal}
        onToggle={() => setCollapsed(v => !v)}
        onSearchFromRail={openSearch}
        onNew={startNew}
        onSelect={select}
      />

      <main className="flex-1 min-w-0 h-full flex flex-col">
        <header className="h-14 shrink-0 px-4 flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-medium text-text-main truncate">{caseTitle(active)}</h1>
            <span className={`h-5 px-2 rounded-full text-xs font-medium inline-flex items-center whitespace-nowrap ${STATUS_TONE[active.status]}`}>{active.status}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <RoleSwitcher userId={userId} onChange={switchRole} />
            <div className="hidden lg:flex -space-x-2" aria-label="參與者">
              {active.participantIds.map(id => <Avatar key={id} person={personOf(id)} size="sm" ring />)}
            </div>
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => setInviteOpen(v => !v)} aria-expanded={inviteOpen} className="h-9 px-3 rounded-full text-sm font-medium text-text-main hover:bg-neutral-border-light inline-flex items-center gap-2 whitespace-nowrap">
                <UserPlus className="w-4 h-4 text-text-sub" />邀請成員
              </button>
              {inviteOpen && (
                <div className="absolute right-0 top-full mt-2 z-30 w-80 rounded-lg border border-neutral-border-light bg-bg-card shadow-lg p-4 flex flex-col gap-3">
                  <span className="text-sm font-medium text-text-main">邀請成員加入討論</span>
                  <input autoFocus value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="輸入姓名或 Email" className="h-9 px-3 rounded-md border border-neutral-border bg-bg-input text-sm text-text-main placeholder:text-text-hint outline-none focus:border-primary" />
                  <ul className="flex flex-col gap-2">
                    {active.participantIds.map(id => {
                      const p = personOf(id);
                      return <li key={id} className="flex items-center gap-2 text-sm text-text-main"><Avatar person={p} size="sm" />{p.name}<span className="text-xs text-text-sub">{p.role}</span><Check className="w-4 h-4 text-success ml-auto" /></li>;
                    })}
                  </ul>
                  <button type="button" disabled={!inviteEmail.trim()} onClick={() => { showToast(`已邀請 ${inviteEmail.trim()}（原型示意）`); setInviteEmail(''); setInviteOpen(false); }} className="h-9 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:bg-neutral-border-light disabled:text-text-muted">
                    送出邀請
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {active.summary.length > 0 && (
          <ConsensusPanel
            hiringCase={active}
            currentUserId={userId}
            progressOpen={progressOpen}
            openTasks={openTaskCount(active.tasks)}
            pulse={summaryPulse}
            onOpenConfirm={() => setModal('confirm')}
            onOpenConsensus={() => setModal('consensus')}
            onToggleProgress={toggleProgress}
          />
        )}

        {isEmptyDraft ? (
          <div className="flex-1 overflow-y-auto flex items-center justify-center px-4">
            <div className="w-full max-w-3xl flex flex-col items-center gap-8 pb-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center"><Sparkles className="w-6 h-6" /></div>
                <h2 className="text-2xl font-bold text-text-main">要討論哪一位任用人選？</h2>
                <p className="text-sm text-text-sub">帶入人選後，Agent 會整理面試紀錄與候選人意向，建立目前共識與任務日誌。</p>
              </div>
              <div className="w-full">{composer}</div>
              <div className="flex flex-wrap justify-center gap-2">
                {DRAFT_SUGGESTIONS.map(s => (
                  <button key={s} type="button" onClick={() => send(s)} className="h-9 px-4 rounded-full border border-neutral-border-light text-sm text-text-sub hover:bg-bg-base hover:text-text-main">{s}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4">
                {active.messages.map(m => (
                  <MessageItem
                    key={m.id}
                    hiringCase={active}
                    msg={m}
                    userId={userId}
                    replyingPlan={replyingPlan?.id ?? null}
                    highlighted={highlightMsgId === m.id}
                    fresh={freshEventId === m.id}
                    onDiscuss={p => { setReplyingPlan(p); inputRef.current?.focus(); }}
                    onOpenSource={setSourceView}
                    onConfirmTask={confirmWork}
                    onViewEvidence={viewEvidence}
                    onAction={handleAction}
                    panel={renderPanel(m.id)}
                  />
                ))}
                {nextStep && typingCaseId !== active.id && (
                  <NextStepMessage userId={userId} step={nextStep} highlighted={highlightMsgId === 'next'} onAction={handleAction} panel={renderPanel('next')} />
                )}
                {typingCaseId === active.id && (
                  <div className="flex gap-3 items-center">
                    <Avatar person={personOf('agent')} />
                    <span className="text-sm text-text-sub motion-safe:animate-pulse">Agent 正在整理…</span>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 px-4 pb-4">
              <div className="max-w-3xl mx-auto flex flex-col gap-3">
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map(s => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => runSuggestion(s)}
                        disabled={busy && s.action === 'send'}
                        className={`h-9 px-4 rounded-full border text-sm disabled:opacity-50 inline-flex items-center gap-1 ${
                          s.action === 'confirmTask' ? 'border-primary bg-primary text-white hover:bg-primary-hover'
                          : s.action === 'start' || s.action === 'fill' || s.action === 'confirm' ? 'border-primary text-primary hover:bg-primary-light'
                          : 'border-neutral-border-light text-text-sub hover:bg-bg-base hover:text-text-main'
                        }`}
                      >
                        {s.action === 'start' && <Play className="w-4 h-4" />}
                        {s.action === 'confirmTask' && <Check className="w-4 h-4" />}
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
                {composer}
              </div>
            </div>
          </>
        )}
      </main>

      {progressOpen && active.tasks.length > 0 && (
        <ProgressPanel
          hiringCase={active}
          justCompletedId={justCompletedId}
          onClose={() => setProgressOpen(false)}
          onLocate={locate}
          onOpenHistory={() => setModal('history')}
        />
      )}

      {modal === 'confirm' && (
        <ConfirmDecisionModal
          hiringCase={active}
          currentUserId={userId}
          onClose={() => setModal(null)}
          onApprove={doApprove}
          onRemind={() => { setModal(null); showToast(`已提醒${personOf(active.confirmerId).name}核准（原型示意）`); }}
        />
      )}
      {modal === 'consensus' && (
        <ConsensusModal hiringCase={active} onClose={() => setModal(null)} onOpenSources={() => setModal('sources')} onOpenLog={() => setModal('log')} onOpenDecision={() => setModal('confirm')} />
      )}
      {modal === 'sources' && <SourcesModal hiringCase={active} onClose={() => setModal(null)} onOpenSource={setSourceView} />}
      {modal === 'log' && <ChangeLogModal hiringCase={active} onClose={() => setModal(null)} />}
      {modal === 'history' && <HistoryModal hiringCase={active} onClose={() => setModal(null)} onLocateMsg={flash} />}
      {sourceView && <SourceRecordModal source={sourceView} onClose={() => setSourceView(null)} />}

      {toast && (
        <div role="status" className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-full bg-text-main text-white text-sm px-4 py-2 shadow-2xl jh-rise">{toast}</div>
      )}
    </div>
  );
};

export default HiringDecisionPage;
