/**
 * JobHub 任用決策空間 — 模擬資料
 * 不打真 API；所有人員、紀錄、共識與訊息皆為示意。
 * 原則：不自行補出績效證據；任何方案都不呈現為已核准。
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
];

/** 目前登入者：HR 王小姐（非授權確認者） */
export const CURRENT_USER_ID: string = 'wang';
/** 企業授權的正式確認者 */
export const AUTHORIZED_CONFIRMER_ID: string = 'lin';

export const personOf = (id: string) => PARTICIPANTS.find(p => p.id === id)!;

// ── 左側任用紀錄 ──────────────────────────────────────────────

export type RecordStatus = '任用評估中' | '等待候選人回覆' | '已確認任用';

export interface HiringRecord {
  id: string;
  candidate: string;
  position: string;
  status: RecordStatus;
  updatedLabel: string;
}

export const HIRING_RECORDS: HiringRecord[] = [
  { id: 'r-chen', candidate: '陳先生', position: '資深後端工程師', status: '任用評估中', updatedLabel: '10:08' },
  { id: 'r-lin', candidate: '林小姐', position: '產品設計師', status: '等待候選人回覆', updatedLabel: '昨天' },
  { id: 'r-chang', candidate: '張先生', position: '資料分析師', status: '已確認任用', updatedLabel: '10/08' },
];

// ── 標示（Agent 建議／待決／已確認） ───────────────────────────

export type Marker = 'agent' | 'pending' | 'confirmed';

export const MARKER_LABEL: Record<Marker, string> = {
  agent: 'Agent 建議',
  pending: '待決',
  confirmed: '已確認',
};

// ── 目前任用共識 ──────────────────────────────────────────────

export const CONSENSUS_VERSION = 'v3';

export interface SummaryItem {
  label: string;
  value: string;
  marker: Marker;
  /** 下一步負責人 */
  ownerId?: string;
}

export const CONSENSUS_SUMMARY: SummaryItem[] = [
  { label: '目前方案', value: '尚未確認', marker: 'pending' },
  { label: '原職缺預算', value: '月薪 8～10 萬', marker: 'confirmed' },
  { label: '候選人期望', value: '月薪 12 萬', marker: 'confirmed' },
  { label: '待決事項', value: '是否增加架構責任並調整職位', marker: 'pending' },
  { label: '下一步', value: '阿哲補充前三個月工作目標', marker: 'pending', ownerId: 'zhe' },
];

export interface PlanOption {
  id: 'A' | 'B';
  title: string;
  position: string;
  salary: string;
  scope: string;
  open: string;
}

export const PLANS: PlanOption[] = [
  {
    id: 'A',
    title: '方案 A',
    position: '維持資深後端工程師',
    salary: '月薪 8～10 萬',
    scope: '責任依原職缺',
    open: '候選人是否接受待確認',
  },
  {
    id: 'B',
    title: '方案 B',
    position: '增加架構責任',
    salary: '職等與薪酬待評估',
    scope: '先明確工作範圍',
    open: '再判斷是否申請預算調整',
  },
];

export interface Requirement {
  item: string;
  detail: string;
  marker: Marker;
  ownerId?: string;
}

/** 任用要求與履行狀態 */
export const REQUIREMENTS: Requirement[] = [
  { item: '面試評估', detail: '技術面試、主管面試皆已完成；阿哲建議錄用', marker: 'confirmed', ownerId: 'zhe' },
  { item: '前三個月工作目標', detail: '尚未提供，為判斷是否增加架構責任的依據', marker: 'pending', ownerId: 'zhe' },
  { item: '架構設計職責範圍', detail: '是否納入職位、需負責到什麼程度', marker: 'pending', ownerId: 'zhe' },
  { item: '職等與薪酬評估', detail: '待工作範圍明確後由 HR 評估', marker: 'pending', ownerId: 'wang' },
  { item: '預算調整申請', detail: '視方案決定是否提出，目前未啟動', marker: 'pending', ownerId: 'lin' },
];

export const CANDIDATE_INTENT = [
  { label: '期望月薪', value: '12 萬', marker: 'confirmed' as Marker },
  { label: '洽談意願', value: '已表達願意洽談', marker: 'confirmed' as Marker },
  { label: '對方案 A（8～10 萬）的接受度', value: '尚未詢問', marker: 'pending' as Marker },
  { label: '來源', value: 'HR 王小姐電話溝通紀錄（10/09）', marker: 'confirmed' as Marker },
];

export interface SourceDoc {
  id: string;
  title: string;
  meta: string;
  excerpt: string;
}

/** 資料來源（「查看依據」也引用這些） */
export const SOURCES: SourceDoc[] = [
  {
    id: 'src-job',
    title: '原職缺：資深後端工程師',
    meta: '職缺 v2・HR 王小姐維護・10/01',
    excerpt: '月薪 8～10 萬。職責：後端服務開發與維運、API 設計、與前端及產品協作。未包含架構設計職責。',
  },
  {
    id: 'src-interview',
    title: '面試紀錄',
    meta: '技術面試（李工程師）・主管面試（阿哲）・10/07',
    excerpt: '主管面試結論：建議錄用。備註：希望新增架構設計職責，處理系統擴充問題。面試紀錄未包含架構職責的具體範圍。',
  },
  {
    id: 'src-intent',
    title: '候選人意向',
    meta: 'HR 王小姐電話溝通・10/09',
    excerpt: '期望月薪 12 萬，表示願意洽談。尚未詢問對原職缺薪資範圍的接受度。',
  },
];

export interface ChangeLog {
  version: string;
  time: string;
  actor: string;
  change: string;
  marker: Marker;
}

export const CHANGE_LOG: ChangeLog[] = [
  { version: 'v3', time: '10/13 10:08', actor: 'Agent', change: '新增方案 A／B 比較，目前方案維持「尚未確認」', marker: 'agent' },
  { version: 'v2', time: '10/09 16:30', actor: '王小姐', change: '加入候選人期望月薪 12 萬、願意洽談', marker: 'confirmed' },
  { version: 'v1', time: '10/07 18:00', actor: 'Agent', change: '依面試紀錄建立任用討論，阿哲建議錄用', marker: 'confirmed' },
];

// ── 對話 ─────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  authorId: string;
  time: string;
  text: string;
  /** Agent 訊息附「查看依據」 */
  sources?: string[];
  /** Agent 訊息內嵌方案比較卡 */
  withPlans?: boolean;
  /** 卡片後接續的提問 */
  followUp?: { text: string; mentionId: string };
  /** 回覆的方案 */
  replyToPlan?: 'A' | 'B';
}

export const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    authorId: 'agent',
    time: '10:02',
    text: '已整理面試結果：阿哲建議錄用，並希望新增架構設計職責；候選人期望月薪 12 萬，已表達願意洽談。新增職責可能影響職等與薪酬評估。',
    sources: ['src-interview', 'src-intent'],
  },
  { id: 'm2', authorId: 'zhe', time: '10:05', text: '他值得 12 萬，我希望他處理系統擴充問題。' },
  { id: 'm3', authorId: 'lin', time: '10:06', text: '原職缺預算只有 10 萬。' },
  {
    id: 'm4',
    authorId: 'agent',
    time: '10:08',
    text: '目前分歧涉及工作責任與預算限制。架構責任尚未明確，現有資料不足以支持提高預算。建議先比較兩個方案，再確認工作目標。',
    sources: ['src-job', 'src-interview', 'src-intent'],
    withPlans: true,
    followUp: { text: '你最希望這位人選在前三個月解決什麼問題？', mentionId: 'zhe' },
  },
];

export const SUGGESTED_ACTIONS = ['整理職位差異', '比較任用方案'];

/** 模擬 Agent 回覆：不產生新證據、不把任何方案視為核准 */
export const mockAgentReply = (text: string, plan?: 'A' | 'B'): string => {
  if (plan) {
    return `已記錄對方案 ${plan} 的意見，共識維持「待決」。提醒：對話中的同意不會視為核准，正式確認需由林主管透過「確認任用方案」操作。`;
  }
  if (text.includes('職位差異')) {
    return '職位差異整理：原職缺為後端服務開發與維運，不含架構設計；阿哲希望新增的是系統擴充相關的架構職責，但目前沒有明確範圍與目標。差異確定後，HR 才能評估是否涉及職等調整。';
  }
  if (text.includes('比較任用方案')) {
    return '兩個方案的關鍵差別在於是否擴大工作責任。方案 A 不需調整預算，但候選人接受度未知；方案 B 需先定義架構職責，才能評估職等與薪酬。兩者目前都缺少阿哲的前三個月工作目標。';
  }
  return '已收到並記入討論。這則訊息不會改變目前共識，若需更新共識內容，我會標示為「Agent 建議」待大家確認。';
};
