/**
 * 任用工作空間流程規則（任務日誌）
 * - startTask：開始處理任務 → 對話中出現開始事件與 Agent 整理（已知／尚缺）
 * - agentTurn：處理中送出訊息 → Agent 區分「已收到」「仍待補充」「已符合完成條件」
 * - confirmTask：指定角色確認 → 任務完成、記錄適用版本、解鎖前置已全部滿足的任務、留下完成與接棒事件
 * - approve：授權者在確認視窗核准（唯一能產生「已核准」的路徑）
 * - adoptSuggestion：Agent 建議經採納後才進入正式任務
 * 整個案件允許多人並行、反覆調整，不是固定闖關流程。
 */
import { HiringCase, CaseTask, ChatMessage, MessageAction, TaskStatus, LIN, CHANG, personOf, isReadyToConfirm, isWorkable, docStats, docGapText } from './hiringMock';
import { CHEN_INITIAL, onTaskComplete, onApprove } from './chenScenario';

export const SEED_CASES: HiringCase[] = [CHEN_INITIAL, LIN, CHANG];

type NewMessage = Omit<ChatMessage, 'id' | 'time'>;
type MakeId = () => string;

const withMessages = (c: HiringCase, time: string, makeId: MakeId, msgs: NewMessage[]): HiringCase => ({
  ...c,
  updatedLabel: '剛剛',
  updatedAt: Date.now(),
  messages: [...c.messages, ...msgs.map(m => ({ ...m, id: makeId(), time }))],
});

export const approvablePlan = (c: HiringCase) => c.plans.find(p => p.confirmable && p.marker === 'agent') ?? null;

export const nextStep = (c: HiringCase) => c.summary.find(s => s.label === '下一步');

/** 目前焦點：共識「下一步」對應的任務；沒有時取第一個可處理的任務 */
export const focusTask = (c: HiringCase) => {
  const id = nextStep(c)?.taskId;
  return c.tasks.find(t => t.id === id && t.status !== '已完成') ?? c.tasks.find(isWorkable) ?? null;
};

/** 還沒完成的前置任務 */
export const blockingDeps = (c: HiringCase, t: CaseTask) =>
  (t.dependsOn ?? []).map(id => c.tasks.find(x => x.id === id)).filter((x): x is CaseTask => !!x && x.status !== '已完成');

/** 主要動作的具體動詞 */
export const actionOf = (t: CaseTask) => t.actionLabel ?? `處理「${t.title}」`;

/** 你現在可以做的事：自己負責、可立即處理的任務；團隊下一步優先，其次進行中 */
export const personalTasks = (c: HiringCase, userId: string) => {
  const nextId = nextStep(c)?.taskId;
  const rank = (t: CaseTask) => (t.id === nextId ? 0 : t.status === '進行中' || isReadyToConfirm(t) ? 1 : 2);
  const own = c.tasks.filter(t => t.ownerId === userId && isWorkable(t) && t.confirmVia !== 'decision');
  // 授權者：方案可核准時，核准任務也算自己可以做的事
  const decision = c.tasks.find(t => t.confirmVia === 'decision' && t.status === '可處理' && userId === c.confirmerId && approvablePlan(c));
  // 指定確認角色：別人負責但等你確認的任務
  const toConfirm = c.tasks.filter(t => t.ownerId !== userId && t.confirmerId === userId && isReadyToConfirm(t));
  return [...(decision ? [decision] : []), ...toConfirm, ...own].sort((a, b) => rank(a) - rank(b));
};

/** 團隊目前卡點：例如「架構責任尚未明確，等待阿哲補充。」 */
export const teamBlocker = (c: HiringCase) => {
  const blocker = c.summary.find(s => s.label === '待決事項');
  const task = focusTask(c);
  if (!blocker) return null;
  if (!task) return { text: `${blocker.value}。`, task: null };
  const owner = personOf(task.ownerId).name;
  const verb = task.confirmVia === 'decision' ? '核准' : task.docs ? '補齊資料' : isReadyToConfirm(task) ? '確認' : '補充';
  return { text: `${blocker.value}，等待${owner}${verb}。`, task };
};

export const joinAnd = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join('、')}與${items[items.length - 1]}`;

const nameOf = (t: CaseTask) => t.progressName ?? t.title;

/**
 * 本案進展的一行描述：任務名稱＋狀態＋必要的負責人或等待原因
 * 例：「架構責任待阿哲補充」「職等與薪酬評估｜等待工作範圍」「任用資料待補齊｜小芸」
 */
export const progressLine = (c: HiringCase, t: CaseTask): { text: string; status: TaskStatus; sub?: string } => {
  const owner = personOf(t.ownerId).name;
  const name = nameOf(t);
  if (t.status === '已完成') return { text: t.doneLabel ?? `${name}已完成`, status: t.status };
  if (t.status === '等待前置') {
    const blockers = blockingDeps(c, t).map(b => b.waitName ?? nameOf(b));
    return { text: `${name}｜等待${blockers.join('、') || '前置事項'}`, status: t.status };
  }
  if (t.status === '尚未啟動') return { text: `${name}｜${t.startCondition ?? '尚未啟動'}`, status: t.status };
  if (t.confirmVia === 'decision') return { text: `${name}待${owner}核准`, status: t.status };
  if (t.docs) {
    const st = docStats(t.docs);
    return { text: `${name}待補齊｜${owner}`, status: t.status, sub: st.review ? `${st.review} 份已收到・待檢核` : undefined };
  }
  if (isReadyToConfirm(t)) return { text: `${name}待${personOf(t.confirmerId ?? t.ownerId).name}確認`, status: t.status, sub: '已符合完成條件' };
  if (t.criteria) {
    const got = t.criteria.filter(cr => cr.state !== '仍待補充').length;
    return { text: `${name}待${owner}補充`, status: t.status, sub: got ? `已補 ${got} 項・待補 ${t.criteria.length - got} 項` : undefined };
  }
  return { text: `${name}｜${owner}`, status: t.status };
};

/**
 * Agent 給目前使用者的下一步（在中央對話最後一則呈現，附具體按鈕）
 * 依目前使用者、案件狀況與權限產生；團隊脈絡一致，個人動作隨角色調整
 */
export const nextStepFor = (c: HiringCase, userId: string): { text: string; actions: MessageAction[] } | null => {
  if (c.status === '討論草稿' || !c.tasks.length) return null;
  const mine = personalTasks(c, userId)[0];
  const team = teamBlocker(c);
  const teamWaitOther = team?.task && team.task.ownerId !== userId
    ? `${nameOf(team.task)}仍在等${personOf(team.task.ownerId).name}${team.task.confirmVia === 'decision' ? '核准' : '補充'}。`
    : '';
  const unlockText = (t: CaseTask) => {
    const next = (t.unlocks ?? []).map(id => c.tasks.find(x => x.id === id)).filter((x): x is CaseTask => !!x && x.status !== '已完成');
    return next.length ? `，才能繼續${next.map(x => x.actionLabel ?? x.title).join('、')}` : '';
  };

  if (!mine) {
    if (!team?.task) return { text: '目前沒有需要你處理的工作。', actions: [] };
    const actions: MessageAction[] = [{ label: '查看討論', kind: 'discuss', taskId: team.task.id }];
    if (team.task.criteria) actions.push({ label: '協助補充', kind: 'assist', taskId: team.task.id });
    return { text: `目前沒有需要你處理的工作。${team.text}你可以查看討論，或協助補充資料；確認仍由負責人進行。`, actions };
  }
  if (mine.confirmVia === 'decision') {
    return { text: `${teamWaitOther}方案已具體，可以核准了。核准只在確認視窗完成，對話中的同意不算核准。`, actions: [{ label: '前往核准', kind: 'approve', taskId: mine.id }] };
  }
  if (isReadyToConfirm(mine)) {
    return {
      text: `「${mine.title}」已收到${joinAnd(mine.criteria!.map(cr => cr.label))}，符合完成條件。確認後會更新後續工作的等待狀態。`,
      actions: [{ label: '確認完成', kind: 'confirm', taskId: mine.id }],
    };
  }
  if (mine.docs) {
    return {
      text: `${teamWaitOther}你現在可以先補齊${nameOf(mine)}，${docGapText(mine.docs).replace(/^尚有 /, '尚有 ')}。`,
      actions: [
        { label: '查看缺項', kind: 'docs', taskId: mine.id },
        { label: '提供資料', kind: 'provide', taskId: mine.id },
        { label: '詢問要求', kind: 'ask', taskId: mine.id },
      ],
    };
  }
  if (mine.criteria) {
    const got = mine.criteria.filter(cr => cr.state !== '仍待補充').map(cr => cr.label);
    const missing = mine.criteria.filter(cr => cr.state === '仍待補充').map(cr => cr.label);
    return {
      text: got.length
        ? `已補充${joinAnd(got)}；還需要${joinAnd(missing)}${unlockText(mine)}。`
        : `${teamWaitOther}目前需要補充${joinAnd(missing)}${unlockText(mine)}。`,
      actions: [{ label: actionOf(mine), kind: 'draft', taskId: mine.id }],
    };
  }
  return { text: `${teamWaitOther}你可以${actionOf(mine)}。`, actions: [{ label: actionOf(mine), kind: 'start', taskId: mine.id }] };
};

/** 任務日誌（次要入口）：誰在何時更新了什麼、為什麼更新 */
export const historyEntries = (c: HiringCase) => {
  const fromEvents = c.messages.filter(m => m.event).map(m => ({
    key: m.id, time: m.time, who: personOf(m.authorId).name, what: m.event!.title, why: m.event!.detail ?? '', msgId: m.id as string | undefined,
  }));
  const fromLog = c.changeLog.map(l => ({ key: `log-${l.version}`, time: l.time, who: l.actor, what: `共識 ${l.version}`, why: l.change, msgId: undefined }));
  return [...fromEvents.reverse(), ...fromLog];
};

const depLabel = (t: CaseTask) => {
  if (t.docs) {
    const s = docStats(t.docs);
    return `${t.title}（${s.ok}／${s.total} 份符合）`;
  }
  return t.title;
};

// ── 開始處理 ─────────────────────────────────────────────────

export const startTask = (c: HiringCase, taskId: string, userId: string, time: string, makeId: MakeId): HiringCase => {
  const task = c.tasks.find(t => t.id === taskId);
  if (!task || !isWorkable(task)) return c;
  const me = personOf(userId).name;
  const isOwner = task.ownerId === userId;
  const started = { ...c, tasks: c.tasks.map(t => (t.id === taskId ? { ...t, status: '進行中' as const } : t)) };
  const msgs: NewMessage[] = [];
  if (task.status !== '進行中' || !isOwner) {
    msgs.push({
      authorId: userId, text: '',
      event: {
        tone: 'start',
        title: isOwner ? `${me}開始：${actionOf(task)}` : `${me}協助補充「${task.title}」`,
        detail: isOwner ? undefined : `協助提供資料不等於代替${personOf(task.ownerId).name}確認。`,
      },
    });
  }
  msgs.push({
    authorId: 'agent',
    text: task.kickoff ?? `我會協助整理「${task.title}」需要的資料。可以直接描述、上傳資料，或請我分析目前缺什麼。`,
    taskRef: { id: task.id, title: task.title },
    checklist: task.criteria ? { taskId, items: task.criteria.map(cr => ({ label: cr.label, state: cr.state })) } : undefined,
    followUp: task.ownerId !== userId ? { text: `這項任務由你負責，我先把目前的整理放在這裡。`, mentionId: task.ownerId } : undefined,
  });
  return withMessages(started, time, makeId, msgs);
};

// ── Agent 回合 ───────────────────────────────────────────────

const genericReply = (c: HiringCase, text: string, planId?: string): string => {
  const confirmer = personOf(c.confirmerId).name;
  if (c.status === '討論草稿') {
    return '好的。請提供人選姓名與應徵職位，或從應徵管理帶入人選，我會整理面試紀錄與候選人意向，建立目前任用共識與任務日誌。';
  }
  if (planId) {
    const plan = c.plans.find(p => p.id === planId);
    if (plan?.marker === 'approved') {
      return `已記錄你的意見。${plan.title}已於 ${c.decision?.version} 由${confirmer}核准，對話中的意見不會改變已核准內容；若需變更，需重新提出方案並再次核准。`;
    }
    return `已記錄對${plan?.title ?? '此方案'}的意見，共識維持「待決」。提醒：對話中的同意不會視為核准，正式核准需由${confirmer}透過「確認任用方案」操作。`;
  }
  const doc = c.tasks.flatMap(t => t.docs ?? []).find(d => text.includes(`「${d.name}」`));
  if (doc && text.includes('解釋')) {
    return `「${doc.name}」的要求：依${doc.policy}（${doc.policyVersion}），任用評估前需由${doc.provider}提供。目前狀態：${doc.status === '未收到' ? '未收件' : doc.status}${doc.reason ? `，原因：${doc.reason}` : ''}。提交後會先標為「已收到，待檢核」，由檢核者確認是否符合，不會直接算完成。`;
  }
  if (text.includes('例外')) {
    return `已記錄例外申請。例外是否成立需由${confirmer}決定；決定之前，這份資料仍列為缺項，任務日誌不會改變狀態。`;
  }
  if (text.includes('替代安排')) {
    return '可評估的替代安排：維持方案 A，系統擴充另由既有團隊分擔或短期委外。目前沒有既有團隊負擔與委外成本的資料。我已把「評估既有團隊能否分擔系統擴充」放在任務日誌的建議新增，採納後才會成為正式任務。';
  }
  if (text.includes('職位差異')) {
    return c.id === 'r-chen'
      ? '職位差異整理：原職缺為後端服務開發與維運，不含架構設計；方案 B 增加系統擴充相關的架構責任。是否納入職位，取決於架構責任釐清後的職等評估與核准結果。'
      : `${c.position}的已核准方案與原職缺一致，目前沒有職位差異需要處理。`;
  }
  if (text.includes('比較任用方案')) {
    if (c.plans.length < 2) {
      return c.decision ? `這筆任用目前只有一個方案，已於 ${c.decision.version} 由${confirmer}核准。` : '目前只有一個方案，沒有其他方案可比較。';
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
  return '已收到並記入討論。這則訊息不會改變目前共識；若需要更新共識或新增任務，我會先標成建議，等大家確認。';
};

/** 處理中的任務：依訊息內容判斷哪些條件已收到、還缺什麼 */
const taskReply = (c: HiringCase, task: CaseTask, authorId: string, text: string, time: string, userMsgId: string, criteriaIds?: string[]) => {
  const criteria = task.criteria!;
  const missingBefore = criteria.filter(cr => cr.state === '仍待補充');
  // 中央草稿：依填寫的欄位判定；自由輸入：依內容判定（原型以關鍵字模擬）
  const matched = missingBefore.filter(cr => (criteriaIds ? criteriaIds.includes(cr.id) : cr.keywords.some(k => text.includes(k))));
  const owner = personOf(task.ownerId).name;
  const confirmer = task.confirmerId ? personOf(task.confirmerId).name : owner;

  if (!matched.length) {
    const replyText = text.includes('分析')
      ? `目前整理：${criteria.filter(cr => cr.state !== '仍待補充').map(cr => cr.label).join('、') || '尚無'}已收到；仍待補充：${missingBefore.map(cr => `${cr.label}（${cr.hint}）`).join('、') || '無'}。`
      : `這則訊息還沒有提到${missingBefore.map(cr => cr.label).join('、')}。可以直接描述、上傳相關文件，或請我分析目前缺什麼。`;
    return { next: c, reply: { text: replyText, taskRef: { id: task.id, title: task.title }, checklist: { taskId: task.id, items: criteria.map(cr => ({ label: cr.label, state: cr.state })) } } };
  }

  const matchedIds = new Set(matched.map(m => m.id));
  let updated = criteria.map(cr => (matchedIds.has(cr.id) ? { ...cr, state: '已收到' as const } : cr));
  const stillMissing = updated.filter(cr => cr.state === '仍待補充');
  if (!stillMissing.length) updated = updated.map(cr => ({ ...cr, state: '已符合' as const }));

  const author = personOf(authorId).name;
  const nextTask: CaseTask = {
    ...task,
    criteria: updated,
    evidence: [...(task.evidence ?? []), `${author} ${time} 補充：${matched.map(m => m.label).join('、')}`],
    evidenceMsgIds: [...(task.evidenceMsgIds ?? []), userMsgId],
  };
  const labels = matched.map(m => m.label).join('、');
  const replyText = stillMissing.length
    ? `${labels}已補充，還需要確認${stillMissing.map(cr => `${cr.label}（${cr.hint}）`).join('、')}。任務保留目前進展，補齊後再請${confirmer}確認。`
    : `${labels}已補充。${updated.length} 項條件都已收到，依本案條件判斷已符合完成條件。${confirmer}確認後，這項任務就會完成。`;

  return {
    next: { ...c, tasks: c.tasks.map(t => (t.id === task.id ? nextTask : t)) },
    reply: { text: replyText, taskRef: { id: task.id, title: task.title }, checklist: { taskId: task.id, items: updated.map(cr => ({ label: cr.label, state: cr.state })) } },
  };
};

export const agentTurn = (
  c: HiringCase, authorId: string, text: string, time: string,
  opts: { planId?: string; taskId?: string; userMsgId: string; criteriaIds?: string[] },
): { next: HiringCase; reply: Omit<ChatMessage, 'id' | 'time' | 'authorId'> } => {
  const task = opts.taskId ? c.tasks.find(t => t.id === opts.taskId) : undefined;
  if (task?.criteria && task.status === '進行中' && !opts.planId) return taskReply(c, task, authorId, text, time, opts.userMsgId, opts.criteriaIds);
  const intent = !opts.planId ? intentReply(c, authorId, text) : null;
  if (intent) return { next: c, reply: intent };
  return { next: c, reply: { text: genericReply(c, text, opts.planId), taskRef: task ? { id: task.id, title: task.title } : undefined } };
};

/**
 * 自然語言操作：「@Agent 我先處理任用資料，幫我列出缺什麼。」
 * 回覆內附與按鈕相同的動作，指向同一筆任務、更新同一份資料
 */
const intentReply = (c: HiringCase, authorId: string, text: string): Omit<ChatMessage, 'id' | 'time' | 'authorId'> | null => {
  const docsTask = c.tasks.find(t => t.docs && t.status !== '已完成');
  const doc = docsTask?.docs?.find(d => text.includes(`「${d.name}」`));
  if (docsTask && !doc && (text.includes('缺什麼') || (text.includes('資料') && (text.includes('列出') || text.includes('要求'))))) {
    const gaps = docsTask.docs!.filter(d => d.status === '未收到' || d.status === '待修正');
    const review = docsTask.docs!.filter(d => d.status === '待檢核');
    const asking = text.includes('要求') && !text.includes('缺什麼');
    return {
      text: asking
        ? `「${docsTask.title}」依${docsTask.docs![0].policy}（${docsTask.docs![0].policyVersion}）：發出任用通知前，${docsTask.docs!.length} 份資料須收齊並通過檢核。${docGapText(docsTask.docs!)}。提交後會先標為「已收到，待檢核」。`
        : `「${docsTask.title}」${docGapText(docsTask.docs!)}：\n${gaps.map(d => `・${d.name}（${d.provider}）${d.status === '待修正' ? `待補正：${d.reason}` : '未收到'}`).join('\n')}${review.length ? `\n另有 ${review.length} 份已收到、等待檢核。` : ''}`,
      taskRef: { id: docsTask.id, title: docsTask.title },
      actions: [
        { label: '查看缺項', kind: 'docs', taskId: docsTask.id },
        { label: '提供資料', kind: 'provide', taskId: docsTask.id },
      ],
    };
  }
  const scopeTask = c.tasks.find(t => t.criteria && isWorkable(t) && (text.includes(t.progressName ?? t.title) || (t.actionLabel && text.includes(t.actionLabel.replace(/^補充/, '')))));
  if (scopeTask) {
    const missing = scopeTask.criteria!.filter(cr => cr.state === '仍待補充').map(cr => cr.label);
    const isOwner = scopeTask.ownerId === authorId;
    return {
      text: missing.length
        ? `「${scopeTask.title}」還需要${joinAnd(missing)}。${isOwner ? '可以直接在下方草稿補充，也可以自由描述。' : `由${personOf(scopeTask.ownerId).name}負責，你可以協助補充，最後由負責人確認。`}`
        : `「${scopeTask.title}」已符合完成條件，等待${personOf(scopeTask.confirmerId ?? scopeTask.ownerId).name}確認。`,
      taskRef: { id: scopeTask.id, title: scopeTask.title },
      actions: missing.length ? [{ label: isOwner ? actionOf(scopeTask) : '協助補充', kind: isOwner ? 'draft' : 'assist', taskId: scopeTask.id }] : [],
    };
  }
  return null;
};

// ── 完成與解鎖 ───────────────────────────────────────────────

/** 標記完成、記錄適用版本，並解鎖「所有前置都已滿足」的任務 */
const completeAndUnlock = (c: HiringCase, taskId: string, byId: string, time: string, summary: string) => {
  const planVersion = c.version;
  let tasks = c.tasks.map(t => (t.id === taskId ? { ...t, status: '已完成' as const, completion: { time: `今天 ${time}`, byId, planVersion, summary } } : t));
  const after = { ...c, tasks };
  const unlocked: string[] = [];
  const stillBlocked: string[] = [];
  tasks = tasks.map(t => {
    if (!t.dependsOn?.includes(taskId) || t.status === '已完成') return t;
    const remaining = blockingDeps(after, t);
    if (remaining.length) {
      stillBlocked.push(`「${t.title}」仍在等待：${remaining.map(r => depLabel(r)).join('、')}`);
      return t;
    }
    if (t.status === '等待前置' || t.status === '尚未啟動') {
      const deps = (t.dependsOn ?? []).map(id => after.tasks.find(x => x.id === id)?.title).filter(Boolean);
      unlocked.push(deps.length > 1 ? `${t.title}（已檢查前置：${deps.join('、')}皆已完成）` : t.title);
      return { ...t, status: '可處理' as const };
    }
    return t;
  });
  return { next: { ...c, tasks }, unlocked, stillBlocked };
};

const COMPLETE_COPY: Record<string, { title: string; detail: string }> = {
  't-arch': { title: '架構責任已釐清', detail: '已補齊職等與薪酬評估所需的工作範圍。' },
  't-comp': { title: '職等與薪酬已評估', detail: '方案 B 已具體：P5、建議月薪 11 萬，可送交核准。' },
};

export const confirmTask = (c: HiringCase, taskId: string, userId: string, time: string, makeId: MakeId): HiringCase => {
  const task = c.tasks.find(t => t.id === taskId);
  if (!task) return c;
  // 有完成條件：需全部符合，並由指定角色確認；沒有完成條件的一般任務：由負責人標記完成
  const canConfirm = task.criteria
    ? isReadyToConfirm(task) && task.confirmerId === userId
    : task.status === '進行中' && !task.docs && task.confirmVia !== 'decision' && task.ownerId === userId;
  if (!canConfirm) return c;
  const copy = COMPLETE_COPY[taskId] ?? { title: `${task.title}已完成`, detail: '' };
  const { next: done, unlocked, stillBlocked } = completeAndUnlock(c, taskId, userId, time, copy.detail || copy.title);
  const { next: affected, message } = onTaskComplete(done, taskId, time);
  const step = nextStep(affected);
  const detail = [copy.detail, unlocked.length ? `「${unlocked.join('」「')}」已解除前置等待。` : '', ...stillBlocked.map(s => `${s}。`)].filter(Boolean).join('');
  const msgs: NewMessage[] = [{
    authorId: userId, text: '',
    event: { tone: 'complete', title: copy.title, detail, next: step ? `下一步：${step.value}。` : undefined, evidenceMsgIds: task.evidenceMsgIds },
  }];
  if (message) msgs.push({ authorId: 'agent', ...message });
  return withMessages(affected, time, makeId, msgs);
};

// ── 正式核准 ─────────────────────────────────────────────────

export const approve = (c: HiringCase, userId: string, time: string, makeId: MakeId): HiringCase => {
  if (userId !== c.confirmerId) return c;
  const approved = onApprove(c, time);
  if (!approved) return c;
  const decideTask = approved.tasks.find(t => t.confirmVia === 'decision' && t.status !== '已完成');
  const { next, unlocked, stillBlocked } = decideTask
    ? completeAndUnlock(approved, decideTask.id, userId, time, `核准方案 B（${approved.version}）`)
    : { next: approved, unlocked: [], stillBlocked: [] };
  const step = nextStep(next);
  return withMessages(next, time, makeId, [{
    authorId: userId, text: '',
    event: {
      tone: 'approve',
      title: `${personOf(userId).name}已核准方案 B（${approved.version}）`,
      detail: ['正式任用條件：資深後端工程師（含架構職責）、P5、月薪 11 萬；每月 1 萬預算調整一併核准。',
        unlocked.length ? `「${unlocked.join('」「')}」已解除前置等待。` : '', ...stillBlocked.map(s => `${s}。`)].filter(Boolean).join(''),
      next: step ? `下一步：${step.value}。` : undefined,
    },
  }]);
};

// ── 建議新增 ─────────────────────────────────────────────────

export const adoptSuggestion = (c: HiringCase, id: string, userId: string, time: string, makeId: MakeId): HiringCase => {
  const s = c.suggested.find(x => x.id === id);
  if (!s) return c;
  const task: CaseTask = {
    id: `t-${s.id}`, kind: s.kind, domain: s.domain, icon: s.icon, title: s.title, purpose: s.purpose, ownerId: s.ownerId,
    status: '可處理', actionLabel: s.actionLabel, conditionSource: `本案條件：由${personOf(userId).name}採納 Agent 建議後新增（${time}）`,
  };
  return withMessages(
    { ...c, suggested: c.suggested.filter(x => x.id !== id), tasks: [...c.tasks, task] },
    time, makeId,
    [{ authorId: userId, text: '', event: { tone: 'adopt', title: `${personOf(userId).name}採納了 Agent 建議：${s.title}`, detail: `已加入本案任務，負責人：${personOf(s.ownerId).name}。` } }],
  );
};

export const dismissSuggestion = (c: HiringCase, id: string): HiringCase => ({ ...c, suggested: c.suggested.filter(x => x.id !== id) });

// ── 提供資料（只到「已收到，待檢核」） ───────────────────────────

export const provideDoc = (c: HiringCase, taskId: string, docName: string, userId: string, time: string, makeId: MakeId): HiringCase => {
  const task = c.tasks.find(t => t.id === taskId);
  const doc = task?.docs?.find(d => d.name === docName);
  if (!task || !doc || (doc.status !== '未收到' && doc.status !== '待修正')) return c;
  const me = personOf(userId).name;
  const docs = task.docs!.map(d => (d.name === docName ? { ...d, status: '待檢核' as const, reason: `${me} ${time} 提供，等待檢核` } : d));
  const nextTask: CaseTask = { ...task, docs, evidence: [...(task.evidence ?? []), `${me} ${time} 提供「${docName}」（待檢核）`] };
  return withMessages(
    { ...c, tasks: c.tasks.map(t => (t.id === taskId ? nextTask : t)) },
    time, makeId,
    [{ authorId: userId, text: '', event: { tone: 'submit', title: `${me}提供了「${docName}」：已收到，待檢核`, detail: `${task.title}：${docGapText(docs)}。` } }],
  );
};

// ── 情境建議動作 ──────────────────────────────────────────────

export type SuggestionAction = 'send' | 'fill' | 'confirm' | 'start' | 'confirmTask' | 'upload' | 'docs';
export interface Suggestion {
  label: string;
  action: SuggestionAction;
  text?: string;
  taskId?: string;
}

const send = (label: string, text = label): Suggestion => ({ label, action: 'send', text });

export const suggestionsFor = (c: HiringCase, userId: string, workingTaskId: string | null): Suggestion[] => {
  if (c.status === '討論草稿') return [];

  const working = workingTaskId ? c.tasks.find(t => t.id === workingTaskId) : null;
  if (working && working.status === '進行中') {
    const list: Suggestion[] = [];
    if (isReadyToConfirm(working) && working.confirmerId === userId) list.push({ label: `確認完成：${working.title}`, action: 'confirmTask', taskId: working.id });
    if (working.ownerId === userId && !isReadyToConfirm(working)) {
      (working.templates ?? []).forEach(t => list.push({ label: t.label, action: 'fill', text: t.text }));
    }
    list.push(send('請 Agent 分析目前缺什麼', '請 Agent 分析目前缺什麼'));
    list.push({ label: '上傳資料', action: 'upload' });
    return list;
  }

  const list: Suggestion[] = [];
  if (c.id === 'r-chen') list.push(send('比較任用方案'), send('評估替代安排', '如果不增加架構責任，系統擴充有沒有其他替代安排？'));
  else if (c.id === 'r-chang') list.push(send('整理到職準備'));
  else list.push(send('整理候選人意向'));
  return list;
};
