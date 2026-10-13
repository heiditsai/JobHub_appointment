/**
 * JobHub 任用決策空間（桌面版高擬真原型，1440 × 1000）
 *
 * 每個對話圍繞一位任用人選；HR、面試官、用人主管、決策者與 Agent 共同參與。
 * Agent 是企業顧問：帶入資料、分析分歧、提出有依據的建議、維護目前共識。
 * 正式決策由企業授權者在「確認任用方案」對話框確認；聊天中的同意不視為核准。
 * 本畫面維持待決狀態；所有資料與動作皆為原型示意。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanelLeftClose, PanelLeftOpen, SquarePen, Sparkles, MessageSquare, Search, X, UserPlus, Paperclip, AtSign, ArrowUp,
  FileSearch, ChevronDown, ChevronUp, MessageSquareReply, CornerDownRight, FileText, Check,
} from 'lucide-react';
import {
  PARTICIPANTS, CURRENT_USER_ID, HIRING_RECORDS, HiringRecord, RecordStatus, PLANS, SOURCES,
  SEED_MESSAGES, SUGGESTED_ACTIONS, ChatMessage, personOf, mockAgentReply,
} from './hiringMock';
import { Avatar, MarkerBadge, IconButton } from './hiringUi';
import ConsensusPanel, { ConfirmDecisionModal } from './ConsensusPanel';

const nowLabel = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

let seq = 0;
const newId = () => `m-${Date.now()}-${seq++}`;

const STATUS_TONE: Record<RecordStatus, string> = {
  任用評估中: 'bg-warning-light text-text-main',
  等待候選人回覆: 'bg-primary-light text-blue-700',
  已確認任用: 'bg-success-light text-success',
};

// ─────────────────────────────────────────────────────────────────────────────
// 左側：任用紀錄
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_GROUPS: RecordStatus[] = ['任用評估中', '等待候選人回覆', '已確認任用'];

/** 視覺比照 AI 小助手側欄：品牌列、無框新增鈕、搜尋、依狀態分組的單行條列、底部使用者列 */
const RecordSidebar: React.FC<{
  collapsed: boolean;
  activeId: string;
  onToggle: () => void;
  onNew: () => void;
  onSelect: (r: HiringRecord) => void;
}> = ({ collapsed, activeId, onToggle, onNew, onSelect }) => {
  const [query, setQuery] = useState('');
  const me = personOf(CURRENT_USER_ID);

  const groups = useMemo(() => {
    const q = query.trim();
    const filtered = HIRING_RECORDS.filter(r => !q || `${r.candidate}${r.position}${r.status}`.includes(q));
    return STATUS_GROUPS
      .map(status => ({ status, items: filtered.filter(r => r.status === status) }))
      .filter(g => g.items.length > 0);
  }, [query]);

  // ── 收合：icon rail ──
  if (collapsed) {
    return (
      <aside className="h-full w-14 shrink-0 bg-bg-base border-r border-neutral-border-light flex flex-col items-center py-3 gap-2">
        <IconButton label="展開側欄" onClick={onToggle}><PanelLeftOpen className="w-5 h-5" /></IconButton>
        <IconButton label="新增任用討論" onClick={onNew}><SquarePen className="w-5 h-5" /></IconButton>
        <IconButton label="搜尋任用紀錄" onClick={onToggle}><Search className="w-5 h-5" /></IconButton>
        <div className="flex-1" />
        <Avatar person={me} />
      </aside>
    );
  }

  // ── 展開 ──
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
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜尋人選、職位"
            className="flex-1 min-w-0 bg-transparent text-sm text-text-main placeholder:text-text-hint outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="清除搜尋" className="text-text-sub hover:text-text-main">
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-4" aria-label="任用紀錄">
        {groups.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <MessageSquare className="w-6 h-6 text-text-muted" />
            <p className="text-xs text-text-sub">找不到「{query}」相關的任用紀錄</p>
          </div>
        )}
        {groups.map(g => (
          <section key={g.status} className="flex flex-col gap-1">
            <h3 className="px-2 text-xs font-medium text-text-sub">{g.status}</h3>
            <ul className="flex flex-col">
              {g.items.map(r => {
                const active = r.id === activeId;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(r)}
                      aria-current={active ? 'page' : undefined}
                      title={`${r.candidate}｜${r.position}・${r.status}`}
                      className={`w-full h-9 px-2 rounded-md text-left text-sm truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        active ? 'bg-neutral-border-light text-text-main font-medium' : 'text-text-main hover:bg-neutral-border-light'
                      }`}
                    >
                      {r.candidate}｜{r.position}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      <div className="shrink-0 border-t border-neutral-border-light p-3 flex items-center gap-2">
        <Avatar person={me} />
        <span className="flex-1 min-w-0 text-sm text-text-main truncate">{me.name}</span>
        <span className="text-xs text-text-sub">{me.role}</span>
      </div>
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 對話：訊息、依據、方案比較卡
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

const EvidenceList: React.FC<{ ids: string[] }> = ({ ids }) => (
  <ul className="mt-2 flex flex-col gap-2 border-l-2 border-neutral-border-light pl-4">
    {ids.map(id => {
      const s = SOURCES.find(x => x.id === id)!;
      return (
        <li key={id} className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-sm font-medium text-text-main">
            <FileText className="w-4 h-4 text-text-sub" />{s.title}
          </span>
          <span className="text-xs text-text-sub">{s.meta}</span>
          <span className="text-sm text-text-main">{s.excerpt}</span>
        </li>
      );
    })}
  </ul>
);

const PlanCompare: React.FC<{ replyingPlan: 'A' | 'B' | null; onDiscuss: (id: 'A' | 'B') => void }> = ({ replyingPlan, onDiscuss }) => (
  <div className="mt-3 grid grid-cols-2 gap-3">
    {PLANS.map(p => {
      const active = replyingPlan === p.id;
      return (
        <div key={p.id} className={`rounded-lg border bg-bg-card flex flex-col ${active ? 'border-primary' : 'border-neutral-border-light'}`}>
          <div className="flex items-center justify-between gap-2 px-4 pt-3">
            <span className="text-sm font-medium text-text-main">{p.title}</span>
            <MarkerBadge marker="agent" label="Agent 建議／未核准" />
          </div>
          <dl className="px-4 py-3 flex flex-col gap-2 text-sm">
            <div className="flex gap-3"><dt className="w-12 shrink-0 text-text-sub">職位</dt><dd className="text-text-main">{p.position}</dd></div>
            <div className="flex gap-3"><dt className="w-12 shrink-0 text-text-sub">薪酬</dt><dd className="text-text-main">{p.salary}</dd></div>
            <div className="flex gap-3"><dt className="w-12 shrink-0 text-text-sub">責任</dt><dd className="text-text-main">{p.scope}</dd></div>
            <div className="flex gap-3"><dt className="w-12 shrink-0 text-text-sub">待確認</dt><dd className="text-text-main">{p.open}</dd></div>
          </dl>
          <div className="mt-auto border-t border-neutral-border-light px-2 py-1">
            <button
              type="button"
              onClick={() => onDiscuss(p.id)}
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

const MessageItem: React.FC<{
  msg: ChatMessage;
  replyingPlan: 'A' | 'B' | null;
  onDiscuss: (id: 'A' | 'B') => void;
}> = ({ msg, replyingPlan, onDiscuss }) => {
  const [showEvidence, setShowEvidence] = useState(false);
  const author = personOf(msg.authorId);
  const isAgent = author.roleKey === 'agent';
  const plan = msg.replyToPlan ? PLANS.find(p => p.id === msg.replyToPlan) : null;

  return (
    <article className="flex gap-3">
      <Avatar person={author} />
      <div className="flex-1 min-w-0">
        <header className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-text-main">{author.name}</span>
          <span className={`text-xs ${isAgent ? 'text-primary' : 'text-text-sub'}`}>{author.role}</span>
          <span className="text-xs text-text-muted">{msg.time}</span>
        </header>

        {plan && (
          <div className="mt-1 inline-flex items-center gap-1 text-xs text-text-sub">
            <CornerDownRight className="w-3 h-3" />回覆 {plan.title}：{plan.position}
          </div>
        )}

        <p className="mt-1 text-base leading-7 text-text-main whitespace-pre-wrap break-words">{renderWithMentions(msg.text)}</p>

        {msg.sources && (
          <>
            <button
              type="button"
              onClick={() => setShowEvidence(v => !v)}
              aria-expanded={showEvidence}
              className="mt-1 h-7 -ml-2 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-bg-base inline-flex items-center gap-1"
            >
              <FileSearch className="w-4 h-4" />
              查看依據（{msg.sources.length}）
              {showEvidence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showEvidence && <EvidenceList ids={msg.sources} />}
          </>
        )}

        {msg.withPlans && <PlanCompare replyingPlan={replyingPlan} onDiscuss={onDiscuss} />}

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
// 頁面
// ─────────────────────────────────────────────────────────────────────────────

const HiringDecisionPage: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [consensusOpen, setConsensusOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [draft, setDraft] = useState('');
  const [replyingPlan, setReplyingPlan] = useState<'A' | 'B' | null>(null);
  const [agentTyping, setAgentTyping] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<number | null>(null);

  const record = HIRING_RECORDS[0];
  const participants = PARTICIPANTS;

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  // 進頁面時停在對話開頭（第一眼看到 Agent 的整理）；之後有新訊息才捲到底
  const seenCount = useRef(SEED_MESSAGES.length);
  useEffect(() => {
    if (messages.length === seenCount.current && !agentTyping) return;
    seenCount.current = messages.length;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, agentTyping]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  // 點外面關閉浮層
  useEffect(() => {
    if (!inviteOpen && !mentionOpen) return;
    const close = () => { setInviteOpen(false); setMentionOpen(false); };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [inviteOpen, mentionOpen]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || agentTyping) return;
    const plan = replyingPlan ?? undefined;
    setMessages(prev => [...prev, { id: newId(), authorId: CURRENT_USER_ID, time: nowLabel(), text: t, replyToPlan: plan }]);
    setDraft('');
    setReplyingPlan(null);
    setAgentTyping(true);
    window.setTimeout(() => {
      setAgentTyping(false);
      setMessages(prev => [...prev, { id: newId(), authorId: 'agent', time: nowLabel(), text: mockAgentReply(t, plan) }]);
    }, 1100);
  };

  const discussPlan = (id: 'A' | 'B') => {
    setReplyingPlan(id);
    inputRef.current?.focus();
  };

  const insertMention = (name: string) => {
    setDraft(d => `${d}${d && !d.endsWith(' ') ? ' ' : ''}@${name} `);
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  const replyPlan = replyingPlan ? PLANS.find(p => p.id === replyingPlan)! : null;

  return (
    <div className="h-screen w-screen flex bg-bg-card text-text-main overflow-hidden">
      <RecordSidebar
        collapsed={collapsed}
        activeId={record.id}
        onToggle={() => setCollapsed(v => !v)}
        onNew={() => showToast('新增任用討論（原型示意）')}
        onSelect={r => { if (r.id !== record.id) showToast(`${r.candidate}｜${r.position} 為示例紀錄，原型僅展示陳先生的討論`); }}
      />

      <main className="flex-1 min-w-0 h-full flex flex-col">
        {/* 頂部：人選、職位、參與者、邀請成員 */}
        <header className="h-14 shrink-0 px-4 flex items-center gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-medium text-text-main whitespace-nowrap">{record.candidate}｜{record.position}</h1>
            <span className={`h-5 px-2 rounded-sm text-xs font-medium inline-flex items-center ${STATUS_TONE[record.status]}`}>{record.status}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex -space-x-2" aria-label="參與者">
              {participants.map(p => <Avatar key={p.id} person={p} size="sm" ring />)}
            </div>
            <span className="text-xs text-text-sub">{participants.length} 位參與</span>
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setInviteOpen(v => !v)}
                aria-expanded={inviteOpen}
                className="h-9 px-3 rounded-md text-sm font-medium text-text-main hover:bg-neutral-border-light inline-flex items-center gap-2"
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
                    {participants.map(p => (
                      <li key={p.id} className="flex items-center gap-2 text-sm text-text-main">
                        <Avatar person={p} size="sm" />{p.name}<span className="text-xs text-text-sub">{p.role}</span>
                        <Check className="w-4 h-4 text-success ml-auto" />
                      </li>
                    ))}
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

        <ConsensusPanel expanded={consensusOpen} onToggle={() => setConsensusOpen(v => !v)} onOpenConfirm={() => setConfirmOpen(true)} />

        {/* 中央多人對話 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
            <div className="flex items-center gap-3 text-xs text-text-sub">
              <span className="flex-1 h-px bg-neutral-border-light" />今天 10/13<span className="flex-1 h-px bg-neutral-border-light" />
            </div>
            {messages.map(m => <MessageItem key={m.id} msg={m} replyingPlan={replyingPlan} onDiscuss={discussPlan} />)}
            {agentTyping && (
              <div className="flex gap-3 items-center">
                <Avatar person={personOf('agent')} />
                <span className="text-sm text-text-sub animate-pulse">Agent 正在分析…</span>
              </div>
            )}
          </div>
        </div>

        {/* 底部輸入（視覺比照 AI 小助手：大圓角輸入框＋圓形送出鈕＋下方註解） */}
        <div className="shrink-0 px-4 pb-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_ACTIONS.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => send(a)}
                  disabled={agentTyping}
                  className="h-9 px-4 rounded-full border border-neutral-border-light text-sm text-text-sub hover:bg-bg-base hover:text-text-main disabled:opacity-50"
                >
                  {a}
                </button>
              ))}
            </div>
            <div>
              <div className="rounded-xl border border-neutral-border bg-bg-input shadow-sm focus-within:border-primary px-4 pt-3 pb-2 flex flex-col gap-2">
                {replyPlan && (
                  <div className="flex items-center gap-2 text-xs text-text-sub">
                    <CornerDownRight className="w-3 h-3" />
                    回覆 <span className="font-medium text-text-main">{replyPlan.title}：{replyPlan.position}</span>
                    <MarkerBadge marker="agent" label="Agent 建議／未核准" />
                    <button type="button" onClick={() => setReplyingPlan(null)} aria-label="取消回覆方案" className="ml-auto text-text-sub hover:text-text-main">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      send(draft);
                    }
                  }}
                  placeholder="補充資訊、討論方案，或請 Agent 分析…"
                  aria-label="輸入訊息"
                  className="w-full resize-none bg-transparent text-base text-text-main placeholder:text-text-hint outline-none leading-6"
                />
                <div className="flex items-center gap-1">
                  <IconButton label="附件" onClick={() => showToast('附件上傳（原型示意）')}><Paperclip className="w-4 h-4" /></IconButton>
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    <IconButton label="@參與者" onClick={() => setMentionOpen(v => !v)} active={mentionOpen}><AtSign className="w-4 h-4" /></IconButton>
                    {mentionOpen && (
                      <ul className="absolute left-0 bottom-full mb-2 z-30 w-56 rounded-md border border-neutral-border-light bg-bg-card shadow-lg py-1">
                        {participants.filter(p => p.id !== CURRENT_USER_ID).map(p => (
                          <li key={p.id}>
                            <button type="button" onClick={() => insertMention(p.name)} className="w-full h-9 px-3 flex items-center gap-2 text-sm text-text-main hover:bg-bg-base">
                              <Avatar person={p} size="sm" />{p.name}<span className="text-xs text-text-sub">{p.role}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => send(draft)}
                    disabled={!draft.trim() || agentTyping}
                    aria-label="送出"
                    className="ml-auto w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover disabled:bg-neutral-border-light disabled:text-text-muted"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-text-sub">Enter 送出、Shift + Enter 換行。對話中的同意不視為核准，正式決策需由授權者確認。</p>
            </div>
          </div>
        </div>
      </main>

      {confirmOpen && <ConfirmDecisionModal onClose={() => setConfirmOpen(false)} />}

      {toast && (
        <div role="status" className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-md bg-text-main text-white text-sm px-4 py-2 shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
};

export default HiringDecisionPage;
