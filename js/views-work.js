// 工作模块：候选池与招聘项目 / 内容创作 / 工具与 Skill 开发
import { data, add, update, remove, find, now } from './store.js';
import { icon } from './icons.js';
import { esc, toast, openModal, confirmBox, helpBtn, fmtDate, fmtFull } from './ui.js';

const rerender = () => import('./app.js').then(m => m.renderCurrent());

// ============ 候选池与招聘项目 ============
const STAGES = ['初筛', '评估中', '待面试', 'Offer', '入职', '淘汰'];
const STAGE_TINT = { '初筛': '', '评估中': 'tint-yellow', '待面试': 'tint-blue', 'Offer': 'tint-pink', '入职': 'tint-green', '淘汰': '' };

export function renderCandidates(view, detailId = null) {
  if (detailId) return renderCandidateDetail(view, detailId);
  const d = data();
  const cands = d.candidates.filter(c => !c.deleted);
  const trashed = d.candidates.filter(c => c.deleted);

  view.innerHTML = `
    <div class="page-head"><h2>候选池与招聘项目</h2>${helpBtn('candidates')}<div class="spacer"></div>
      <button class="btn" data-action="new-project">${icon('plus')}项目</button>
      <button class="btn primary" data-action="new-cand">${icon('plus')}候选人</button></div>
    <div class="board">
      ${STAGES.map(stage => {
        const list = cands.filter(c => c.stage === stage);
        return `
        <div class="board-col ${STAGE_TINT[stage]}">
          <h3>${stage}<span class="count">${list.length}</span></h3>
          ${list.map(c => `
            <div class="board-card" data-cand="${c.id}">
              <div class="bc-title">${esc(c.name)}</div>
              <div class="bc-meta">
                <span>${esc(c.role)}</span>
                ${c.project ? `<span class="tag blue">${esc(c.project)}</span>` : ''}
                ${(c.tags || []).map(t => `<span class="tag gray">${esc(t)}</span>`).join('')}
              </div>
            </div>`).join('')}
          <button class="board-add" data-add-stage="${stage}">+ 添加到此阶段</button>
        </div>`;
      }).join('')}
    </div>
    <div class="sec-title">招聘项目</div>
    <div class="board">
      ${d.projects.map(p => `
        <div class="card" data-proj="${p.id}" style="cursor:pointer">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <b style="font-size:15px">${esc(p.name)}</b>
            <span class="tag ${p.status === '进行中' ? 'green' : 'yellow'}">${esc(p.status)}</span>
            ${p.version ? `<span class="tag gray">${esc(p.version)}</span>` : ''}
          </div>
          <div style="font-size:13px;color:var(--text-2)">${esc(p.type)} · ${esc(p.note || '').slice(0, 50)}</div>
        </div>`).join('') || '<div class="empty"><p>还没有项目，点右上角「项目」新建。</p></div>'}
    </div>
    ${trashed.length ? `
      <div class="sec-title">回收站<span class="tag gray">${trashed.length}</span></div>
      ${trashed.map(c => `
        <div class="task-row"><div class="t-body"><div class="t-title done">${esc(c.name)}（已删除）</div></div>
        <div class="t-actions"><button class="btn small" data-restore="${c.id}">恢复</button></div></div>`).join('')}
    ` : ''}
  `;

  view.querySelector('[data-action="new-cand"]').onclick = () => candForm();
  view.querySelector('[data-action="new-project"]').onclick = () => projForm();
  view.querySelectorAll('[data-add-stage]').forEach(b => b.onclick = () => candForm(null, b.dataset.addStage));
  view.querySelectorAll('[data-cand]').forEach(c => c.onclick = () => location.hash = '#/candidates/' + c.dataset.cand);
  view.querySelectorAll('[data-proj]').forEach(c => c.onclick = () => projForm(find('projects', c.dataset.proj)));
  view.querySelectorAll('[data-restore]').forEach(b => b.onclick = () => {
    update('candidates', b.dataset.restore, { deleted: false });
    toast('已恢复'); rerender();
  });
}

function candForm(cand = null, presetStage = '初筛') {
  const c = cand || { name: '', role: '', stage: presetStage, project: '', tags: [], note: '', salary: '' };
  const { close, el } = openModal(cand ? '编辑候选人' : '新增候选人', `
    <div class="field"><label>姓名</label><input type="text" name="name" value="${esc(c.name)}"></div>
    <div class="field"><label>岗位</label><input type="text" name="role" value="${esc(c.role)}" placeholder="如：品牌经理"></div>
    <div class="field"><label>阶段</label><select name="stage">${STAGES.map(s => `<option ${c.stage === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label>所属项目</label><input type="text" name="project" value="${esc(c.project)}" placeholder="如：品牌经理招聘"></div>
    <div class="field"><label>标签（逗号分隔）</label><input type="text" name="tags" value="${esc((c.tags || []).join('，'))}"></div>
    <div class="field"><label>备注</label><textarea name="note">${esc(c.note)}</textarea></div>
    <div class="form-actions">
      <button class="btn ghost" data-close>取消</button>
      <button class="btn primary" data-save>保存</button>
    </div>`, { helpKey: 'candidates' });
  el.querySelector('[data-save]').onclick = () => {
    const name = el.querySelector('[name=name]').value.trim();
    if (!name) { toast('姓名不能为空', true); return; }
    const patch = {
      name,
      role: el.querySelector('[name=role]').value.trim(),
      stage: el.querySelector('[name=stage]').value,
      project: el.querySelector('[name=project]').value.trim(),
      tags: el.querySelector('[name=tags]').value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      note: el.querySelector('[name=note]').value.trim(),
    };
    if (cand) {
      if (cand.stage !== patch.stage) {
        patch.history = [...(cand.history || []), { at: now(), text: `阶段：${cand.stage} → ${patch.stage}` }];
      }
      update('candidates', cand.id, patch);
      toast('已保存');
    } else {
      add('candidates', { ...patch, links: [], history: [{ at: now(), text: `录入，阶段：${patch.stage}` }], deleted: false });
      toast('已新增');
    }
    close(); rerender();
  };
}

function renderCandidateDetail(view, id) {
  const c = find('candidates', id);
  if (!c) { view.innerHTML = `<div class="err-box">这条记录不存在或已删除。<a href="#/candidates">返回候选池</a></div>`; return; }
  const tasks = data().tasks.filter(t => t.linkedTo === id && t.status !== 'done');
  view.innerHTML = `
    <div class="detail-head">
      <button class="icon-btn" onclick="location.hash='#/candidates'" aria-label="返回">${icon('back')}</button>
      <h2>${esc(c.name)}</h2>
      <span class="tag blue">${esc(c.stage)}</span>
      ${c.deleted ? '<span class="tag pink">已删除</span>' : ''}
      <div class="spacer"></div>
      <button class="btn" data-action="edit">${icon('edit')}编辑</button>
      ${!c.deleted ? `<button class="btn danger" data-action="del">${icon('trash')}删除</button>` : ''}
    </div>
    <div class="card">
      <dl class="kv">
        <dt>岗位</dt><dd>${esc(c.role) || '—'}</dd>
        <dt>所属项目</dt><dd>${esc(c.project) || '—'}</dd>
        <dt>标签</dt><dd>${(c.tags || []).map(t => `<span class="tag gray">${esc(t)}</span>`).join(' ') || '—'}</dd>
        <dt>备注</dt><dd>${esc(c.note) || '—'}</dd>
        <dt>更新</dt><dd>${fmtFull(c.updatedAt)}</dd>
      </dl>
    </div>
    ${tasks.length ? `<div class="sec-title">关联的待办</div>${tasks.map(t => `<div class="task-row"><div class="t-body"><div class="t-title">${esc(t.title)}</div><div class="t-meta">${t.due ? '截止 ' + esc(t.due) : ''}</div></div></div>`).join('')}` : ''}
    <div class="sec-title">阶段时间线</div>
    ${(c.history || []).slice().reverse().map(h => `
      <div class="changelog-item"><div class="cl-date">${fmtFull(h.at)}</div><div class="cl-desc">${esc(h.text)}</div></div>`).join('') || '<p style="color:var(--text-2);font-size:13.5px">暂无记录</p>'}
  `;
  view.querySelector('[data-action="edit"]').onclick = () => candForm(c);
  view.querySelector('[data-action="del"]')?.addEventListener('click', async () => {
    const ok = await confirmBox('删除候选人', `「${esc(c.name)}」将进入回收站，可以随时恢复，不会丢失时间线。`, { danger: true, okText: '删除' });
    if (ok) { update('candidates', id, { deleted: true }); toast('已删除，可在候选池底部回收站恢复'); location.hash = '#/candidates'; }
  });
}

function projForm(p = null) {
  const x = p || { name: '', type: '社招', status: '规划中', version: '', note: '' };
  const { close, el } = openModal(p ? '编辑项目' : '新建项目', `
    <div class="field"><label>项目名称</label><input type="text" name="name" value="${esc(x.name)}"></div>
    <div class="field"><label>类型</label><select name="type">${['社招', '校招', '机制建设', '寻访', '其他'].map(s => `<option ${x.type === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label>状态</label><select name="status">${['规划中', '进行中', '待对齐', '已收尾'].map(s => `<option ${x.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label>当前版本（可空）</label><input type="text" name="version" value="${esc(x.version)}" placeholder="如 V3"></div>
    <div class="field"><label>备注</label><textarea name="note">${esc(x.note)}</textarea></div>
    <div class="form-actions">
      ${p ? '<button class="btn danger" data-del>删除</button>' : ''}
      <div class="spacer" style="flex:1"></div>
      <button class="btn ghost" data-close>取消</button>
      <button class="btn primary" data-save>保存</button>
    </div>`);
  el.querySelector('[data-save]').onclick = () => {
    const name = el.querySelector('[name=name]').value.trim();
    if (!name) { toast('名称不能为空', true); return; }
    const patch = {
      name,
      type: el.querySelector('[name=type]').value,
      status: el.querySelector('[name=status]').value,
      version: el.querySelector('[name=version]').value.trim(),
      note: el.querySelector('[name=note]').value.trim(),
    };
    if (p) { update('projects', p.id, patch); } else { add('projects', { ...patch, links: [] }); }
    close(); toast('已保存'); rerender();
  };
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    const ok = await confirmBox('删除项目', '项目删除后不可恢复，关联的候选人不会被删除。', { danger: true, okText: '删除' });
    if (ok) { remove('projects', p.id); close(); toast('已删除'); rerender(); }
  });
}

// ============ 内容创作 ============
const CONTENT_STAGES = ['选题', '草稿', '待发布', '已发布'];
const PLATFORMS = ['全部', '公众号', '抖音', '小红书'];
let contentPlatform = '全部';

export function renderContent(view) {
  const d = data();
  const list = d.contents.filter(c => contentPlatform === '全部' || c.platform === contentPlatform);
  const published = d.contents.filter(c => c.stage === '已发布' && c.publishDate).sort((a, b) => a.publishDate.localeCompare(b.publishDate));

  view.innerHTML = `
    <div class="page-head"><h2>内容创作</h2>${helpBtn('content')}<div class="spacer"></div>
      <button class="btn primary" data-action="new">${icon('plus')}新选题</button></div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      ${PLATFORMS.map(p => `<button class="btn small ${contentPlatform === p ? 'primary' : ''}" data-plat="${p}">${p}</button>`).join('')}
    </div>
    <div class="board">
      ${CONTENT_STAGES.map(stage => {
        const items = list.filter(c => c.stage === stage);
        return `
        <div class="board-col ${{ '选题': 'tint-yellow', '草稿': 'tint-blue', '待发布': 'tint-pink', '已发布': 'tint-green' }[stage]}">
          <h3>${stage}<span class="count">${items.length}</span></h3>
          ${items.map(c => `
            <div class="board-card" data-c="${c.id}">
              <div class="bc-title">${esc(c.title)}</div>
              <div class="bc-meta"><span class="tag pink">${esc(c.platform)}</span>
              ${c.publishDate ? `<span>${esc(c.publishDate)}</span>` : ''}</div>
            </div>`).join('')}
          <button class="board-add" data-add="${stage}">+ 添加</button>
        </div>`;
      }).join('')}
    </div>
    <div class="sec-title">发布日历</div>
    ${published.length ? published.map(c => `
      <div class="task-row"><span class="tag green">${esc(c.publishDate)}</span>
      <div class="t-body"><div class="t-title">${esc(c.title)}</div><div class="t-meta">${esc(c.platform)}</div></div></div>`).join('')
      : '<div class="empty">' + icon('calendar') + '<p>还没有已发布内容。把选题推进到「已发布」并填日期后，会按时间排在这里。</p></div>'}
  `;

  view.querySelector('[data-action="new"]').onclick = () => contentForm();
  view.querySelectorAll('[data-plat]').forEach(b => b.onclick = () => { contentPlatform = b.dataset.plat; rerender(); });
  view.querySelectorAll('[data-add]').forEach(b => b.onclick = () => contentForm(null, b.dataset.add));
  view.querySelectorAll('[data-c]').forEach(c => c.onclick = () => contentForm(find('contents', c.dataset.c)));
}

function contentForm(c = null, presetStage = '选题') {
  const x = c || { title: '', platform: '公众号', stage: presetStage, publishDate: '', note: '' };
  const { close, el } = openModal(c ? '编辑内容' : '新选题', `
    <div class="field"><label>标题</label><input type="text" name="title" value="${esc(x.title)}"></div>
    <div class="field"><label>平台</label><select name="platform">${['公众号', '抖音', '小红书'].map(s => `<option ${x.platform === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label>阶段</label><select name="stage">${CONTENT_STAGES.map(s => `<option ${x.stage === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label>发布日期（已发布后填）</label><input type="date" name="publishDate" value="${esc(x.publishDate)}"></div>
    <div class="field"><label>备注 / 素材链接</label><textarea name="note">${esc(x.note)}</textarea></div>
    <div class="form-actions">
      ${c ? '<button class="btn danger" data-del>删除</button><div style="flex:1"></div>' : ''}
      <button class="btn ghost" data-close>取消</button>
      <button class="btn primary" data-save>保存</button>
    </div>`, { helpKey: 'content' });
  el.querySelector('[data-save]').onclick = () => {
    const title = el.querySelector('[name=title]').value.trim();
    if (!title) { toast('标题不能为空', true); return; }
    const patch = {
      title,
      platform: el.querySelector('[name=platform]').value,
      stage: el.querySelector('[name=stage]').value,
      publishDate: el.querySelector('[name=publishDate]').value,
      note: el.querySelector('[name=note]').value.trim(),
    };
    if (c) { update('contents', c.id, patch); } else { add('contents', { ...patch, links: [] }); }
    close(); toast('已保存'); rerender();
  };
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    const ok = await confirmBox('删除这条内容', '删除后不可恢复。', { danger: true, okText: '删除' });
    if (ok) { remove('contents', c.id); close(); toast('已删除'); rerender(); }
  });
}

// ============ 工具与 Skill 开发 ============
const TOOL_STATUS = ['想法', '开发中', '已落地', '待推广', '迭代中'];

export function renderTools(view) {
  const d = data();
  view.innerHTML = `
    <div class="page-head"><h2>工具与 Skill 开发</h2>${helpBtn('tools')}<div class="spacer"></div>
      <button class="btn primary" data-action="new">${icon('plus')}新工具</button></div>
    ${d.tools.length ? d.tools.map(t => `
      <div class="card" style="margin-bottom:12px" data-t="${t.id}">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <b style="font-size:15px">${esc(t.name)}</b>
          ${t.version ? `<span class="tag blue">${esc(t.version)}</span>` : ''}
          <span class="tag ${t.status === '已落地' ? 'green' : t.status === '待推广' ? 'yellow' : 'gray'}">${esc(t.status)}</span>
          <div class="spacer" style="flex:1"></div>
          <button class="btn small" data-edit="${t.id}">${icon('edit')}编辑</button>
        </div>
        ${t.note ? `<p style="font-size:13.5px;color:var(--text-2);margin-top:8px">${esc(t.note)}</p>` : ''}
        ${(t.history || []).length ? `
          <div style="margin-top:10px">
            ${t.history.slice().reverse().slice(0, 3).map(h => `<div class="changelog-item" style="margin-bottom:8px"><div class="cl-date">${fmtFull(h.at)}</div><div class="cl-desc">${esc(h.text)}</div></div>`).join('')}
          </div>` : ''}
      </div>`).join('')
    : `<div class="empty">${icon('tools')}<p>还没有工具记录。把你做过的脚本、Skill、自动化工具放进来跟踪版本。</p>
       <button class="btn primary" data-action="new">${icon('plus')}新工具</button></div>`}
  `;
  view.querySelectorAll('[data-action="new"]').forEach(b => b.onclick = () => toolForm());
  view.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => toolForm(find('tools', b.dataset.edit)));
}

function toolForm(t = null) {
  const x = t || { name: '', version: '', status: '想法', note: '' };
  const { close, el } = openModal(t ? '编辑工具' : '新工具', `
    <div class="field"><label>名称</label><input type="text" name="name" value="${esc(x.name)}"></div>
    <div class="field"><label>当前版本</label><input type="text" name="version" value="${esc(x.version)}" placeholder="如 v1.2.0"></div>
    <div class="field"><label>状态</label><select name="status">${TOOL_STATUS.map(s => `<option ${x.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="field"><label>备注</label><textarea name="note">${esc(x.note)}</textarea></div>
    ${t ? `<div class="field"><label>追加一条版本记录（可空）</label><input type="text" name="history" placeholder="如：v1.1.0 增加批量导出"></div>` : ''}
    <div class="form-actions">
      ${t ? '<button class="btn danger" data-del>删除</button><div style="flex:1"></div>' : ''}
      <button class="btn ghost" data-close>取消</button>
      <button class="btn primary" data-save>保存</button>
    </div>`, { helpKey: 'tools' });
  el.querySelector('[data-save]').onclick = () => {
    const name = el.querySelector('[name=name]').value.trim();
    if (!name) { toast('名称不能为空', true); return; }
    const patch = {
      name,
      version: el.querySelector('[name=version]').value.trim(),
      status: el.querySelector('[name=status]').value,
      note: el.querySelector('[name=note]').value.trim(),
    };
    if (t) {
      const h = el.querySelector('[name=history]')?.value.trim();
      if (h) patch.history = [...(t.history || []), { at: now(), text: h }];
      update('tools', t.id, patch);
    } else {
      add('tools', { ...patch, links: [], history: [] });
    }
    close(); toast('已保存'); rerender();
  };
  el.querySelector('[data-del]')?.addEventListener('click', async () => {
    const ok = await confirmBox('删除这个工具', '删除后不可恢复，版本历史一并删除。', { danger: true, okText: '删除' });
    if (ok) { remove('tools', t.id); close(); toast('已删除'); rerender(); }
  });
}
