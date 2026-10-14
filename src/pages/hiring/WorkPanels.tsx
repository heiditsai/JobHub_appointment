/**
 * 中央工作面板：點 Agent 訊息內的按鈕後，在原位展開，不跳頁、保留對話位置。
 * - DocsPanel：查看缺項（名稱、提供人、收件與檢核狀態、缺漏原因、制度來源與版本）
 * - ProvidePanel：提供資料（模擬選檔 → 提交後為「已收到，待檢核」）
 * - DraftPanel：可編輯草稿（依完成條件分欄，可帶入範例；已補內容保留）
 */
import React, { useState } from 'react';
import { Check, CircleCheck, CircleDashed, CircleHelp, Flag, Upload, X, FileText, Sparkles } from 'lucide-react';
import { CaseTask, CriterionState, DocItem, docGapText } from './hiringMock';

const CRITERION_STYLE: Record<CriterionState, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  仍待補充: { icon: CircleDashed, tone: 'text-text-sub' },
  已收到: { icon: Check, tone: 'text-primary' },
  已符合: { icon: CircleCheck, tone: 'text-success' },
};

export const CriteriaList: React.FC<{ items: { label: string; state: CriterionState; hint?: string }[] }> = ({ items }) => (
  <ul className="flex flex-col gap-2">
    {items.map(i => {
      const s = CRITERION_STYLE[i.state];
      return (
        <li key={i.label} className="flex items-start gap-2 text-sm">
          <s.icon className={`w-4 h-4 shrink-0 mt-1 ${s.tone}`} />
          <span className="flex-1 min-w-0">
            <span className="text-text-main">{i.label}</span>
            {i.hint && <span className="block text-xs text-text-sub">{i.hint}</span>}
          </span>
          <span className={`text-xs whitespace-nowrap ${s.tone}`}>{i.state}</span>
        </li>
      );
    })}
  </ul>
);

const Shell: React.FC<{ title: string; meta?: string; onClose: () => void; children: React.ReactNode }> = ({ title, meta, onClose, children }) => (
  <div className="mt-3 rounded-lg border border-primary bg-bg-card jh-rise">
    <div className="flex items-center gap-2 px-4 pt-3">
      <span className="text-sm font-medium text-text-main">{title}</span>
      {meta && <span className="text-xs text-text-sub">{meta}</span>}
      <button type="button" onClick={onClose} aria-label="收起" className="ml-auto w-7 h-7 rounded-md flex items-center justify-center text-text-sub hover:bg-bg-base hover:text-text-main">
        <X className="w-4 h-4" />
      </button>
    </div>
    <div className="px-4 pb-4 pt-3">{children}</div>
  </div>
);

const DOC_STATUS: Record<DocItem['status'], { text: string; tone: string }> = {
  未收到: { text: '未收件', tone: 'bg-bg-base text-text-sub border-neutral-border' },
  待修正: { text: '已收件・待補正', tone: 'bg-warning-light text-text-main border-yellow-200' },
  待檢核: { text: '已收到・待檢核', tone: 'bg-primary-light text-blue-700 border-blue-200' },
  符合: { text: '已收件・檢核符合', tone: 'bg-success-light text-success border-green-100' },
};

// ── 查看缺項 ─────────────────────────────────────────────────

export const DocsPanel: React.FC<{
  task: CaseTask;
  onClose: () => void;
  onProvide: (name: string) => void;
  onAsk: (name: string) => void;
  onException: (name: string) => void;
}> = ({ task, onClose, onProvide, onAsk, onException }) => {
  const [all, setAll] = useState(false);
  const docs = task.docs!;
  const needs = docs.filter(d => d.status !== '符合');
  const shown = all ? docs : needs;
  const linkBtn = 'h-7 px-2 rounded-md text-xs font-medium inline-flex items-center gap-1';
  return (
    <Shell title={`查看缺項・${task.title}`} meta={docGapText(docs)} onClose={onClose}>
      <div className="flex items-center justify-between text-xs text-text-sub mb-2">
        <span>{all ? `全部 ${docs.length} 份` : `需要處理 ${needs.length} 份`}</span>
        <button type="button" onClick={() => setAll(v => !v)} className="font-medium hover:text-text-main">{all ? '只看需要處理的' : `顯示全部 ${docs.length} 份`}</button>
      </div>
      <ul className="flex flex-col rounded-md border border-neutral-border-light max-h-80 overflow-y-auto">
        {shown.map(d => {
          const st = DOC_STATUS[d.status];
          const actionable = d.status === '未收到' || d.status === '待修正';
          return (
            <li key={d.name} className="flex flex-col gap-1 px-3 py-3 border-b border-neutral-border-light last:border-b-0">
              <div className="flex items-start gap-2">
                <span className="flex-1 min-w-0 text-sm font-medium text-text-main">{d.name}</span>
                <span className={`h-6 px-2 rounded-full border text-xs inline-flex items-center whitespace-nowrap ${st.tone}`}>{st.text}</span>
              </div>
              <span className="text-xs text-text-sub">提供人：{d.provider}{d.reason ? `・${d.status === '待檢核' ? '' : '原因：'}${d.reason}` : ''}</span>
              <span className="text-xs text-text-sub">依據：{d.policy}（{d.policyVersion}）</span>
              {actionable && (
                <div className="flex flex-wrap items-center gap-1 -ml-2">
                  <button type="button" onClick={() => onProvide(d.name)} className={`${linkBtn} text-primary hover:bg-primary-light`}><Upload className="w-3 h-3" />提供資料</button>
                  <button type="button" onClick={() => onAsk(d.name)} className={`${linkBtn} text-text-sub hover:text-text-main hover:bg-bg-base`}><CircleHelp className="w-3 h-3" />詢問要求</button>
                  <button type="button" onClick={() => onException(d.name)} className={`${linkBtn} text-text-sub hover:text-text-main hover:bg-bg-base`}><Flag className="w-3 h-3" />提出例外</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-text-sub">提交後顯示「已收到，待檢核」，由檢核者判定是否符合；不會直接算完成。</p>
    </Shell>
  );
};

// ── 提供資料 ─────────────────────────────────────────────────

export const ProvidePanel: React.FC<{
  task: CaseTask;
  preset?: string | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}> = ({ task, preset, onClose, onSubmit }) => {
  const options = task.docs!.filter(d => d.status === '未收到' || d.status === '待修正');
  const [picked, setPicked] = useState<string>(preset && options.some(o => o.name === preset) ? preset : options[0]?.name ?? '');
  const [file, setFile] = useState(false);
  return (
    <Shell title={`提供資料・${task.title}`} meta="模擬提交，不會送出真實檔案" onClose={onClose}>
      {options.length === 0 ? (
        <p className="text-sm text-text-sub">目前沒有缺項需要提供。</p>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-text-main">要提供哪一份？</span>
            <select
              value={picked}
              onChange={e => { setPicked(e.target.value); setFile(false); }}
              className="h-9 px-3 rounded-md border border-neutral-border bg-bg-input text-sm text-text-main outline-none focus:border-primary"
            >
              {options.map(o => <option key={o.name} value={o.name}>{o.name}（{o.status === '待修正' ? '待補正' : '未收到'}）</option>)}
            </select>
          </label>
          {file ? (
            <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-bg-base text-sm text-text-main">
              <FileText className="w-4 h-4 text-text-sub" />{picked}.pdf<span className="text-xs text-text-sub">模擬檔案</span>
              <button type="button" onClick={() => setFile(false)} aria-label="移除檔案" className="ml-auto text-text-sub hover:text-text-main"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setFile(true)} className="h-9 px-3 rounded-md border border-dashed border-neutral-border text-sm text-text-sub hover:bg-bg-base inline-flex items-center gap-2">
              <Upload className="w-4 h-4" />選擇檔案（模擬）
            </button>
          )}
          <div className="flex items-center gap-2">
            <button type="button" disabled={!file} onClick={() => { onSubmit(picked); setFile(false); }} className="h-9 px-4 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:bg-neutral-border-light disabled:text-text-muted">
              提交，交由檢核
            </button>
            <span className="text-xs text-text-sub">提交後為「已收到，待檢核」</span>
          </div>
        </div>
      )}
    </Shell>
  );
};

// ── 可編輯草稿 ───────────────────────────────────────────────

export const DraftPanel: React.FC<{
  task: CaseTask;
  values: Record<string, string>;
  assisting: boolean;
  busy: boolean;
  onChange: (id: string, v: string) => void;
  onClose: () => void;
  onSubmit: (ids: string[]) => void;
}> = ({ task, values, assisting, busy, onChange, onClose, onSubmit }) => {
  const criteria = task.criteria!;
  const filledNew = criteria.filter(cr => cr.state === '仍待補充' && (values[cr.id] ?? '').trim());
  return (
    <Shell title={`${assisting ? '協助補充' : task.actionLabel ?? '補充'}・${task.title}`} meta={assisting ? '你提供的內容會交由負責人確認' : '草稿只在送出後分享給本案成員'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {criteria.map(cr => {
          const done = cr.state !== '仍待補充';
          return (
            <label key={cr.id} className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-sm text-text-main">
                {cr.label}
                {done
                  ? <span className="h-5 px-2 rounded-full bg-primary-light text-blue-700 text-xs inline-flex items-center gap-1"><Check className="w-3 h-3" />{cr.state}</span>
                  : <span className="h-5 px-2 rounded-full bg-bg-base text-text-sub text-xs inline-flex items-center gap-1"><CircleDashed className="w-3 h-3" />待補充</span>}
                {!done && cr.sample && !(values[cr.id] ?? '').trim() && (
                  <button type="button" onClick={e => { e.preventDefault(); onChange(cr.id, cr.sample!); }} className="ml-auto h-6 px-2 rounded-md text-xs text-text-sub hover:text-text-main hover:bg-bg-base inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />帶入範例
                  </button>
                )}
              </span>
              <textarea
                rows={2}
                value={values[cr.id] ?? ''}
                disabled={done}
                onChange={e => onChange(cr.id, e.target.value)}
                placeholder={cr.hint}
                className="w-full resize-y rounded-md border border-neutral-border bg-bg-input px-3 py-2 text-sm text-text-main placeholder:text-text-hint outline-none focus:border-primary disabled:bg-bg-base disabled:text-text-sub"
              />
            </label>
          );
        })}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!filledNew.length || busy}
            onClick={() => onSubmit(filledNew.map(cr => cr.id))}
            className="h-9 px-4 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:bg-neutral-border-light disabled:text-text-muted"
          >
            送出補充{filledNew.length ? `（${filledNew.length} 項）` : ''}
          </button>
          <span className="text-xs text-text-sub">可以只補一部分；也可以直接在下方輸入框自由描述</span>
        </div>
      </div>
    </Shell>
  );
};
