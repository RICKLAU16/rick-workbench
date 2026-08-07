// AI 帮手：内置规则引擎（免费离线）+ 可选大模型（BYOK，直连官方 API）
import { data } from './store.js';

// ---------- 规则引擎 ----------
const RULES = [
  { to: 'candidates', label: '候选池与招聘项目', kw: ['候选人', '简历', '面试', 'offer', '薪酬', '入职', '背调', '猎头', '寻访', '校招', '内推', 'JD'] },
  { to: 'content', label: '内容创作', kw: ['公众号', '选题', '文章', '抖音', '小红书', '视频', '文案', '发布', '涨粉', '爆款'] },
  { to: 'tools', label: '工具与 Skill 开发', kw: ['skill', '脚本', '工具', '自动化', '插件', 'Python', 'API', 'OCR', '网页', '爬虫', '提示词'] },
  { to: 'tasks', label: '今日任务', kw: ['明天', '记得', '提醒', '跟进', '确认', '催', 'ddl', '截止'] },
];

export function suggestFor(text) {
  const t = (text || '').toLowerCase();
  let best = null, bestScore = 0;
  for (const r of RULES) {
    const score = r.kw.reduce((s, k) => s + (t.includes(k.toLowerCase()) ? 1 : 0), 0);
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return best ? { to: best.to, label: best.label, reason: `命中关键词：${best.kw.filter(k => t.includes(k.toLowerCase())).slice(0, 3).join('、')}` } : null;
}

// 今日聚合摘要（纯规则，不依赖大模型）
export function todayBrief() {
  const d = data();
  const today = new Date().toISOString().slice(0, 10);
  const open = d.tasks.filter(x => x.status !== 'done');
  const overdue = open.filter(x => x.due && x.due < today);
  const confirm = open.filter(x => x.status === 'confirm');
  const dueToday = open.filter(x => x.due === today);
  const inboxNew = d.inbox.filter(x => x.status === 'new').length;
  const parts = [];
  if (overdue.length) parts.push(`${overdue.length} 件事已逾期，优先处理`);
  if (confirm.length) parts.push(`${confirm.length} 件事等你拍板`);
  if (dueToday.length) parts.push(`${dueToday.length} 件事今天到期`);
  if (inboxNew) parts.push(`收集箱有 ${inboxNew} 条未归类`);
  if (!parts.length) return '没有逾期和待确认事项，可以从各模块挑一件推进。';
  return parts.join('；') + '。';
}

// ---------- 大模型（BYOK） ----------
const PROVIDERS = {
  deepseek: { name: 'DeepSeek', url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' },
  kimi: { name: 'Kimi', url: 'https://api.moonshot.cn/v1/chat/completions', model: 'kimi-k2-0905-preview' },
};

export function aiReady() {
  const s = data().settings;
  return !!(s.aiEnabled && s.aiKey);
}

export async function askLLM(system, user) {
  const s = data().settings;
  const p = PROVIDERS[s.aiProvider] || PROVIDERS.deepseek;
  if (!s.aiKey) throw new Error('未配置 API Key，请到「设置与数据 → AI 配置」填写');
  const resp = await fetch(p.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.aiKey}` },
    body: JSON.stringify({
      model: p.model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.3,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`${p.name} API 返回 ${resp.status}：${txt.slice(0, 160)}`);
  }
  const json = await resp.json();
  return json.choices?.[0]?.message?.content || '';
}

// 用大模型给收集箱条目归类（返回结构化建议，调用方负责预览确认）
export async function llmClassify(content) {
  const sys = `你是个人工作台的归类助手。把用户随手记录的内容归到以下之一：candidates(招聘/候选人相关)、content(内容创作/公众号/短视频)、tools(工具/脚本/skill开发)、tasks(明确的待办事项)、none(无法判断)。只输出 JSON：{"to":"...","reason":"一句话理由"}`;
  const raw = await askLLM(sys, content);
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('模型返回格式异常');
  const parsed = JSON.parse(m[0]);
  const labelMap = { candidates: '候选池与招聘项目', content: '内容创作', tools: '工具与 Skill 开发', tasks: '今日任务' };
  if (parsed.to === 'none' || !labelMap[parsed.to]) return null;
  return { to: parsed.to, label: labelMap[parsed.to], reason: parsed.reason || '模型建议' };
}

// 工作周报式摘要
export async function llmSummary() {
  const d = data();
  const s = {
    任务: d.tasks.filter(x => x.status !== 'done').map(x => `${x.title}[${x.status}${x.due ? ' 截止' + x.due : ''}]`),
    候选人: d.candidates.filter(x => !x.deleted).map(x => `${x.name}-${x.stage}`),
    项目: d.projects.map(x => `${x.name}(${x.status}${x.version ? ' ' + x.version : ''})`),
    内容: d.contents.map(x => `${x.title}[${x.platform}/${x.stage}]`),
    工具: d.tools.map(x => `${x.name} ${x.version}(${x.status})`),
  };
  const sys = '你是 HR 负责人的工作台助手。根据用户的工作台数据，输出：1) 三条最该优先推进的事及理由；2) 一个可能的风险或遗漏。每条不超过 40 字，直接说事，不要客套。';
  return askLLM(sys, JSON.stringify(s, null, 1));
}
