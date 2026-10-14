/**
 * 目前任用共識列（精簡：目前方案／目前卡點／下一步，其餘收在「更多」）＋正式確認對話框。
 * - 方案細節在中央對話的方案卡；任務在右側「本案工作清單」——這裡不重複
 * - 「確認任用方案」只在方案具體且可核准時突出；已核准時收進「更多」的核准紀錄
 * - 正式核准只能在確認對話框完成，不把聊天中的同意視為核准
 */
import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, Lock, CircleAlert, CircleCheck, ChevronDown, ChevronUp, History } from 'lucide-react';
import { HiringCase, PlanOption, personOf } from './hiringMock';
import { approvablePlan } from './caseFlow';
import { Avatar, MarkerBadge } from './hiringUi';

const Row: React.FC<{ label: string; value: React.ReactNode; marker?: React.ComponentProps<typeof MarkerBadge>['marker'] }> = ({ label, value, marker }) => (
  <div className="flex items-start gap-3 py-2 border-b border-neutral-border-light last:border-b-0">
    <span className="w-24 shrink-0 text-sm text-text-sub">{label}</span>
    <span className="flex-1 min-w-0 text-sm text-text-main">{value}</span>
    {marker && <MarkerBadge marker={marker} />}
  </div>
);

const PlanRows: React.FC<{ plan: PlanOption; marker: 'agent' | 'approved' }> = ({ plan, marker }) => (
  <>
    <Row label="職位" value={plan.position} marker={marker} />
    <Row label="薪酬" value={plan.salary} />
    <Row label="責任" value={plan.scope} />
    <Row label="能解決" value={plan.solves} />
    <Row label="需要配套" value={plan.support} />
    <Row label="仍待解決" value={plan.openIssues} />
  </>
);

// ── 正式確認對話框 ─────────────────────────────────────────────

export const ConfirmDecisionModal: React.FC<{
  hiringCase: HiringCase;
  currentUserId: string;
  onClose: () => void;
  onApprove: () => void;
  onRemind: () => void;
}> = ({ hiringCase: c, currentUserId, onClose, onApprove, onRemind }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const confirmer = personOf(c.confirmerId);
  const isAuthorized = currentUserId === c.confirmerId;
  const pending = approvablePlan(c);
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
        className="w-full max-w-xl max-h-full rounded-lg bg-bg-card shadow-xl flex flex-col"
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

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <div className="rounded-md border border-neutral-border-light">
            <div className="px-4 py-2 border-b border-neutral-border-light bg-bg-base rounded-t-md text-xs font-medium text-text-sub">
              {decided ? `已核准內容・${decided.title}` : pending ? `待核准內容・${pending.title}` : '待確認內容'}
            </div>
            <div className="px-4">
              {decided ? <PlanRows plan={decided} marker="approved" />
                : pending ? <PlanRows plan={pending} marker="agent" />
                : <Row label="任用方案" value="尚未有可核准的方案" marker="pending" />}
            </div>
          </div>

          {decided ? (
            <div className="flex items-start gap-3 rounded-md bg-success-light px-4 py-3">
              <CircleCheck className="w-4 h-4 text-success shrink-0 mt-1" />
              <div className="flex flex-col gap-1 text-sm text-text-main">
                <p>{personOf(c.decision!.confirmerId).name}已於 {c.decision!.time} 正式核准此方案（{c.decision!.version}）。</p>
                <p className="text-text-sub">如需變更，需重新提出方案並再次核准；對話中的意見不會改變已核准內容。</p>
              </div>
            </div>
          ) : pending ? (
            <div className="flex items-start gap-3 rounded-md bg-warning-light px-4 py-3">
              <CircleAlert className="w-4 h-4 text-text-main shrink-0 mt-1" />
              <div className="flex flex-col gap-1 text-sm text-text-main">
                <p>核准後，上述條件會成為正式任用決策（{c.version} → 新版本），並更新本案任務。</p>
                <p className="text-text-sub">對話中的同意不會自動視為核准，正式決策以此處的核准紀錄為準。</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-md bg-warning-light px-4 py-3">
              <CircleAlert className="w-4 h-4 text-text-main shrink-0 mt-1" />
              <p className="text-sm text-text-main">目前沒有可核准的方案。方案需具體到職位、薪酬與配套後，才能送交核准。</p>
            </div>
          )}

          {pending && isAuthorized && (
            <label className="flex items-start gap-2 text-sm text-text-main cursor-pointer">
              <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="mt-1 accent-primary" />
              我已確認以上任用條件，了解核准後將成為正式決策
            </label>
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
          {decided ? null : pending && !isAuthorized ? (
            <button type="button" onClick={onRemind} className="h-9 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover">
              提醒{confirmer.name}核准
            </button>
          ) : (
            <button
              type="button"
              disabled={!pending || !isAuthorized || !acknowledged}
              onClick={onApprove}
              className="h-9 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:bg-neutral-border-light disabled:text-text-muted disabled:cursor-not-allowed"
            >
              {pending ? `核准${pending.title}` : '核准'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

// ── 共識列（精簡：目前方案／目前卡點／下一步；其餘按需查看） ──────────────

/** 變更紀錄（從「更多」開啟） */
const ChangeLogModal: React.FC<{ hiringCase: HiringCase; onClose: () => void }> = ({ hiringCase: c, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="log-title" onClick={e => e.stopPropagation()} className="w-full max-w-lg max-h-full rounded-lg bg-bg-card shadow-xl flex flex-col">
        <header className="flex items-center justify-between px-6 pt-6">
          <h2 id="log-title" className="text-lg font-semibold text-text-main">共識變更紀錄</h2>
          <button type="button" onClick={onClose} aria-label="關閉" className="w-8 h-8 rounded-md flex items-center justify-center text-text-sub hover:bg-bg-base"><X className="w-4 h-4" /></button>
        </header>
        <ol className="px-6 py-4 overflow-y-auto flex flex-col">
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
      </div>
    </div>
  );
};

const ConsensusPanel: React.FC<{
  hiringCase: HiringCase;
  currentUserId: string;
  onOpenConfirm: () => void;
}> = ({ hiringCase: c, currentUserId, onOpenConfirm }) => {
  const [more, setMore] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const pending = approvablePlan(c);
  const plan = c.summary.find(s => s.label === '目前方案');
  const blocker = c.summary.find(s => s.label === '待決事項');
  const next = c.summary.find(s => s.label === '下一步');
  const extras = c.summary.filter(s => !['目前方案', '待決事項', '下一步'].includes(s.label));
  const isMyTurn = next?.ownerId === currentUserId;

  return (
    <div className="shrink-0 bg-bg-card">
      <div className="max-w-3xl mx-auto px-4 pb-2">
        <div className={`rounded-lg border bg-bg-base ${pending ? 'border-primary' : 'border-neutral-border-light'}`}>
          <div className="flex items-center gap-4 px-4 py-3">
            {plan && <MarkerBadge marker={plan.marker} label={plan.value} />}
            {blocker && (
              <div className="flex-1 min-w-0 flex items-baseline gap-2">
                <span className="shrink-0 text-xs text-text-sub">目前卡點</span>
                <span className="text-sm text-text-main truncate" title={blocker.value}>{blocker.value}</span>
              </div>
            )}
            {next && (
              <div className="min-w-0 flex items-center gap-2">
                <span className="shrink-0 text-xs text-text-sub">下一步</span>
                {next.ownerId && <Avatar person={personOf(next.ownerId)} size="xs" />}
                <span className="text-sm font-medium text-text-main truncate" title={next.value}>{next.value}</span>
                {isMyTurn && <span className="shrink-0 h-5 px-2 rounded-full bg-primary text-white text-xs inline-flex items-center">輪到你</span>}
              </div>
            )}
            <div className="shrink-0 flex items-center gap-1">
              {pending && (
                <button type="button" onClick={onOpenConfirm} className="h-8 px-3 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary-hover inline-flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />確認任用方案
                </button>
              )}
              <button
                type="button"
                onClick={() => setMore(v => !v)}
                aria-expanded={more}
                className="h-8 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-neutral-border-light inline-flex items-center gap-1"
              >
                更多{more ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {more && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 border-t border-neutral-border-light text-sm">
              {extras.map(item => (
                <span key={item.label} className="inline-flex items-center gap-2">
                  <span className="text-xs text-text-sub">{item.label}</span>
                  <span className="text-text-main">{item.value}</span>
                  <MarkerBadge marker={item.marker} />
                </span>
              ))}
              <span className="ml-auto inline-flex items-center gap-1">
                <span className="text-xs text-text-sub">共識 {c.version}・{c.versionTime} 更新</span>
                {c.decision && (
                  <button type="button" onClick={onOpenConfirm} className="h-7 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-neutral-border-light">
                    核准紀錄 {c.decision.version}
                  </button>
                )}
                <button type="button" onClick={() => setLogOpen(true)} className="h-7 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-neutral-border-light">
                  變更紀錄
                </button>
              </span>
            </div>
          )}
        </div>
      </div>
      {logOpen && <ChangeLogModal hiringCase={c} onClose={() => setLogOpen(false)} />}
    </div>
  );
};

export default ConsensusPanel;
