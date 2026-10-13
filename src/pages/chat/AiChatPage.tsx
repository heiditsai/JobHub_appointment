/**
 * AI 小助手 — 對話式前台（對標 ChatGPT／Claude 介面）
 *
 * 獨立前台：整個 App 就是這一頁（src/main.tsx 直接掛載）。
 * Spec：JobHub.Doc 尚無對應 PRD（PM 口頭需求，2026-10-13）。
 *
 * 結構：
 *  - 左側 Sidebar：可收合（桌面收成 icon rail、行動版為 overlay）
 *    - 新對話：開一個空白草稿，送出第一則訊息後才進入歷程
 *    - 對話歷程：依時間分組（今天／昨天／過去 7 天…），可搜尋、重新命名、刪除
 *  - 右側主區：空狀態（問候＋建議）／對話串＋輸入框
 * AI 回覆為前端模擬（逐字串流），不打真 API。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanelLeftClose, PanelLeftOpen, SquarePen, Search, MoreHorizontal, Pencil, Trash2,
  ArrowUp, Square, Sparkles, Copy, Check, RotateCcw, Menu, X, MessageSquare,
} from 'lucide-react';
import {
  Conversation, ChatMessage, SEED_CONVERSATIONS, SUGGESTIONS, CURRENT_USER, mockReply, groupLabelOf, newId,
} from './aiChatMock';

const GROUP_ORDER = ['今天', '昨天', '過去 7 天', '過去 30 天', '更早'];
const COLLAPSE_KEY = 'ai-chat:sidebar-collapsed';

const readCollapsed = () => {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
};
const writeCollapsed = (v: boolean) => {
  try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch { /* 無痕模式等情境略過 */ }
};

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onToggle: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  /** 行動版 overlay 時顯示關閉鈕 */
  onCloseMobile?: () => void;
}

const IconButton: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="w-9 h-9 shrink-0 rounded-md flex items-center justify-center text-text-sub hover:bg-neutral-border-light hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  >
    {children}
  </button>
);

const ChatSidebar: React.FC<SidebarProps> = ({
  collapsed, conversations, activeId, onToggle, onNew, onSelect, onRename, onDelete, onCloseMobile,
}) => {
  const [query, setQuery] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuId]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = conversations
      .filter(c => !q || c.title.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const map = new Map<string, Conversation[]>();
    filtered.forEach(c => {
      const label = groupLabelOf(c.updatedAt);
      map.set(label, [...(map.get(label) ?? []), c]);
    });
    return GROUP_ORDER.filter(g => map.has(g)).map(g => ({ label: g, items: map.get(g)! }));
  }, [conversations, query]);

  const commitRename = () => {
    if (editingId && draftTitle.trim()) onRename(editingId, draftTitle.trim());
    setEditingId(null);
  };

  const userInitial = CURRENT_USER.name.slice(0, 1);

  // ── 收合：icon rail ──
  if (collapsed) {
    return (
      <aside className="h-full w-14 shrink-0 bg-bg-base border-r border-neutral-border-light flex flex-col items-center py-3 gap-2">
        <IconButton label="展開側欄" onClick={onToggle}><PanelLeftOpen className="w-5 h-5" /></IconButton>
        <IconButton label="新對話" onClick={onNew}><SquarePen className="w-5 h-5" /></IconButton>
        <IconButton label="搜尋對話" onClick={onToggle}><Search className="w-5 h-5" /></IconButton>
        <div className="flex-1" />
        <div className="w-8 h-8 rounded-full bg-primary-light text-primary text-sm font-medium flex items-center justify-center" title={CURRENT_USER.name}>
          {userInitial}
        </div>
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
          <span className="text-base font-medium text-text-main truncate">AI 小助手</span>
        </div>
        {onCloseMobile
          ? <IconButton label="關閉側欄" onClick={onCloseMobile}><X className="w-5 h-5" /></IconButton>
          : <IconButton label="收合側欄" onClick={onToggle}><PanelLeftClose className="w-5 h-5" /></IconButton>}
      </div>

      <div className="px-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onNew}
          className="w-full h-9 px-3 rounded-md flex items-center gap-2 text-sm font-medium text-text-main hover:bg-neutral-border-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <SquarePen className="w-4 h-4 text-text-sub" />
          新對話
          <span className="ml-auto text-xs text-text-muted">⌘⇧O</span>
        </button>
        <label className="h-9 px-3 rounded-md flex items-center gap-2 bg-bg-input border border-neutral-border-light focus-within:border-primary">
          <Search className="w-4 h-4 text-text-sub shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜尋對話"
            className="flex-1 min-w-0 bg-transparent text-sm text-text-main placeholder:text-text-hint outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="清除搜尋" className="text-text-sub hover:text-text-main">
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-4" aria-label="對話歷程">
        {groups.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <MessageSquare className="w-6 h-6 text-text-muted" />
            <p className="text-xs text-text-sub">{query ? `找不到「${query}」相關的對話` : '還沒有對話，按「新對話」開始'}</p>
          </div>
        )}
        {groups.map(g => (
          <section key={g.label} className="flex flex-col gap-1">
            <h3 className="px-2 text-xs font-medium text-text-sub">{g.label}</h3>
            <ul className="flex flex-col">
              {g.items.map(c => {
                const active = c.id === activeId;
                if (editingId === c.id) {
                  return (
                    <li key={c.id}>
                      <input
                        autoFocus
                        value={draftTitle}
                        onChange={e => setDraftTitle(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-full h-9 px-2 rounded-md bg-bg-input border border-primary text-sm text-text-main outline-none"
                      />
                    </li>
                  );
                }
                return (
                  <li key={c.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full h-9 pl-2 pr-8 rounded-md text-left text-sm truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        active ? 'bg-neutral-border-light text-text-main font-medium' : 'text-text-main hover:bg-neutral-border-light'
                      }`}
                      title={c.title}
                    >
                      {c.title}
                    </button>
                    <button
                      type="button"
                      aria-label={`${c.title} 的更多動作`}
                      onClick={e => { e.stopPropagation(); setMenuId(menuId === c.id ? null : c.id); }}
                      className={`absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-text-sub hover:text-text-main hover:bg-dark-100 ${
                        active || menuId === c.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                      }`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuId === c.id && (
                      <div
                        role="menu"
                        onClick={e => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1 z-20 w-36 py-1 rounded-md bg-bg-card border border-neutral-border-light shadow-lg"
                      >
                        <button
                          type="button" role="menuitem"
                          onClick={() => { setDraftTitle(c.title); setEditingId(c.id); setMenuId(null); }}
                          className="w-full h-9 px-3 flex items-center gap-2 text-sm text-text-main hover:bg-bg-base"
                        >
                          <Pencil className="w-4 h-4 text-text-sub" />重新命名
                        </button>
                        <button
                          type="button" role="menuitem"
                          onClick={() => { onDelete(c.id); setMenuId(null); }}
                          className="w-full h-9 px-3 flex items-center gap-2 text-sm text-error hover:bg-error-light"
                        >
                          <Trash2 className="w-4 h-4" />刪除
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      <div className="shrink-0 border-t border-neutral-border-light p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary-light text-primary text-sm font-medium flex items-center justify-center shrink-0">
          {userInitial}
        </div>
        <span className="flex-1 min-w-0 text-sm text-text-main truncate">{CURRENT_USER.name}</span>
      </div>
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Composer
// ─────────────────────────────────────────────────────────────────────────────

const Composer: React.FC<{
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  autoFocusKey: string;
}> = ({ streaming, onSend, onStop, autoFocusKey }) => {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, [autoFocusKey]);

  // 自動長高，上限約 8 行
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const submit = () => {
    const t = text.trim();
    if (!t || streaming) return;
    onSend(t);
    setText('');
  };

  return (
    <div className="w-full">
      <div className="rounded-xl border border-neutral-border bg-bg-input shadow-sm focus-within:border-primary px-4 pt-3 pb-2 flex flex-col gap-2">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            // 中文輸入法選字時的 Enter 不送出
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="輸入訊息，Enter 送出、Shift + Enter 換行"
          aria-label="輸入訊息"
          className="w-full resize-none bg-transparent text-base text-text-main placeholder:text-text-hint outline-none leading-6"
        />
        <div className="flex items-center justify-end">
          {streaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="停止回覆"
              className="w-8 h-8 rounded-full bg-text-main text-white flex items-center justify-center hover:bg-secondary"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim()}
              aria-label="送出"
              className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover disabled:bg-neutral-border-light disabled:text-text-muted"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-text-sub">AI 回覆可能有誤，重要資訊請再次確認。</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Message
// ─────────────────────────────────────────────────────────────────────────────

const MessageRow: React.FC<{
  msg: ChatMessage;
  isStreaming: boolean;
  canRegenerate: boolean;
  onRegenerate: () => void;
}> = ({ msg, isStreaming, canRegenerate, onRegenerate }) => {
  const [copied, setCopied] = useState(false);

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-bg-base px-4 py-3 text-base text-text-main whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    );
  }

  const copy = () => {
    navigator.clipboard?.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="text-base text-text-main leading-7 whitespace-pre-wrap break-words">
          {msg.content}
          {isStreaming && <span className="inline-block w-2 h-4 ml-1 align-middle bg-primary animate-pulse rounded-sm" />}
          {isStreaming && !msg.content && <span className="text-text-sub">思考中…</span>}
        </div>
        {!isStreaming && (
          <div className="mt-2 flex items-center gap-1">
            <button type="button" onClick={copy} aria-label="複製" title="複製"
              className="w-8 h-8 rounded-md flex items-center justify-center text-text-sub hover:bg-bg-base hover:text-text-main">
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </button>
            {canRegenerate && (
              <button type="button" onClick={onRegenerate} aria-label="重新產生" title="重新產生"
                className="w-8 h-8 rounded-md flex items-center justify-center text-text-sub hover:bg-bg-base hover:text-text-main">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const AiChatPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>(SEED_CONVERSATIONS);
  /** null = 新對話草稿（尚未送出第一則訊息，不出現在歷程） */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = conversations.find(c => c.id === activeId) ?? null;

  const toggleCollapsed = () => setCollapsed(v => { writeCollapsed(!v); return !v; });

  const stopStreaming = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setStreamingId(null);
  };
  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  const startNew = () => {
    stopStreaming();
    setActiveId(null);
    setMobileOpen(false);
  };

  const select = (id: string) => {
    stopStreaming();
    setActiveId(id);
    setMobileOpen(false);
  };

  // ⌘/Ctrl + Shift + O：新對話（同 ChatGPT）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        startNew();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // 新訊息或串流中 → 捲到底
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages, activeId]);

  /** 逐字串流模擬回覆到指定對話的最後一則 assistant 訊息 */
  const streamReply = (convId: string, msgId: string, full: string) => {
    setStreamingId(msgId);
    let i = 0;
    // 先停 400ms 呈現「思考中」
    window.setTimeout(() => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        i = Math.min(full.length, i + 3);
        setConversations(prev => prev.map(c => c.id !== convId ? c : {
          ...c,
          messages: c.messages.map(m => m.id === msgId ? { ...m, content: full.slice(0, i) } : m),
        }));
        if (i >= full.length) stopStreaming();
      }, 24);
    }, 400);
  };

  const send = (text: string) => {
    const userMsg: ChatMessage = { id: newId('m'), role: 'user', content: text };
    const botMsg: ChatMessage = { id: newId('m'), role: 'assistant', content: '' };
    let convId = activeId;
    if (!convId) {
      convId = newId('c');
      const title = text.length > 24 ? `${text.slice(0, 24)}…` : text;
      setConversations(prev => [{ id: convId!, title, updatedAt: Date.now(), messages: [userMsg, botMsg] }, ...prev]);
      setActiveId(convId);
    } else {
      setConversations(prev => prev.map(c => c.id !== convId ? c : {
        ...c, updatedAt: Date.now(), messages: [...c.messages, userMsg, botMsg],
      }));
    }
    streamReply(convId, botMsg.id, mockReply(text));
  };

  const regenerate = () => {
    if (!active) return;
    const lastUser = [...active.messages].reverse().find(m => m.role === 'user');
    const last = active.messages[active.messages.length - 1];
    if (!lastUser || last.role !== 'assistant') return;
    setConversations(prev => prev.map(c => c.id !== active.id ? c : {
      ...c, messages: c.messages.map(m => m.id === last.id ? { ...m, content: '' } : m),
    }));
    streamReply(active.id, last.id, mockReply(lastUser.content));
  };

  const rename = (id: string, title: string) =>
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));

  const remove = (id: string) => {
    if (id === activeId) startNew();
    setConversations(prev => prev.filter(c => c.id !== id));
  };

  const sidebarProps = {
    conversations, activeId,
    onToggle: toggleCollapsed, onNew: startNew, onSelect: select, onRename: rename, onDelete: remove,
  };

  const firstName = CURRENT_USER.name;

  return (
    <div className="h-screen w-screen flex bg-bg-card text-text-main overflow-hidden">
      {/* 桌面：常駐側欄（可收合成 icon rail） */}
      <div className="hidden md:flex h-full">
        <ChatSidebar {...sidebarProps} collapsed={collapsed} />
      </div>

      {/* 行動版：overlay */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="md:hidden fixed inset-y-0 left-0 z-50 shadow-lg">
            <ChatSidebar {...sidebarProps} collapsed={false} onCloseMobile={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <main className="flex-1 min-w-0 h-full flex flex-col">
        {/* 頂列 */}
        <header className="h-14 shrink-0 px-4 flex items-center gap-2">
          <div className="md:hidden flex items-center gap-1">
            <IconButton label="開啟側欄" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></IconButton>
            <IconButton label="新對話" onClick={startNew}><SquarePen className="w-5 h-5" /></IconButton>
          </div>
          <span className="flex-1 min-w-0 truncate text-sm font-medium text-text-main">
            {active ? active.title : ''}
          </span>
        </header>

        {active ? (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
                {active.messages.map((m, idx) => (
                  <MessageRow
                    key={m.id}
                    msg={m}
                    isStreaming={m.id === streamingId}
                    canRegenerate={idx === active.messages.length - 1 && m.role === 'assistant'}
                    onRegenerate={regenerate}
                  />
                ))}
              </div>
            </div>
            <div className="shrink-0 px-4 pb-4">
              <div className="max-w-3xl mx-auto">
                <Composer streaming={!!streamingId} onSend={send} onStop={stopStreaming} autoFocusKey={active.id} />
              </div>
            </div>
          </>
        ) : (
          /* 空狀態：新對話 */
          <div className="flex-1 overflow-y-auto flex items-center justify-center px-4">
            <div className="w-full max-w-3xl flex flex-col items-center gap-8 pb-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-text-main">
                  {firstName ? `${firstName}，今天想處理什麼？` : '今天想處理什麼？'}
                </h1>
              </div>
              <Composer streaming={!!streamingId} onSend={send} onStop={stopStreaming} autoFocusKey="new" />
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="h-9 px-4 rounded-full border border-neutral-border-light text-sm text-text-sub hover:bg-bg-base hover:text-text-main"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AiChatPage;
