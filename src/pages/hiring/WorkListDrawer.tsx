/**
 * 本案工作清單（右側、由使用者開啟／關閉）——只呈現任務。
 *
 * 資訊層級：
 * 1. 最上方：現在最該處理的一件事（「目前需要 X 補充…」）
 * 2. 依任務來源分組：本案補充（這次討論提出）／制度要求（公司制度規定）；業務領域只作小標籤
 * 3. 每組預設只列「現在可處理」與「正在等待」；已完成、尚未啟動可展開查看
 * 4. 點任務才看完成條件、制度依據、證據、前置依賴與來源
 */
import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Hourglass, MessageSquareText, FileText, BookOpen } from 'lucide-react';
import { HiringCase, CaseTask, SourceDoc, TaskOrigin, TASK_ORIGINS, openTaskCount, isActionable, personOf } from './hiringMock';
import { Avatar, TaskStatusBadge } from './hiringUi';

const ORIGIN_HINT: Record<TaskOrigin, string> = {
  本案補充: '這次討論中提出，不是制度規定',
  制度要求: '公司任用制度規定必須完成',
};

const ORIGIN_TONE: Record<TaskOrigin, string> = {
  本案補充: 'bg-primary-light text-blue-700',
  制度要求: 'bg-secondary-light text-secondary',
};

const OriginTag: React.FC<{ origin: TaskOrigin }> = ({ origin }) => (
  <span className={`h-5 px-2 rounded-sm text-xs font-medium inline-flex items-center whitespace-nowrap ${ORIGIN_TONE[origin]}`}>{origin}</span>
);

const DomainTag: React.FC<{ domain: string }> = ({ domain }) => (
  <span className="h-5 px-2 rounded-sm border border-neutral-border-light text-xs text-text-sub inline-flex items-center whitespace-nowrap">{domain}</span>
);

const Progress: React.FC<{ p: NonNullable<CaseTask['progress']> }> = ({ p }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-1 rounded-full bg-neutral-border-light overflow-hidden">
      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((p.done / p.total) * 100)}%` }} />
    </div>
    <span className="text-xs text-text-sub whitespace-nowrap">{p.label} {p.done}／{p.total} {p.unit}</span>
  </div>
);

const verbOf = (t: CaseTask) => (t.status === '待決策' ? '決定' : '補充');

// ── 任務列 ───────────────────────────────────────────────────

const TaskRow: React.FC<{ task: CaseTask; onOpen: () => void }> = ({ task: t, onOpen }) => {
  const owner = personOf(t.ownerId);
  const done = t.status === '已完成';
  return (
    <li>
      <button type="button" onClick={onOpen} className="group w-full text-left px-3 py-3 rounded-md hover:bg-bg-base flex flex-col gap-2">
        <span className="flex items-start gap-2">
          <span className={`flex-1 min-w-0 text-sm ${done ? 'text-text-sub' : 'text-text-main font-medium'}`}>
            {t.title}{t.progress && <span className="font-normal text-text-sub">：{t.progress.label} {t.progress.done}／{t.progress.total} {t.progress.unit}</span>}
          </span>
          <TaskStatusBadge status={t.status} />
        </span>
        <span className="flex items-center gap-2 text-xs text-text-sub">
          <DomainTag domain={t.domain} />
          <Avatar person={owner} size="xs" />{owner.name}
          {t.waitingFor && <span className="inline-flex items-center gap-1 min-w-0 truncate"><Hourglass className="w-3 h-3 shrink-0" />等待{t.waitingFor}</span>}
          <ChevronRight className="w-4 h-4 ml-auto shrink-0 text-text-muted group-hover:text-text-sub" />
        </span>
      </button>
    </li>
  );
};

// ── 任務詳情 ─────────────────────────────────────────────────

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <dt className="text-xs text-text-sub">{label}</dt>
    <dd className="text-sm text-text-main">{children}</dd>
  </div>
);

const TaskDetail: React.FC<{
  c: HiringCase;
  task: CaseTask;
  onBack: () => void;
  onOpenTask: (id: string) => void;
  onOpenSource: (s: SourceDoc) => void;
  onViewDiscussion: (keyword: string) => void;
}> = ({ c, task: t, onBack, onOpenTask, onOpenSource, onViewDiscussion }) => {
  const owner = personOf(t.ownerId);
  const deps = (t.dependsOn ?? []).map(id => c.tasks.find(x => x.id === id)).filter((x): x is CaseTask => !!x);
  const sources = (t.sourceIds ?? []).map(id => c.sources.find(s => s.id === id)).filter((s): s is SourceDoc => !!s);

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={onBack} className="self-start h-8 -ml-2 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-bg-base inline-flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" />本案工作清單
      </button>

      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-2"><OriginTag origin={t.origin} /><DomainTag domain={t.domain} /><TaskStatusBadge status={t.status} /></span>
        <h3 className="text-base font-medium text-text-main">{t.title}</h3>
        <span className="inline-flex items-center gap-2 text-sm text-text-sub"><Avatar person={owner} size="xs" />{owner.name}・{owner.role}</span>
      </div>

      <dl className="flex flex-col gap-4">
        <Field label="完成條件">{t.criteria}</Field>
        {t.progress && <Field label="履行進度"><Progress p={t.progress} /></Field>}
        <Field label="目前證據">{t.evidence ?? <span className="text-text-sub">尚未提供</span>}</Field>
        {t.impact && <Field label="為什麼要做">{t.impact}</Field>}
        {t.policyRef && (
          <Field label="制度依據">
            <span className="inline-flex items-start gap-2"><BookOpen className="w-4 h-4 text-text-sub shrink-0 mt-1" />{t.policyRef}</span>
          </Field>
        )}
        {deps.length > 0 && (
          <Field label="前置依賴">
            <ul className="flex flex-col gap-1">
              {deps.map(d => (
                <li key={d.id}>
                  <button type="button" onClick={() => onOpenTask(d.id)} className="w-full flex items-center gap-2 px-2 py-1 -mx-2 rounded-md hover:bg-bg-base text-left">
                    <span className="flex-1 min-w-0 text-sm text-text-main truncate">{d.title}</span>
                    <TaskStatusBadge status={d.status} />
                  </button>
                </li>
              ))}
            </ul>
          </Field>
        )}
        {sources.length > 0 && (
          <Field label="來源">
            <ul className="flex flex-col gap-1">
              {sources.map(s => (
                <li key={s.id}>
                  <button type="button" onClick={() => onOpenSource(s)} className="inline-flex items-center gap-2 text-sm text-text-main hover:text-primary">
                    <FileText className="w-4 h-4 text-text-sub" />{s.title}<span className="text-xs text-text-sub">查看原始紀錄</span>
                  </button>
                </li>
              ))}
            </ul>
          </Field>
        )}
      </dl>

      {t.discussKeyword && (
        <button
          type="button"
          onClick={() => onViewDiscussion(t.discussKeyword!)}
          className="self-start h-9 px-3 rounded-md border border-neutral-border text-sm font-medium text-text-main hover:bg-bg-base inline-flex items-center gap-2"
        >
          <MessageSquareText className="w-4 h-4 text-text-sub" />查看討論
        </button>
      )}
    </div>
  );
};

// ── 抽屜 ─────────────────────────────────────────────────────

const WorkListDrawer: React.FC<{
  hiringCase: HiringCase;
  currentUserId: string;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onClose: () => void;
  onOpenSource: (s: SourceDoc) => void;
  onViewDiscussion: (keyword: string) => void;
}> = ({ hiringCase: c, currentUserId, selectedTaskId, onSelectTask, onClose, onOpenSource, onViewDiscussion }) => {
  const [expanded, setExpanded] = useState<Record<TaskOrigin, boolean>>({ 本案補充: false, 制度要求: false });
  const open = openTaskCount(c.tasks);
  const selected = selectedTaskId ? c.tasks.find(t => t.id === selectedTaskId) ?? null : null;

  // 現在最該處理的一件事：共識「下一步」對應的任務；沒有對應時取第一個可處理的任務
  const nextTaskId = c.summary.find(s => s.label === '下一步')?.taskId;
  const linked = c.tasks.find(t => t.id === nextTaskId && t.status !== '已完成');
  const focus = linked ?? c.tasks.find(isActionable) ?? null;
  const focusOwner = focus ? personOf(focus.ownerId) : null;
  const focusLead = !focus || !focusOwner ? ''
    : focus.status === '等待前置' ? `目前在等：${focus.waitingFor ?? '前置事項'}`
    : `目前需要${focus.ownerId === currentUserId ? '你' : focusOwner.name}${verbOf(focus)}`;

  return (
    <aside className="h-full w-96 shrink-0 border-l border-neutral-border-light bg-bg-card flex flex-col" aria-label="本案工作清單">
      <div className="h-14 shrink-0 flex items-center gap-2 px-4 border-b border-neutral-border-light">
        <span className="text-sm font-medium text-text-main">本案工作清單</span>
        <span className="text-xs text-text-sub">{open ? `${open} 項未完成` : '全部完成'}</span>
        <button type="button" onClick={onClose} aria-label="關閉本案工作清單" className="ml-auto w-8 h-8 rounded-md flex items-center justify-center text-text-sub hover:bg-bg-base hover:text-text-main">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {selected ? (
          <TaskDetail
            c={c}
            task={selected}
            onBack={() => onSelectTask(null)}
            onOpenTask={id => onSelectTask(id)}
            onOpenSource={onOpenSource}
            onViewDiscussion={onViewDiscussion}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {/* 現在最該處理的一件事 */}
            {focus && focusOwner && (
              <section className="rounded-lg border border-primary bg-bg-card px-4 py-3 flex flex-col gap-2">
                <span className="text-xs text-text-sub">{focusLead}</span>
                <span className="text-base font-medium text-text-main">{focus.title}</span>
                <span className="text-xs text-text-sub">{focus.origin}・{focus.impact ?? focus.domain}</span>
                {focus.progress && <Progress p={focus.progress} />}
                <span className="flex items-center gap-2">
                  {focus.discussKeyword && (
                    <button
                      type="button"
                      onClick={() => onViewDiscussion(focus.discussKeyword!)}
                      className="h-8 px-2 -ml-2 rounded-md text-xs font-medium text-primary hover:bg-primary-light inline-flex items-center gap-1"
                    >
                      <MessageSquareText className="w-4 h-4" />查看討論
                    </button>
                  )}
                  <button type="button" onClick={() => onSelectTask(focus.id)} className="h-8 px-2 rounded-md text-xs font-medium text-text-sub hover:text-text-main hover:bg-bg-base">
                    查看詳情
                  </button>
                </span>
              </section>
            )}

            {TASK_ORIGINS.map(origin => {
              const items = c.tasks.filter(t => t.origin === origin);
              if (!items.length) return null;
              const current = items.filter(t => t !== focus && (isActionable(t) || t.status === '等待前置'));
              const done = items.filter(t => t.status === '已完成');
              const later = items.filter(t => t.status === '尚未啟動');
              const openCount = items.filter(t => t.status !== '已完成').length;
              return (
                <section key={origin} className="flex flex-col gap-1">
                  <h3 className="flex items-baseline gap-2 px-3">
                    <span className="text-sm font-medium text-text-main">{origin}</span>
                    <span className="text-xs text-text-sub">{ORIGIN_HINT[origin]}</span>
                    <span className="ml-auto text-xs text-text-sub whitespace-nowrap">{openCount} 項未完成</span>
                  </h3>
                  <ul className="flex flex-col">
                    {current.map(t => <TaskRow key={t.id} task={t} onOpen={() => onSelectTask(t.id)} />)}
                  </ul>
                  {current.length === 0 && <p className="px-3 py-2 text-xs text-text-sub">目前沒有需要處理或等待中的項目</p>}
                  {(done.length > 0 || later.length > 0) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpanded(e => ({ ...e, [origin]: !e[origin] }))}
                        aria-expanded={expanded[origin]}
                        className="self-start h-8 px-3 rounded-md text-xs text-text-sub hover:text-text-main hover:bg-bg-base inline-flex items-center gap-1"
                      >
                        {[done.length && `已完成 ${done.length} 項`, later.length && `尚未啟動 ${later.length} 項`].filter(Boolean).join('・')}
                        {expanded[origin] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expanded[origin] && (
                        <ul className="flex flex-col">
                          {[...later, ...done].map(t => <TaskRow key={t.id} task={t} onOpen={() => onSelectTask(t.id)} />)}
                        </ul>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default WorkListDrawer;
