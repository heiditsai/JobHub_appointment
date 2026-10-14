/**
 * 任用決策空間流程規則
 * - agentTurn：使用者送出訊息後，Agent 回覆並（必要時）推進案件
 * - approvePlan：授權者在確認視窗核准方案（唯一能產生「已核准」的路徑）
 * - suggestionsFor：依案件進度與目前身分，顯示情境建議動作
 */
import { HiringCase, ChatMessage, LIN, CHANG, personOf } from './hiringMock';
import { CHEN_INITIAL, toStage1, toStage2, toApproved, GOALS_TEMPLATE, COMP_TEMPLATE } from './chenScenario';

export const SEED_CASES: HiringCase[] = [CHEN_INITIAL, LIN, CHANG];

type AgentReply = Omit<ChatMessage, 'id' | 'time' | 'authorId'>;

/** 可送交核准的方案（內容具體、尚未核准） */
export const approvablePlan = (c: HiringCase) => c.plans.find(p => p.confirmable && p.marker === 'agent') ?? null;

const genericReply = (c: HiringCase, text: string, planId?: string): string => {
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
  if (text.includes('替代安排')) {
    return '可評估的替代安排：維持方案 A，系統擴充另由現有團隊分擔或短期委外。目前沒有現有團隊負擔與委外成本的資料，需要阿哲提供後才能比較。';
  }
  if (text.includes('@阿哲') && text.includes('目標')) {
    return '已提醒阿哲。工作目標補上後，我會更新本案任務與方案。';
  }
  if (text.includes('@林主管') && text.includes('核准')) {
    return '已提醒林主管。核准需透過「確認任用方案」完成，對話中的同意不會視為核准。';
  }
  if (text.includes('職位差異')) {
    if (c.id === 'r-chen') {
      return c.stage >= 1
        ? '職位差異整理：原職缺為後端服務開發與維運，不含架構設計；阿哲的工作目標新增訂單服務擴充、服務拆分與 API 設計規範，屬於架構職責。是否納入職位，取決於方案 B 是否核准。'
        : '職位差異整理：原職缺為後端服務開發與維運，不含架構設計；阿哲希望新增系統擴充相關的架構職責，但目前沒有明確範圍與目標。差異確定後，HR 才能評估是否涉及職等調整。';
    }
    return `${c.position}的已核准方案與原職缺一致，目前沒有職位差異需要處理。`;
  }
  if (text.includes('比較任用方案')) {
    if (c.plans.length < 2) {
      return c.decision
        ? `這筆任用目前只有一個方案，已於 ${c.decision.version} 由${confirmer}核准，沒有其他方案可比較。`
        : '目前只有一個方案，沒有其他方案可比較。';
    }
    return `方案比較：\n${c.plans.map(p => `・${p.title}：${p.position}，${p.salary}。能解決：${p.solves}。仍待解決：${p.openIssues}。`).join('\n')}\n兩者目前都是 Agent 建議，尚未核准。`;
  }
  if (text.includes('候選人意向')) {
    return `候選人意向整理：\n${c.intent.map(i => `・${i.label}：${i.value}`).join('\n')}\n以上是候選人表達或有紀錄的內容，不代表企業已同意。`;
  }
  if (text.includes('到職準備')) {
    const open = c.tasks.filter(t => t.status !== '已完成');
    return open.length
      ? `到職準備尚有 ${open.length} 項未完成：\n${open.map(t => `・${t.title}（${personOf(t.ownerId).name}，${t.status}）`).join('\n')}`
      : '到職準備的任務都已完成。';
  }
  return '已收到並記入討論。這則訊息不會改變目前共識，若需更新共識內容，我會標示為「Agent 建議」待大家確認。';
};

/** 使用者送出訊息後的 Agent 回合：符合情境條件就推進案件，否則只回覆 */
export const agentTurn = (
  c: HiringCase, authorId: string, text: string, time: string, planId?: string,
): { next: HiringCase; reply: AgentReply } => {
  if (c.id === 'r-chen' && !planId) {
    if (c.stage === 0 && authorId === 'zhe' && text.includes('目標') && !text.includes('@')) return toStage1(c, text, time);
    if (c.stage === 1 && authorId === 'wang' && (text.includes('薪酬') || text.includes('職等')) && !text.includes('@')) return toStage2(c, text, time);
  }
  return { next: c, reply: { text: genericReply(c, text, planId) } };
};

/** 授權者在確認視窗核准方案 */
export const approvePlan = (c: HiringCase, time: string): { next: HiringCase; reply: AgentReply } | null => {
  if (c.id === 'r-chen' && c.stage === 2) return toApproved(c, time);
  return null;
};

// ── 情境建議動作 ──────────────────────────────────────────────

export type SuggestionAction = 'send' | 'fill' | 'confirm' | 'tasks';
export interface Suggestion {
  label: string;
  action: SuggestionAction;
  /** send：直接送出的文字；fill：帶入輸入框的範本 */
  text?: string;
}

const send = (label: string, text = label): Suggestion => ({ label, action: 'send', text });

export const suggestionsFor = (c: HiringCase, userId: string): Suggestion[] => {
  if (c.status === '討論草稿') return [];

  if (c.id === 'r-chen') {
    switch (c.stage) {
      case 0:
        if (userId === 'zhe') return [{ label: '補充工作目標', action: 'fill', text: GOALS_TEMPLATE }, send('評估替代安排', '如果不增加架構責任，系統擴充有沒有其他替代安排？')];
        if (userId === 'wang') return [send('提醒阿哲補充目標', '@阿哲 麻煩補充前三個月工作目標，薪酬評估需要這份資料。'), send('比較任用方案')];
        return [send('比較任用方案'), send('整理職位差異')];
      case 1:
        if (userId === 'wang') return [{ label: '填寫薪酬評估', action: 'fill', text: COMP_TEMPLATE }, send('比較任用方案')];
        if (userId === 'zhe') return [send('比較任用方案'), send('評估替代安排', '如果不增加架構責任，系統擴充有沒有其他替代安排？')];
        return [send('比較任用方案'), send('整理職位差異')];
      case 2:
        if (userId === c.confirmerId) return [{ label: '審核方案 B', action: 'confirm' }, send('比較任用方案')];
        if (userId === 'wang') return [send('提醒林主管核准', '@林主管 方案 B 已可核准，麻煩在「確認任用方案」中處理。'), send('比較任用方案')];
        return [send('比較任用方案')];
      default:
        return [send('整理候選人意向'), { label: '查看工作清單', action: 'tasks' }];
    }
  }

  if (c.id === 'r-chang') return [send('整理到職準備'), { label: '查看工作清單', action: 'tasks' }];
  return [send('整理候選人意向'), { label: '查看工作清單', action: 'tasks' }];
};
