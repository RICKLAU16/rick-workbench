// 数据层：localStorage 持久化 + 示例数据 + 导出/导入
const KEY = 'rick-workbench-v2';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const now = () => new Date().toISOString();
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DEFAULT_SETTINGS = {
  aiProvider: 'deepseek',
  aiKey: '',
  aiEnabled: false,
  dashboardCards: null, // null = 用默认布局
};

// 仪表盘默认卡片布局
export const DEFAULT_DASHBOARD = [
  { id: 'stats-today', type: 'stats', title: '今日概览', visible: true },
  { id: 'tasks-today', type: 'tasks', title: '今日待办', visible: true },
  { id: 'overdue', type: 'overdue', title: '逾期工作', visible: true },
  { id: 'interview-today', type: 'interview-today', title: '今日面试', visible: true },
  { id: 'pending-stages', type: 'pending-stages', title: '待面试 / 待入职', visible: true },
  { id: 'week-done', type: 'week-done', title: '近 7 天完成', visible: true },
  { id: 'my-positions', type: 'positions', title: '我负责的岗位', visible: true },
  { id: 'gantt', type: 'gantt', title: '项目甘特图', visible: true },
];

function seed() {
  const t = now();
  const today = todayStr();
  const cand1 = uid(), cand2 = uid(), cand3 = uid(), cand4 = uid();
  const proj1 = uid(), proj2 = uid(), proj3 = uid();
  const task1 = uid(), task2 = uid(), task3 = uid(), task4 = uid();
  return {
    meta: {
      name: 'Rick工作台',
      createdAt: t,
      changelog: [{
        date: today,
        title: 'V2 聚焦招聘主业',
        desc: '首页改为可自定义仪表盘，新增甘特图、拖拽看板、面试/入职统计。删除工具模块，弱化内容创作。',
        impact: '全站', needAction: '首页卡片可以自行增删排序',
      }],
    },
    settings: { ...DEFAULT_SETTINGS },
    tasks: [
      { id: task1, title: '确认品牌负责人薪酬口径', module: 'candidates', status: 'confirm', due: today, linkedTo: cand1, createdAt: t, updatedAt: t },
      { id: task2, title: '2027校招院校清单初审', module: 'candidates', status: 'doing', due: today, linkedTo: proj1, createdAt: t, updatedAt: t },
      { id: task3, title: '注塑机辅机产品经理 JD 终稿', module: 'candidates', status: 'todo', due: '', linkedTo: proj3, createdAt: t, updatedAt: t },
      { id: task4, title: '跟进入职材料提交情况', module: 'candidates', status: 'todo', due: today, linkedTo: null, createdAt: t, updatedAt: t },
    ],
    candidates: [
      { id: cand1, name: '林示例', role: '品牌负责人', stage: '待面试', project: '品牌负责人', tags: ['品牌策略'], note: '', salary: '', interviewDate: today, onboardDate: '', links: [], history: [{ at: t, text: '完成评估，进入面试安排' }], createdAt: t, updatedAt: t, deleted: false },
      { id: cand2, name: '周示例', role: '品牌负责人', stage: '评估中', project: '品牌负责人', tags: ['活动策划'], note: '', salary: '', interviewDate: '', onboardDate: '', links: [], history: [{ at: t, text: '初筛通过' }], createdAt: t, updatedAt: t, deleted: false },
      { id: cand3, name: '吴示例', role: '高级产品经理（注塑机辅机）', stage: '待面试', project: '注塑机辅机高级产品经理', tags: ['机械', '产品经理'], note: '', salary: '', interviewDate: today, onboardDate: '', links: [], history: [{ at: t, text: '用人部门初面通过' }], createdAt: t, updatedAt: t, deleted: false },
      { id: cand4, name: '郑示例', role: '品牌负责人', stage: 'Offer', project: '品牌负责人', tags: ['整合营销'], note: '', salary: '', interviewDate: '', onboardDate: '', links: [], history: [{ at: t, text: 'Offer 已发，待确认' }], createdAt: t, updatedAt: t, deleted: false },
    ],
    projects: [
      { id: proj1, name: '2027届校园招聘', type: '校招', status: '进行中', version: 'V1', note: '星动力，智造新世界。', links: [],
        phases: [
          { name: '院校清单确认', start: '2026-08-01', end: '2026-08-15', status: '进行中' },
          { name: '宣讲会筹备', start: '2026-08-15', end: '2026-09-10', status: '未开始' },
          { name: '简历投递开放', start: '2026-09-01', end: '2026-10-15', status: '未开始' },
          { name: '面试批次', start: '2026-09-20', end: '2026-11-15', status: '未开始' },
          { name: 'Offer 发放', start: '2026-10-15', end: '2026-12-01', status: '未开始' },
        ], createdAt: t, updatedAt: t },
      { id: proj2, name: '品牌负责人', type: '社招', status: '进行中', version: '', note: '候选池持续评估中。', links: [], phases: [], createdAt: t, updatedAt: t },
      { id: proj3, name: '注塑机辅机高级产品经理', type: '社招', status: '进行中', version: '', note: 'JD 已定稿，寻访中。', links: [], phases: [], createdAt: t, updatedAt: t },
    ],
    contents: [
      { id: uid(), title: 'AI 筛简历的边界在哪里（示例）', platform: '公众号', stage: '选题', publishDate: '', note: '', links: [], createdAt: t, updatedAt: t },
    ],
    inbox: [],
  };
}

let db = null;

// 从 V1 迁移
function migrateV1(old) {
  const d = seed();
  // 保留用户数据
  if (old.tasks) d.tasks = old.tasks.filter(t => t.module !== 'tools' && t.module !== 'content');
  if (old.candidates) d.candidates = old.candidates.map(c => ({ ...c, interviewDate: c.interviewDate || '', onboardDate: c.onboardDate || '' }));
  if (old.projects) d.projects = old.projects.map(p => ({ ...p, phases: p.phases || [] }));
  if (old.contents) d.contents = old.contents;
  if (old.inbox) d.inbox = old.inbox.filter(x => x.suggested !== 'tools');
  if (old.settings) d.settings = { ...DEFAULT_SETTINGS, ...old.settings, dashboardCards: null };
  if (old.meta?.changelog) d.meta.changelog = [...d.meta.changelog, ...old.meta.changelog];
  return d;
}

export function load() {
  if (db) return db;
  // 先试 V2 key
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { db = JSON.parse(raw); return db; }
  } catch (e) { console.error('V2 数据读取失败', e); }
  // 尝试从 V1 迁移
  try {
    const oldRaw = localStorage.getItem('rick-workbench-v1');
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      if (old.meta && Array.isArray(old.tasks)) {
        db = migrateV1(old);
        save();
        return db;
      }
    }
  } catch (e) { console.error('V1 迁移失败', e); }
  db = seed();
  save();
  return db;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    console.error('保存失败', e);
    return false;
  }
}

export function data() { return load(); }
export { uid };

const COLLECTIONS = ['tasks', 'candidates', 'projects', 'contents', 'inbox'];

export function add(coll, item) {
  const d = load();
  const rec = { id: uid(), createdAt: now(), updatedAt: now(), ...item };
  d[coll].unshift(rec);
  save();
  return rec;
}

export function update(coll, id, patch) {
  const d = load();
  const i = d[coll].findIndex(x => x.id === id);
  if (i < 0) return null;
  d[coll][i] = { ...d[coll][i], ...patch, updatedAt: now() };
  save();
  return d[coll][i];
}

export function remove(coll, id) {
  const d = load();
  const i = d[coll].findIndex(x => x.id === id);
  if (i < 0) return false;
  d[coll].splice(i, 1);
  save();
  return true;
}

export function find(coll, id) {
  return load()[coll].find(x => x.id === id) || null;
}

export function searchAll(kw) {
  const d = load();
  const k = kw.trim().toLowerCase();
  if (!k) return [];
  const hit = (s) => (s || '').toString().toLowerCase().includes(k);
  const out = [];
  const fields = {
    tasks: ['title'], candidates: ['name', 'role', 'project', 'note', 'stage'],
    projects: ['name', 'type', 'note', 'status'], contents: ['title', 'platform', 'note', 'stage'],
    inbox: ['content'],
  };
  const labels = { tasks: '任务', candidates: '候选人', projects: '招聘项目', contents: '内容', inbox: '收集箱' };
  for (const coll of COLLECTIONS) {
    for (const item of d[coll]) {
      if (item.deleted) continue;
      const matched = fields[coll].filter(f => hit(item[f]) || (f === 'tags' && (item.tags || []).some(hit)));
      if (matched.length || (item.tags || []).some(hit)) {
        out.push({ coll, collLabel: labels[coll], item });
      }
    }
  }
  return out;
}

export function exportJSON() {
  return JSON.stringify(load(), null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed.meta || !Array.isArray(parsed.tasks)) {
    throw new Error('文件格式不正确：缺少 meta 或 tasks 字段');
  }
  for (const c of COLLECTIONS) if (!Array.isArray(parsed[c])) parsed[c] = [];
  if (!parsed.settings) parsed.settings = { ...DEFAULT_SETTINGS };
  if (!parsed.meta.changelog) parsed.meta.changelog = [];
  db = parsed;
  save();
  return true;
}

export function resetAll() {
  db = seed();
  save();
}

export function stats() {
  const d = load();
  const s = {};
  for (const c of COLLECTIONS) s[c] = d[c].filter(x => !x.deleted).length;
  return s;
}

export function addChangelog(entry) {
  load().meta.changelog.unshift(entry);
  save();
}
