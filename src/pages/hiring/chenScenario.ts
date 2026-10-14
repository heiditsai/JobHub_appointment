/**
 * 陳先生｜資深後端工程師 — 可推進的原型情境
 *
 * stage 0  初始：方案 A／B 皆為 Agent 建議；等阿哲補工作目標
 * stage 1  阿哲補工作目標 → 「工作目標」「職責範圍」完成、「職等與薪酬評估」解除前置等待；方案 B 範圍具體
 * stage 2  王小姐填薪酬評估 → 方案 B 具體且可送核准；「選定並核准方案」轉為待決策
 * stage 3  林主管在「確認任用方案」核准方案 B（對話中的同意不算）
 *
 * 用來驗證：對話是否真的推進案件，以及任務、方案與摘要是否保持一致。
 * 原則：不自行補出績效證據；只有正式核准才標「已核准」。
 */
import {
  HiringCase, PlanOption, CaseTask, TaskStatus, TaskChange, SummaryItem, SourceDoc, ChatMessage,
} from './hiringMock';

const H = 60 * 60 * 1000;

// ── 方案（各階段快照） ────────────────────────────────────────

export const PLAN_A0: PlanOption = {
  id: 'A', title: '方案 A', position: '維持資深後端工程師', salary: '月薪 8～10 萬', scope: '責任依原職缺',
  solves: '補足後端服務開發與維運人力',
  support: '不需調整預算；需確認候選人是否接受',
  openIssues: '系統擴充問題仍無專責人選；候選人期望 12 萬',
  marker: 'agent',
};

export const PLAN_B0: PlanOption = {
  id: 'B', title: '方案 B', position: '資深後端工程師，增加架構責任', salary: '職等與薪酬待評估', scope: '工作範圍待阿哲定義',
  solves: '由專人負責系統擴充（範圍待定）',
  support: '需職等與薪酬評估；可能需申請預算調整',
  openIssues: '架構責任範圍未定；預算來源未定',
  marker: 'agent',
};

const PLAN_A1: PlanOption = {
  ...PLAN_A0,
  openIssues: '無法涵蓋工作目標 1、2（訂單服務擴充、服務拆分）；候選人期望 12 萬',
};

const PLAN_B1: PlanOption = {
  ...PLAN_B0,
  scope: '依阿哲工作目標：訂單服務擴充設計、服務拆分規劃、API 設計規範',
  solves: '工作目標 1～3 皆有專責人選',
  support: '需王小姐評估職等與薪酬；可能需申請預算調整',
  openIssues: '職等與薪酬未定；候選人期望 12 萬',
};

const PLAN_B2: PlanOption = {
  ...PLAN_B1,
  position: '資深後端工程師（含架構職責）・P5',
  salary: '月薪 11 萬（職等薪資帶 10～12 萬）',
  support: '需申請每月 1 萬預算調整，隨方案一併核准',
  openIssues: '候選人期望 12 萬，11 萬是否接受待確認',
  confirmable: true,
};

const PLAN_B3: PlanOption = { ...PLAN_B2, marker: 'approved', confirmable: false };

// ── 任務 ─────────────────────────────────────────────────────

const TASKS_0: CaseTask[] = [
  // ── 本案補充：為了這次決定而提出，不是制度規定 ──
  {
    id: 't-goals', origin: '本案補充', domain: '任用要求與履行', title: '前三個月工作目標', detail: '判斷是否增加架構責任的依據', ownerId: 'zhe', status: '待補充',
    criteria: '列出前三個月希望人選解決的具體問題', impact: '影響架構責任與薪酬評估', sourceIds: ['src-interview'],
    evidence: '面試備註只寫「處理系統擴充問題」，沒有具體目標', discussKeyword: '前三個月',
  },
  {
    id: 't-scope', origin: '本案補充', domain: '任用要求與履行', title: '定義架構職責範圍', detail: '是否納入職位、需負責到什麼程度', ownerId: 'zhe', status: '等待前置', waitingFor: '前三個月工作目標',
    criteria: '說明架構職責包含哪些工作、負責到什麼程度', impact: '決定方案 B 的工作範圍', dependsOn: ['t-goals'], discussKeyword: '架構',
  },
  {
    id: 't-accept', origin: '本案補充', domain: '聘用共識', title: '詢問候選人對方案的接受度', detail: '方案具體後再詢問', ownerId: 'wang', status: '尚未啟動',
    criteria: '取得候選人對具體薪酬的回應', impact: '候選人期望 12 萬，需確認方案是否可行', sourceIds: ['src-intent'], discussKeyword: '接受',
  },
  {
    id: 't-intent', origin: '本案補充', domain: '聘用共識', title: '記錄候選人期望', detail: '期望月薪 12 萬、願意洽談', ownerId: 'wang', status: '已完成',
    criteria: '記錄候選人期望薪資與洽談意願', sourceIds: ['src-intent'], evidence: 'HR 電話溝通紀錄 10/09', discussKeyword: '期望',
  },
  // ── 制度要求：公司任用制度規定 ──
  {
    id: 't-docs', origin: '制度要求', domain: '任用要求與履行', title: '任用前資料', detail: '還差前職離職證明、健康檢查報告', ownerId: 'wang', status: '待補充',
    progress: { done: 3, total: 5, unit: '份', label: '已收到' },
    criteria: '發出任用通知前收齊 5 份任用前資料', policyRef: '任用作業規範 第 4 條',
    evidence: '已收到：學經歷證明、身分證影本、背景查核同意書',
  },
  {
    id: 't-comp', origin: '制度要求', domain: '任用決策', title: '職等與薪酬評估', detail: '職位內容調整時，須由 HR 重新評估職等', ownerId: 'wang', status: '等待前置', waitingFor: '工作目標與職責範圍',
    criteria: 'HR 依工作範圍提出職等與薪資帶', policyRef: '薪酬管理辦法 第 3 條：職務內容變更須重新評估職等', dependsOn: ['t-goals', 't-scope'], discussKeyword: '職等與薪酬',
  },
  {
    id: 't-plan', origin: '制度要求', domain: '任用決策', title: '任用方案經授權者核准', detail: '由林主管在「確認任用方案」核准', ownerId: 'lin', status: '等待前置', waitingFor: '職等與薪酬評估',
    criteria: '授權核准者在「確認任用方案」完成核准（對話中的同意不算）', policyRef: '任用作業規範 第 6 條：任用條件須經部門決策者核准', dependsOn: ['t-comp'], discussKeyword: '核准',
  },
  {
    id: 't-budget', origin: '制度要求', domain: '任用決策', title: '超出職缺預算需核准預算調整', detail: '方案薪酬超過 10 萬時才需要', ownerId: 'lin', status: '尚未啟動',
    criteria: '薪酬超出職缺預算時，由決策者核准預算調整', policyRef: '預算管理辦法 第 8 條', dependsOn: ['t-comp'], discussKeyword: '預算',
  },
  {
    id: 't-interview', origin: '制度要求', domain: '任用要求與履行', title: '面試評估紀錄', detail: '技術面試、主管面試皆已完成', ownerId: 'zhe', status: '已完成',
    criteria: '至少一場專業面試與一場主管面試，並有書面結論', policyRef: '任用作業規範 第 3 條', sourceIds: ['src-interview'], evidence: '面試紀錄 10/07',
  },
];

type TaskPatch = Partial<Omit<CaseTask, 'id'>>;

/** 套用任務變更，並回傳變更清單（給 Agent 訊息顯示） */
const patchTasks = (tasks: CaseTask[], patches: Record<string, TaskPatch>) => {
  const changes: TaskChange[] = [];
  const next = tasks.map(t => {
    const p = patches[t.id];
    if (!p) return t;
    if (p.status && p.status !== t.status) changes.push({ title: t.title, from: t.status, to: p.status as TaskStatus });
    return { ...t, ...p, waitingFor: p.status && p.status !== '等待前置' ? undefined : (p.waitingFor ?? t.waitingFor) };
  });
  return { next, changes };
};

// ── 摘要 ─────────────────────────────────────────────────────

const BUDGET: SummaryItem = { label: '原職缺預算', value: '月薪 8～10 萬', marker: 'recorded' };
const EXPECT: SummaryItem = { label: '候選人期望', value: '月薪 12 萬', marker: 'candidate' };

const SUMMARY_0: SummaryItem[] = [
  { label: '目前方案', value: '兩個方案評估中', marker: 'pending' },
  BUDGET, EXPECT,
  { label: '待決事項', value: '架構責任範圍未定，無法評估薪酬', marker: 'pending' },
  { label: '下一步', value: '阿哲補充前三個月工作目標', marker: 'pending', ownerId: 'zhe', taskId: 't-goals' },
];

// ── 資料來源 ─────────────────────────────────────────────────

const SRC_JOB: SourceDoc = {
  id: 'src-job', title: '原職缺：資深後端工程師', kind: '職缺', meta: '職缺 v2・HR 王小姐維護・10/01',
  excerpt: '月薪 8～10 萬。職責：後端服務開發與維運、API 設計、與前端及產品協作。未包含架構設計職責。',
  fields: [
    ['職缺名稱', '資深後端工程師'], ['職缺版本', 'v2（10/01 更新）'], ['部門', '平台工程部'], ['薪資範圍', '月薪 8～10 萬'],
    ['工作內容', '1. 後端服務開發與維運\n2. API 設計與文件維護\n3. 與前端、產品團隊協作'], ['未包含', '架構設計職責'], ['維護者', 'HR 王小姐'],
  ],
};

const SRC_INTERVIEW: SourceDoc = {
  id: 'src-interview', title: '面試紀錄', kind: '面試紀錄', meta: '技術面試（李工程師）・主管面試（阿哲）・10/07',
  excerpt: '主管面試結論：建議錄用。備註：希望新增架構設計職責，處理系統擴充問題。面試紀錄未包含架構職責的具體範圍。',
  fields: [
    ['技術面試', '10/07 10:00・面試官 李工程師'], ['技術面試結論', '通過'], ['主管面試', '10/07 14:00・面試官 阿哲'],
    ['主管面試結論', '建議錄用'], ['主管備註', '希望新增架構設計職責，處理系統擴充問題。'], ['未記載', '架構職責的具體範圍與目標'],
  ],
};

const SRC_INTENT: SourceDoc = {
  id: 'src-intent', title: '候選人意向', kind: '溝通紀錄', meta: 'HR 王小姐電話溝通・10/09',
  excerpt: '期望月薪 12 萬，表示願意洽談。尚未詢問對原職缺薪資範圍的接受度。',
  fields: [
    ['溝通方式', '電話'], ['時間', '10/09 15:20'], ['記錄者', 'HR 王小姐'],
    ['候選人表達', '期望月薪 12 萬，願意洽談。'], ['尚未詢問', '對原職缺薪資範圍（8～10 萬）的接受度'],
  ],
};

const srcFromMessage = (id: string, title: string, kind: string, author: string, time: string, text: string): SourceDoc => ({
  id, title, kind, meta: `${author}於對話中提供・${time}`, excerpt: text.replace(/\n/g, ' '),
  fields: [['提供者', author], ['時間', time], ['內容', text]],
});

// ── 初始案件 ─────────────────────────────────────────────────

export const CHEN_INITIAL: HiringCase = {
  id: 'r-chen',
  candidate: '陳先生',
  position: '資深後端工程師',
  status: '任用評估中',
  updatedLabel: '10:08',
  updatedAt: Date.now() - 1 * H,
  stage: 0,
  participantIds: ['agent', 'wang', 'lee', 'zhe', 'lin'],
  confirmerId: 'lin',
  version: 'v3',
  versionTime: '10:08',
  summary: SUMMARY_0,
  plans: [PLAN_A0, PLAN_B0],
  tasks: TASKS_0,
  intent: [
    { label: '期望月薪', value: '12 萬', marker: 'candidate' },
    { label: '洽談意願', value: '願意洽談', marker: 'candidate' },
    { label: '對 8～10 萬的接受度', value: '尚未詢問', marker: 'pending' },
    { label: '來源', value: 'HR 王小姐電話溝通紀錄（10/09）', marker: 'recorded' },
  ],
  sources: [SRC_JOB, SRC_INTERVIEW, SRC_INTENT],
  changeLog: [
    { version: 'v3', time: '10/13 10:08', actor: 'Agent', change: '新增方案 A／B 比較，目前方案維持「尚未確認」', marker: 'agent' },
    { version: 'v2', time: '10/09 16:30', actor: '王小姐', change: '加入候選人期望月薪 12 萬、願意洽談', marker: 'candidate' },
    { version: 'v1', time: '10/07 18:00', actor: 'Agent', change: '依面試紀錄建立任用討論，阿哲建議錄用', marker: 'recorded' },
  ],
  messages: [
    { id: 'chen-1', authorId: 'agent', time: '10:02', text: '已整理面試結果：阿哲建議錄用，並希望新增架構設計職責；候選人期望月薪 12 萬，已表達願意洽談。新增職責可能影響職等與薪酬評估。', sources: ['src-interview', 'src-intent'] },
    { id: 'chen-2', authorId: 'zhe', time: '10:05', text: '他值得 12 萬，我希望他處理系統擴充問題。' },
    { id: 'chen-3', authorId: 'lin', time: '10:06', text: '原職缺預算只有 10 萬。' },
    {
      id: 'chen-4', authorId: 'agent', time: '10:08',
      text: '目前分歧涉及工作責任與預算限制。架構責任尚未明確，現有資料不足以支持提高預算。建議先比較兩個方案，再確認工作目標。',
      sources: ['src-job', 'src-interview', 'src-intent'],
      plans: [PLAN_A0, PLAN_B0],
      followUp: { text: '你最希望這位人選在前三個月解決什麼問題？', mentionId: 'zhe' },
    },
  ],
};

// ── 情境範本（情境建議動作會帶入輸入框，使用者可再修改） ─────────────

export const GOALS_TEMPLATE = '前三個月工作目標：\n1. 完成訂單服務的擴充設計，支援尖峰流量\n2. 規劃既有服務的拆分順序\n3. 建立團隊的 API 設計規範';
export const COMP_TEMPLATE = '職等與薪酬評估：依工作目標，職責相當於 P5（含架構職責），職等薪資帶 10～12 萬，建議月薪 11 萬，需申請每月 1 萬預算調整。';

// ── 推進規則 ─────────────────────────────────────────────────

type AgentReply = Omit<ChatMessage, 'id' | 'time' | 'authorId'>;

/** 阿哲補工作目標 → stage 1 */
export const toStage1 = (c: HiringCase, text: string, time: string): { next: HiringCase; reply: AgentReply } => {
  const { next: tasks, changes } = patchTasks(c.tasks, {
    't-goals': { status: '已完成', detail: `阿哲於 ${time} 補充`, evidence: `阿哲 ${time} 於對話中補充 3 項目標`, sourceIds: ['src-goals'] },
    't-scope': { status: '已完成', detail: '依工作目標：訂單服務擴充、服務拆分、API 規範', evidence: '由工作目標 1～3 定義', sourceIds: ['src-goals'] },
    't-comp': { status: '待補充', detail: '前置已完成，請依工作目標評估' },
  });
  const src = srcFromMessage('src-goals', '前三個月工作目標', '主管補充', '阿哲', time, text);
  return {
    next: {
      ...c,
      stage: 1,
      version: 'v4',
      versionTime: time,
      plans: [PLAN_A1, PLAN_B1],
      tasks,
      sources: [...c.sources, src],
      summary: [
        { label: '目前方案', value: '兩個方案評估中', marker: 'pending' },
        BUDGET, EXPECT,
        { label: '待決事項', value: '職等與薪酬尚未評估', marker: 'pending' },
        { label: '下一步', value: '王小姐評估職等與薪酬', marker: 'pending', ownerId: 'wang', taskId: 't-comp' },
      ],
      changeLog: [
        { version: 'v4', time: `今天 ${time}`, actor: 'Agent', change: '依阿哲工作目標更新方案 B 工作範圍；職等與薪酬評估解除前置等待', marker: 'agent' },
        ...c.changeLog,
      ],
    },
    reply: {
      text: '已收到阿哲補充的前三個月工作目標，並更新本案任務與方案：「定義架構職責範圍」依目標完成，「職等與薪酬評估」已解除前置等待，交由王小姐處理。方案 A 無法涵蓋目標 1、2；方案 B 的工作範圍已具體，但職等與薪酬尚未評估，兩個方案都還未核准。',
      sources: ['src-goals', 'src-job'],
      plans: [PLAN_A1, PLAN_B1],
      updates: { version: 'v4', tasks: changes },
      followUp: { text: '請依工作目標評估職等與薪酬，完成後方案 B 才能送交核准。', mentionId: 'wang' },
    },
  };
};

/** 王小姐填薪酬評估 → stage 2（方案 B 可送核准） */
export const toStage2 = (c: HiringCase, text: string, time: string): { next: HiringCase; reply: AgentReply } => {
  const { next: tasks, changes } = patchTasks(c.tasks, {
    't-comp': { status: '已完成', detail: 'P5，建議月薪 11 萬', evidence: `王小姐 ${time} 提出：P5、薪資帶 10～12 萬、建議 11 萬`, sourceIds: ['src-comp'] },
    't-plan': { status: '待決策', detail: '方案 B 可送交林主管核准' },
    't-budget': { status: '待決策', detail: '方案 B 月薪 11 萬，超出預算每月 1 萬', evidence: '薪酬評估建議 11 萬，職缺預算上限 10 萬', sourceIds: ['src-comp', 'src-job'] },
    't-accept': { detail: '方案核准後詢問' },
  });
  const src = srcFromMessage('src-comp', '職等與薪酬評估', 'HR 評估', '王小姐', time, text);
  return {
    next: {
      ...c,
      stage: 2,
      version: 'v5',
      versionTime: time,
      plans: [PLAN_A1, PLAN_B2],
      tasks,
      sources: [...c.sources, src],
      summary: [
        { label: '目前方案', value: '方案 B 待核准', marker: 'pending' },
        BUDGET, EXPECT,
        { label: '待決事項', value: '等待林主管核准方案 B 與預算調整', marker: 'pending' },
        { label: '下一步', value: '林主管核准或退回方案 B', marker: 'pending', ownerId: 'lin', taskId: 't-plan' },
      ],
      changeLog: [
        { version: 'v5', time: `今天 ${time}`, actor: 'Agent', change: '依王小姐薪酬評估具體化方案 B（P5、月薪 11 萬），可送交核准', marker: 'agent' },
        ...c.changeLog,
      ],
    },
    reply: {
      text: '已收到王小姐的職等與薪酬評估，方案 B 已具體：資深後端工程師（含架構職責）、P5、月薪 11 萬，需申請每月 1 萬預算調整。候選人期望 12 萬，11 萬是否接受仍待確認。方案 B 已可送交核准，核准前仍為 Agent 建議。',
      sources: ['src-comp', 'src-intent'],
      plans: [PLAN_A1, PLAN_B2],
      updates: { version: 'v5', tasks: changes },
      followUp: { text: '請在「確認任用方案」中核准或退回方案 B。對話中的同意不會視為核准。', mentionId: 'lin' },
    },
  };
};

/** 林主管在確認視窗核准方案 B → stage 3 */
export const toApproved = (c: HiringCase, time: string): { next: HiringCase; reply: AgentReply } => {
  const { next: tasks, changes } = patchTasks(c.tasks, {
    't-plan': { status: '已完成', detail: `林主管於 ${time} 核准方案 B（v6）`, evidence: `核准紀錄 v6（${time}）` },
    't-budget': { status: '已完成', detail: '每月 1 萬，隨方案 B 核准', evidence: `核准紀錄 v6（${time}）` },
    't-accept': { status: '待補充', detail: '詢問候選人對 11 萬的接受度' },
  });
  return {
    next: {
      ...c,
      stage: 3,
      version: 'v6',
      versionTime: time,
      decision: { version: 'v6', time: `今天 ${time}`, confirmerId: 'lin', planId: 'B' },
      plans: [PLAN_B3],
      tasks,
      summary: [
        { label: '目前方案', value: '方案 B 已核准（v6）', marker: 'approved' },
        { label: '任用條件', value: 'P5，月薪 11 萬', marker: 'approved' },
        EXPECT,
        { label: '待決事項', value: '候選人是否接受 11 萬', marker: 'pending' },
        { label: '下一步', value: '王小姐詢問候選人接受度', marker: 'pending', ownerId: 'wang', taskId: 't-accept' },
      ],
      changeLog: [
        { version: 'v6', time: `今天 ${time}`, actor: '林主管', change: '正式核准方案 B：P5、月薪 11 萬，含每月 1 萬預算調整', marker: 'approved' },
        ...c.changeLog,
      ],
    },
    reply: {
      text: '林主管已在「確認任用方案」中核准方案 B（v6）。正式任用條件：資深後端工程師（含架構職責）、P5、月薪 11 萬；每月 1 萬預算調整一併核准。',
      plans: [PLAN_B3],
      updates: { version: 'v6', tasks: changes },
      followUp: { text: '請詢問候選人對 11 萬的接受度，回覆後我會更新聘用共識。', mentionId: 'wang' },
    },
  };
};
