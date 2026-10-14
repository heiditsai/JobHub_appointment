/**
 * JobHub 任用工作空間 — 型別、人員、標示與示例紀錄（林小姐、張先生）
 * 陳先生的可推進情境在 chenScenario.ts；任務推進規則在 caseFlow.ts。
 * 不打真 API；所有資料（含制度條文與資料份數）皆為示例值，不代表特定公司的真實規定。
 *
 * 共識標示（方案、意向、紀錄用）：
 * - agent      Agent 建議：Agent 提出、尚未經人確認
 * - pending    待決：需討論或補資料
 * - candidate  候選人已表達：候選人自己說的，不代表企業同意
 * - recorded   有紀錄：有資料來源的事實，不代表企業同意
 * - approved   已核准：只有企業授權者正式核准的條件才用
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
  { id: 'yun', name: '小芸', role: 'HR', roleKey: 'hr', initial: '芸' },
  { id: 'lee', name: '李工程師', role: '面試官', roleKey: 'interviewer', initial: '李' },
  { id: 'zhe', name: '阿哲', role: '用人主管', roleKey: 'manager', initial: '哲' },
  { id: 'lin', name: '林主管', role: '決策者', roleKey: 'decider', initial: '林' },
  { id: 'wu', name: '吳設計師', role: '面試官', roleKey: 'interviewer', initial: '吳' },
  { id: 'chou', name: '周經理', role: '用人主管', roleKey: 'manager', initial: '周' },
  { id: 'huang', name: '黃經理', role: '用人主管', roleKey: 'manager', initial: '黃' },
];

/** 預設檢視身分：HR 小芸（可在側欄切換，原型示意） */
export const DEFAULT_USER_ID = 'yun';

export const personOf = (id: string) => PARTICIPANTS.find(p => p.id === id)!;

// ── 共識標示 ─────────────────────────────────────────────────

export type Marker = 'agent' | 'pending' | 'candidate' | 'recorded' | 'approved';

export const MARKER_LABEL: Record<Marker, string> = {
  agent: 'Agent 建議',
  pending: '待決',
  candidate: '候選人已表達',
  recorded: '有紀錄',
  approved: '已核准',
};

// ── 任務 ─────────────────────────────────────────────────────

/** 三個業務領域只作小標籤／篩選，不是必須依序完成的關卡 */
export type TaskDomain = '任用決策' | '任用要求與履行' | '聘用共識';
export const TASK_DOMAINS: TaskDomain[] = ['任用決策', '任用要求與履行', '聘用共識'];

export type TaskStatus = '可處理' | '進行中' | '待補充' | '等待前置' | '尚未啟動' | '已完成';

/**
 * - 制度任務：依公司管理辦法及本案適用條件產生
 * - 本案任務：討論中新增、已採納的補充工作
 */
export type TaskKind = '制度任務' | '本案任務';
export const TASK_KINDS: TaskKind[] = ['制度任務', '本案任務'];

export type TaskIcon = 'compass' | 'scale' | 'stamp' | 'folder' | 'signature' | 'message' | 'clipboard' | 'users' | 'laptop' | 'calendar' | 'mail';

/** 完成條件項目：仍待補充 → 已收到（有人提供）→ 已符合（分析後符合條件） */
export type CriterionState = '仍待補充' | '已收到' | '已符合';

export interface Criterion {
  id: string;
  label: string;
  /** 這一項要回答什麼 */
  hint: string;
  state: CriterionState;
  /** 原型用：自由輸入的訊息中出現這些詞，視為提供了這一項 */
  keywords: string[];
  /** 草稿範例（可帶入，不是問卷） */
  sample?: string;
}

/**
 * 制度任務的資料清單（查看缺項）
 * 提交後只到「待檢核」，由檢核者判定是否符合，不會直接標示符合或完成任務
 */
export interface DocItem {
  name: string;
  provider: string;
  status: '符合' | '待修正' | '未收到' | '待檢核';
  /** 缺漏或待補正原因 */
  reason?: string;
  /** 制度來源與版本（示例） */
  policy: string;
  policyVersion: string;
}

export interface TaskCompletion {
  time: string;
  byId: string;
  /** 完成時適用的共識（方案）版本；方案變更影響條件時，保留此紀錄並標示需重新確認 */
  planVersion: string;
  summary: string;
}

export interface CaseTask {
  id: string;
  kind: TaskKind;
  domain: TaskDomain;
  icon: TaskIcon;
  title: string;
  /** 為什麼需要處理 */
  purpose: string;
  ownerId: string;
  status: TaskStatus;
  /** 完成後可推進的任務 */
  unlocks?: string[];
  dependsOn?: string[];
  /** 尚未啟動時的啟動條件 */
  startCondition?: string;
  criteria?: Criterion[];
  /** 完成條件的來源：制度依據，或本案條件說明 */
  conditionSource: string;
  /** 指定確認角色 */
  confirmerId?: string;
  /** decision：透過「確認任用方案」正式核准 */
  confirmVia?: 'task' | 'decision';
  docs?: DocItem[];
  evidence?: string[];
  /** 證據對應的訊息，可回查 */
  evidenceMsgIds?: string[];
  completion?: TaskCompletion;
  /** 開始處理時，Agent 的整理 */
  kickoff?: string;
  /** 處理中可帶入輸入框的範例（不是問卷，使用者可自由回答） */
  templates?: { label: string; text: string }[];
  /** 主要動作的具體動詞，例如「查看缺項」「補充工作範圍」 */
  actionLabel?: string;
  /** 查看討論時，在對話中找最近一則包含此詞的訊息 */
  discussKeyword?: string;
  /** 本案進展用的精簡名稱，例如「架構責任」「任用資料」 */
  progressName?: string;
  /** 完成時的說法，例如「面試結果已整理」 */
  doneLabel?: string;
  /** 被其他任務等待時的說法，例如「工作範圍」 */
  waitName?: string;
}

/** Agent 建議新增、尚未採納的任務 */
export interface SuggestedTask {
  id: string;
  kind: TaskKind;
  domain: TaskDomain;
  icon: TaskIcon;
  title: string;
  purpose: string;
  reason: string;
  ownerId: string;
  actionLabel: string;
}

export const openTaskCount = (tasks: CaseTask[]) => tasks.filter(t => t.status !== '已完成').length;
export const isWorkable = (t: CaseTask) => t.status === '可處理' || t.status === '進行中' || t.status === '待補充';
export const isReadyToConfirm = (t: CaseTask) =>
  t.status === '進行中' && !!t.criteria?.length && t.criteria.every(c => c.state === '已符合');

// ── 型別 ─────────────────────────────────────────────────────

export type CaseStatus = '討論草稿' | '任用評估中' | '等待候選人回覆' | '已核准任用';

export interface SummaryItem {
  label: string;
  value: string;
  marker: Marker;
  /** 下一步負責人 */
  ownerId?: string;
  /** 下一步對應的任務（任務日誌的目前焦點） */
  taskId?: string;
}

/** 任用方案：職位、薪酬、責任＋企業視角（能解決、需要配套、仍待解決） */
export interface PlanOption {
  id: string;
  title: string;
  position: string;
  salary: string;
  scope: string;
  solves: string;
  support: string;
  openIssues: string;
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
  kind: string;
  meta: string;
  excerpt: string;
  fields: [string, string][];
}

export interface ChangeLog {
  version: string;
  time: string;
  actor: string;
  change: string;
  marker: Marker;
}

export interface ChecklistSnapshot {
  taskId: string;
  items: { label: string; state: CriterionState }[];
}

export interface ChatMessage {
  id: string;
  authorId: string;
  time: string;
  text: string;
  /** 對話事件（開始處理、完成、接棒、採納建議、核准），以簡短列呈現 */
  event?: {
    tone: 'start' | 'complete' | 'adopt' | 'approve' | 'submit';
    title: string;
    detail?: string;
    next?: string;
    /** 可回查的依據訊息 */
    evidenceMsgIds?: string[];
  };
  /** 這則訊息是在處理哪個任務時送出的 */
  taskRef?: { id: string; title: string };
  /** Agent 訊息內的具體動作按鈕（與右側進展、自然語言操作指向同一筆任務） */
  actions?: MessageAction[];
  /** Agent 對完成條件的整理（當下快照） */
  checklist?: ChecklistSnapshot;
  sources?: string[];
  /** 方案卡（當下快照） */
  plans?: PlanOption[];
  followUp?: { text: string; mentionId: string };
  replyToPlan?: { id: string; label: string };
}

export type MessageActionKind = 'docs' | 'provide' | 'ask' | 'draft' | 'confirm' | 'approve' | 'start' | 'discuss' | 'assist';
export interface MessageAction {
  label: string;
  kind: MessageActionKind;
  taskId: string;
}

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
  updatedAt: number;
  participantIds: string[];
  /** 企業授權的正式核准者 */
  confirmerId: string;
  version: string;
  versionTime: string;
  summary: SummaryItem[];
  plans: PlanOption[];
  tasks: CaseTask[];
  suggested: SuggestedTask[];
  intent: IntentItem[];
  sources: SourceDoc[];
  changeLog: ChangeLog[];
  messages: ChatMessage[];
  decision?: Decision;
}

const now = Date.now();
const H = 60 * 60 * 1000;

// ── 資料清單（示例） ─────────────────────────────────────────

const DOC_NAMES: [string, string][] = [
  ['履歷表', '候選人'], ['學歷證明', '候選人'], ['經歷證明', '候選人'], ['身分證影本', '候選人'], ['個資蒐集同意書', '候選人'],
  ['背景查核同意書', '候選人'], ['技術面試評分表', '面試官'], ['主管面試評分表', '面試官'], ['面試紀錄摘要', 'HR'], ['職務說明書', 'HR'],
  ['薪資期望表', '候選人'], ['作品／專案說明', '候選人'], ['證照影本', '候選人'], ['推薦人聯絡資料', '候選人'], ['到職可行日確認', '候選人'],
  ['前職離職證明', '候選人'], ['前職薪資證明', '候選人'], ['推薦人查核紀錄', 'HR'], ['競業條款聲明', '候選人'], ['健康聲明書', '候選人'],
];

const DOC_POLICY = '示例任用作業辦法 第 4 條：任用評估資料清單';
const DOC_POLICY_VERSION = 'v2026.1';

const missingReason = (provider: string) =>
  provider === '候選人' ? '候選人尚未上傳' : provider === '面試官' ? '面試官尚未繳交' : 'HR 尚未彙整';

/** 前 received 份已收到，其中 fixes 列出的為待補正，其餘未收到 */
export const makeDocs = (received: number, fixes: Record<string, string>): DocItem[] =>
  DOC_NAMES.map(([name, provider], i) => {
    const base = { name, provider, policy: DOC_POLICY, policyVersion: DOC_POLICY_VERSION };
    if (i >= received) return { ...base, status: '未收到' as const, reason: missingReason(provider) };
    if (fixes[name]) return { ...base, status: '待修正' as const, reason: fixes[name] };
    return { ...base, status: '符合' as const };
  });

export const docStats = (docs: DocItem[]) => ({
  total: docs.length,
  received: docs.filter(d => d.status !== '未收到').length,
  ok: docs.filter(d => d.status === '符合').length,
  missing: docs.filter(d => d.status === '未收到').length,
  fix: docs.filter(d => d.status === '待修正').length,
  review: docs.filter(d => d.status === '待檢核').length,
});

/** 「尚有 5 份未收到、2 份待補正」——用具體缺項取代不明確的比例 */
export const docGapText = (docs: DocItem[]) => {
  const s = docStats(docs);
  const parts = [s.missing && `${s.missing} 份未收到`, s.fix && `${s.fix} 份待補正`, s.review && `${s.review} 份已收到待檢核`].filter(Boolean);
  return parts.length ? `尚有 ${parts.join('、')}` : '資料皆已檢核符合';
};

// ─────────────────────────────────────────────────────────────
// 林小姐｜產品設計師｜等待候選人回覆
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
  participantIds: ['agent', 'yun', 'wu', 'chou', 'lin'],
  confirmerId: 'lin',
  version: 'v4',
  versionTime: '10/12 09:45',
  decision: { version: 'v4', time: '10/11 13:40', confirmerId: 'lin', planId: 'D1' },
  summary: [
    { label: '目前方案', value: '方案已核准（v4）', marker: 'approved' },
    { label: '任用條件', value: '月薪 7.5 萬，10/21 到職', marker: 'approved' },
    { label: '待決事項', value: '等待候選人回覆（期限 10/16）', marker: 'pending' },
    { label: '下一步', value: '小芸追蹤候選人回覆', marker: 'pending', ownerId: 'yun', taskId: 'lin-t4' },
  ],
  plans: [LIN_PLAN],
  tasks: [
    {
      id: 'lin-t1', kind: '制度任務', domain: '任用決策', icon: 'stamp', title: '任用方案核准', doneLabel: '任用方案已核准（v4）', purpose: '任用條件需由決策者正式核准。',
      ownerId: 'lin', status: '已完成', confirmVia: 'decision', conditionSource: '示例管理辦法：任用條件須經部門決策者核准',
      completion: { time: '10/11 13:40', byId: 'lin', planVersion: 'v4', summary: '核准任用方案 v4' },
    },
    {
      id: 'lin-t2', kind: '制度任務', domain: '任用要求與履行', icon: 'clipboard', title: '面試評估紀錄', doneLabel: '面試結果已整理', purpose: '任用前需有專業面試與主管面試的書面結論。',
      ownerId: 'chou', status: '已完成', conditionSource: '示例管理辦法：至少一場專業面試與一場主管面試',
      completion: { time: '10/08 18:30', byId: 'chou', planVersion: 'v1', summary: '作品集、設計實作、主管面試完成' },
    },
    {
      id: 'lin-t3', kind: '制度任務', domain: '聘用共識', icon: 'mail', title: '寄送書面 Offer', doneLabel: 'Offer 已寄出', purpose: '依已核准方案寄出書面 Offer，並註明回覆期限。',
      ownerId: 'yun', status: '已完成', conditionSource: '示例管理辦法：Offer 須依核准方案寄出',
      completion: { time: '10/11 16:05', byId: 'yun', planVersion: 'v4', summary: '寄出 Offer，回覆期限 10/16' },
    },
    {
      id: 'lin-t4', kind: '本案任務', domain: '聘用共識', icon: 'message', title: '追蹤候選人回覆', progressName: '候選人回覆', waitName: '候選人回覆', purpose: '候選人正在比較另一份 Offer，需在期限前取得回覆。',
      ownerId: 'yun', status: '進行中', unlocks: ['lin-t5'], conditionSource: '本案條件：取得候選人接受或婉拒的回覆', actionLabel: '記錄候選人回覆', discussKeyword: '回覆',
      evidence: ['10/12 電話：候選人表示本週內回覆'],
    },
    {
      id: 'lin-t5', kind: '制度任務', domain: '任用要求與履行', icon: 'folder', title: '準備到職資料', progressName: '到職資料', purpose: '到職前需收齊到職資料。',
      ownerId: 'yun', status: '尚未啟動', dependsOn: ['lin-t4'], startCondition: '候選人接受 Offer 後', actionLabel: '查看缺項',
      conditionSource: '示例管理辦法：到職前收齊到職資料（份數為示例值）',
    },
  ],
  suggested: [],
  intent: [
    { label: '期望月薪', value: '7～8 萬', marker: 'candidate' },
    { label: '目前狀態', value: '同時在比較另一份 Offer', marker: 'candidate' },
    { label: '是否接受', value: '尚未回覆', marker: 'pending' },
    { label: '來源', value: 'HR 小芸電話溝通紀錄（10/12）', marker: 'recorded' },
  ],
  sources: [
    {
      id: 'lin-job', title: '原職缺：產品設計師', kind: '職缺', meta: '職缺 v1・HR 小芸維護・09/20',
      excerpt: '月薪 6.5～8 萬。職責：產品介面與互動設計、設計系統維護、使用者研究協作。',
      fields: [['職缺名稱', '產品設計師'], ['薪資範圍', '月薪 6.5～8 萬'], ['工作內容', '1. 產品介面與互動設計\n2. 設計系統維護\n3. 使用者研究協作'], ['維護者', 'HR 小芸']],
    },
    {
      id: 'lin-offer', title: 'Offer 寄送紀錄', kind: 'Offer 紀錄', meta: 'HR 小芸・10/11',
      excerpt: '依已核准的任用方案 v4 寄出：產品設計師，月薪 7.5 萬，10/21 到職，回覆期限 10/16。',
      fields: [['依據方案', '任用方案 v4（林主管 10/11 13:40 核准）'], ['月薪', '7.5 萬'], ['到職日', '10/21'], ['回覆期限', '10/16'], ['寄送者', 'HR 小芸・10/11 16:05']],
    },
    {
      id: 'lin-intent', title: '候選人意向', kind: '溝通紀錄', meta: 'HR 小芸電話溝通・10/12',
      excerpt: '表示會在本週內回覆，目前也在比較另一份 Offer。未提及對薪資的異議。',
      fields: [['溝通方式', '電話'], ['時間', '10/12 09:20'], ['候選人表達', '會在本週內回覆，目前也在比較另一份 Offer。'], ['未提及', '對薪資的異議']],
    },
  ],
  changeLog: [
    { version: 'v4', time: '10/11 13:40', actor: '林主管', change: '正式核准任用方案：月薪 7.5 萬、10/21 到職', marker: 'approved' },
    { version: 'v3', time: '10/10 17:20', actor: 'Agent', change: '依面試結果與職缺預算提出任用方案', marker: 'agent' },
    { version: 'v2', time: '10/09 11:00', actor: '小芸', change: '加入候選人期望月薪 7～8 萬', marker: 'candidate' },
  ],
  messages: [
    { id: 'lin-1', authorId: 'agent', time: '10/11 16:10', text: '林主管已核准任用方案 v4，Offer 已由小芸寄出。候選人回覆期限為 10/16。', sources: ['lin-offer'], plans: [LIN_PLAN] },
    { id: 'lin-2', authorId: 'yun', time: '10/12 09:30', text: '已和林小姐通過電話，她說這週內會回覆，目前也在比較另一份 Offer。' },
    { id: 'lin-3', authorId: 'chou', time: '10/12 09:42', text: '如果她在意薪資，還有沒有空間再談？' },
    {
      id: 'lin-4', authorId: 'agent', time: '10/12 09:45',
      text: '已核准的方案 v4 月薪為 7.5 萬，若要調整需重新提出方案並由林主管再次核准，現有共識不會因對話改變。目前紀錄中候選人未對薪資提出異議，建議先等候選人回覆。',
      sources: ['lin-intent', 'lin-job'],
      followUp: { text: '候選人回覆後請更新意向，我會同步目前共識。', mentionId: 'yun' },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 張先生｜資料分析師｜已核准任用（到職準備中）
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
  participantIds: ['agent', 'yun', 'huang', 'lin'],
  confirmerId: 'lin',
  version: 'v3',
  versionTime: '10/08 10:20',
  decision: { version: 'v2', time: '10/06 15:10', confirmerId: 'lin', planId: 'D1' },
  summary: [
    { label: '目前方案', value: '方案已核准（v2）', marker: 'approved' },
    { label: '任用條件', value: '月薪 6.8 萬，10/20 到職', marker: 'approved' },
    { label: '待決事項', value: '第一週工作尚未安排', marker: 'pending' },
    { label: '下一步', value: '黃經理安排第一週工作', marker: 'pending', ownerId: 'huang', taskId: 'chang-t5' },
  ],
  plans: [CHANG_PLAN],
  tasks: [
    {
      id: 'chang-t1', kind: '制度任務', domain: '任用決策', icon: 'stamp', title: '任用方案核准', doneLabel: '任用方案已核准（v2）', purpose: '任用條件需由決策者正式核准。',
      ownerId: 'lin', status: '已完成', confirmVia: 'decision', conditionSource: '示例管理辦法：任用條件須經部門決策者核准',
      completion: { time: '10/06 15:10', byId: 'lin', planVersion: 'v2', summary: '核准任用方案 v2' },
    },
    {
      id: 'chang-t2', kind: '制度任務', domain: '聘用共識', icon: 'mail', title: '候選人書面接受 Offer', doneLabel: '候選人已接受 Offer', purpose: '取得候選人書面接受，才能進入到職準備。',
      ownerId: 'yun', status: '已完成', conditionSource: '示例管理辦法：取得候選人書面接受',
      completion: { time: '10/07 11:02', byId: 'yun', planVersion: 'v2', summary: '候選人以 Email 接受' },
    },
    {
      id: 'chang-t3', kind: '制度任務', domain: '任用要求與履行', icon: 'folder', title: '準備到職資料', progressName: '到職資料', purpose: '到職前需收齊並檢核到職資料。',
      ownerId: 'yun', status: '待補充', actionLabel: '查看缺項', discussKeyword: '到職資料',
      docs: makeDocs(15, { 學歷證明: '影本不清晰，需重新提供', 證照影本: '證照已過期，需提供最新版本' }),
      conditionSource: '示例管理辦法：到職前收齊並通過檢核（份數為示例值）',
    },
    {
      id: 'chang-t4', kind: '制度任務', domain: '任用要求與履行', icon: 'laptop', title: '設備與系統權限', progressName: '設備與權限', purpose: '讓新人到職當天就能開始工作。',
      ownerId: 'huang', status: '進行中', conditionSource: '示例管理辦法：到職前 3 個工作天完成申請', actionLabel: '更新申請進度',
      evidence: ['已送出筆電申請', '資料平台權限待補 IT 單號'],
    },
    {
      id: 'chang-t5', kind: '本案任務', domain: '任用要求與履行', icon: 'calendar', title: '安排第一週工作', progressName: '第一週工作', purpose: '讓新人到職當天知道要做什麼、找誰。',
      ownerId: 'huang', status: '可處理', conditionSource: '本案條件：列出第一週每日安排與帶領人', actionLabel: '安排第一週工作', discussKeyword: '第一週',
      evidence: ['10/08 對話：先安排熟悉資料平台（尚無具體安排）'],
    },
  ],
  suggested: [],
  intent: [
    { label: '是否接受', value: '已接受', marker: 'candidate' },
    { label: '到職日', value: '10/20', marker: 'candidate' },
    { label: '來源', value: '候選人 Email 回覆（10/07）', marker: 'recorded' },
  ],
  sources: [
    {
      id: 'chang-offer', title: 'Offer 寄送紀錄', kind: 'Offer 紀錄', meta: 'HR 小芸・10/06',
      excerpt: '依已核准的任用方案 v2 寄出：資料分析師，月薪 6.8 萬，10/20 到職。',
      fields: [['依據方案', '任用方案 v2（林主管 10/06 15:10 核准）'], ['月薪', '6.8 萬'], ['到職日', '10/20'], ['寄送者', 'HR 小芸・10/06 17:30']],
    },
    {
      id: 'chang-accept', title: '候選人回覆', kind: 'Email', meta: '候選人 Email・10/07',
      excerpt: '接受 Offer，確認 10/20 到職。',
      fields: [['寄件者', '張先生'], ['時間', '10/07 11:02'], ['內容摘要', '感謝提供機會，接受 Offer，確認 10/20 到職。']],
    },
  ],
  changeLog: [
    { version: 'v3', time: '10/08 10:20', actor: '小芸', change: '候選人已接受，進入到職準備', marker: 'candidate' },
    { version: 'v2', time: '10/06 15:10', actor: '林主管', change: '正式核准任用方案：月薪 6.8 萬、10/20 到職', marker: 'approved' },
  ],
  messages: [
    { id: 'chang-1', authorId: 'agent', time: '10/07 18:10', text: '候選人已回覆接受 Offer，表示 10/20 到職。任用方案 v2 已由林主管核准，目前進入到職準備。', sources: ['chang-accept', 'chang-offer'], plans: [CHANG_PLAN] },
    { id: 'chang-2', authorId: 'yun', time: '10/08 10:15', text: 'Offer 相關文件已寄出，候選人也簽回了。' },
    { id: 'chang-3', authorId: 'huang', time: '10/08 10:18', text: '第一週我會安排他先熟悉資料平台。' },
    {
      id: 'chang-4', authorId: 'agent', time: '10/08 10:20',
      text: '已更新共識：到職資料收到 15／20 份，其中 13 份符合要求；設備與系統權限申請中；第一週工作尚未安排。',
      followUp: { text: '第一週的工作安排確定後可以貼在這裡，我會加進任務日誌。', mentionId: 'huang' },
    },
  ],
};

/** 新增任用討論：空白草稿 */
export const makeDraftCase = (id: string, userId: string): HiringCase => ({
  id,
  candidate: '新任用討論',
  position: '',
  status: '討論草稿',
  updatedLabel: '剛剛',
  updatedAt: Date.now(),
  participantIds: userId === 'agent' ? ['agent'] : ['agent', userId],
  confirmerId: 'lin',
  version: 'v0',
  versionTime: '',
  summary: [],
  plans: [],
  tasks: [],
  suggested: [],
  intent: [],
  sources: [],
  changeLog: [],
  messages: [],
});

export const DRAFT_SUGGESTIONS = ['從應徵管理帶入人選', '貼上面試紀錄請 Agent 整理', '建立任用方案草稿'];
