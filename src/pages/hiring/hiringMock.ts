/**
 * JobHub 任用決策空間 — 型別、人員、標示與示例紀錄（林小姐、張先生）
 * 陳先生的可推進情境在 chenScenario.ts；流程規則（Agent 回合、核准、情境建議）在 caseFlow.ts。
 * 不打真 API；所有資料皆為示意。
 *
 * 標示語意（共識、方案、意向、紀錄用；不可混用）：
 * - agent      Agent 建議：Agent 提出、尚未經人確認
 * - pending    待決：需討論或補資料
 * - candidate  候選人已表達：候選人自己說的，不代表企業同意
 * - recorded   有紀錄：有資料來源的事實，不代表企業同意
 * - approved   已核准：只有企業授權者正式核准的條件才用
 *
 * 任務狀態（本案任務用；與上面的標示分開）：
 * 待補充／等待前置／待決策／尚未啟動／已完成
 */

export type RoleKey = 'hr' | 'interviewer' | 'manager' | 'decider' | 'agent';

export interface Participant {
  id: string;
  name: string;
  role: string;
  roleKey: RoleKey;
  /** 頭像顯示字 */
  initial: string;
}

export const PARTICIPANTS: Participant[] = [
  { id: 'agent', name: 'Agent', role: '企業顧問', roleKey: 'agent', initial: 'A' },
  { id: 'wang', name: '王小姐', role: 'HR', roleKey: 'hr', initial: '王' },
  { id: 'lee', name: '李工程師', role: '面試官', roleKey: 'interviewer', initial: '李' },
  { id: 'zhe', name: '阿哲', role: '用人主管', roleKey: 'manager', initial: '哲' },
  { id: 'lin', name: '林主管', role: '決策者', roleKey: 'decider', initial: '林' },
  { id: 'wu', name: '吳設計師', role: '面試官', roleKey: 'interviewer', initial: '吳' },
  { id: 'chou', name: '周經理', role: '用人主管', roleKey: 'manager', initial: '周' },
  { id: 'huang', name: '黃經理', role: '用人主管', roleKey: 'manager', initial: '黃' },
];

/** 預設檢視身分：HR 王小姐（可在側欄切換，原型示意） */
export const DEFAULT_USER_ID = 'wang';

export const personOf = (id: string) => PARTICIPANTS.find(p => p.id === id)!;

// ── 標示 ─────────────────────────────────────────────────────

export type Marker = 'agent' | 'pending' | 'candidate' | 'recorded' | 'approved';

export const MARKER_LABEL: Record<Marker, string> = {
  agent: 'Agent 建議',
  pending: '待決',
  candidate: '候選人已表達',
  recorded: '有紀錄',
  approved: '已核准',
};

// ── 本案任務 ─────────────────────────────────────────────────

/** 三個業務領域在同一對話中交織，不是必須依序完成的分頁 */
export type TaskDomain = '任用決策' | '任用要求與履行' | '聘用共識';
export const TASK_DOMAINS: TaskDomain[] = ['任用決策', '任用要求與履行', '聘用共識'];

export type TaskStatus = '待補充' | '等待前置' | '待決策' | '尚未啟動' | '已完成';

/**
 * 任務來源：
 * - 制度要求：公司任用制度規定必須完成（附條文出處）
 * - 本案補充：這次討論中為了做決定而提出，不是制度規定
 */
export type TaskOrigin = '制度要求' | '本案補充';
export const TASK_ORIGINS: TaskOrigin[] = ['本案補充', '制度要求'];

export interface CaseTask {
  id: string;
  origin: TaskOrigin;
  /** 業務領域只作小標籤，不再用來分組 */
  domain: TaskDomain;
  title: string;
  detail: string;
  ownerId: string;
  status: TaskStatus;
  /** 等待前置時：在等什麼 */
  waitingFor?: string;
  /** 完成條件 */
  criteria: string;
  /** 制度要求的條文出處 */
  policyRef?: string;
  /** 依據的資料來源（可開原始紀錄） */
  sourceIds?: string[];
  /** 目前已提供的證據 */
  evidence?: string;
  /** 前置依賴的任務 id */
  dependsOn?: string[];
  /** 這項任務會影響什麼（本案補充用來說明為什麼要做） */
  impact?: string;
  /** 具體履行進度，例如「已收到 15／20 份」 */
  progress?: { done: number; total: number; unit: string; label: string };
  /** 「查看討論」時，在對話中找最近一則包含此關鍵字的訊息 */
  discussKeyword?: string;
}

export const openTaskCount = (tasks: CaseTask[]) => tasks.filter(t => t.status !== '已完成').length;
export const isActionable = (t: CaseTask) => t.status === '待補充' || t.status === '待決策';

// ── 型別 ─────────────────────────────────────────────────────

export type CaseStatus = '討論草稿' | '任用評估中' | '等待候選人回覆' | '已核准任用';

export interface SummaryItem {
  label: string;
  value: string;
  marker: Marker;
  /** 下一步負責人 */
  ownerId?: string;
  /** 下一步對應的工作清單任務（工作清單最上方的焦點） */
  taskId?: string;
}

/** 任用方案：除了職位、薪酬、責任，也呈現企業視角（解決什麼、需要什麼配套、還留下什麼問題） */
export interface PlanOption {
  id: string;
  title: string;
  position: string;
  salary: string;
  scope: string;
  solves: string;
  support: string;
  openIssues: string;
  /** agent = Agent 建議／未核准；approved = 授權者已核准 */
  marker: 'agent' | 'approved';
  /** 內容已具體、可送交授權者核准 */
  confirmable?: boolean;
}

export interface IntentItem {
  label: string;
  value: string;
  marker: Marker;
}

export interface SourceDoc {
  id: string;
  title: string;
  /** 紀錄類型：職缺／面試紀錄／溝通紀錄… */
  kind: string;
  meta: string;
  excerpt: string;
  /** 原始紀錄欄位（唯讀） */
  fields: [string, string][];
}

export interface ChangeLog {
  version: string;
  time: string;
  actor: string;
  change: string;
  marker: Marker;
}

export interface TaskChange {
  title: string;
  from: TaskStatus;
  to: TaskStatus;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  time: string;
  text: string;
  /** Agent 訊息附「查看依據」（source id） */
  sources?: string[];
  /** Agent 訊息內嵌方案卡（當下快照，之後方案更新不會回頭改舊訊息） */
  plans?: PlanOption[];
  /** 卡片後接續的提問 */
  followUp?: { text: string; mentionId: string };
  /** 回覆的方案（id 與當時標題） */
  replyToPlan?: { id: string; label: string };
  /** Agent 這次更新了共識與任務 */
  updates?: { version: string; tasks: TaskChange[] };
}

/** 正式核准紀錄 */
export interface Decision {
  version: string;
  time: string;
  confirmerId: string;
  planId: string;
}

export interface HiringCase {
  id: string;
  candidate: string;
  position: string;
  status: CaseStatus;
  updatedLabel: string;
  /** 排序用（epoch ms） */
  updatedAt: number;
  /** 情境進度（僅陳先生的可推進情境使用） */
  stage: number;
  participantIds: string[];
  /** 企業授權的正式核准者 */
  confirmerId: string;
  version: string;
  versionTime: string;
  summary: SummaryItem[];
  plans: PlanOption[];
  tasks: CaseTask[];
  intent: IntentItem[];
  sources: SourceDoc[];
  changeLog: ChangeLog[];
  messages: ChatMessage[];
  decision?: Decision;
}

const now = Date.now();
const H = 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────
// 林小姐｜產品設計師｜等待候選人回覆（方案已核准，Offer 已寄出）
// ─────────────────────────────────────────────────────────────

const LIN_PLAN: PlanOption = {
  id: 'D1', title: '任用方案', position: '產品設計師', salary: '月薪 7.5 萬', scope: '責任依原職缺，10/21 到職',
  solves: '補足產品介面與設計系統人力', support: '不需調整預算（職缺預算 6.5～8 萬）', openIssues: '候選人尚未回覆，期限 10/16',
  marker: 'approved',
};

export const LIN: HiringCase = {
  id: 'r-lin',
  candidate: '林小姐',
  position: '產品設計師',
  status: '等待候選人回覆',
  updatedLabel: '昨天',
  updatedAt: now - 26 * H,
  stage: 0,
  participantIds: ['agent', 'wang', 'wu', 'chou', 'lin'],
  confirmerId: 'lin',
  version: 'v4',
  versionTime: '10/12 09:45',
  decision: { version: 'v4', time: '10/11 13:40', confirmerId: 'lin', planId: 'D1' },
  summary: [
    { label: '目前方案', value: '已核准（v4）', marker: 'approved' },
    { label: '任用條件', value: '月薪 7.5 萬，10/21 到職', marker: 'approved' },
    { label: '候選人回覆', value: '尚未回覆，期限 10/16', marker: 'pending' },
    { label: '待決事項', value: '等待候選人回覆（期限 10/16）', marker: 'pending' },
    { label: '下一步', value: '王小姐追蹤候選人回覆', marker: 'pending', ownerId: 'wang', taskId: 'lin-t4' },
  ],
  plans: [LIN_PLAN],
  tasks: [
    {
      id: 'lin-t1', origin: '制度要求', domain: '任用決策', title: '任用方案經授權者核准', detail: '林主管於 10/11 核准 v4', ownerId: 'lin', status: '已完成',
      criteria: '授權核准者在「確認任用方案」完成核准', policyRef: '任用作業規範 第 6 條：任用條件須經部門決策者核准', evidence: '核准紀錄 v4（10/11 13:40）', discussKeyword: '核准',
    },
    {
      id: 'lin-t2', origin: '制度要求', domain: '任用要求與履行', title: '面試評估紀錄', detail: '作品集、設計實作、主管面試皆已完成', ownerId: 'chou', status: '已完成',
      criteria: '至少一場專業面試與一場主管面試，並有書面結論', policyRef: '任用作業規範 第 3 條', evidence: '面試紀錄 10/08', sourceIds: ['lin-job'],
    },
    {
      id: 'lin-t3', origin: '制度要求', domain: '聘用共識', title: '寄送書面 Offer', detail: '10/11 由王小姐寄出', ownerId: 'wang', status: '已完成',
      criteria: '依已核准方案寄出書面 Offer，註明回覆期限', policyRef: '任用作業規範 第 7 條', evidence: 'Offer 寄送紀錄 10/11', sourceIds: ['lin-offer'],
    },
    {
      id: 'lin-t4', origin: '本案補充', domain: '聘用共識', title: '追蹤候選人回覆', detail: '候選人正在比較另一份 Offer', ownerId: 'wang', status: '等待前置', waitingFor: '候選人於 10/16 前回覆',
      criteria: '取得候選人接受或婉拒的回覆', impact: '決定是否啟動到職準備', sourceIds: ['lin-intent'], evidence: '10/12 電話：會在本週內回覆', discussKeyword: '回覆',
    },
    {
      id: 'lin-t5', origin: '制度要求', domain: '任用要求與履行', title: '到職資料', detail: '候選人接受後啟動', ownerId: 'wang', status: '尚未啟動',
      criteria: '收齊到職資料 20 份', policyRef: '到職作業規範 第 2 條', dependsOn: ['lin-t4'],
    },
  ],
  intent: [
    { label: '期望月薪', value: '7～8 萬', marker: 'candidate' },
    { label: '目前狀態', value: '同時在比較另一份 Offer', marker: 'candidate' },
    { label: '是否接受', value: '尚未回覆', marker: 'pending' },
    { label: '來源', value: 'HR 王小姐電話溝通紀錄（10/12）', marker: 'recorded' },
  ],
  sources: [
    {
      id: 'lin-job', title: '原職缺：產品設計師', kind: '職缺', meta: '職缺 v1・HR 王小姐維護・09/20',
      excerpt: '月薪 6.5～8 萬。職責：產品介面與互動設計、設計系統維護、使用者研究協作。',
      fields: [
        ['職缺名稱', '產品設計師'], ['職缺版本', 'v1（09/20 建立）'], ['部門', '產品設計部'], ['薪資範圍', '月薪 6.5～8 萬'],
        ['工作內容', '1. 產品介面與互動設計\n2. 設計系統維護\n3. 使用者研究協作'], ['維護者', 'HR 王小姐'],
      ],
    },
    {
      id: 'lin-offer', title: 'Offer 寄送紀錄', kind: 'Offer 紀錄', meta: 'HR 王小姐・10/11',
      excerpt: '依已核准的任用方案 v4 寄出：產品設計師，月薪 7.5 萬，10/21 到職，回覆期限 10/16。',
      fields: [
        ['依據方案', '任用方案 v4（林主管 10/11 13:40 核准）'], ['職位', '產品設計師'], ['月薪', '7.5 萬'],
        ['到職日', '10/21'], ['回覆期限', '10/16'], ['寄送者', 'HR 王小姐・10/11 16:05'],
      ],
    },
    {
      id: 'lin-intent', title: '候選人意向', kind: '溝通紀錄', meta: 'HR 王小姐電話溝通・10/12',
      excerpt: '表示會在本週內回覆，目前也在比較另一份 Offer。未提及對薪資的異議。',
      fields: [
        ['溝通方式', '電話'], ['時間', '10/12 09:20'], ['記錄者', 'HR 王小姐'],
        ['候選人表達', '會在本週內回覆，目前也在比較另一份 Offer。'], ['未提及', '對薪資的異議'],
      ],
    },
  ],
  changeLog: [
    { version: 'v4', time: '10/11 13:40', actor: '林主管', change: '正式核准任用方案：月薪 7.5 萬、10/21 到職', marker: 'approved' },
    { version: 'v3', time: '10/10 17:20', actor: 'Agent', change: '依面試結果與職缺預算提出任用方案', marker: 'agent' },
    { version: 'v2', time: '10/09 11:00', actor: '王小姐', change: '加入候選人期望月薪 7～8 萬', marker: 'candidate' },
    { version: 'v1', time: '10/08 18:30', actor: 'Agent', change: '依面試紀錄建立任用討論，周經理建議錄用', marker: 'recorded' },
  ],
  messages: [
    { id: 'lin-1', authorId: 'agent', time: '10/11 16:10', text: '林主管已核准任用方案 v4，Offer 已由王小姐寄出。候選人回覆期限為 10/16。', sources: ['lin-offer'], plans: [LIN_PLAN] },
    { id: 'lin-2', authorId: 'wang', time: '10/12 09:30', text: '已和林小姐通過電話，她說這週內會回覆，目前也在比較另一份 Offer。' },
    { id: 'lin-3', authorId: 'chou', time: '10/12 09:42', text: '如果她在意薪資，還有沒有空間再談？' },
    {
      id: 'lin-4', authorId: 'agent', time: '10/12 09:45',
      text: '已核准的方案 v4 月薪為 7.5 萬，若要調整需重新提出方案並由林主管再次核准，現有共識不會因對話改變。目前紀錄中候選人未對薪資提出異議，建議先等候選人回覆。',
      sources: ['lin-intent', 'lin-job'],
      followUp: { text: '候選人回覆後請更新意向，我會同步目前共識。', mentionId: 'wang' },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 張先生｜資料分析師｜已核准任用（候選人已接受，到職準備中）
// ─────────────────────────────────────────────────────────────

const CHANG_PLAN: PlanOption = {
  id: 'D1', title: '任用方案', position: '資料分析師', salary: '月薪 6.8 萬', scope: '責任依原職缺，10/20 到職',
  solves: '補足營運報表與資料分析人力', support: '不需調整預算', openIssues: '無',
  marker: 'approved',
};

export const CHANG: HiringCase = {
  id: 'r-chang',
  candidate: '張先生',
  position: '資料分析師',
  status: '已核准任用',
  updatedLabel: '10/08',
  updatedAt: now - 5 * 24 * H,
  stage: 0,
  participantIds: ['agent', 'wang', 'huang', 'lin'],
  confirmerId: 'lin',
  version: 'v3',
  versionTime: '10/08 10:20',
  decision: { version: 'v2', time: '10/06 15:10', confirmerId: 'lin', planId: 'D1' },
  summary: [
    { label: '目前方案', value: '已核准（v2）', marker: 'approved' },
    { label: '任用條件', value: '月薪 6.8 萬，10/20 到職', marker: 'approved' },
    { label: '候選人回覆', value: '已接受（10/07）', marker: 'candidate' },
    { label: '待決事項', value: '到職資料還差 5 份、第一週工作未安排', marker: 'pending' },
    { label: '下一步', value: '黃經理安排第一週工作', marker: 'pending', ownerId: 'huang', taskId: 'chang-t5' },
  ],
  plans: [CHANG_PLAN],
  tasks: [
    {
      id: 'chang-t1', origin: '制度要求', domain: '任用決策', title: '任用方案經授權者核准', detail: '林主管於 10/06 核准 v2', ownerId: 'lin', status: '已完成',
      criteria: '授權核准者在「確認任用方案」完成核准', policyRef: '任用作業規範 第 6 條：任用條件須經部門決策者核准', evidence: '核准紀錄 v2（10/06 15:10）',
    },
    {
      id: 'chang-t2', origin: '制度要求', domain: '聘用共識', title: '候選人書面接受 Offer', detail: '10/07 以 Email 回覆接受', ownerId: 'wang', status: '已完成',
      criteria: '取得候選人書面接受', policyRef: '任用作業規範 第 7 條', evidence: '候選人 Email 10/07', sourceIds: ['chang-accept'],
    },
    {
      id: 'chang-t3', origin: '制度要求', domain: '任用要求與履行', title: '到職資料', detail: '還差 5 份：健康檢查報告、前職離職證明等', ownerId: 'wang', status: '待補充',
      progress: { done: 15, total: 20, unit: '份', label: '已收到' },
      criteria: '到職前收齊到職資料 20 份', policyRef: '到職作業規範 第 2 條',
      evidence: '已收到 15 份；缺健康檢查報告、前職離職證明、存摺影本、眷屬資料、緊急聯絡人表', impact: '未收齊不得辦理報到', discussKeyword: '到職資料',
    },
    {
      id: 'chang-t4', origin: '制度要求', domain: '任用要求與履行', title: '設備與系統權限申請', detail: '筆電、資料平台權限申請中', ownerId: 'huang', status: '待補充',
      criteria: '到職前 3 個工作天完成設備與權限申請', policyRef: '到職作業規範 第 5 條', evidence: '已送出筆電申請；資料平台權限待補 IT 單號',
    },
    {
      id: 'chang-t5', origin: '本案補充', domain: '任用要求與履行', title: '第一週工作安排', detail: '黃經理表示先熟悉資料平台', ownerId: 'huang', status: '待補充',
      criteria: '列出第一週每日安排與帶領人', impact: '讓新人到職當天知道要做什麼', evidence: '10/08 對話：先安排熟悉資料平台（尚無具體安排）', discussKeyword: '第一週',
    },
  ],
  intent: [
    { label: '是否接受', value: '已接受', marker: 'candidate' },
    { label: '到職日', value: '10/20', marker: 'candidate' },
    { label: '來源', value: '候選人 Email 回覆（10/07）', marker: 'recorded' },
  ],
  sources: [
    {
      id: 'chang-offer', title: 'Offer 寄送紀錄', kind: 'Offer 紀錄', meta: 'HR 王小姐・10/06',
      excerpt: '依已核准的任用方案 v2 寄出：資料分析師，月薪 6.8 萬，10/20 到職。',
      fields: [['依據方案', '任用方案 v2（林主管 10/06 15:10 核准）'], ['職位', '資料分析師'], ['月薪', '6.8 萬'], ['到職日', '10/20'], ['寄送者', 'HR 王小姐・10/06 17:30']],
    },
    {
      id: 'chang-accept', title: '候選人回覆', kind: 'Email', meta: '候選人 Email・10/07',
      excerpt: '接受 Offer，確認 10/20 到職。',
      fields: [['寄件者', '張先生'], ['時間', '10/07 11:02'], ['內容摘要', '感謝提供機會，接受 Offer，確認 10/20 到職。']],
    },
  ],
  changeLog: [
    { version: 'v3', time: '10/08 10:20', actor: '王小姐', change: '候選人已接受，進入到職準備', marker: 'candidate' },
    { version: 'v2', time: '10/06 15:10', actor: '林主管', change: '正式核准任用方案：月薪 6.8 萬、10/20 到職', marker: 'approved' },
    { version: 'v1', time: '10/04 17:00', actor: 'Agent', change: '依面試紀錄建立任用討論並提出任用方案', marker: 'agent' },
  ],
  messages: [
    { id: 'chang-1', authorId: 'agent', time: '10/07 18:10', text: '候選人已回覆接受 Offer，表示 10/20 到職。任用方案 v2 已由林主管核准，目前進入到職準備。', sources: ['chang-accept', 'chang-offer'], plans: [CHANG_PLAN] },
    { id: 'chang-2', authorId: 'wang', time: '10/08 10:15', text: '到職文件已寄出，候選人也簽回了。' },
    { id: 'chang-3', authorId: 'huang', time: '10/08 10:18', text: '第一週我會安排他先熟悉資料平台。' },
    {
      id: 'chang-4', authorId: 'agent', time: '10/08 10:20',
      text: '已更新共識：Offer 相關文件已簽回。到職資料目前收到 15／20 份，另有設備與系統權限申請、第一週工作安排尚未完成。',
      followUp: { text: '第一週的工作安排確定後可以貼在這裡，我會加進到職準備。', mentionId: 'huang' },
    },
  ],
};

/** 新增任用討論：空白草稿，尚未帶入人選 */
export const makeDraftCase = (id: string, userId: string): HiringCase => ({
  id,
  candidate: '新任用討論',
  position: '',
  status: '討論草稿',
  updatedLabel: '剛剛',
  updatedAt: Date.now(),
  stage: 0,
  participantIds: userId === 'agent' ? ['agent'] : ['agent', userId],
  confirmerId: 'lin',
  version: 'v0',
  versionTime: '',
  summary: [],
  plans: [],
  tasks: [],
  intent: [],
  sources: [],
  changeLog: [],
  messages: [],
});

export const DRAFT_SUGGESTIONS = ['從應徵管理帶入人選', '貼上面試紀錄請 Agent 整理', '建立任用方案草稿'];
