// 系统能力：更多 / 搜索 / AI 帮手 / 设置与数据（使用说明、更新日志、备份恢复、AI 配置）
import { data, searchAll, exportJSON, importJSON, resetAll, stats, save, todayStr } from './store.js';
import { icon } from './icons.js';
import { esc, toast, openModal, confirmBox, helpBtn, fmtFull } from './ui.js';
import { aiReady, llmSummary, todayBrief, suggestFor } from './ai.js';

const rerender = () => import('./app.js').then(m => m.renderCurrent());

// ============ 更多 ============
export function renderMore(view) {
  const cells = [
    { hash: '#/content', icon: 'content', name: '内容创作', desc: '选题 · 草稿 · 发布' },
    { hash: '#/inbox', icon: 'inbox', name: '收集箱', desc: '临时记录与归类' },
    { hash: '#/search', icon: 'search', name: '搜索', desc: '跨模块找回内容' },
    { hash: '#/ai', icon: 'ai', name: 'AI 帮手', desc: '规则引擎 + 大模型' },
    { hash: '#/settings', icon: 'settings', name: '设置与数据', desc: '备份 · AI 配置 · 说明' },
    { hash: '#/docs', icon: 'doc', name: '使用说明', desc: '工作台完整说明书' },
    { hash: '#/changelog', icon: 'history', name: '更新日志', desc: '每次更新的记录' },
  ];
  view.innerHTML = `
    <div class="page-head"><h2>更多</h2></div>
    <div class="menu-grid">
      ${cells.map(c => `
        <a class="menu-cell" href="${c.hash}">${icon(c.icon)}
          <span class="mc-name">${c.name}</span><span class="mc-desc">${c.desc}</span></a>`).join('')}
    </div>`;
}

// ============ 搜索 ============
export function renderSearch(view) {
  view.innerHTML = `
    <div class="page-head"><h2>搜索</h2>${helpBtn('search')}</div>
    <div class="search-box">
      <input type="text" id="search-input" placeholder="搜任务、候选人、项目、内容、收集箱" style="padding:10px 14px;border:1px solid var(--border);border-radius:10px;font-size:15px;font-family:var(--font);min-height:44px">
    </div>
    <div id="search-results"></div>`;
  const input = view.querySelector('#search-input');
  const results = view.querySelector('#search-results');
  const doSearch = () => {
    const kw = input.value.trim();
    if (!kw) { results.innerHTML = ''; return; }
    const hits = searchAll(kw);
    if (!hits.length) {
      results.innerHTML = `<div class="empty">${icon('search')}<p>没有找到「${esc(kw)}」相关的内容。</p></div>`;
      return;
    }
    const groups = {};
    hits.forEach(h => { (groups[h.collLabel] = groups[h.collLabel] || []).push(h); });
    const routeOf = (h) => h.coll === 'candidates' ? `#/candidates/${h.item.id}` : { tasks: '#/tasks', projects: '#/candidates', contents: '#/content', inbox: '#/inbox' }[h.coll];
    const titleOf = (h) => h.item.title || h.item.name || h.item.content;
    const hl = (s) => esc(s || '').replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`);
    results.innerHTML = Object.entries(groups).map(([label, list]) => `
      <div class="result-group">
        <div class="sec-title">${label}<span class="tag gray">${list.length}</span></div>
        ${list.map(h => `
          <a class="result-item task-row" href="${routeOf(h)}">
            <div class="t-body">
              <div class="t-title">${hl((titleOf(h) || '').slice(0, 60))}</div>
              <div class="t-meta">${hl((h.item.note || h.item.stage || h.item.status || '').toString().slice(0, 60))}</div>
            </div>
          </a>`).join('')}
      </div>`).join('');
  };
  input.addEventListener('input', doSearch);
  input.focus();
  if (location.hash.includes('?q=')) {
    input.value = decodeURIComponent(location.hash.split('?q=')[1] || '');
    doSearch();
  }
}

// ============ AI 帮手 ============
export function renderAI(view) {
  const s = data().settings;
  view.innerHTML = `
    <div class="page-head"><h2>AI 帮手</h2>${helpBtn('ai')}</div>
    <div class="card tint-green" style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b>规则引擎</b><span class="tag green">始终可用 · 免费 · 离线</span></div>
      <p style="font-size:13.5px;color:var(--text-2)">今日聚合摘要、收集箱关键词归类建议，不需要联网和任何 Key。</p>
      <div style="margin-top:10px"><button class="btn" data-action="brief">${icon('today')}生成今日摘要</button></div>
      <div id="brief-out" style="margin-top:10px"></div>
    </div>
    <div class="card tint-blue">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap"><b>大模型</b>
        ${aiReady() ? '<span class="tag blue">已启用</span>' : '<span class="tag gray">未配置</span>'}</div>
      <p style="font-size:13.5px;color:var(--text-2)">填自己的 DeepSeek / Kimi Key 后启用。用于更准的收集箱归类和工作复盘建议。Key 只保存在本机浏览器，直连官方 API，费用走你自己的账号。</p>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn primary" data-action="review" ${aiReady() ? '' : 'disabled'}>${icon('ai')}生成本周推进建议</button>
        <a class="btn ghost" href="#/settings">去配置 Key</a>
      </div>
      <div id="review-out" style="margin-top:10px"></div>
    </div>`;

  view.querySelector('[data-action="brief"]').onclick = () => {
    view.querySelector('#brief-out').innerHTML = `<div class="ai-preview"><h4>${icon('today')}今日摘要（规则引擎生成）</h4><div class="ai-diff">${esc(todayBrief())}</div></div>`;
  };
  view.querySelector('[data-action="review"]').onclick = async () => {
    const out = view.querySelector('#review-out');
    out.innerHTML = '<div class="loading">模型思考中…</div>';
    try {
      const text = await llmSummary();
      out.innerHTML = `<div class="ai-preview"><h4>${icon('ai')}推进建议（仅供参考）</h4><div class="ai-diff">${esc(text)}</div></div>`;
    } catch (err) {
      out.innerHTML = `<div class="err-box">${esc(err.message)}</div>`;
    }
  };
}

// ============ 设置与数据 ============
export function renderSettings(view) {
  const s = data().settings;
  const st = stats();
  view.innerHTML = `
    <div class="page-head"><h2>设置与数据</h2>${helpBtn('settings')}</div>
    <div class="settings-list">
      <div class="card">
        <div class="sec-title" style="margin-top:0">AI 配置</div>
        <div class="field"><label>服务商</label><select id="ai-provider">
          <option value="deepseek" ${s.aiProvider === 'deepseek' ? 'selected' : ''}>DeepSeek</option>
          <option value="kimi" ${s.aiProvider === 'kimi' ? 'selected' : ''}>Kimi（月之暗面）</option>
        </select></div>
        <div class="field"><label>API Key（只保存在本机浏览器）</label><input type="password" id="ai-key" value="${esc(s.aiKey)}" placeholder="sk-..."></div>
        <div class="settings-row">
          <div class="sr-body"><div class="sr-name">启用大模型能力</div><div class="sr-desc">关闭时只用免费规则引擎</div></div>
          <input type="checkbox" id="ai-enabled" ${s.aiEnabled ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--accent)">
        </div>
        <div class="form-actions"><button class="btn primary" data-action="save-ai">保存 AI 配置</button></div>
      </div>
      <div class="card">
        <div class="sec-title" style="margin-top:0">数据备份</div>
        <p style="font-size:13.5px;color:var(--text-2);margin-bottom:12px">数据只存在这台设备的浏览器里。当前：任务 ${st.tasks} 条、候选人 ${st.candidates} 位、项目 ${st.projects} 个、内容 ${st.contents} 条、收集箱 ${st.inbox} 条。建议每周导出一次。</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" data-action="export">${icon('export')}导出备份（JSON）</button>
          <button class="btn" data-action="import">${icon('import')}导入恢复</button>
        </div>
      </div>
      <div class="card">
        <div class="sec-title" style="margin-top:0">说明与日志</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <a class="btn" href="#/docs">${icon('doc')}使用说明</a>
          <a class="btn" href="#/changelog">${icon('history')}更新日志</a>
        </div>
      </div>
      <div class="card">
        <div class="sec-title" style="margin-top:0">危险区</div>
        <p style="font-size:13.5px;color:var(--text-2);margin-bottom:12px">重置会清空所有数据并恢复示例内容，操作前请务必先导出备份。</p>
        <button class="btn danger" data-action="reset">${icon('warn')}清空并重置</button>
      </div>
    </div>`;

  view.querySelector('[data-action="save-ai"]').onclick = () => {
    const d = data();
    d.settings.aiProvider = view.querySelector('#ai-provider').value;
    d.settings.aiKey = view.querySelector('#ai-key').value.trim();
    d.settings.aiEnabled = view.querySelector('#ai-enabled').checked;
    save();
    toast('AI 配置已保存');
  };
  view.querySelector('[data-action="export"]').onclick = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rick-workbench-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('备份已下载');
  };
  view.querySelector('[data-action="import"]').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = async () => {
      const file = inp.files[0];
      if (!file) return;
      const text = await file.text();
      try { JSON.parse(text); } catch { toast('文件不是有效的 JSON', true); return; }
      const ok = await confirmBox('导入并覆盖当前数据', '导入会整体替换现有全部数据。建议先导出当前数据再导入。', { danger: true, okText: '导入覆盖' });
      if (!ok) return;
      try { importJSON(text); toast('导入成功'); rerender(); } catch (e) { toast('导入失败：' + e.message, true); }
    };
    inp.click();
  };
  view.querySelector('[data-action="reset"]').onclick = async () => {
    const ok = await confirmBox('清空所有数据', '这会删除你的全部数据，恢复成示例内容。不可撤销！', { danger: true, okText: '我确定，清空' });
    if (ok) { resetAll(); toast('已重置'); rerender(); }
  };
}

// ============ 使用说明 ============
export function renderDocs(view) {
  view.innerHTML = `
    <div class="page-head"><h2>使用说明</h2>${helpBtn('settings')}</div>
    <div class="card doc-body">
      <h3>这个工作台是什么</h3>
      <p>Rick工作台 是面向招聘 COE 日常工作的个人工作台。核心场景：候选人跟踪、招聘项目管理、面试入职安排、任务管理。电脑和手机打开同一个网址，自动适配。</p>
      <h3>账号与登录</h3>
      <p><b>没有账号系统，打开即用。</b>任何人拿到网址都能看到界面，但看不到你的数据。</p>
      <h3>数据保存在哪</h3>
      <table>
        <tr><th>问题</th><th>答案</th></tr>
        <tr><td>存哪</td><td>浏览器 localStorage（本机）</td></tr>
        <tr><td>会上传服务器吗</td><td>不会。GitHub Pages 只存网页代码</td></tr>
        <tr><td>换设备能看到吗</td><td>不能，需要导出备份 → 新设备导入恢复</td></tr>
        <tr><td>清浏览器缓存会怎样</td><td>数据全丢。请每周导出备份</td></tr>
      </table>
      <h3>AI 能力</h3>
      <table>
        <tr><th>层</th><th>能力</th><th>费用</th></tr>
        <tr><td>规则引擎（内置）</td><td>今日摘要、收集箱归类</td><td>免费，离线可用</td></tr>
        <tr><td>大模型（可选）</td><td>更准的归类、推进建议</td><td>填自己的 DeepSeek/Kimi Key，按你账号计费</td></tr>
      </table>
      <h3>导出 / 备份 / 恢复 / 迁移</h3>
      <ul>
        <li>导出：设置与数据 → 导出备份，得到 JSON 文件</li>
        <li>恢复：设置与数据 → 导入恢复，选择之前的 JSON</li>
        <li>迁移：旧设备导出 → 传到新设备 → 导入</li>
      </ul>
      <h3>费用</h3>
      <table>
        <tr><th>项</th><th>费用</th></tr>
        <tr><td>托管</td><td>0（GitHub Pages 免费）</td></tr>
        <tr><td>规则引擎 AI</td><td>0（离线内置）</td></tr>
        <tr><td>大模型 AI</td><td>按你自己的 Key 计费</td></tr>
        <tr><td>数据库</td><td>0（浏览器 localStorage）</td></tr>
      </table>
      <h3>本版未启用的能力</h3>
      <ul>
        <li>多设备自动同步、云端数据库</li>
        <li>账号登录与多人协作</li>
        <li>读取本地文件（浏览器安全限制）</li>
        <li>Obsidian 等外部知识库直连</li>
      </ul>
    </div>`;
}

// ============ 更新日志 ============
export function renderChangelog(view) {
  const log = data().meta.changelog;
  view.innerHTML = `
    <div class="page-head"><h2>更新日志</h2></div>
    <p class="page-sub">每次更新记录日期、内容、影响范围和你是否需要操作。</p>
    ${log.map(e => `
      <div class="changelog-item">
        <div class="cl-date">${esc(e.date)} · 影响范围：${esc(e.impact)}</div>
        <div class="cl-title">${esc(e.title)}</div>
        <div class="cl-desc">${esc(e.desc)}</div>
        <div class="cl-desc" style="margin-top:4px"><b>需要你操作：</b>${esc(e.needAction)}</div>
      </div>`).join('')}`;
}
