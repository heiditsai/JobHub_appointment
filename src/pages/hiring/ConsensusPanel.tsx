/**
 * 目前任用共識：預設精簡（五項，單列），可展開為分頁詳情（任用方案／要求與履行／
 * 候選人意向／資料來源／變更紀錄）。展開區限高並內部捲動，不擠掉中央對話。
 * 正式確認走獨立的「確認任用方案」對話框，不把聊天中的同意視為核准。
 */
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, X, FileText, Lock, History, CircleAlert, CircleCheck, ExternalLink, Info } from 'lucide-react';
import { CURRENT_USER_ID, HiringCase, personOf, Marker, SourceDoc } from './hiringMock';
import { Avatar, MarkerBadge, MARKER_DOT, MARKER_HELP } from './hiringUi';

const Row: React.FC<{ label: string; value: React.ReactNode; marker?: Marker }> = ({ label, value, marker }) => (
  <div className="flex items-start gap-3 py-2 border-b border-neutral-border-light last:border-b-0">
    <span className="w-32 shrink-0 text-sm text-text-sub">{label}</span>
    <span className="flex-1 min-w-0 text-sm text-text-main">{value}</span>
    {marker && <MarkerBadge marker={marker} />}
  </div>
);


// ── 正式確認對話框 ─────────────────────────────────────────────

export const ConfirmDecisionModal: React.FC<{ hiringCase: HiringCase; onClose: () => void }> = ({ hiringCase: c, onClose }) => {
  const confirmer = personOf(c.confirmerId);
  const isAuthorized = CURRENT_USER_ID === c.confirmerId;
  const pendingCount = c.requirements.filter(r => r.marker === 'pending').length;
  const decided = c.decision ? c.plans.find(p => p.id === c.decision!.planId) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl rounded-lg bg-bg-card shadow-xl flex flex-col"
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="flex flex-col gap-1">
            <h2 id="confirm-title" className="text-lg font-semibold text-text-main">確認任用方案</h2>
            <p className="text-sm text-text-sub">{c.candidate}｜{c.position}・共識版本 {c.version}（{c.versionTime}）</p>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉" className="w-8 h-8 rounded-md flex items-center justify-center text-text-sub hover:bg-bg-base">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="rounded-md border border-neutral-border-light">
            <div className="px-4 py-2 border-b border-neutral-border-light bg-bg-base rounded-t-md text-xs font-medium text-text-sub">
              {decided ? '已核准內容' : '待確認內容'}
            </div>
            <div className="px-4">
              {decided ? (
                <>
                  <Row label="任用方案" value={`${decided.title}（${c.decision!.version}）`} marker="approved" />
                  <Row label="職位" value={decided.position} marker="approved" />
                  <Row label="薪酬" value={decided.salary} marker="approved" />
                  <Row label="責任與到職" value={decided.scope} marker="approved" />
                </>
              ) : (
                <>
                  <Row label="任用方案" value={c.plans.length ? `尚未選定（${c.plans.map(p => p.title).join('／')} 皆為 Agent 建議）` : '尚未提出'} marker="pending" />
                  <Row label="職位" value={c.position ? `${c.position}（是否調整待決）` : '尚未帶入'} marker="pending" />
                  <Row label="薪酬" value="未定" marker="pending" />
                  <Row label="待決事項" value={`${pendingCount} 項尚未完成`} marker="pending" />
                </>
              )}
            </div>
          </div>

          {decided ? (
            <div className="flex items-start gap-3 rounded-md bg-success-light px-4 py-3">
              <CircleCheck className="w-4 h-4 text-success shrink-0 mt-1" />
              <div className="flex flex-col gap-1 text-sm text-text-main">
                <p>{personOf(c.decision!.confirmerId).name}已於 {c.decision!.time} 正式核准此方案。</p>
                <p className="text-text-sub">如需變更，需重新提出方案並再次核准；對話中的意見不會改變已核准內容。</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-md bg-warning-light px-4 py-3">
              <CircleAlert className="w-4 h-4 text-text-main shrink-0 mt-1" />
              <div className="flex flex-col gap-1 text-sm text-text-main">
                <p>目前沒有可確認的方案。請先選定方案並完成待決事項。</p>
                <p className="text-text-sub">對話中的同意不會自動視為核准，正式決策以此處的核准紀錄為準。</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Avatar person={confirmer} size="sm" />
            <span className="text-sm text-text-main">授權核准者：{confirmer.name}（{confirmer.role}）</span>
            {!isAuthorized && <span className="ml-auto inline-flex items-center gap-1 text-xs text-text-sub"><Lock className="w-3 h-3" />你僅能檢視</span>}
          </div>
        </div>

        <footer className="flex justify-end gap-2 px-6 pb-6">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-neutral-border text-sm font-medium text-text-main hover:bg-bg-base">
            關閉
          </button>
          <button
            type="button"
            disabled
            title={decided ? '此方案已核准' : '方案尚未選定，無法核准'}
            className="h-9 px-4 rounded-md bg-primary text-white text-sm font-medium disabled:bg-neutral-border-light disabled:text-text-muted disabled:cursor-not-allowed"
          >
            {decided ? `已核准（${c.decision!.version}）` : `核准任用（${c.version}）`}
          </button>
        </footer>
      </div>
    </div>
  );
};

// ── 共識面板 ──────────────────────────────────────────────────

type TabKey = 'plans' | 'requirements' | 'intent' | 'sources' | 'log';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'plans', label: '任用方案' },
  { key: 'requirements', label: '要求與履行' },
  { key: 'intent', label: '候選人意向' },
  { key: 'sources', label: '資料來源' },
  { key: 'log', label: '變更紀錄' },
];

const ConsensusPanel: React.FC<{
  hiringCase: HiringCase;
  expanded: boolean;
  onToggle: () => void;
  onOpenConfirm: () => void;
  onOpenSource: (s: SourceDoc) => void;
}> = ({ hiringCase: c, expanded, onToggle, onOpenConfirm, onOpenSource }) => {
  const [tab, setTab] = useState<TabKey>('plans');
  const [showHelp, setShowHelp] = useState(false);
  const isDecided = !!c.decision;
  const currentPlan = c.summary.find(s => s.label === '目前方案');

  const count: Record<TabKey, number> = {
    plans: c.plans.length,
    requirements: c.requirements.filter(r => r.marker === 'pending').length,
    intent: c.intent.length,
    sources: c.sources.length,
    log: c.changeLog.length,
  };

  return (
    <div className="shrink-0 bg-bg-card">
      <div className="max-w-3xl mx-auto px-4 pb-2">
        <div className="rounded-lg border border-neutral-border-light bg-bg-base">
          {/* 標題列 */}
          <div className="flex items-center gap-3 px-4 pt-3">
            <span className="text-sm font-medium text-text-main">目前任用共識</span>
            <span className="text-xs text-text-sub">版本 {c.version}・{c.versionTime} 更新</span>
            <MarkerBadge marker={currentPlan?.marker ?? 'pending'} label={isDecided ? '方案已核准' : '待決'} />
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenConfirm}
                className="h-8 px-2 rounded-md text-xs font-medium text-text-main hover:bg-neutral-border-light inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-4 h-4 text-text-sub" />
                確認任用方案
              </button>
              <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="h-8 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-neutral-border-light inline-flex items-center gap-1"
              >
                {expanded ? '收合' : '展開詳情'}
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 精簡摘要：單列五欄 */}
          <dl className="grid grid-cols-5 gap-4 px-4 pt-2 pb-3">
            {c.summary.map(item => (
              <div key={item.label} className="flex flex-col gap-1 min-w-0" title={item.value}>
                <dt className="flex items-center gap-1 text-xs text-text-sub">
                  <span className={`w-1 h-1 rounded-full ${MARKER_DOT[item.marker]}`} />
                  {item.label}
                </dt>
                <dd className="text-sm text-text-main flex items-start gap-1">
                  {item.ownerId && <Avatar person={personOf(item.ownerId)} size="xs" />}
                  <span className="min-w-0 line-clamp-2">{item.value}</span>
                </dd>
              </div>
            ))}
          </dl>

          {/* 展開詳情：分頁＋限高捲動 */}
          {expanded && (
            <div className="border-t border-neutral-border-light bg-bg-card rounded-b-lg">
              <div role="tablist" className="flex items-center gap-1 px-2 pt-2 border-b border-neutral-border-light">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.key}
                    onClick={() => setTab(t.key)}
                    className={`h-9 px-3 -mb-px border-b-2 text-sm inline-flex items-center gap-1 ${
                      tab === t.key ? 'border-primary text-text-main font-medium' : 'border-transparent text-text-sub hover:text-text-main'
                    }`}
                  >
                    {t.label}
                    {count[t.key] > 0 && <span className="text-xs text-text-muted">{count[t.key]}</span>}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowHelp(v => !v)}
                  aria-expanded={showHelp}
                  className={`ml-auto h-8 px-2 rounded-md text-xs inline-flex items-center gap-1 hover:bg-bg-base ${showHelp ? 'text-text-main' : 'text-text-sub'}`}
                >
                  <Info className="w-4 h-4" />標示說明
                </button>
              </div>

              {showHelp && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-b border-neutral-border-light bg-bg-base text-xs text-text-sub">
                  {MARKER_HELP.map(h => (
                    <span key={h.marker} className="inline-flex items-center gap-1"><MarkerBadge marker={h.marker} />{h.text}</span>
                  ))}
                </div>
              )}

              <div role="tabpanel" className="max-h-44 overflow-y-auto px-4 py-1">
                {tab === 'plans' && (
                  <div className="flex flex-col">
                    {c.plans.map(p => (
                      <Row key={p.id} label={p.title} value={`${p.position}；${p.salary}；${p.scope}`} marker={p.marker} />
                    ))}
                    {!isDecided && <Row label="目前方案" value="尚未確認" marker="pending" />}
                  </div>
                )}

                {tab === 'requirements' && (
                  <ul className="flex flex-col">
                    {c.requirements.map(r => {
                      const owner = r.ownerId ? personOf(r.ownerId) : null;
                      return (
                        <li key={r.item} className="flex items-center gap-3 py-2 border-b border-neutral-border-light last:border-b-0">
                          <span className="w-32 shrink-0 text-sm text-text-main">{r.item}</span>
                          <span className="flex-1 min-w-0 text-sm text-text-sub">{r.detail}</span>
                          {owner && (
                            <span className="w-20 shrink-0 inline-flex items-center gap-1 text-xs text-text-sub">
                              <Avatar person={owner} size="xs" />{owner.name}
                            </span>
                          )}
                          <MarkerBadge marker={r.marker} label={r.marker === 'recorded' ? '已完成' : undefined} />
                        </li>
                      );
                    })}
                  </ul>
                )}

                {tab === 'intent' && (
                  <div className="flex flex-col">
                    {c.intent.map(i => <Row key={i.label} label={i.label} value={i.value} marker={i.marker} />)}
                  </div>
                )}

                {tab === 'sources' && (
                  <ul className="flex flex-col py-1 gap-1">
                    {c.sources.map(src => (
                      <li key={src.id}>
                        <button
                          type="button"
                          onClick={() => onOpenSource(src)}
                          className="group w-full flex items-start gap-2 px-2 py-2 text-left hover:bg-bg-base rounded-md"
                        >
                          <FileText className="w-4 h-4 text-text-sub shrink-0 mt-1" />
                          <span className="flex-1 min-w-0 flex flex-col gap-1">
                            <span className="text-sm text-text-main">{src.title}<span className="ml-2 text-xs text-text-sub">{src.meta}</span></span>
                            <span className="text-sm text-text-sub line-clamp-1">{src.excerpt}</span>
                          </span>
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs text-text-sub group-hover:text-primary">
                            查看原始紀錄<ExternalLink className="w-3 h-3" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {tab === 'log' && (
                  <ol className="flex flex-col">
                    {c.changeLog.map(l => (
                      <li key={l.version} className="flex items-start gap-3 py-2 border-b border-neutral-border-light last:border-b-0">
                        <History className="w-4 h-4 text-text-sub shrink-0 mt-1" />
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <span className="text-sm text-text-main">{l.change}</span>
                          <span className="text-xs text-text-sub">{l.version}・{l.time}・{l.actor}</span>
                        </div>
                        <MarkerBadge marker={l.marker} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsensusPanel;
