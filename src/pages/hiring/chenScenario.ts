/**
 * 陳先生｜資深後端工程師 — 可推進的原型情境（任務日誌版）
 *
 * 驗證路徑：
 * 開啟任務日誌 → 阿哲「開始處理」釐清架構責任 → 在對話中補充 → Agent 指出仍缺授權資訊
 * → 補齊後阿哲確認 → 任務完成 → 小芸的「職等與薪酬評估」解除前置等待 → 頂部摘要更新
 * 延伸：小芸完成薪酬評估 → 方案 B 可送核准 → 林主管在「確認任用方案」核准
 *
 * 原則：不自行補出績效證據；完成判定依本案條件與角色權限；只有正式核准才標「已核准」。
 */
import { HiringCase, PlanOption, CaseTask, SummaryItem, SourceDoc, ChatMessage, makeDocs } from './hiringMock';

const H = 60 * 60 * 1000;

// ── 方案（各階段快照） ────────────────────────────────────────

const PLAN_A0: PlanOption = {
  id: 'A', title: '方案 A', position: '維持資深後端工程師', salary: '月薪 8～10 萬', scope: '責任依原職缺',
  solves: '補足後端服務開發與維運人力', support: '不需調整預算；需確認候選人是否接受',
  openIssues: '系統擴充問題仍無專責人選；候選人期望 12 萬', marker: 'agent',
};

const PLAN_B0: PlanOption = {
  id: 'B', title: '方案 B', position: '資深後端工程師，增加架構責任', salary: '職等與薪酬待評估', scope: '工作範圍待阿哲釐清',
  solves: '由專人負責系統擴充（範圍待定）', support: '需職等與薪酬評估；可能需申請預算調整',
  openIssues: '架構責任範圍未定；預算來源未定', marker: 'agent',
};

const PLAN_A1: PlanOption = { ...PLAN_A0, openIssues: '無法涵蓋阿哲確認的架構責任；候選人期望 12 萬' };

const PLAN_B1: PlanOption = {
  ...PLAN_B0,
  scope: '依阿哲確認的工作目標、責任範圍與架構決策權限（共識 v4）',
  solves: '系統擴充有專責人選，責任與權限明確',
  support: '需小芸評估職等與薪酬；可能需申請預算調整',
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

const ARCH_TEMPLATES = [
  {
    label: '補充成果與範圍',
    text: '到職前三個月希望看到的成果：\n1. 完成訂單服務的擴充設計，支援尖峰流量\n2. 規劃既有服務的拆分順序\n負責範圍：訂單與庫存兩個服務的後端架構。',
  },
  {
    label: '補充授權安排',
    text: '架構決策權限：可以決定訂單、庫存服務內部的技術選型與拆分方式；跨服務的介面變更需要我和平台組同意。協作：每週與平台組、前端組同步一次。',
  },
];

const COMP_TEMPLATE = '職等與薪酬評估：依阿哲確認的工作範圍，職責相當於 P5（含架構職責），職等薪資帶 10～12 萬，建議月薪 11 萬，超出原職缺預算每月 1 萬。';

const TASKS_0: CaseTask[] = [
  // ── 本案任務 ──
  {
    id: 't-arch', kind: '本案任務', domain: '任用要求與履行', icon: 'compass',
    title: '釐清架構責任', progressName: '架構責任', doneLabel: '架構責任已釐清', waitName: '工作範圍', purpose: '陳先生需要負責到什麼範圍？這會影響職等與薪酬評估。',
    ownerId: 'zhe', status: '可處理', unlocks: ['t-comp'], confirmerId: 'zhe', confirmVia: 'task', actionLabel: '補充工作範圍', discussKeyword: '架構',
    criteria: [
      { id: 'c-goal', label: '工作目標', hint: '到職前三個月希望看到的成果', state: '仍待補充', keywords: ['目標', '成果', '三個月'], sample: '1. 完成訂單服務的擴充設計，支援尖峰流量\n2. 規劃既有服務的拆分順序' },
      { id: 'c-scope', label: '責任範圍', hint: '負責哪些系統或服務、負責到什麼程度', state: '仍待補充', keywords: ['負責', '範圍', '服務'], sample: '負責訂單與庫存兩個服務的後端架構' },
      { id: 'c-auth', label: '授權安排', hint: '能做哪些架構決策、需要誰同意、與誰協作', state: '仍待補充', keywords: ['決策', '權限', '授權', '同意', '協作'], sample: '可決定兩個服務內部的技術選型與拆分方式；跨服務介面變更需經我和平台組同意；每週與平台組、前端組同步' },
    ],
    conditionSource: '本案條件（本原型示例）：工作目標、責任範圍、授權安排已明確，並由指定角色確認。這些是本案條件，不宣稱為所有公司的固定要求。',
    evidence: ['面試備註：希望處理系統擴充問題（未寫明範圍）'],
    kickoff: '目前已知道希望陳先生改善系統擴充。還需要確認他負責的範圍，以及能做哪些架構決策。阿哲，你可以先描述到職前三個月希望看到的成果，我再協助整理。',
    templates: ARCH_TEMPLATES,
  },
  {
    id: 't-accept', kind: '本案任務', domain: '聘用共識', icon: 'message',
    title: '詢問候選人對方案的接受度', progressName: '候選人接受度', purpose: '候選人期望 12 萬，需確認具體方案是否可行。',
    ownerId: 'yun', status: '尚未啟動', dependsOn: ['t-decide'], startCondition: '任用方案核准後', actionLabel: '詢問候選人', discussKeyword: '接受',
    conditionSource: '本案條件：取得候選人對具體薪酬的回應',
  },
  {
    id: 't-intent', kind: '本案任務', domain: '聘用共識', icon: 'message',
    title: '記錄候選人期望', doneLabel: '候選人期望已記錄', purpose: '了解候選人的期望薪資與洽談意願。',
    ownerId: 'yun', status: '已完成', conditionSource: '本案條件：記錄期望薪資與洽談意願',
    evidence: ['HR 電話溝通紀錄 10/09：期望 12 萬、願意洽談'],
    completion: { time: '10/09 16:30', byId: 'yun', planVersion: 'v2', summary: '期望 12 萬、願意洽談' },
  },
  // ── 制度任務 ──
  {
    id: 't-docs', kind: '制度任務', domain: '任用要求與履行', icon: 'folder',
    title: '準備任用評估資料', progressName: '任用資料', doneLabel: '任用資料已齊備', waitName: '任用資料', purpose: '任用評估與簽核需要完整、合格的候選人資料。',
    ownerId: 'yun', status: '待補充', unlocks: ['t-sign'], actionLabel: '查看缺項', discussKeyword: '任用評估資料',
    docs: makeDocs(15, { 學歷證明: '影本不清晰，需重新提供', 證照影本: '證照已過期，需提供最新版本' }),
    conditionSource: '示例管理辦法：發出任用通知前，評估資料須收齊並通過檢核（份數為示例值，不代表特定公司規定）',
  },
  {
    id: 't-comp', kind: '制度任務', domain: '任用決策', icon: 'scale',
    title: '職等與薪酬評估', progressName: '職等與薪酬評估', doneLabel: '職等與薪酬已評估', waitName: '職等與薪酬評估', purpose: '職務內容變更時須重新評估職等，並確認薪酬是否超出預算。',
    ownerId: 'yun', status: '等待前置', dependsOn: ['t-arch', 't-interview'], unlocks: ['t-decide'], confirmerId: 'yun', confirmVia: 'task', actionLabel: '評估職等與薪酬', discussKeyword: '職等',
    criteria: [
      { id: 'c-grade', label: '職等', hint: '對應的職等', state: '仍待補充', keywords: ['P5', 'P4', 'P6', '職等'], sample: 'P5（含架構職責）' },
      { id: 'c-pay', label: '薪資帶與建議月薪', hint: '職等薪資帶與建議月薪', state: '仍待補充', keywords: ['薪資帶', '月薪'], sample: '職等薪資帶 10～12 萬，建議月薪 11 萬' },
      { id: 'c-budget', label: '預算差額', hint: '是否超出原職缺預算、差多少', state: '仍待補充', keywords: ['預算', '差額', '超出'], sample: '超出原職缺預算每月 1 萬' },
    ],
    conditionSource: '示例管理辦法：職務內容變更須重新評估職等（本原型示例，非特定公司規定）',
    kickoff: '阿哲已確認工作目標、責任範圍與授權安排。評估需要三項：職等、薪資帶與建議月薪、是否超出原職缺預算。小芸，可以依薪酬辦法提出評估，我會協助對照預算。',
    templates: [{ label: '填入評估範例', text: COMP_TEMPLATE }],
  },
  {
    id: 't-decide', kind: '制度任務', domain: '任用決策', icon: 'stamp',
    title: '任用方案核准', progressName: '任用方案', doneLabel: '任用方案已核准', waitName: '方案核准', purpose: '任用條件需由決策者正式核准，對話中的同意不算核准。',
    ownerId: 'lin', status: '等待前置', dependsOn: ['t-comp'], unlocks: ['t-sign', 't-accept'], confirmVia: 'decision', actionLabel: '前往核准', discussKeyword: '核准',
    conditionSource: '示例管理辦法：任用條件須經部門決策者核准',
  },
  {
    id: 't-sign', kind: '制度任務', domain: '任用要求與履行', icon: 'signature',
    title: '準備簽核資料', progressName: '簽核資料', purpose: '彙整核准結果與評估資料，送出任用簽核。',
    ownerId: 'yun', status: '尚未啟動', dependsOn: ['t-decide', 't-docs'], startCondition: '本案任用方向確認後', actionLabel: '準備簽核資料',
    conditionSource: '示例管理辦法：任用簽核須附核准方案與評估資料',
  },
  {
    id: 't-interview', kind: '制度任務', domain: '任用要求與履行', icon: 'clipboard',
    title: '面試評估紀錄', doneLabel: '面試結果已整理', purpose: '任用前需有專業面試與主管面試的書面結論。',
    ownerId: 'zhe', status: '已完成', conditionSource: '示例管理辦法：至少一場專業面試與一場主管面試',
    evidence: ['技術面試（李工程師）通過', '主管面試（阿哲）建議錄用'],
    completion: { time: '10/07 18:00', byId: 'zhe', planVersion: 'v1', summary: '技術、主管面試完成' },
  },
];

// ── 摘要 ─────────────────────────────────────────────────────

const BUDGET: SummaryItem = { label: '原職缺預算', value: '月薪 8～10 萬', marker: 'recorded' };
const EXPECT: SummaryItem = { label: '候選人期望', value: '月薪 12 萬', marker: 'candidate' };

const summaryOf = (plan: SummaryItem, blocker: string, next: Omit<SummaryItem, 'label' | 'marker'>, extras = [BUDGET, EXPECT]): SummaryItem[] => [
  plan, ...extras,
  { label: '待決事項', value: blocker, marker: 'pending' },
  { label: '下一步', marker: 'pending', ...next },
];

// ── 資料來源 ─────────────────────────────────────────────────

const SRC_JOB: SourceDoc = {
  id: 'src-job', title: '原職缺：資深後端工程師', kind: '職缺', meta: '職缺 v2・HR 小芸維護・10/01',
  excerpt: '月薪 8～10 萬。職責：後端服務開發與維運、API 設計、與前端及產品協作。未包含架構設計職責。',
  fields: [
    ['職缺名稱', '資深後端工程師'], ['職缺版本', 'v2（10/01 更新）'], ['薪資範圍', '月薪 8～10 萬'],
    ['工作內容', '1. 後端服務開發與維運\n2. API 設計與文件維護\n3. 與前端、產品團隊協作'], ['未包含', '架構設計職責'], ['維護者', 'HR 小芸'],
  ],
};

const SRC_INTERVIEW: SourceDoc = {
  id: 'src-interview', title: '面試紀錄', kind: '面試紀錄', meta: '技術面試（李工程師）・主管面試（阿哲）・10/07',
  excerpt: '主管面試結論：建議錄用。備註：希望新增架構設計職責，處理系統擴充問題。面試紀錄未包含架構職責的具體範圍。',
  fields: [
    ['技術面試', '10/07 10:00・面試官 李工程師・通過'], ['主管面試', '10/07 14:00・面試官 阿哲'],
    ['主管面試結論', '建議錄用'], ['主管備註', '希望新增架構設計職責，處理系統擴充問題。'], ['未記載', '架構職責的具體範圍與目標'],
  ],
};

const SRC_INTENT: SourceDoc = {
  id: 'src-intent', title: '候選人意向', kind: '溝通紀錄', meta: 'HR 小芸電話溝通・10/09',
  excerpt: '期望月薪 12 萬，表示願意洽談。尚未詢問對原職缺薪資範圍的接受度。',
  fields: [['溝通方式', '電話'], ['時間', '10/09 15:20'], ['記錄者', 'HR 小芸'], ['候選人表達', '期望月薪 12 萬，願意洽談。'], ['尚未詢問', '對原職缺薪資範圍（8～10 萬）的接受度']],
};

// ── 初始案件 ─────────────────────────────────────────────────

export const CHEN_INITIAL: HiringCase = {
  id: 'r-chen',
  candidate: '陳先生',
  position: '資深後端工程師',
  status: '任用評估中',
  updatedLabel: '10:08',
  updatedAt: Date.now() - 1 * H,
  participantIds: ['agent', 'yun', 'lee', 'zhe', 'lin'],
  confirmerId: 'lin',
  version: 'v3',
  versionTime: '10:08',
  summary: summaryOf(
    { label: '目前方案', value: '兩個方案評估中', marker: 'pending' },
    '架構責任尚未明確',
    { value: '阿哲補充工作範圍', ownerId: 'zhe', taskId: 't-arch' },
  ),
  plans: [PLAN_A0, PLAN_B0],
  tasks: TASKS_0,
  suggested: [
    {
      id: 's-alt', kind: '本案任務', domain: '任用決策', icon: 'users', ownerId: 'zhe',
      title: '評估既有團隊能否分擔系統擴充', purpose: '若最後採方案 A，系統擴充需要其他安排。', actionLabel: '評估團隊負擔',
      reason: 'Agent 建議：方案 A 目前沒有處理系統擴充的配套',
    },
    {
      id: 's-panel', kind: '本案任務', domain: '任用要求與履行', icon: 'clipboard', ownerId: 'lee',
      title: '確認是否需要補充架構面談', purpose: '目前面試紀錄未涵蓋架構設計相關的討論。', actionLabel: '確認面談需求',
      reason: 'Agent 建議：若採方案 B，評估依據可能不足',
    },
  ],
  intent: [
    { label: '期望月薪', value: '12 萬', marker: 'candidate' },
    { label: '洽談意願', value: '願意洽談', marker: 'candidate' },
    { label: '對 8～10 萬的接受度', value: '尚未詢問', marker: 'pending' },
    { label: '來源', value: 'HR 小芸電話溝通紀錄（10/09）', marker: 'recorded' },
  ],
  sources: [SRC_JOB, SRC_INTERVIEW, SRC_INTENT],
  changeLog: [
    { version: 'v3', time: '10/13 10:08', actor: 'Agent', change: '新增方案 A／B 比較，目前方案維持「兩個方案評估中」', marker: 'agent' },
    { version: 'v2', time: '10/09 16:30', actor: '小芸', change: '加入候選人期望月薪 12 萬、願意洽談', marker: 'candidate' },
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

// ── 任務完成後的案件變化 ──────────────────────────────────────

type Effect = { next: HiringCase; message?: Omit<ChatMessage, 'id' | 'time' | 'authorId'> };

/** 任務完成時，對共識與方案的影響（任務狀態與解鎖由 caseFlow 處理） */
export const onTaskComplete = (c: HiringCase, taskId: string, time: string): Effect => {
  if (c.id !== 'r-chen') return { next: c };

  if (taskId === 't-arch') {
    return {
      next: {
        ...c,
        version: 'v4', versionTime: time,
        plans: [PLAN_A1, PLAN_B1],
        summary: summaryOf(
          { label: '目前方案', value: '兩個方案評估中', marker: 'pending' },
          '職等與薪酬尚未評估',
          { value: '小芸評估職等與薪酬', ownerId: 'yun', taskId: 't-comp' },
        ),
        changeLog: [{ version: 'v4', time: `今天 ${time}`, actor: '阿哲', change: '確認架構責任：工作目標、責任範圍、授權安排；方案 B 工作範圍更新', marker: 'recorded' }, ...c.changeLog],
      },
      message: {
        text: '方案 B 的工作範圍已依確認內容更新；職等與薪酬仍未評估，兩個方案都還未核准。',
        plans: [PLAN_A1, PLAN_B1],
        followUp: { text: '可以開始評估職等與薪酬了，我已把阿哲確認的範圍整理在任務日誌。', mentionId: 'yun' },
      },
    };
  }

  if (taskId === 't-comp') {
    return {
      next: {
        ...c,
        version: 'v5', versionTime: time,
        plans: [PLAN_A1, PLAN_B2],
        summary: summaryOf(
          { label: '目前方案', value: '方案 B 待核准', marker: 'pending' },
          '方案 B 與預算調整尚未核准',
          { value: '林主管核准任用方案', ownerId: 'lin', taskId: 't-decide' },
        ),
        changeLog: [{ version: 'v5', time: `今天 ${time}`, actor: '小芸', change: '完成職等與薪酬評估：P5、建議月薪 11 萬，超出預算每月 1 萬', marker: 'recorded' }, ...c.changeLog],
      },
      message: {
        text: '方案 B 已具體：資深後端工程師（含架構職責）、P5、月薪 11 萬，需申請每月 1 萬預算調整。候選人期望 12 萬，11 萬是否接受仍待確認。方案 B 已可送交核准，核准前仍為 Agent 建議。',
        plans: [PLAN_A1, PLAN_B2],
        followUp: { text: '請在「確認任用方案」中核准或退回方案 B。對話中的同意不會視為核准。', mentionId: 'lin' },
      },
    };
  }

  return { next: c };
};

/** 林主管在確認視窗核准方案 B */
export const onApprove = (c: HiringCase, time: string): HiringCase | null => {
  if (c.id !== 'r-chen' || !c.plans.some(p => p.id === 'B' && p.confirmable)) return null;
  return {
    ...c,
    version: 'v6', versionTime: time,
    decision: { version: 'v6', time: `今天 ${time}`, confirmerId: 'lin', planId: 'B' },
    plans: [PLAN_B3],
    summary: summaryOf(
      { label: '目前方案', value: '方案 B 已核准（v6）', marker: 'approved' },
      '候選人是否接受 11 萬',
      { value: '小芸詢問候選人接受度', ownerId: 'yun', taskId: 't-accept' },
      [{ label: '任用條件', value: 'P5，月薪 11 萬', marker: 'approved' }, EXPECT],
    ),
    changeLog: [{ version: 'v6', time: `今天 ${time}`, actor: '林主管', change: '正式核准方案 B：P5、月薪 11 萬，含每月 1 萬預算調整', marker: 'approved' }, ...c.changeLog],
  };
};

export const APPROVED_PLAN_B = PLAN_B3;
