/**
 * JobHub 任用決策空間（桌面版高擬真原型，1440 × 1000）
 *
 * 每個對話圍繞一位任用人選；HR、面試官、用人主管、決策者與 Agent 共同參與。
 * Agent 是企業顧問：帶入資料、分析分歧、提出有依據的建議、維護目前共識與本案任務。
 * 正式決策由企業授權者在「確認任用方案」對話框核准；聊天中的同意不視為核准。
 * 所有資料與動作皆為原型示意；側欄底部可切換檢視身分，用來走完多角色情境。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanelLeftClose, PanelLeftOpen, SquarePen, Sparkles, MessageSquare, Search, X, UserPlus, Paperclip, AtSign, ArrowUp,
  FileSearch, ChevronDown, ChevronUp, MessageSquareReply, CornerDownRight, FileText, Check, ExternalLink, ListChecks,
  ChevronsUpDown, ArrowRight,
} from 'lucide-react';
import {
  PARTICIPANTS, DEFAULT_USER_ID, HiringCase, CaseStatus, SourceDoc, ChatMessage, PlanOption,
  DRAFT_SUGGESTIONS, personOf, makeDraftCase, openTaskCount,
} from './hiringMock';
import { SEED_CASES, agentTurn, approvePlan, suggestionsFor, Suggestion } from './caseFlow';
import { Avatar, MarkerBadge, IconButton, SourceRecordModal, TaskStatusBadge } from './hiringUi';
import ConsensusPanel, { ConfirmDecisionModal } from './ConsensusPanel';
import WorkListDrawer from './WorkListDrawer';

const nowLabel = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`;

const STATUS_TONE: Record<CaseStatus, string> = {
  討論草稿: 'bg-bg-base text-text-sub',
  任用評估中: 'bg-warning-light text-text-main',
  等待候選人回覆: 'bg-primary-light text-blue-700',
  已核准任用: 'bg-success-light text-success',
};

const STATUS_GROUPS: CaseStatus[] = ['討論草稿', '任用評估中', '等待候選人回覆', '已核准任用'];

const caseTitle = (c: HiringCase) => (c.position ? `${c.candidate}｜${c.position}` : c.candidate);

/** 把文字中的 query 標亮 */
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  const i = text.indexOf(query);
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="bg-yellow-100 text-text-main rounded-sm">{text.slice(i, i + query.length)}</mark>{text.slice(i + query.length)}</>;
};

// ─────────────────────────────────────────────────────────────────────────────
// 左側：任用紀錄（視覺比照 AI 小助手側欄）
// ─────────────────────────────────────────────────────────────────────────────

interface SearchHit {
  c: HiringCase;
  /** 命中對話內容時的片段 */
  snippet?: string;
}

/** 側欄底部：目前身分＋切換（原型用，方便走完多角色情境） */
const IdentitySwitcher: React.FC<{ userId: string; onChange: (id: string) => void }> = ({ userId, onChange }) => {
  const [open, setOpen] = useState(false);
  const me = personOf(userId);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative shrink-0 border-t border-neutral-border-light p-3" onClick={e => e.stopPropagation()}>
      {open && (
        <div className="absolute left-3 right-3 bottom-full mb-2 z-30 rounded-md border border-neutral-border-light bg-bg-card shadow-lg py-1">
          <p className="px-3 py-2 text-xs text-text-sub">切換檢視身分（原型示意）</p>
          {PARTICIPANTS.filter(p => p.roleKey !== 'agent').map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id); setOpen(false); }}
              className="w-full h-9 px-3 flex items-center gap-2 text-sm text-text-main hover:bg-bg-base"
            >
              <Avatar person={p} size="sm" />{p.name}<span className="text-xs text-text-sub">{p.role}</span>
              {p.id === userId && <Check className="w-4 h-4 text-primary ml-auto" />}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full rounded-md flex items-center gap-2 px-1 py-1 hover:bg-neutral-border-light"
      >
        <Avatar person={me} />
        <span className="flex-1 min-w-0 text-left text-sm text-text-main truncate">{me.name}</span>
        <span className="text-xs text-text-sub">{me.role}</span>
        <ChevronsUpDown className="w-4 h-4 text-text-sub" />
      </button>
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
  onChangeUser: (id: string) => void;
}> = ({ collapsed, cases, activeId, userId, focusSearchSignal, onToggle, onSearchFromRail, onNew, onSelect, onChangeUser }) => {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const q = query.trim();

  useEffect(() => {
    if (focusSearchSignal) searchRef.current?.focus();
  }, [focusSearchSignal]);

  // 搜尋：人選、職位、狀態、參與者、對話內容
  const hits = useMemo<SearchHit[]>(() => {
    const sorted = [...cases].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted.map(c => ({ c }));
    return sorted.flatMap(c => {
      const meta = `${c.candidate}${c.position}${c.status}${c.participantIds.map(id => personOf(id).name).join('')}`;
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

  const groups = STATUS_GROUPS
    .map(status => ({ status, items: hits.filter(h => h.c.status === status) }))
    .filter(g => g.items.length > 0);

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
          <div className="w-7 h-7 rounded-md bg-primary text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-base font-medium text-text-main truncate">JobHub</span>
        </div>
        <IconButton label="收合側欄" onClick={onToggle}><PanelLeftClose className="w-5 h-5" /></IconButton>
      </div>

      <div className="px-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onNew}
          className="w-full h-9 px-3 rounded-md flex items-center gap-2 text-sm font-medium text-text-main hover:bg-neutral-border-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <SquarePen className="w-4 h-4 text-text-sub" />
          新增任用討論
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
            placeholder="搜尋人選、職位、對話"
            aria-label="搜尋任用紀錄"
            className="flex-1 min-w-0 bg-transparent text-sm text-text-main placeholder:text-text-hint outline-none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="清除搜尋" className="text-text-sub hover:text-text-main">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-xs text-text-muted">⌘K</span>
          )}
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
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      aria-current={active ? 'page' : undefined}
                      title={`${caseTitle(c)}・${c.status}`}
                      className={`w-full min-h-9 px-2 py-2 rounded-md text-left flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        active ? 'bg-neutral-border-light' : 'hover:bg-neutral-border-light'
                      }`}
                    >
                      <span className={`text-sm text-text-main truncate ${active ? 'font-medium' : ''}`}>
                        <Highlight text={caseTitle(c)} query={q} />
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

      <IdentitySwitcher userId={userId} onChange={onChangeUser} />
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 對話：訊息、依據、方案卡、共識更新
// ─────────────────────────────────────────────────────────────────────────────

/** 把 @姓名 標成提及樣式 */
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
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-normal text-text-sub group-hover:text-primary">
              查看原始紀錄<ExternalLink className="w-3 h-3" />
            </span>
          </span>
          <span className="text-xs text-text-sub">{s.meta}</span>
          <span className="text-sm text-text-main">{s.excerpt}</span>
        </button>
      </li>
    ))}
  </ul>
);

/** 方案卡：職位／薪酬／責任＋企業視角（能解決、需要配套、仍待解決） */
const PlanCards: React.FC<{
  hiringCase: HiringCase;
  plans: PlanOption[];
  replyingPlan: string | null;
  onDiscuss: (p: PlanOption) => void;
}> = ({ hiringCase: c, plans, replyingPlan, onDiscuss }) => (
  <div className={`mt-3 grid gap-3 ${plans.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
    {plans.map(p => {
      const active = replyingPlan === p.id;
      const approved = p.marker === 'approved';
      return (
        <div key={p.id} className={`rounded-lg border bg-bg-card flex flex-col ${active ? 'border-primary' : 'border-neutral-border-light'}`}>
          <div className="flex items-center justify-between gap-2 px-4 pt-3">
            <span className="text-sm font-medium text-text-main">{p.title}</span>
            {approved
              ? <MarkerBadge marker="approved" label={`已核准 ${c.decision?.version ?? ''}`} />
              : <MarkerBadge marker="agent" label={p.confirmable ? 'Agent 建議／可送核准' : 'Agent 建議／未核准'} />}
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
          {approved && c.decision && (
            <p className="px-4 pb-3 text-xs text-text-sub">{personOf(c.decision.confirmerId).name}於 {c.decision.time} 正式核准</p>
          )}
          <div className="mt-auto border-t border-neutral-border-light px-2 py-1">
            <button
              type="button"
              onClick={() => onDiscuss(p)}
              className={`h-8 px-2 rounded-md text-xs font-medium inline-flex items-center gap-1 hover:bg-bg-base ${active ? 'text-primary' : 'text-text-sub hover:text-text-main'}`}
            >
              <MessageSquareReply className="w-4 h-4" />
              {active ? '正在回覆此方案' : '針對此方案討論'}
            </button>
          </div>
        </div>
      );
    })}
  </div>
);

/** Agent 推進案件時，顯示這次更新了哪些任務 */
const UpdateNotice: React.FC<{ updates: NonNullable<ChatMessage['updates']>; onOpenTasks: () => void }> = ({ updates, onOpenTasks }) => (
  <div className="mt-3 rounded-md border border-neutral-border-light bg-bg-base px-4 py-3 flex flex-col gap-2">
    <div className="flex items-center gap-2 text-xs text-text-sub">
      <ListChecks className="w-4 h-4" />已更新目前任用共識 {updates.version} 與工作清單
      <button type="button" onClick={onOpenTasks} className="ml-auto font-medium text-text-sub hover:text-primary">查看工作清單</button>
    </div>
    <ul className="flex flex-col gap-2">
      {updates.tasks.map(t => (
        <li key={t.title} className="flex items-center gap-2 text-sm text-text-main">
          <span className="flex-1 min-w-0 truncate">{t.title}</span>
          <TaskStatusBadge status={t.from} />
          <ArrowRight className="w-3 h-3 text-text-sub shrink-0" />
          <TaskStatusBadge status={t.to} />
        </li>
      ))}
    </ul>
  </div>
);

const MessageItem: React.FC<{
  hiringCase: HiringCase;
  msg: ChatMessage;
  replyingPlan: string | null;
  onDiscuss: (p: PlanOption) => void;
  highlighted: boolean;
  onOpenSource: (s: SourceDoc) => void;
  onOpenTasks: () => void;
}> = ({ hiringCase: c, msg, replyingPlan, onDiscuss, highlighted, onOpenSource, onOpenTasks }) => {
  const [showEvidence, setShowEvidence] = useState(false);
  const author = personOf(msg.authorId);
  const isAgent = author.roleKey === 'agent';
  const sources = (msg.sources ?? []).map(id => c.sources.find(s => s.id === id)).filter((s): s is SourceDoc => !!s);

  return (
    <article id={`msg-${msg.id}`} className={`flex gap-3 -mx-3 px-3 py-2 rounded-lg transition-colors duration-500 ${highlighted ? 'bg-primary-light' : ''}`}>
      <Avatar person={author} />
      <div className="flex-1 min-w-0">
        <header className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-text-main">{author.name}</span>
          <span className={`text-xs ${isAgent ? 'text-primary' : 'text-text-sub'}`}>{author.role}</span>
          <span className="text-xs text-text-muted">{msg.time}</span>
        </header>

        {msg.replyToPlan && (
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-text-sub">
            <CornerDownRight className="w-3 h-3" />回覆 {msg.replyToPlan.label}
          </div>
        )}

        <p className="mt-1 text-base leading-7 text-text-main whitespace-pre-wrap break-words">{renderWithMentions(msg.text)}</p>

        {msg.updates && <UpdateNotice updates={msg.updates} onOpenTasks={onOpenTasks} />}

        {sources.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowEvidence(v => !v)}
              aria-expanded={showEvidence}
              className="mt-1 h-7 -ml-2 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-bg-base inline-flex items-center gap-1"
            >
              <FileSearch className="w-4 h-4" />
              查看依據（{sources.length}）
              {showEvidence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showEvidence && <EvidenceList sources={sources} onOpen={onOpenSource} />}
          </>
        )}

        {msg.plans && <PlanCards hiringCase={c} plans={msg.plans} replyingPlan={replyingPlan} onDiscuss={onDiscuss} />}

        {msg.followUp && (
          <p className="mt-4 text-base leading-7 text-text-main">
            <span className="text-primary font-medium">@{personOf(msg.followUp.mentionId).name}</span>，{msg.followUp.text}
          </p>
        )}
      </div>
    </article>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 輸入框（視覺比照 AI 小助手）
// ─────────────────────────────────────────────────────────────────────────────

const Composer: React.FC<{
  hiringCase: HiringCase;
  userId: string;
  draft: string;
  onDraft: (v: string) => void;
  busy: boolean;
  replyPlan: PlanOption | null;
  onCancelPlan: () => void;
  onSend: () => void;
  onToast: (t: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}> = ({ hiringCase: c, userId, draft, onDraft, busy, replyPlan, onCancelPlan, onSend, onToast, inputRef }) => {
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

  const me = personOf(userId);

  return (
    <div>
      <div className="rounded-xl border border-neutral-border bg-bg-input shadow-sm focus-within:border-primary px-4 pt-3 pb-2 flex flex-col gap-2">
        {replyPlan && (
          <div className="flex items-center gap-2 text-xs text-text-sub">
            <CornerDownRight className="w-3 h-3" />
            回覆 <span className="font-medium text-text-main">{replyPlan.title}：{replyPlan.position}</span>
            {replyPlan.marker === 'approved'
              ? <MarkerBadge marker="approved" label={`已核准 ${c.decision?.version ?? ''}`} />
              : <MarkerBadge marker="agent" label="Agent 建議／未核准" />}
            <button type="button" onClick={onCancelPlan} aria-label="取消回覆方案" className="ml-auto text-text-sub hover:text-text-main">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <textarea
          ref={inputRef}
          rows={2}
          value={draft}
          onChange={e => onDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={c.status === '討論草稿' ? '輸入人選姓名與職位，或貼上面試紀錄…' : '補充資訊、討論方案，或請 Agent 分析…'}
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
          <span className="ml-auto mr-2 inline-flex items-center gap-1 text-xs text-text-sub">
            以 <Avatar person={me} size="xs" />{me.name}身分發言
          </span>
          <button
            type="button"
            onClick={onSend}
            disabled={!draft.trim() || busy}
            aria-label="送出"
            className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover disabled:bg-neutral-border-light disabled:text-text-muted"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-text-sub">Enter 送出、Shift + Enter 換行。對話中的同意不視為核准，正式決策需由授權者核准。</p>
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
  const [workList, setWorkList] = useState<{ open: boolean; taskId: string | null }>({ open: false, taskId: null });
  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sourceView, setSourceView] = useState<SourceDoc | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [draft, setDraft] = useState('');
  const [replyingPlan, setReplyingPlan] = useState<PlanOption | null>(null);
  const [typingCaseId, setTypingCaseId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<number | null>(null);

  const active = cases.find(c => c.id === activeId)!;
  const isEmptyDraft = active.status === '討論草稿' && active.messages.length === 0;
  const openTasks = openTaskCount(active.tasks);
  const suggestions = suggestionsFor(active, userId);

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  const patchCase = (id: string, fn: (c: HiringCase) => HiringCase) =>
    setCases(prev => prev.map(c => (c.id === id ? fn(c) : c)));

  // 切換任用紀錄：停在對話開頭（第一眼看到 Agent 的整理）
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeId]);

  // 同一筆紀錄有新訊息才捲到底
  const seen = useRef({ id: activeId, count: active.messages.length });
  useEffect(() => {
    const count = active.messages.length;
    const grew = seen.current.id === activeId && count > seen.current.count;
    seen.current = { id: activeId, count };
    if ((grew || typingCaseId === activeId) && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [active.messages.length, activeId, typingCaseId]);

  const openSearch = () => {
    setCollapsed(false);
    setFocusSearchSignal(n => n + 1);
  };

  // ⌘K：搜尋任用紀錄
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
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
    setWorkList(w => ({ ...w, taskId: null }));
  };

  const startNew = () => {
    const emptyDraft = cases.find(c => c.status === '討論草稿' && c.messages.length === 0);
    if (emptyDraft) { select(emptyDraft.id); return; }
    const created = makeDraftCase(newId('draft'), userId);
    setCases(prev => [created, ...prev]);
    select(created.id);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const openWorkList = (taskId: string | null = null) => {
    // 窄螢幕：讓出左側欄，確保對話仍能和工作清單並排對照
    if (window.innerWidth < 1280) setCollapsed(true);
    setWorkList({ open: true, taskId });
  };

  /** 查看討論：捲到最近一則提到此任務的訊息，並短暫標亮 */
  const viewDiscussion = (keyword: string) => {
    const msg = [...active.messages].reverse().find(m => m.text.includes(keyword) || m.followUp?.text.includes(keyword));
    if (!msg) { showToast('對話中還沒有相關討論'); return; }
    document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightMsgId(msg.id);
    window.setTimeout(() => setHighlightMsgId(id => (id === msg.id ? null : id)), 2000);
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || typingCaseId) return;
    const caseId = active.id;
    const plan = replyingPlan;
    const author = userId;
    const time = nowLabel();
    patchCase(caseId, c => ({
      ...c,
      // 草稿：以第一則訊息當暫定標題
      candidate: c.status === '討論草稿' && c.messages.length === 0 ? (text.length > 16 ? `${text.slice(0, 16)}…` : text) : c.candidate,
      participantIds: c.participantIds.includes(author) ? c.participantIds : [...c.participantIds, author],
      updatedLabel: '剛剛',
      updatedAt: Date.now(),
      messages: [...c.messages, {
        id: newId('m'), authorId: author, time, text,
        replyToPlan: plan ? { id: plan.id, label: `${plan.title}：${plan.position}` } : undefined,
      }],
    }));
    setDraft('');
    setReplyingPlan(null);
    setTypingCaseId(caseId);
    window.setTimeout(() => {
      setTypingCaseId(null);
      setCases(prev => prev.map(c => {
        if (c.id !== caseId) return c;
        const { next, reply } = agentTurn(c, author, text, time, plan?.id);
        return { ...next, messages: [...next.messages, { id: newId('m'), authorId: 'agent', time: nowLabel(), ...reply }] };
      }));
    }, 1100);
  };

  const approve = () => {
    const time = nowLabel();
    setCases(prev => prev.map(c => {
      if (c.id !== active.id) return c;
      const result = approvePlan(c, time);
      if (!result) return c;
      return { ...result.next, updatedLabel: '剛剛', updatedAt: Date.now(), messages: [...result.next.messages, { id: newId('m'), authorId: 'agent', time, ...result.reply }] };
    }));
    setConfirmOpen(false);
    showToast('已核准，正式決策已記錄');
  };

  const runSuggestion = (s: Suggestion) => {
    if (s.action === 'send' && s.text) send(s.text);
    if (s.action === 'fill' && s.text) { setDraft(s.text); inputRef.current?.focus(); }
    if (s.action === 'confirm') setConfirmOpen(true);
    if (s.action === 'tasks') openWorkList();
  };

  const discussPlan = (p: PlanOption) => {
    setReplyingPlan(p);
    inputRef.current?.focus();
  };

  const busy = typingCaseId !== null;

  const composer = (
    <Composer
      key={active.id}
      hiringCase={active}
      userId={userId}
      draft={draft}
      onDraft={setDraft}
      busy={busy}
      replyPlan={replyingPlan}
      onCancelPlan={() => setReplyingPlan(null)}
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
        onChangeUser={id => { setUserId(id); showToast(`已切換為${personOf(id).name}（${personOf(id).role}）`); }}
      />

      <main className="flex-1 min-w-0 h-full flex flex-col">
        {/* 頂部：人選、職位、本案任務、參與者、邀請成員 */}
        <header className="h-14 shrink-0 px-4 flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-medium text-text-main truncate">{caseTitle(active)}</h1>
            <span className={`h-5 px-2 rounded-sm text-xs font-medium inline-flex items-center whitespace-nowrap ${STATUS_TONE[active.status]}`}>{active.status}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {active.tasks.length > 0 && (
              <button
                type="button"
                onClick={() => (workList.open ? setWorkList(w => ({ ...w, open: false })) : openWorkList())}
                aria-pressed={workList.open}
                className={`h-9 px-3 rounded-md text-sm font-medium inline-flex items-center gap-2 whitespace-nowrap hover:bg-neutral-border-light ${workList.open ? 'bg-neutral-border-light text-text-main' : 'text-text-main'}`}
              >
                <ListChecks className="w-4 h-4 text-text-sub" />
                本案工作清單
                <span className={`h-5 px-2 rounded-full text-xs inline-flex items-center ${openTasks ? 'bg-warning-light text-text-main' : 'bg-success-light text-success'}`}>
                  {openTasks ? `${openTasks} 項未完成` : '全部完成'}
                </span>
              </button>
            )}
            <div className="flex -space-x-2" aria-label="參與者">
              {active.participantIds.map(id => <Avatar key={id} person={personOf(id)} size="sm" ring />)}
            </div>
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setInviteOpen(v => !v)}
                aria-expanded={inviteOpen}
                className="h-9 px-3 rounded-md text-sm font-medium text-text-main hover:bg-neutral-border-light inline-flex items-center gap-2 whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4 text-text-sub" />
                邀請成員
              </button>
              {inviteOpen && (
                <div className="absolute right-0 top-full mt-2 z-30 w-80 rounded-lg border border-neutral-border-light bg-bg-card shadow-lg p-4 flex flex-col gap-3">
                  <span className="text-sm font-medium text-text-main">邀請成員加入討論</span>
                  <input
                    autoFocus
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="輸入姓名或 Email"
                    className="h-9 px-3 rounded-md border border-neutral-border bg-bg-input text-sm text-text-main placeholder:text-text-hint outline-none focus:border-primary"
                  />
                  <ul className="flex flex-col gap-2">
                    {active.participantIds.map(id => {
                      const p = personOf(id);
                      return (
                        <li key={id} className="flex items-center gap-2 text-sm text-text-main">
                          <Avatar person={p} size="sm" />{p.name}<span className="text-xs text-text-sub">{p.role}</span>
                          <Check className="w-4 h-4 text-success ml-auto" />
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    disabled={!inviteEmail.trim()}
                    onClick={() => { showToast(`已邀請 ${inviteEmail.trim()}（原型示意）`); setInviteEmail(''); setInviteOpen(false); }}
                    className="h-9 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:bg-neutral-border-light disabled:text-text-muted"
                  >
                    送出邀請
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {active.summary.length > 0 && (
          <ConsensusPanel
            key={active.id}
            hiringCase={active}
            currentUserId={userId}
            onOpenConfirm={() => setConfirmOpen(true)}
          />
        )}

        {isEmptyDraft ? (
          <div className="flex-1 overflow-y-auto flex items-center justify-center px-4">
            <div className="w-full max-w-3xl flex flex-col items-center gap-8 pb-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-text-main">要討論哪一位任用人選？</h2>
                <p className="text-sm text-text-sub">帶入人選後，Agent 會整理面試紀錄與候選人意向，建立目前任用共識與本案任務。</p>
              </div>
              <div className="w-full">{composer}</div>
              <div className="flex flex-wrap justify-center gap-2">
                {DRAFT_SUGGESTIONS.map(s => (
                  <button key={s} type="button" onClick={() => send(s)} className="h-9 px-4 rounded-full border border-neutral-border-light text-sm text-text-sub hover:bg-bg-base hover:text-text-main">
                    {s}
                  </button>
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
                    replyingPlan={replyingPlan?.id ?? null}
                    onDiscuss={discussPlan}
                    highlighted={highlightMsgId === m.id}
                    onOpenSource={setSourceView}
                    onOpenTasks={() => openWorkList()}
                  />
                ))}
                {typingCaseId === active.id && (
                  <div className="flex gap-3 items-center">
                    <Avatar person={personOf('agent')} />
                    <span className="text-sm text-text-sub animate-pulse">Agent 正在分析…</span>
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
                        className={`h-9 px-4 rounded-full border text-sm disabled:opacity-50 ${
                          s.action === 'fill' || s.action === 'confirm'
                            ? 'border-primary text-primary hover:bg-primary-light'
                            : 'border-neutral-border-light text-text-sub hover:bg-bg-base hover:text-text-main'
                        }`}
                      >
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

      {workList.open && active.tasks.length > 0 && (
        <WorkListDrawer
          hiringCase={active}
          currentUserId={userId}
          selectedTaskId={workList.taskId}
          onSelectTask={taskId => setWorkList({ open: true, taskId })}
          onClose={() => setWorkList({ open: false, taskId: null })}
          onOpenSource={setSourceView}
          onViewDiscussion={viewDiscussion}
        />
      )}

      {confirmOpen && (
        <ConfirmDecisionModal
          hiringCase={active}
          currentUserId={userId}
          onClose={() => setConfirmOpen(false)}
          onApprove={approve}
          onRemind={() => { setConfirmOpen(false); showToast(`已提醒${personOf(active.confirmerId).name}核准（原型示意）`); }}
        />
      )}
      {sourceView && <SourceRecordModal source={sourceView} onClose={() => setSourceView(null)} />}

      {toast && (
        <div role="status" className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-md bg-text-main text-white text-sm px-4 py-2 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
};

export default HiringDecisionPage;
