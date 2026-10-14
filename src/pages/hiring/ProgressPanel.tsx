/**
 * 本案進展（右側、可收合；窄螢幕按需開啟）——精簡列表，回答「現在做到哪裡、正在等什麼」。
 * 每項只顯示：任務名稱＋狀態＋必要的負責人或等待原因；圖示與文字並用，不只靠顏色。
 * 工作可並行：不用固定編號、垂直連線或依序通關的視覺。
 *
 * - 點項目：定位中央相關討論或工作內容，短暫標示
 * - 展開（箭頭）：完成條件、制度依據、歷史紀錄
 * - 「任務日誌」（誰在何時更新了什麼、為什麼）收在次要入口
 */
import React, { useEffect, useState } from 'react';
import { X, CircleCheck, CircleDot, Circle, CircleDashed, ChevronDown, ChevronRight, History, BookOpen, Crosshair } from 'lucide-react';
import { HiringCase, CaseTask, TaskStatus, openTaskCount, docGapText, personOf } from './hiringMock';
import { progressLine, historyEntries } from './caseFlow';
import { CriteriaList } from './WorkPanels';

const GLYPH: Record<TaskStatus, { icon: React.ComponentType<{ className?: string }>; tone: string; word: string }> = {
  已完成: { icon: CircleCheck, tone: 'text-success', word: '已完成' },
  可處理: { icon: CircleDot, tone: 'text-primary', word: '可處理' },
  進行中: { icon: CircleDot, tone: 'text-primary', word: '進行中' },
  待補充: { icon: CircleDot, tone: 'text-text-main', word: '待補充' },
  等待前置: { icon: Circle, tone: 'text-text-sub', word: '等待' },
  尚未啟動: { icon: CircleDashed, tone: 'text-text-sub', word: '未啟動' },
};

const ProgressItem: React.FC<{
  c: HiringCase;
  task: CaseTask;
  fresh: boolean;
  onLocate: (t: CaseTask) => void;
}> = ({ c, task: t, fresh, onLocate }) => {
  const [open, setOpen] = useState(false);
  const line = progressLine(c, t);
  const g = GLYPH[t.status];
  return (
    <li className={`rounded-md ${fresh ? 'jh-glow bg-success-light' : ''}`}>
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => onLocate(t)}
          title="定位到中央相關內容"
          className="group flex-1 min-w-0 flex items-start gap-2 px-2 py-2 rounded-md text-left hover:bg-bg-card"
        >
          <g.icon className={`w-4 h-4 shrink-0 mt-1 ${g.tone} ${fresh ? 'jh-check-pop' : ''}`} />
          <span className="flex-1 min-w-0 flex flex-col">
            <span className={`text-sm ${t.status === '已完成' ? 'text-text-sub' : 'text-text-main'}`}>{line.text}</span>
            {line.sub && <span className="text-xs text-text-sub">{line.sub}</span>}
            <span className="flex items-center gap-2 mt-1">
              <span className={`text-xs ${g.tone}`}>{g.word}</span>
              <span className="text-xs text-text-sub">・{t.kind === '制度任務' ? '制度要求' : '本案補充'}</span>
              <Crosshair className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100" />
            </span>
          </span>
        </button>
        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={`${t.title}的詳細`} className="w-7 h-7 mt-1 shrink-0 rounded-md flex items-center justify-center text-text-sub hover:bg-bg-card hover:text-text-main">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
      {open && (
        <div className="ml-6 mr-2 mb-2 px-3 py-3 rounded-md bg-bg-card flex flex-col gap-3 jh-rise">
          <section className="flex flex-col gap-1">
            <h5 className="text-xs font-medium text-text-sub">完成條件</h5>
            {t.criteria ? <CriteriaList items={t.criteria} />
              : t.docs ? <p className="text-sm text-text-main">{docGapText(t.docs)}（共 {t.docs.length} 份，提交後須通過檢核）</p>
              : <p className="text-sm text-text-main">{t.conditionSource.replace(/^本案條件：/, '')}</p>}
          </section>
          <section className="flex flex-col gap-1">
            <h5 className="text-xs font-medium text-text-sub">{t.kind === '制度任務' ? '制度依據' : '本案條件'}</h5>
            <p className="flex items-start gap-2 text-xs text-text-main"><BookOpen className="w-3 h-3 text-text-sub shrink-0 mt-1" />{t.conditionSource}</p>
          </section>
          <section className="flex flex-col gap-1">
            <h5 className="text-xs font-medium text-text-sub">歷史紀錄</h5>
            <ul className="flex flex-col gap-1 text-xs text-text-main">
              {(t.evidence ?? []).map(e => <li key={e}>{e}</li>)}
              {t.completion && <li>完成：{t.completion.time}・{personOf(t.completion.byId).name}・適用共識 {t.completion.planVersion}</li>}
              {!t.evidence?.length && !t.completion && <li className="text-text-sub">尚無紀錄</li>}
            </ul>
          </section>
        </div>
      )}
    </li>
  );
};

/** 任務日誌：誰在何時更新了什麼、為什麼更新（次要入口） */
export const HistoryModal: React.FC<{ hiringCase: HiringCase; onClose: () => void; onLocateMsg: (id: string) => void }> = ({ hiringCase: c, onClose, onLocateMsg }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const entries = historyEntries(c);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="任務日誌" onClick={e => e.stopPropagation()} className="w-full max-w-xl max-h-full rounded-lg bg-bg-card shadow-xl flex flex-col">
        <header className="flex items-center justify-between px-6 pt-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-text-main">任務日誌</h2>
            <p className="text-sm text-text-sub">誰在何時更新了什麼、為什麼更新</p>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉" className="w-8 h-8 rounded-md flex items-center justify-center text-text-sub hover:bg-bg-base"><X className="w-4 h-4" /></button>
        </header>
        <ol className="px-6 py-4 overflow-y-auto flex flex-col">
          {entries.map(e => (
            <li key={e.key} className="flex items-start gap-3 py-3 border-b border-neutral-border-light last:border-b-0">
              <History className="w-4 h-4 text-text-sub shrink-0 mt-1" />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-sm text-text-main">{e.what}</span>
                {e.why && <span className="text-xs text-text-sub">{e.why}</span>}
                <span className="text-xs text-text-sub">{e.who}・{e.time}</span>
              </div>
              {e.msgId && (
                <button type="button" onClick={() => { onLocateMsg(e.msgId!); onClose(); }} className="shrink-0 h-7 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-bg-base">定位</button>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

const ProgressPanel: React.FC<{
  hiringCase: HiringCase;
  justCompletedId: string | null;
  onClose: () => void;
  onLocate: (t: CaseTask) => void;
  onOpenHistory: () => void;
}> = ({ hiringCase: c, justCompletedId, onClose, onLocate, onOpenHistory }) => {
  const [showAll, setShowAll] = useState(false);
  // 剛完成的任務先留在原位播放勾選與亮起，之後才收進「已完成」
  const active = c.tasks.filter(t => (t.status !== '已完成' && t.status !== '尚未啟動') || t.id === justCompletedId);
  const done = c.tasks.filter(t => t.status === '已完成' && t.id !== justCompletedId);
  const later = c.tasks.filter(t => t.status === '尚未啟動');
  const [doneOpen, setDoneOpen] = useState(false);
  const [laterOpen, setLaterOpen] = useState(false);
  const item = (t: CaseTask) => <ProgressItem key={t.id} c={c} task={t} fresh={justCompletedId === t.id} onLocate={onLocate} />;

  const group = (label: string, items: CaseTask[], open: boolean, toggle: () => void) => items.length > 0 && (
    <section className="flex flex-col">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex items-center gap-1 h-8 px-2 rounded-md text-xs text-text-sub hover:text-text-main hover:bg-bg-card">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}{label} {items.length}
      </button>
      {open && <ul className="flex flex-col">{items.map(item)}</ul>}
    </section>
  );

  return (
    <aside className="h-full w-72 shrink-0 border-l border-neutral-border-light bg-bg-base flex flex-col" aria-label="本案進展">
      <div className="h-14 shrink-0 flex items-center gap-2 px-4">
        <span className="text-sm font-medium text-text-main">本案進展</span>
        <span className="text-xs text-text-sub">{openTaskCount(c.tasks)} 項未完成</span>
        <button type="button" onClick={onClose} aria-label="收合本案進展" className="ml-auto w-8 h-8 rounded-md flex items-center justify-center text-text-sub hover:bg-bg-card hover:text-text-main">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 flex flex-col gap-2">
        <ul className="flex flex-col">{active.map(item)}</ul>
        {group('已完成', done, showAll || doneOpen, () => setDoneOpen(v => !v))}
        {group('尚未啟動', later, showAll || laterOpen, () => setLaterOpen(v => !v))}
      </div>

      <div className="shrink-0 flex items-center gap-1 px-2 py-2 border-t border-neutral-border-light">
        <button type="button" onClick={() => setShowAll(v => !v)} className="h-8 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-bg-card">
          {showAll ? '收起已完成與未啟動' : `查看全部 ${c.tasks.length} 項`}
        </button>
        <button type="button" onClick={onOpenHistory} className="ml-auto h-8 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-bg-card inline-flex items-center gap-1">
          <History className="w-4 h-4" />任務日誌
        </button>
      </div>
    </aside>
  );
};

export default ProgressPanel;
