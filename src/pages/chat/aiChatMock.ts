/**
 * AI 小助手（對話式前台）假資料。
 * 不打真 API：歷史對話與 AI 回覆全部在前端模擬。
 */

/** 目前登入者（prototype 寫死） */
export const CURRENT_USER = { name: 'Heidi' };

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  /** epoch ms；歷程依此分組排序 */
  updatedAt: number;
  messages: ChatMessage[];
}

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

let seq = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const conv = (title: string, ago: number, pairs: [string, string][]): Conversation => ({
  id: newId('c'),
  title,
  updatedAt: now - ago,
  messages: pairs.flatMap(([q, a]) => [
    { id: newId('m'), role: 'user' as const, content: q },
    { id: newId('m'), role: 'assistant' as const, content: a },
  ]),
});

export const SEED_CONVERSATIONS: Conversation[] = [
  conv('本週出勤異常原因分析', 20 * 60 * 1000, [
    ['幫我看本週出勤異常的主要原因', '本週共有 37 筆出勤異常，主要集中在三類：\n\n1. 忘記打卡（21 筆，57%）— 集中在週一早班\n2. 遲到超過 15 分鐘（11 筆）— 以信義門市最多\n3. 加班未申請（5 筆）\n\n建議先針對週一早班發送打卡提醒，預期可降低一半以上的異常。'],
  ]),
  conv('門市儲備幹部 JD 優化', 3 * 60 * 60 * 1000, [
    ['把門市儲備幹部的職缺描述寫得更吸引人', '以下是調整後的開頭段落：\n\n「從第一線帶人開始，兩年內成為門市店長。」我們提供完整的儲備幹部培訓路徑、每季晉升評核，以及跨店輪調機會。\n\n要我接著把工作內容與福利段落也一起改寫嗎？'],
  ]),
  conv('Q3 人力缺口預測', DAY + 2 * 60 * 60 * 1000, [
    ['預測下一季的人力缺口', '依過去 12 個月的離職率與展店計畫推估，Q3 預計缺口 18 人：門市人員 12 人、倉儲 4 人、行政 2 人。建議 7 月中前啟動門市人員招募。'],
  ]),
  conv('請假政策 Q&A 摘要', DAY + 6 * 60 * 60 * 1000, [
    ['摘要一下特休的規定', '特休依年資計算：滿半年 3 天、滿一年 7 天、滿兩年 10 天，之後逐年遞增，上限 30 天。未休完的天數可於年度結束時折算工資。'],
  ]),
  conv('面試評語大綱', 3 * DAY, [
    ['幫我產生一份面試評語大綱', '面試評語可分四段：\n\n1. 經歷與職缺的相符程度\n2. 溝通與服務態度\n3. 排班彈性與到職時間\n4. 綜合建議（推薦／保留／不推薦）'],
  ]),
  conv('調薪方案預算模擬', 5 * DAY, [
    ['模擬全員調薪 3% 的預算影響', '全員調薪 3% 每月增加人事成本約 NT$ 412,000，全年約 NT$ 4,944,000（含勞健保雇主負擔）。'],
  ]),
  conv('新人到職流程檢查清單', 12 * DAY, [
    ['列出新人到職當天要準備的事', '到職當天檢查清單：\n\n- 帳號與打卡權限開通\n- 勞健保加保\n- 制服與識別證\n- 指派帶班導師\n- 安排第一週班表'],
  ]),
  conv('離職面談重點整理', 40 * DAY, [
    ['整理上個月離職面談的共同原因', '上個月 9 位離職同仁，最常提到的原因依序為：排班不穩定（5 位）、通勤距離（3 位）、薪資（2 位）。'],
  ]),
];

export const SUGGESTIONS = [
  '分析本週出勤異常原因',
  '幫我寫一份門市人員職缺描述',
  '預測下一季人力缺口',
  '摘要公司請假政策',
];

/** 模擬 AI 回覆：依關鍵字挑一段示意內容 */
export const mockReply = (question: string): string => {
  if (/出勤|打卡|遲到/.test(question)) {
    return '我查看了最近的出勤紀錄。異常主要來自「忘記打卡」與「遲到」兩類，集中在週一早班。\n\n建議做法：\n1. 週一早班前 15 分鐘推播打卡提醒\n2. 連續兩週異常的同仁由店長一對一關懷\n\n需要我把名單匯出給各店店長嗎？';
  }
  if (/職缺|JD|描述|招募/.test(question)) {
    return '好的，以下是一份職缺描述草稿：\n\n【門市人員】\n- 負責商品陳列、收銀與顧客服務\n- 可配合輪班，週休二日\n- 提供完整教育訓練與晉升制度\n\n想調整語氣（更活潑／更正式）或補上薪資範圍嗎？';
  }
  if (/人力|缺口|預測/.test(question)) {
    return '依目前在職人數、近 12 個月離職率與展店計畫推估，下一季預計缺口約 15–20 人，以門市人員為主。建議提前 6 週啟動招募。';
  }
  if (/請假|特休|假/.test(question)) {
    return '請假政策重點：特休依年資計算、病假一年 30 日內半薪、事假一年 14 日內不給薪。完整條文可在「表單系統 → 請假申請」查看。';
  }
  return `收到你的問題：「${question.slice(0, 40)}${question.length > 40 ? '…' : ''}」\n\n這是 prototype 的示意回覆，實際上線後會由 AI 小助手依公司資料回答。你可以試著問我出勤、招募、人力預測或請假政策相關問題。`;
};

/** 依新舊分組：今天／昨天／過去 7 天／過去 30 天／更早 */
export const groupLabelOf = (ts: number): string => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  if (ts >= t0) return '今天';
  if (ts >= t0 - DAY) return '昨天';
  if (ts >= t0 - 7 * DAY) return '過去 7 天';
  if (ts >= t0 - 30 * DAY) return '過去 30 天';
  return '更早';
};
