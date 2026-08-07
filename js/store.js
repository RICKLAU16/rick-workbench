// 数据层：localStorage 持久化 + 示例数据 + 导出/导入
const KEY = 'rick-workbench-v1';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const now = () => new Date().toISOString();
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DEFAULT_SETTINGS = {
  aiProvider: 'deepseek',   // deepseek | kimi
  aiKey: '',
  aiEnabled: false,
};

function seed() {
  const t = now();
  const cand1 = uid(), cand2 = uid(), proj1 = uid(), proj2 = uid(), task1 = uid(), task2 = uid(), task3 = uid();
  return {
    meta: {
      name: 'Rick工作台',
      createdAt: t,
      changelog: [{
        date: todayStr(),
        title: 'V1 首次上线',
        desc: '今日、候选池与招聘项目、内容创作、工具开发、收集箱、搜索、AI 帮手、设置与数据全部可用。数据保存在本机浏览器。',
        impact: '全站', needAction: '建议在设置中导出一次备份，熟悉备份流程',
      }],
    },
    settings: { ...DEFAULT_SETTINGS },
    // 任务：今日页的聚合来源。module 标记归属模块，status: todo/doing/confirm/done
    tasks: [
      { id: task1, title: '确认品牌经理岗位薪酬口径（示例）', module: 'candidates', status: 'confirm', due: todayStr(), linkedTo: cand1, createdAt: t, updatedAt: t },
      { id: task2, title: '公众号本周选题定稿（示例）', module: 'content', status: 'doing', due: todayStr(), linkedTo: null, createdAt: t, updatedAt: t },
      { id: task3, title: '评审 skill 推广反馈（示例）', module: 'tools', status: 'todo', due: '', linkedTo: null, createdAt: t, updatedAt: t },
    ],
    // 候选人（示例数据，全部虚构）
    candidates: [
      { id: cand1, name: '林示例', role: '品牌经理', stage: '待面试', project: '品牌经理招聘', tags: ['公众号运营', 'B2B'], note: '作品集扎实，薪酬预期待对齐。', salary: '', links: [], history: [{ at: t, text: '完成简历评估，进入面试安排' }], createdAt: t, updatedAt: t, deleted: false },
      { id: cand2, name: '周示例', role: '品牌经理', stage: '评估中', project: '品牌经理招聘', tags: ['活动策划'], note: '等待作品集补充。', salary: '', links: [], history: [{ at: t, text: '初筛通过' }], createdAt: t, updatedAt: t, deleted: false },
    ],
    // 招聘项目
    projects: [
      { id: proj1, name: '品牌经理招聘', type: '社招', status: '进行中', version: '', note: '候选池持续评估中。', links: [], createdAt: t, updatedAt: t },
      { id: proj2, name: '星动力校招', type: '校招', status: '规划中', version: 'V1', note: '2027 届规划已出 V1。', links: [], createdAt: t, updatedAt: t },
    ],
    // 内容创作
    contents: [
      { id: uid(), title: 'AI 筛简历的边界在哪里（示例选题）', platform: '公众号', stage: '选题', publishDate: '', note: '从一次误判案例切入。', links: [], createdAt: t, updatedAt: t },
    ],
    // 工具与 Skill
    tools: [
      { id: uid(), name: '示例·简历评估助手', version: 'v1.0.0', status: '已落地', note: '待收集使用反馈。', links: [], history: [{ at: t, text: 'v1.0.0 发布' }], createdAt: t, updatedAt: t },
    ],
    // 收集箱。kind: text/link/task/file；status: new/sorted/archived
    inbox: [
      { id: uid(), kind: 'text', content: '示例：把面试评估表做成在线填写，自动汇总评分', status: 'new', suggested: 'tools', createdAt: t },
    ],
  };
}

let db = null;

export function load() {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    db = raw ? JSON.parse(raw) : seed();
  } catch (e) {
    console.error('数据读取失败，使用全新数据', e);
    db = seed();
    save();
    return db;
  }
  if (!raw_exists()) save();
  return db;
}
function raw_exists() { return localStorage.getItem(KEY) !== null; }

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

// 通用实体操作
const COLLECTIONS = ['tasks', 'candidates', 'projects', 'contents', 'tools', 'inbox'];

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

// 跨模块搜索
export function searchAll(kw) {
  const d = load();
  const k = kw.trim().toLowerCase();
  if (!k) return [];
  const hit = (s) => (s || '').toString().toLowerCase().includes(k);
  const out = [];
  const fields = {
    tasks: ['title'], candidates: ['name', 'role', 'project', 'note', 'stage'],
    projects: ['name', 'type', 'note', 'status'], contents: ['title', 'platform', 'note', 'stage'],
    tools: ['name', 'version', 'note', 'status'], inbox: ['content'],
  };
  const labels = { tasks: '任务', candidates: '候选人', projects: '招聘项目', contents: '内容', tools: '工具', inbox: '收集箱' };
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

// 导出 / 导入
export function exportJSON() {
  return JSON.stringify(load(), null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text); // 解析失败会抛错，由调用方捕获
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
