/** 任用決策空間共用小元件：頭像、標示、按鈕、原始紀錄視窗 */
import React, { useEffect } from 'react';
import { Sparkles, X, FileText } from 'lucide-react';
import { Marker, MARKER_LABEL, Participant, RoleKey, SourceDoc } from './hiringMock';

const AVATAR_TONE: Record<RoleKey, string> = {
  agent: 'bg-primary-light text-primary',
  hr: 'bg-blue-100 text-blue-700',
  interviewer: 'bg-secondary-light text-secondary',
  manager: 'bg-success-light text-success',
  decider: 'bg-dark-100 text-text-main',
};

const AVATAR_SIZE = {
  xs: 'w-5 h-5 text-xs',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-sm',
};

export const Avatar: React.FC<{ person: Participant; size?: keyof typeof AVATAR_SIZE; ring?: boolean }> = ({ person, size = 'md', ring }) => (
  <div
    className={`${AVATAR_SIZE[size]} rounded-full shrink-0 flex items-center justify-center font-medium ${AVATAR_TONE[person.roleKey]} ${ring ? 'ring-2 ring-white' : ''}`}
    title={`${person.name}・${person.role}`}
  >
    {person.roleKey === 'agent' ? <Sparkles className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} /> : person.initial}
  </div>
);

/**
 * 五種標示，語意不可混用：
 * - agent：Agent 提出、尚未經人確認
 * - pending：需討論或補資料
 * - candidate：候選人自己表達的意向（不代表企業同意）
 * - recorded：有資料來源的事實（不代表企業同意）
 * - approved：企業授權者正式核准
 */
const MARKER_TONE: Record<Marker, string> = {
  agent: 'bg-primary-light text-blue-700 border-blue-200',
  pending: 'bg-warning-light text-text-main border-yellow-200',
  candidate: 'bg-secondary-light text-secondary border-dark-100',
  recorded: 'bg-bg-card text-text-sub border-neutral-border-light',
  approved: 'bg-success-light text-success border-green-100',
};

export const MARKER_DOT: Record<Marker, string> = {
  agent: 'bg-primary',
  pending: 'bg-warning',
  candidate: 'bg-secondary',
  recorded: 'bg-dark-300',
  approved: 'bg-success',
};

export const MarkerBadge: React.FC<{ marker: Marker; label?: string }> = ({ marker, label }) => (
  <span className={`inline-flex items-center gap-1 h-5 px-2 rounded-sm border text-xs font-medium whitespace-nowrap ${MARKER_TONE[marker]}`}>
    <span className={`w-1 h-1 rounded-full ${MARKER_DOT[marker]}`} />
    {label ?? MARKER_LABEL[marker]}
  </span>
);

export const MARKER_HELP: { marker: Marker; text: string }[] = [
  { marker: 'agent', text: 'Agent 提出，尚未經人確認' },
  { marker: 'pending', text: '需討論或補資料' },
  { marker: 'candidate', text: '候選人自己表達，不代表企業同意' },
  { marker: 'recorded', text: '有資料來源，不代表企業同意' },
  { marker: 'approved', text: '授權者正式核准' },
];

export const IconButton: React.FC<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}> = ({ label, onClick, children, active }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`w-9 h-9 shrink-0 rounded-md flex items-center justify-center hover:bg-neutral-border-light hover:text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
      active ? 'bg-neutral-border-light text-text-main' : 'text-text-sub'
    }`}
  >
    {children}
  </button>
);

/** 原始紀錄（唯讀）：查看依據／資料來源點開後顯示 */
export const SourceRecordModal: React.FC<{ source: SourceDoc; onClose: () => void }> = ({ source, onClose }) => {
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
        aria-labelledby="source-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl max-h-full rounded-lg bg-bg-card shadow-xl flex flex-col"
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-bg-base text-text-sub flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-xs text-text-sub">原始紀錄・{source.kind}</span>
              <h2 id="source-title" className="text-lg font-semibold text-text-main">{source.title}</h2>
              <p className="text-sm text-text-sub">{source.meta}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉" className="w-8 h-8 rounded-md flex items-center justify-center text-text-sub hover:bg-bg-base shrink-0">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="px-6 py-5 overflow-y-auto flex flex-col gap-4">
          <dl className="rounded-md border border-neutral-border-light px-4">
            {source.fields.map(([k, v]) => (
              <div key={k} className="flex items-start gap-3 py-2 border-b border-neutral-border-light last:border-b-0">
                <dt className="w-24 shrink-0 text-sm text-text-sub">{k}</dt>
                <dd className="flex-1 min-w-0 text-sm text-text-main whitespace-pre-wrap">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-text-sub">原始紀錄為唯讀。這份資料是 Agent 分析的依據，不代表企業已同意其中內容。</p>
        </div>

        <footer className="flex justify-end px-6 pb-6">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-md border border-neutral-border text-sm font-medium text-text-main hover:bg-bg-base">
            關閉
          </button>
        </footer>
      </div>
    </div>
  );
};
