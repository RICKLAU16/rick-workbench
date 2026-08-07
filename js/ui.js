// UI 基础组件：modal / toast / confirm / help 问号
import { icon } from './icons.js';

export function esc(s) {
  return (s ?? '').toString()
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function toast(msg, isError = false) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// 弹窗：content 为 HTML 字符串；返回关闭函数
export function openModal(title, contentHTML, { helpKey = null } = {}) {
  const root = document.getElementById('modal-root');
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head">
        <h3>${esc(title)}</h3>
        ${helpKey ? helpBtn(helpKey) : ''}
        <button class="mini-btn" data-close aria-label="关闭">${icon('close')}</button>
      </div>
      <div class="modal-body">${contentHTML}</div>
    </div>`;
  const close = () => { mask.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  mask.addEventListener('click', (e) => {
    if (e.target === mask || e.target.closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  root.appendChild(mask);
  return { close, el: mask };
}

// 确认框：重要操作必须经此确认
export function confirmBox(title, desc, { danger = false, okText = '确认' } = {}) {
  return new Promise((resolve) => {
    const { close, el } = openModal(title, `
      <p style="font-size:14px;color:var(--text-2);line-height:1.7">${desc}</p>
      <div class="form-actions">
        <button class="btn ghost" data-no>取消</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(okText)}</button>
      </div>`);
    el.querySelector('[data-yes]').onclick = () => { close(); resolve(true); };
    el.querySelector('[data-no]').onclick = () => { close(); resolve(false); };
    mask_close_on_bg(el, () => resolve(false), close);
  });
}
function mask_close_on_bg(el, onCancel, close) {
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-close]')) { onCancel(); }
  }, { once: false });
}

// 帮助系统：HELP 文案集中管理，内容为「做什么/怎么操作/完成后/撤销/出错」
const HELP = {
  today: { t: '今日', what: '聚合所有模块里现在要做、待确认、异常和最近可继续的事项。', how: '点圆圈标记完成；点铅笔编辑；点关联图标查看来源模块。', after: '完成的任务会划线并从统计中移除。', undo: '再次点圆圈即可恢复为未完成。', err: '数据保存在本机浏览器，异常时先到设置里导出备份。' },
  candidates: { t: '候选池与招聘项目', what: '用看板跟踪候选人从初筛到入职的阶段，右侧是招聘项目卡。', how: '点卡片看详情；详情里可以改阶段、记笔记、挂关联。', after: '阶段变化会记入该候选人的时间线。', undo: '阶段可以随时改回；删除前会要求确认，删除后进回收站可恢复。', err: '示例人物均为虚构，真实候选人请自行录入。' },
  content: { t: '内容创作', what: '管理公众号/抖音/小红书的选题、草稿和发布节奏。', how: '按平台切换视图；选题卡在「选题→草稿→待发布→已发布」间流转。', after: '标记已发布后可填发布日期，日历视图按它排布。', undo: '阶段可随意改回。', err: '发布动作本身需要在各平台 App 里完成，这里只做记录。' },
  tools: { t: '工具与 Skill 开发', what: '跟踪每个工具/Skill 的版本、状态和迭代历史。', how: '点卡片进详情，记版本号、改状态、追加版本记录。', after: '版本历史按时间倒序保留。', undo: '版本记录写错了可以编辑该条目。', err: '这里的版本号只是记录，不会改动你真实的 skill 文件。' },
  inbox: { t: '收集箱', what: '接收暂时不知道放哪里的文字、链接和临时任务。', how: '手机点底部「＋」或本页输入框快速记录；AI 会建议去向，你确认后才归位。', after: '确认归位后条目进入对应模块，收集箱里标记已归档。', undo: '归位错了：到对应模块删除该条目即可，收集箱记录不影响。', err: 'AI 建议只是建议，不确认不会移动任何内容。' },
  search: { t: '搜索', what: '跨模块全文找回：任务、候选人、项目、内容、工具、收集箱。', how: '输入关键词，结果按模块分组，点结果直达详情。', after: '无修改操作。', undo: '不需要。', err: '搜不到时检查是否记在了导出备份里——可先在设置导出后用编辑器搜。' },
  ai: { t: 'AI 帮手', what: '两层能力：内置规则引擎（免费离线）和可选的大模型（填自己的 API Key）。', how: '规则引擎随时可用；大模型需在设置里填 DeepSeek 或 Kimi 的 Key 并启用。', after: 'AI 的重要修改先出预览和变化说明，你确认后才生效。', undo: '未确认的预览不产生任何改动。', err: 'Key 只存在本机浏览器，直连官方 API；请求失败先看 Key 是否有效、余额是否充足。' },
  settings: { t: '设置与数据', what: '使用说明、更新日志、数据备份/恢复、AI 配置。', how: '导出=下载 JSON 备份；导入=从备份恢复；每周建议导出一次。', after: '导入会整体覆盖当前数据，操作前会要求确认。', undo: '导入前请先导出当前数据，即可随时回退。', err: '数据只在本机浏览器，换设备/清缓存会丢，备份是唯一保障。' },
  quickadd: { t: '快速记录', what: '把此刻的想法、链接、临时任务先扔进收集箱。', how: '选类型、写内容、保存；之后到收集箱里让 AI 建议去向。', after: '条目出现在收集箱顶部。', undo: '收集箱里可以删除。', err: '无。' },
  task: { t: '任务', what: '一条待办，可归属某个模块、设截止日期、关联到具体对象。', how: '填写标题，选模块和日期；状态为「待确认」时会出现在今日页的待确认区。', after: '保存后出现在今日页和来源模块。', undo: '今日页点圆圈完成，或详情里删除。', err: '无。' },
};

export function helpBtn(key) {
  return `<button class="help-dot" data-help="${key}" aria-label="帮助：${esc(HELP[key]?.t || key)}">?</button>`;
}

let activePop = null;
export function closeHelp() { activePop?.remove(); activePop = null; }

export function showHelp(key, anchor) {
  closeHelp();
  const h = HELP[key];
  if (!h) return;
  const pop = document.createElement('div');
  pop.className = 'help-pop';
  pop.innerHTML = `
    <h4>${esc(h.t)}</h4>
    <div class="hp-row"><span class="hp-k">做什么</span>${esc(h.what)}</div>
    <div class="hp-row"><span class="hp-k">怎么操作</span>${esc(h.how)}</div>
    <div class="hp-row"><span class="hp-k">完成后</span>${esc(h.after)}</div>
    <div class="hp-row"><span class="hp-k">如何撤销</span>${esc(h.undo)}</div>
    <div class="hp-row"><span class="hp-k">出错怎么办</span>${esc(h.err)}</div>`;
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const pw = Math.min(320, window.innerWidth - 24);
  pop.style.maxWidth = pw + 'px';
  let left = Math.min(Math.max(12, r.left - pw / 2 + r.width / 2), window.innerWidth - pw - 12);
  let top = r.bottom + 8;
  pop.style.left = left + 'px';
  pop.style.top = '0px';
  const ph = pop.offsetHeight;
  if (top + ph > window.innerHeight - 12) top = Math.max(12, r.top - ph - 8);
  pop.style.top = top + 'px';
  activePop = pop;
  const off = (e) => { if (!pop.contains(e.target)) { closeHelp(); document.removeEventListener('click', off); } };
  setTimeout(() => document.addEventListener('click', off), 0);
}

// 全局事件委托：帮助问号（桌面 hover 短暂提示、点击完整说明；手机点击）
export function bindHelp(rootEl = document) {
  rootEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-help]');
    if (btn) { e.preventDefault(); e.stopPropagation(); showHelp(btn.dataset.help, btn); }
  });
  let hoverTimer = null;
  rootEl.addEventListener('mouseover', (e) => {
    if (window.innerWidth < 900) return;
    const btn = e.target.closest('[data-help]');
    if (!btn) return;
    hoverTimer = setTimeout(() => showHelp(btn.dataset.help, btn), 450);
  });
  rootEl.addEventListener('mouseout', (e) => {
    if (e.target.closest?.('[data-help]')) { clearTimeout(hoverTimer); }
  });
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function fmtFull(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
