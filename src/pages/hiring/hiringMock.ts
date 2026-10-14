/**
 * JobHub 任用決策空間 — 模擬資料
 * 不打真 API；所有人員、任用紀錄、共識與訊息皆為示意。
 *
 * 標示語意（不可混用）：
 * - agent      Agent 建議：Agent 提出、尚未經人確認
 * - pending    待決：需討論或補資料
 * - candidate  候選人已表達：候選人自己說的，不代表企業同意
 * - recorded   有紀錄：有資料來源的事實，不代表企業同意
 * - approved   已核准：只有企業授權者正式核准的條件才用
 *
 * 原則：不自行補出績效證據；只有正式核准的方案才標「已核准」。
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

/** 目前登入者：HR 王小姐（非授權核准者） */
export const CURRENT_USER_ID: string = 'wang';

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

// ── 型別 ─────────────────────────────────────────────────────

export type CaseStatus = '討論草稿' | '任用評估中' | '等待候選人回覆' | '已核准任用';

export interface SummaryItem {
  label: string;
  value: string;
  marker: Marker;
  /** 下一步負責人 */
  ownerId?: string;
}

export interface PlanOption {
  id: string;
  title: string;
  position: string;
  salary: string;
  scope: string;
  open: string;
  /** agent = Agent 建議／未核准；approved = 授權者已核准 */
  marker: 'agent' | 'approved';
}

export interface Requirement {
  item: string;
  detail: string;
  /** recorded = 已完成且有紀錄；pending = 待決 */
  marker: Marker;
  ownerId?: string;
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

export interface ChatMessage {
  id: string;
  authorId: string;
  time: string;
  text: string;
  /** Agent 訊息附「查看依據」（source id） */
  sources?: string[];
  /** Agent 訊息內嵌方案卡（plan id） */
  planIds?: string[];
  /** 卡片後接續的提問 */
  followUp?: { text: string; mentionId: string };
  /** 回覆的方案 */
  replyToPlan?: string;
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
  participantIds: string[];
  /** 企業授權的正式核准者 */
  confirmerId: string;
  version: string;
  versionTime: string;
  summary: SummaryItem[];
  plans: PlanOption[];
  requirements: Requirement[];
  intent: IntentItem[];
  sources: SourceDoc[];
  changeLog: ChangeLog[];
  messages: ChatMessage[];
  decision?: Decision;
}

const now = Date.now();
const H = 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────
// 陳先生｜資深後端工程師｜任用評估中
// ─────────────────────────────────────────────────────────────

const CHEN: HiringCase = {
  id: 'r-chen',
  candidate: '陳先生',
  position: '資深後端工程師',
  status: '任用評估中',
  updatedLabel: '10:08',
  updatedAt: now - 1 * H,
  participantIds: ['agent', 'wang', 'lee', 'zhe', 'lin'],
  confirmerId: 'lin',
  version: 'v3',
  versionTime: '10:08',
  summary: [
    { label: '目前方案', value: '尚未確認', marker: 'pending' },
    { label: '原職缺預算', value: '月薪 8～10 萬', marker: 'recorded' },
    { label: '候選人期望', value: '月薪 12 萬', marker: 'candidate' },
    { label: '待決事項', value: '是否增加架構責任並調整職位', marker: 'pending' },
    { label: '下一步', value: '阿哲補充前三個月工作目標', marker: 'pending', ownerId: 'zhe' },
  ],
  plans: [
    { id: 'A', title: '方案 A', position: '維持資深後端工程師', salary: '月薪 8～10 萬', scope: '責任依原職缺', open: '候選人是否接受待確認', marker: 'agent' },
    { id: 'B', title: '方案 B', position: '增加架構責任', salary: '職等與薪酬待評估', scope: '先明確工作範圍', open: '再判斷是否申請預算調整', marker: 'agent' },
  ],
  requirements: [
    { item: '面試評估', detail: '技術面試、主管面試皆已完成；阿哲建議錄用', marker: 'recorded', ownerId: 'zhe' },
    { item: '前三個月工作目標', detail: '尚未提供，為判斷是否增加架構責任的依據', marker: 'pending', ownerId: 'zhe' },
    { item: '架構設計職責範圍', detail: '是否納入職位、需負責到什麼程度', marker: 'pending', ownerId: 'zhe' },
    { item: '職等與薪酬評估', detail: '待工作範圍明確後由 HR 評估', marker: 'pending', ownerId: 'wang' },
    { item: '預算調整申請', detail: '視方案決定是否提出，目前未啟動', marker: 'pending', ownerId: 'lin' },
  ],
  intent: [
    { label: '期望月薪', value: '12 萬', marker: 'candidate' },
    { label: '洽談意願', value: '願意洽談', marker: 'candidate' },
    { label: '對 8～10 萬的接受度', value: '尚未詢問', marker: 'pending' },
    { label: '來源', value: 'HR 王小姐電話溝通紀錄（10/09）', marker: 'recorded' },
  ],
  sources: [
    {
      id: 'src-job', title: '原職缺：資深後端工程師', kind: '職缺', meta: '職缺 v2・HR 王小姐維護・10/01',
      excerpt: '月薪 8～10 萬。職責：後端服務開發與維運、API 設計、與前端及產品協作。未包含架構設計職責。',
      fields: [
        ['職缺名稱', '資深後端工程師'],
        ['職缺版本', 'v2（10/01 更新）'],
        ['部門', '平台工程部'],
        ['薪資範圍', '月薪 8～10 萬'],
        ['工作內容', '1. 後端服務開發與維運\n2. API 設計與文件維護\n3. 與前端、產品團隊協作'],
        ['未包含', '架構設計職責'],
        ['維護者', 'HR 王小姐'],
      ],
    },
    {
      id: 'src-interview', title: '面試紀錄', kind: '面試紀錄', meta: '技術面試（李工程師）・主管面試（阿哲）・10/07',
      excerpt: '主管面試結論：建議錄用。備註：希望新增架構設計職責，處理系統擴充問題。面試紀錄未包含架構職責的具體範圍。',
      fields: [
        ['技術面試', '10/07 10:00・面試官 李工程師'],
        ['技術面試結論', '通過'],
        ['主管面試', '10/07 14:00・面試官 阿哲'],
        ['主管面試結論', '建議錄用'],
        ['主管備註', '希望新增架構設計職責，處理系統擴充問題。'],
        ['未記載', '架構職責的具體範圍與目標'],
      ],
    },
    {
      id: 'src-intent', title: '候選人意向', kind: '溝通紀錄', meta: 'HR 王小姐電話溝通・10/09',
      excerpt: '期望月薪 12 萬，表示願意洽談。尚未詢問對原職缺薪資範圍的接受度。',
      fields: [
        ['溝通方式', '電話'],
        ['時間', '10/09 15:20'],
        ['記錄者', 'HR 王小姐'],
        ['候選人表達', '期望月薪 12 萬，願意洽談。'],
        ['尚未詢問', '對原職缺薪資範圍（8～10 萬）的接受度'],
      ],
    },
  ],
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
      planIds: ['A', 'B'],
      followUp: { text: '你最希望這位人選在前三個月解決什麼問題？', mentionId: 'zhe' },
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// 林小姐｜產品設計師｜等待候選人回覆（方案已核准，Offer 已寄出）
// ─────────────────────────────────────────────────────────────

const LIN: HiringCase = {
  id: 'r-lin',
  candidate: '林小姐',
  position: '產品設計師',
  status: '等待候選人回覆',
  updatedLabel: '昨天',
  updatedAt: now - 26 * H,
  participantIds: ['agent', 'wang', 'wu', 'chou', 'lin'],
  confirmerId: 'lin',
  version: 'v4',
  versionTime: '10/12 09:45',
  decision: { version: 'v4', time: '10/11 13:40', confirmerId: 'lin', planId: 'D1' },
  summary: [
    { label: '目前方案', value: '已核准（v4）', marker: 'approved' },
    { label: '任用條件', value: '月薪 7.5 萬，10/21 到職', marker: 'approved' },
    { label: '候選人回覆', value: '尚未回覆，期限 10/16', marker: 'pending' },
    { label: '待決事項', value: '候選人是否接受 Offer', marker: 'pending' },
    { label: '下一步', value: '王小姐追蹤候選人回覆', marker: 'pending', ownerId: 'wang' },
  ],
  plans: [
    { id: 'D1', title: '任用方案', position: '產品設計師', salary: '月薪 7.5 萬', scope: '責任依原職缺，10/21 到職', open: '候選人回覆期限 10/16', marker: 'approved' },
  ],
  requirements: [
    { item: '面試評估', detail: '作品集審查、設計實作、主管面試皆已完成；周經理建議錄用', marker: 'recorded', ownerId: 'chou' },
    { item: '任用方案核准', detail: '林主管於 10/11 核准 v4', marker: 'approved', ownerId: 'lin' },
    { item: 'Offer 寄送', detail: '10/11 由王小姐寄出', marker: 'recorded', ownerId: 'wang' },
    { item: '候選人回覆', detail: '期限 10/16，目前尚未回覆', marker: 'pending', ownerId: 'wang' },
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
        ['職缺名稱', '產品設計師'],
        ['職缺版本', 'v1（09/20 建立）'],
        ['部門', '產品設計部'],
        ['薪資範圍', '月薪 6.5～8 萬'],
        ['工作內容', '1. 產品介面與互動設計\n2. 設計系統維護\n3. 使用者研究協作'],
        ['維護者', 'HR 王小姐'],
      ],
    },
    {
      id: 'lin-interview', title: '面試紀錄', kind: '面試紀錄', meta: '設計實作（吳設計師）・主管面試（周經理）・10/08',
      excerpt: '主管面試結論：建議錄用。設計實作評分通過。',
      fields: [
        ['作品集審查', '10/03・通過'],
        ['設計實作', '10/08 10:00・面試官 吳設計師・通過'],
        ['主管面試', '10/08 15:00・面試官 周經理'],
        ['主管面試結論', '建議錄用'],
      ],
    },
    {
      id: 'lin-offer', title: 'Offer 寄送紀錄', kind: 'Offer 紀錄', meta: 'HR 王小姐・10/11',
      excerpt: '依已核准的任用方案 v4 寄出：產品設計師，月薪 7.5 萬，10/21 到職，回覆期限 10/16。',
      fields: [
        ['依據方案', '任用方案 v4（林主管 10/11 13:40 核准）'],
        ['職位', '產品設計師'],
        ['月薪', '7.5 萬'],
        ['到職日', '10/21'],
        ['回覆期限', '10/16'],
        ['寄送者', 'HR 王小姐・10/11 16:05'],
      ],
    },
    {
      id: 'lin-intent', title: '候選人意向', kind: '溝通紀錄', meta: 'HR 王小姐電話溝通・10/12',
      excerpt: '表示會在本週內回覆，目前也在比較另一份 Offer。未提及對薪資的異議。',
      fields: [
        ['溝通方式', '電話'],
        ['時間', '10/12 09:20'],
        ['記錄者', 'HR 王小姐'],
        ['候選人表達', '會在本週內回覆，目前也在比較另一份 Offer。'],
        ['未提及', '對薪資的異議'],
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
    {
      id: 'lin-1', authorId: 'agent', time: '10/11 16:10',
      text: '林主管已核准任用方案 v4，Offer 已由王小姐寄出。候選人回覆期限為 10/16。',
      sources: ['lin-offer'],
      planIds: ['D1'],
    },
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

const CHANG: HiringCase = {
  id: 'r-chang',
  candidate: '張先生',
  position: '資料分析師',
  status: '已核准任用',
  updatedLabel: '10/08',
  updatedAt: now - 5 * 24 * H,
  participantIds: ['agent', 'wang', 'huang', 'lin'],
  confirmerId: 'lin',
  version: 'v3',
  versionTime: '10/08 10:20',
  decision: { version: 'v2', time: '10/06 15:10', confirmerId: 'lin', planId: 'D1' },
  summary: [
    { label: '目前方案', value: '已核准（v2）', marker: 'approved' },
    { label: '任用條件', value: '月薪 6.8 萬，10/20 到職', marker: 'approved' },
    { label: '候選人回覆', value: '已接受（10/07）', marker: 'candidate' },
    { label: '待決事項', value: '筆電與資料平台權限申請', marker: 'pending' },
    { label: '下一步', value: '黃經理安排第一週工作', marker: 'pending', ownerId: 'huang' },
  ],
  plans: [
    { id: 'D1', title: '任用方案', position: '資料分析師', salary: '月薪 6.8 萬', scope: '責任依原職缺，10/20 到職', open: '無', marker: 'approved' },
  ],
  requirements: [
    { item: '任用方案核准', detail: '林主管於 10/06 核准 v2', marker: 'approved', ownerId: 'lin' },
    { item: '候選人接受 Offer', detail: '10/07 以 Email 回覆接受', marker: 'recorded', ownerId: 'wang' },
    { item: '到職文件', detail: '10/08 寄出，候選人已簽回', marker: 'recorded', ownerId: 'wang' },
    { item: '設備與權限', detail: '筆電、資料平台權限申請中', marker: 'pending', ownerId: 'huang' },
    { item: '第一週工作安排', detail: '尚未提供', marker: 'pending', ownerId: 'huang' },
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
      fields: [
        ['依據方案', '任用方案 v2（林主管 10/06 15:10 核准）'],
        ['職位', '資料分析師'],
        ['月薪', '6.8 萬'],
        ['到職日', '10/20'],
        ['寄送者', 'HR 王小姐・10/06 17:30'],
      ],
    },
    {
      id: 'chang-accept', title: '候選人回覆', kind: 'Email', meta: '候選人 Email・10/07',
      excerpt: '接受 Offer，確認 10/20 到職。',
      fields: [
        ['寄件者', '張先生'],
        ['時間', '10/07 11:02'],
        ['內容摘要', '感謝提供機會，接受 Offer，確認 10/20 到職。'],
      ],
    },
  ],
  changeLog: [
    { version: 'v3', time: '10/08 10:20', actor: '王小姐', change: '候選人已接受，進入到職準備', marker: 'candidate' },
    { version: 'v2', time: '10/06 15:10', actor: '林主管', change: '正式核准任用方案：月薪 6.8 萬、10/20 到職', marker: 'approved' },
    { version: 'v1', time: '10/04 17:00', actor: 'Agent', change: '依面試紀錄建立任用討論並提出任用方案', marker: 'agent' },
  ],
  messages: [
    { id: 'chang-1', authorId: 'agent', time: '10/07 18:10', text: '候選人已回覆接受 Offer，表示 10/20 到職。任用方案 v2 已由林主管核准，目前進入到職準備。', sources: ['chang-accept', 'chang-offer'], planIds: ['D1'] },
    { id: 'chang-2', authorId: 'wang', time: '10/08 10:15', text: '到職文件已寄出，候選人也簽回了。' },
    { id: 'chang-3', authorId: 'huang', time: '10/08 10:18', text: '第一週我會安排他先熟悉資料平台。' },
    {
      id: 'chang-4', authorId: 'agent', time: '10/08 10:20',
      text: '已更新共識：到職文件完成。尚待完成的是筆電與資料平台權限申請，以及第一週工作安排。',
      followUp: { text: '第一週的工作安排確定後可以貼在這裡，我會加進到職準備。', mentionId: 'huang' },
    },
  ],
};

export const SEED_CASES: HiringCase[] = [CHEN, LIN, CHANG];

/** 新增任用討論：空白草稿，尚未帶入人選 */
export const makeDraftCase = (id: string): HiringCase => ({
  id,
  candidate: '新任用討論',
  position: '',
  status: '討論草稿',
  updatedLabel: '剛剛',
  updatedAt: Date.now(),
  participantIds: ['agent', CURRENT_USER_ID],
  confirmerId: 'lin',
  version: 'v0',
  versionTime: '',
  summary: [],
  plans: [],
  requirements: [],
  intent: [],
  sources: [],
  changeLog: [],
  messages: [],
});

export const SUGGESTED_ACTIONS = ['整理職位差異', '比較任用方案'];
export const DRAFT_SUGGESTIONS = ['從應徵管理帶入人選', '貼上面試紀錄請 Agent 整理', '建立任用方案草稿'];

/** 模擬 Agent 回覆：不產生新證據、不把任何方案視為核准 */
export const mockAgentReply = (c: HiringCase, text: string, planId?: string): string => {
  const confirmer = personOf(c.confirmerId).name;
  if (c.status === '討論草稿') {
    return '好的。請提供人選姓名與應徵職位，或從應徵管理帶入人選，我會整理面試紀錄與候選人意向，建立目前任用共識。';
  }
  if (planId) {
    const plan = c.plans.find(p => p.id === planId);
    if (plan?.marker === 'approved') {
      return `已記錄你的意見。${plan.title}已於 ${c.decision?.version} 由${confirmer}核准，對話中的意見不會改變已核准內容；若需變更，需重新提出方案並再次核准。`;
    }
    return `已記錄對${plan?.title ?? '此方案'}的意見，共識維持「待決」。提醒：對話中的同意不會視為核准，正式核准需由${confirmer}透過「確認任用方案」操作。`;
  }
  if (text.includes('職位差異')) {
    return c.id === 'r-chen'
      ? '職位差異整理：原職缺為後端服務開發與維運，不含架構設計；阿哲希望新增的是系統擴充相關的架構職責，但目前沒有明確範圍與目標。差異確定後，HR 才能評估是否涉及職等調整。'
      : `${c.position}的已核准方案與原職缺一致，目前沒有職位差異需要處理。`;
  }
  if (text.includes('比較任用方案')) {
    return c.id === 'r-chen'
      ? '兩個方案的關鍵差別在於是否擴大工作責任。方案 A 不需調整預算，但候選人接受度未知；方案 B 需先定義架構職責，才能評估職等與薪酬。兩者目前都缺少阿哲的前三個月工作目標。'
      : `這筆任用只有一個方案，已於 ${c.decision?.version} 由${confirmer}核准，沒有其他方案可比較。`;
  }
  return '已收到並記入討論。這則訊息不會改變目前共識，若需更新共識內容，我會標示為「Agent 建議」待大家確認。';
};
