// 任务页 + 收集箱 + 快速记录
import { data, add, update, remove, find, todayStr } from './store.js';
import { icon } from './icons.js';
import { esc, toast, openModal, confirmBox, helpBtn, fmtDate, fmtFull } from './ui.js';
import { suggestFor, todayBrief, aiReady, llmClassify } from './ai.js';

const MODULE_LABELS = { candidates: '招聘', content: '内容', none: '独立任务' };
const STATUS_LABELS = { todo: '待办', doing: '进行中', confirm: '待确认', done: '已完成' };

const rerender = () => import('./app.js').then(m => m.renderCurrent());

// ============ 任务页 ============
export function renderTasks(view) {
  const d = data();
  const today = todayStr();
  const open = d.tasks.filter(t => t.status !== 'done');
  const overdue = open.filter(t => t.due && t.due < today);
  const confirmList = open.filter(t => t.status === 'confirm');
  const dueToday = open.filter(t => t.due === today && t.status !== 'confirm');
  const noDue = open.filter(t => !t.due && t.status !== 'confirm');
  const doneList = d.tasks.filter(t => t.status === 'done').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  view.innerHTML = `
    <div class="page-head"><h2>任务</h2>${helpBtn('today')}<div class="spacer"></div>
      <button class="btn primary" data-action="new-task">${icon('plus')}新建任务</button></div>
    ${taskSection('已逾期', overdue, 'warn')}
    ${taskSection('待确认', confirmList)}
    ${taskSection('今日到期', dueToday)}
    ${taskSection('进行中', noDue)}
    ${taskSection('已完成', doneList)}
    ${!open.length && !doneList.length ? `
      <div class="empty">${icon('today')}<p>没有任务。新建一条，或到仪表盘看看。</p>
      <button class="btn primary" data-action="new-task">${icon('plus')}新建任务</button></div>` : ''}
  `;

  view.querySelectorAll('[data-action="new-task"]').forEach(b => b.onclick = () => taskForm());
  bindTaskRows(view);
}

function taskSection(title, list, tone) {
  if (!list.length) return '';
  return `
    <div class="sec-title">${esc(title)}<span class="tag ${tone === 'warn' ? 'pink' : 'gray'}">${list.length}</span></div>
    ${list.map(taskRow).join('')}`;
}

function taskRow(t) {
  const linked = t.linkedTo ? find('candidates', t.linkedTo) || find('projects', t.linkedTo) : null;
  const done = t.status === 'done';
  return `
    <div class="task-row" data-id="${t.id}">
      <button class="check ${done ? 'done' : ''}" data-act="toggle" aria-label="${done ? '恢复' : '完成'}">${icon('task')}</button>
      <div class="t-body">
        <div class="t-title ${done ? 'done' : ''}">${esc(t.title)}</div>
        <div class="t-meta">
          <span class="tag gray">${MODULE_LABELS[t.module] || '独立任务'}</span>
          <span class="tag ${t.status === 'confirm' ? 'pink' : 'blue'}">${STATUS_LABELS[t.status]}</span>
          ${t.due ? `<span>截止 ${esc(t.due)}</span>` : ''}
          ${linked ? `<button class="link-chip" data-act="go-link" data-link="${linked.id}">${icon('link')}${esc(linked.name || linked.title)}</button>` : ''}
        </div>
      </div>
      <div class="t-actions">
        <button class="mini-btn" data-act="edit" aria-label="编辑">${icon('edit')}</button>
        <button class="mini-btn" data-act="del" aria-label="删除">${icon('trash')}</button>
      </div>
    </div>`;
}

function bindTaskRows(view) {
  view.querySelectorAll('.task-row').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-act="toggle"]').onclick = () => {
      const t = find('tasks', id);
      update('tasks', id, { status: t.status === 'done' ? 'todo' : 'done' });
      rerender();
    };
    row.querySelector('[data-act="edit"]').onclick = () => taskForm(find('tasks', id));
    row.querySelector('[data-act="del"]').onclick = async () => {
      const ok = await confirmBox('删除任务', '删除后不可恢复。', { danger: true, okText: '删除' });
      if (ok) { remove('tasks', id); toast('已删除'); rerender(); }
    };
    const linkBtn = row.querySelector('[data-act="go-link"]');
    if (linkBtn) linkBtn.onclick = () => { location.hash = '#/candidates/' + linkBtn.dataset.link; };
  });
}

export function taskForm(task = null, presetModule = 'none') {
  const t = task || { title: '', module: presetModule, status: 'todo', due: '', linkedTo: '' };
  const d = data();
  const linkOptions = [
    ...d.candidates.filter(c => !c.deleted).map(c => `<option value="${c.id}" ${t.linkedTo === c.id ? 'selected' : ''}>候选人 · ${esc(c.name)}</option>`),
    ...d.projects.map(p => `<option value="${p.id}" ${t.linkedTo === p.id ? 'selected' : ''}>项目 · ${esc(p.name)}</option>`),
    ...d.contents.map(c => `<option value="${c.id}" ${t.linkedTo === c.id ? 'selected' : ''}>内容 · ${esc(c.title)}</option>`),
  ].join('');
  const { close, el } = openModal(task ? '编辑任务' : '新建任务', `
    <div class="field"><label>标题</label><input type="text" name="title" value="${esc(t.title)}"></div>
    <div class="field"><label>归属模块</label><select name="module">
      <option value="none" ${t.module === 'none' ? 'selected' : ''}>独立任务</option>
      <option value="candidates" ${t.module === 'candidates' ? 'selected' : ''}>招聘</option>
      <option value="content" ${t.module === 'content' ? 'selected' : ''}>内容创作</option>
    </select></div>
    <div class="field"><label>状态</label><select name="status">
      ${Object.entries(STATUS_LABELS).map(([k, v]) => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${v}</option>`).join('')}
    </select></div>
    <div class="field"><label>截止日期（可空）</label><input type="date" name="due" value="${esc(t.due || '')}"></div>
    <div class="field"><label>关联到（可空）</label><select name="linkedTo"><option value="">不关联</option>${linkOptions}</select></div>
    <div class="form-actions">
      <button class="btn ghost" data-close>取消</button>
      <button class="btn primary" data-save>保存</button>
    </div>`, { helpKey: 'task' });
  el.querySelector('[data-save]').onclick = () => {
    const title = el.querySelector('[name=title]').value.trim();
    if (!title) { toast('标题不能为空', true); return; }
    const patch = {
      title,
      module: el.querySelector('[name=module]').value,
      status: el.querySelector('[name=status]').value,
      due: el.querySelector('[name=due]').value,
      linkedTo: el.querySelector('[name=linkedTo]').value || null,
    };
    if (task) { update('tasks', task.id, patch); toast('已保存'); }
    else { add('tasks', patch); toast('已新建任务'); }
    close(); rerender();
  };
}

// ============ 收集箱 ============
const KIND_LABELS = { text: '文字', link: '链接', task: '临时任务', file: '文件' };
const RULE_LABEL = { candidates: '候选池', content: '内容创作', tasks: '任务' };

export function renderInbox(view) {
  const d = data();
  const items = d.inbox.filter(x => x.status !== 'archived');
  view.innerHTML = `
    <div class="page-head"><h2>收集箱</h2>${helpBtn('inbox')}<div class="spacer"></div>
      <button class="btn primary" data-action="quick">${icon('plus')}快速记录</button></div>
    <p class="page-sub">不知道放哪的先扔这里。AI 会建议去向，确认后才归位。</p>
    ${items.length ? items.map(inboxCard).join('') : `
      <div class="empty">${icon('inbox')}<p>收集箱是空的。随手记一条，保持输入通道畅通。</p>
      <button class="btn primary" data-action="quick">${icon('plus')}快速记录</button></div>`}
  `;
  view.querySelectorAll('[data-action="quick"]').forEach(b => b.onclick = () => quickAdd());

  items.forEach(item => {
    const card = view.querySelector(`[data-inbox="${item.id}"]`);
    if (!card) return;
    card.querySelector('[data-act="ai-suggest"]')?.addEventListener('click', () => aiSuggest(item.id, card));
    card.querySelector('[data-act="accept"]')?.addEventListener('click', () => acceptSuggestion(item.id));
    card.querySelector('[data-act="archive"]')?.addEventListener('click', async () => {
      const ok = await confirmBox('归档这条记录', '归档后不再显示在收集箱，但仍会参与搜索。');
      if (ok) { update('inbox', item.id, { status: 'archived' }); toast('已归档'); rerender(); }
    });
    card.querySelector('[data-act="del"]')?.addEventListener('click', async () => {
      const ok = await confirmBox('删除这条记录', '删除后不可恢复。', { danger: true, okText: '删除' });
      if (ok) { remove('inbox', item.id); toast('已删除'); rerender(); }
    });
  });
}

function inboxCard(item) {
  const sug = item.suggested ? RULE_LABEL[item.suggested] : null;
  return `
    <div class="card" style="margin-bottom:12px" data-inbox="${item.id}">
      <div class="inbox-item">
        <span class="kind">${icon(item.kind === 'link' ? 'link' : item.kind === 'task' ? 'task' : item.kind === 'file' ? 'folder' : 'text')}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:14.5px;word-break:break-word">${esc(item.content)}</div>
          <div class="t-meta" style="font-size:12.5px;color:var(--text-2);margin-top:4px">
            <span class="tag gray">${KIND_LABELS[item.kind] || '文字'}</span>
            <span>${fmtFull(item.createdAt)}</span>
            ${item.status === 'sorted' ? '<span class="tag green">已归位</span>' : ''}
          </div>
          ${sug && item.status === 'new' ? `
            <div class="inbox-suggest">
              ${icon('ai')}<span>建议归入「${sug}」${item.suggestReason ? '：' + esc(item.suggestReason) : ''}</span>
              <button class="btn small primary" data-act="accept">确认归位</button>
            </div>` : ''}
          ${item.status === 'new' && !sug ? `
            <div style="margin-top:8px"><button class="btn small" data-act="ai-suggest">${icon('ai')}让 AI 建议去向</button></div>` : ''}
        </div>
        <div class="t-actions">
          <button class="mini-btn" data-act="archive" aria-label="归档">${icon('inbox')}</button>
          <button class="mini-btn" data-act="del" aria-label="删除">${icon('trash')}</button>
        </div>
      </div>
    </div>`;
}

async function aiSuggest(id, card) {
  const item = find('inbox', id);
  const btn = card.querySelector('[data-act="ai-suggest"]');
  btn.disabled = true; btn.textContent = '分析中…';
  try {
    let sug = null;
    if (aiReady()) {
      sug = await llmClassify(item.content);
    }
    if (!sug) {
      const rule = suggestFor(item.content);
      sug = rule || null;
    }
    if (sug) {
      update('inbox', id, { suggested: sug.to, suggestReason: sug.reason + (aiReady() ? '' : '（规则引擎）') });
      rerender();
    } else {
      btn.disabled = false; btn.innerHTML = `${icon('ai')}让 AI 建议去向`;
      toast('AI 判断不了去向，请手动归位或先归档');
    }
  } catch (e) {
    btn.disabled = false; btn.innerHTML = `${icon('ai')}让 AI 建议去向`;
    toast(e.message, true);
  }
}

async function acceptSuggestion(id) {
  const item = find('inbox', id);
  const to = item.suggested;
  const ok = await confirmBox('确认归位', `将把这条记录归入「${RULE_LABEL[to]}」，收集箱里标记为已归位。`);
  if (!ok) return;
  if (to === 'tasks') {
    add('tasks', { title: item.content, module: 'none', status: 'todo', due: '', linkedTo: null });
  } else if (to === 'candidates') {
    add('projects', { name: item.content.slice(0, 40), type: '其他', status: '待评估', version: '', note: item.content, links: [], phases: [] });
  } else if (to === 'content') {
    add('contents', { title: item.content.slice(0, 40), platform: '公众号', stage: '选题', publishDate: '', note: item.content, links: [] });
  }
  update('inbox', id, { status: 'sorted' });
  toast(`已归入「${RULE_LABEL[to]}」`);
  rerender();
}

// ============ 快速记录 ============
export function quickAdd() {
  const { close, el } = openModal('快速记录', `
    <div class="field"><label>类型</label><select name="kind">
      <option value="text">文字 / 想法</option>
      <option value="link">链接</option>
      <option value="task">临时任务</option>
      <option value="file">文件（记录名称和位置）</option>
    </select></div>
    <div class="field"><label>内容</label><textarea name="content" placeholder="先记下来，去向之后再说"></textarea></div>
    <div class="form-actions">
      <button class="btn ghost" data-close>取消</button>
      <button class="btn primary" data-save>存入收集箱</button>
    </div>`, { helpKey: 'quickadd' });
  const ta = el.querySelector('[name=content]');
  ta.focus();
  el.querySelector('[data-save]').onclick = () => {
    const content = ta.value.trim();
    if (!content) { toast('内容不能为空', true); return; }
    add('inbox', { kind: el.querySelector('[name=kind]').value, content, status: 'new', suggested: null });
    close();
    toast('已存入收集箱');
    rerender();
  };
}
