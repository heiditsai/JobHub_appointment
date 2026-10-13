/**
 * 目前任用共識：預設精簡（五項），可展開看任用方案、要求履行、候選人意向、資料來源、變更紀錄。
 * 正式確認走獨立的「確認任用方案」對話框，不把聊天中的同意視為核准。
 */
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, X, FileText, Lock, History, CircleAlert } from 'lucide-react';
import {
  CONSENSUS_SUMMARY, CONSENSUS_VERSION, PLANS, REQUIREMENTS, CANDIDATE_INTENT, SOURCES, CHANGE_LOG,
  AUTHORIZED_CONFIRMER_ID, CURRENT_USER_ID, personOf, Marker,
} from './hiringMock';
import { Avatar, MarkerBadge } from './hiringUi';

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <section className={`flex flex-col gap-3 ${className}`}>
    <h3 className="text-sm font-medium text-text-main">{title}</h3>
    {children}
  </section>
);

const Row: React.FC<{ label: string; value: React.ReactNode; marker?: Marker }> = ({ label, value, marker }) => (
  <div className="flex items-start gap-3 py-2 border-b border-neutral-border-light last:border-b-0">
    <span className="w-32 shrink-0 text-sm text-text-sub">{label}</span>
    <span className="flex-1 min-w-0 text-sm text-text-main">{value}</span>
    {marker && <MarkerBadge marker={marker} />}
  </div>
);

// ── 正式確認對話框 ─────────────────────────────────────────────

export const ConfirmDecisionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const confirmer = personOf(AUTHORIZED_CONFIRMER_ID);
  const isAuthorized = CURRENT_USER_ID === AUTHORIZED_CONFIRMER_ID;
  const pendingCount = REQUIREMENTS.filter(r => r.marker === 'pending').length;

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
            <p className="text-sm text-text-sub">陳先生｜資深後端工程師・共識版本 {CONSENSUS_VERSION}（10/13 10:08）</p>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉" className="w-8 h-8 rounded-md flex items-center justify-center text-text-sub hover:bg-bg-base">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="rounded-md border border-neutral-border-light">
            <div className="px-4 py-2 border-b border-neutral-border-light bg-bg-base rounded-t-md text-xs font-medium text-text-sub">待確認內容</div>
            <div className="px-4">
              <Row label="任用方案" value="尚未選定（方案 A／B 皆為 Agent 建議）" marker="pending" />
              <Row label="職位" value="資深後端工程師（是否增加架構責任待決）" marker="pending" />
              <Row label="月薪" value="未定；原職缺預算 8～10 萬，候選人期望 12 萬" marker="pending" />
              <Row label="待決事項" value={`${pendingCount} 項尚未完成`} marker="pending" />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md bg-warning-light px-4 py-3">
            <CircleAlert className="w-4 h-4 text-text-main shrink-0 mt-1" />
            <div className="flex flex-col gap-1 text-sm text-text-main">
              <p>目前沒有可確認的方案。請先選定方案並完成待決事項。</p>
              <p className="text-text-sub">對話中的同意不會自動視為核准，正式決策以此處的確認紀錄為準。</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Avatar person={confirmer} size="sm" />
            <span className="text-sm text-text-main">授權確認者：{confirmer.name}（{confirmer.role}）</span>
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
            title="方案尚未選定，無法確認"
            className="h-9 px-4 rounded-md bg-primary text-white text-sm font-medium disabled:bg-neutral-border-light disabled:text-text-muted disabled:cursor-not-allowed"
          >
            確認任用（{CONSENSUS_VERSION}）
          </button>
        </footer>
      </div>
    </div>
  );
};

// ── 共識面板 ──────────────────────────────────────────────────

const ConsensusPanel: React.FC<{
  expanded: boolean;
  onToggle: () => void;
  onOpenConfirm: () => void;
}> = ({ expanded, onToggle, onOpenConfirm }) => {
  const [openSource, setOpenSource] = useState<string | null>(null);

  return (
    <div className="shrink-0 bg-bg-card">
      <div className="max-w-3xl mx-auto px-4 pb-2">
        <div className="rounded-lg border border-neutral-border-light bg-bg-base">
          {/* 標題列 */}
          <div className="flex items-center gap-3 px-4 pt-3">
            <span className="text-sm font-medium text-text-main">目前任用共識</span>
            <span className="text-xs text-text-sub">版本 {CONSENSUS_VERSION}・10:08 更新</span>
            <MarkerBadge marker="pending" label="待決" />
            <div className="ml-auto flex items-center gap-2">
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

          {/* 精簡摘要 */}
          <dl className="grid grid-cols-3 gap-x-6 gap-y-3 px-4 pt-3 pb-4">
            {CONSENSUS_SUMMARY.map(item => (
              <div key={item.label} className="flex flex-col gap-1 min-w-0">
                <dt className="flex items-center gap-1 text-xs text-text-sub">
                  <span className={`w-1 h-1 rounded-full ${item.marker === 'pending' ? 'bg-warning' : item.marker === 'agent' ? 'bg-primary' : 'bg-success'}`} />
                  {item.label}
                </dt>
                <dd className="text-sm text-text-main flex items-center gap-2">
                  {item.ownerId && <Avatar person={personOf(item.ownerId)} size="sm" />}
                  <span className="min-w-0">{item.value}</span>
                </dd>
              </div>
            ))}
          </dl>

          {/* 展開詳情 */}
          {expanded && (
            <div className="border-t border-neutral-border-light bg-bg-card rounded-b-lg px-4 py-4 max-h-[52vh] overflow-y-auto flex flex-col gap-6">
              <div className="flex items-center gap-4 text-xs text-text-sub">
                <span>標示說明</span>
                <span className="inline-flex items-center gap-1"><MarkerBadge marker="agent" />Agent 提出，尚未經人確認</span>
                <span className="inline-flex items-center gap-1"><MarkerBadge marker="pending" />需討論或補資料</span>
                <span className="inline-flex items-center gap-1"><MarkerBadge marker="confirmed" />有來源或已由負責人確認</span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Section title="任用方案">
                  <div className="flex flex-col">
                    <Row label="目前方案" value="尚未確認" marker="pending" />
                    {PLANS.map(p => (
                      <Row key={p.id} label={p.title} value={`${p.position}；${p.salary}`} marker="agent" />
                    ))}
                  </div>
                </Section>

                <Section title="候選人意向">
                  <div className="flex flex-col">
                    {CANDIDATE_INTENT.map(i => <Row key={i.label} label={i.label} value={i.value} marker={i.marker} />)}
                  </div>
                </Section>

                <Section title="任用要求與履行狀態" className="col-span-2">
                  <ul className="flex flex-col">
                    {REQUIREMENTS.map(r => {
                      const owner = r.ownerId ? personOf(r.ownerId) : null;
                      return (
                        <li key={r.item} className="flex items-center gap-3 py-2 border-b border-neutral-border-light last:border-b-0">
                          <span className="w-40 shrink-0 text-sm text-text-main">{r.item}</span>
                          <span className="flex-1 min-w-0 text-sm text-text-sub">{r.detail}</span>
                          {owner && (
                            <span className="w-28 shrink-0 inline-flex items-center gap-2 text-xs text-text-sub">
                              <Avatar person={owner} size="sm" />{owner.name}
                            </span>
                          )}
                          <MarkerBadge marker={r.marker} label={r.marker === 'confirmed' ? '已完成' : '待決'} />
                        </li>
                      );
                    })}
                  </ul>
                </Section>

                <Section title="資料來源">
                  <ul className="flex flex-col gap-2">
                    {SOURCES.map(s => (
                      <li key={s.id} className="rounded-md border border-neutral-border-light">
                        <button
                          type="button"
                          onClick={() => setOpenSource(openSource === s.id ? null : s.id)}
                          aria-expanded={openSource === s.id}
                          className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-bg-base rounded-md"
                        >
                          <FileText className="w-4 h-4 text-text-sub shrink-0 mt-1" />
                          <span className="flex-1 min-w-0 flex flex-col">
                            <span className="text-sm text-text-main">{s.title}</span>
                            <span className="text-xs text-text-sub">{s.meta}</span>
                          </span>
                          {openSource === s.id ? <ChevronUp className="w-4 h-4 text-text-sub" /> : <ChevronDown className="w-4 h-4 text-text-sub" />}
                        </button>
                        {openSource === s.id && <p className="px-3 pb-3 pl-8 text-sm text-text-main">{s.excerpt}</p>}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="變更紀錄">
                  <ol className="flex flex-col">
                    {CHANGE_LOG.map(c => (
                      <li key={c.version} className="flex items-start gap-3 py-2 border-b border-neutral-border-light last:border-b-0">
                        <History className="w-4 h-4 text-text-sub shrink-0 mt-1" />
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <span className="text-sm text-text-main">{c.change}</span>
                          <span className="text-xs text-text-sub">{c.version}・{c.time}・{c.actor}</span>
                        </div>
                        <MarkerBadge marker={c.marker} />
                      </li>
                    ))}
                  </ol>
                </Section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsensusPanel;
