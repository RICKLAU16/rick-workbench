// 系统能力：更多 / 搜索 / AI 帮手 / 设置与数据（使用说明、更新日志、备份恢复、AI 配置）
import { data, searchAll, exportJSON, importJSON, resetAll, stats, save, todayStr } from './store.js';
import { icon } from './icons.js';
import { esc, toast, openModal, confirmBox, helpBtn, fmtFull } from './ui.js';
import { aiReady, llmSummary, todayBrief, suggestFor } from './ai.js';

const rerender = () => import('./app.js').then(m => m.renderCurrent());

// ============ 更多（手机端「工作」入口，桌面端也可访问） ============
export function renderMore(view) {
  const cells = [
    { hash: '#/content', icon: 'content', name: '内容创作', desc: '选题 · 草稿 · 发布日历' },
    { hash: '#/tools', icon: 'tools', name: '工具与 Skill', desc: '版本与推广状态' },
    { hash: '#/inbox', icon: 'inbox', name: '收集箱', desc: '临时记录与归类' },
    { hash: '#/search', icon: 'search', name: '搜索', desc: '跨模块找回内容' },
    { hash: '#/ai', icon: 'ai', name: 'AI 帮手', desc: '规则引擎 + 大模型' },
    { hash: '#/settings', icon: 'settings', name: '设置与数据', desc: '备份 · AI 配置 · 说明' },
    { hash: '#/docs', icon: 'doc', name: '使用说明', desc: '工作台完整说明书' },
    { hash: '#/changelog', icon: 'history', name: '更新日志', desc: '每次更新的记录' },
  ];
  view.innerHTML = `
    <div class="page-head"><h2>工作</h2></div>
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
      <input type="text" id="search-input" placeholder="搜任务、候选人、项目、内容、工具、收集箱" style="padding:10px 14px;border:1px solid var(--border);border-radius:10px;font-size:15px;font-family:var(--font);min-height:44px">
    </div>
    <div id="search-results"></div>`;
  const input = view.querySelector('#search-input');
  const results = view.querySelector('#search-results');
  const doSearch = () => {
    const kw = input.value.trim();
    if (!kw) { results.innerHTML = ''; return; }
    const hits = searchAll(kw);
    if (!hits.length) {
      results.innerHTML = `<div class="empty">${icon('search')}<p>没有找到「${esc(kw)}」相关的内容。换个关键词，或先到设置导出备份用编辑器全文搜。</p></div>`;
      return;
    }
    const groups = {};
    hits.forEach(h => { (groups[h.collLabel] = groups[h.collLabel] || []).push(h); });
    const routeOf = (h) => h.coll === 'candidates' ? `#/candidates/${h.item.id}` : { tasks: '#/today', projects: '#/candidates', contents: '#/content', tools: '#/tools', inbox: '#/inbox' }[h.coll];
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
    view.querySelector('#brief-out').innerHTML = `<div class="ai-preview"><h4>${icon('today')}今日摘要（规则引擎生成，无需确认，不产生修改）</h4><div class="ai-diff">${esc(todayBrief())}</div></div>`;
  };
  view.querySelector('[data-action="review"]').onclick = async (e) => {
    const out = view.querySelector('#review-out');
    out.innerHTML = '<div class="loading">模型思考中…</div>';
    try {
      const text = await llmSummary();
      out.innerHTML = `<div class="ai-preview"><h4>${icon('ai')}推进建议（仅供参考，不会自动改动任何数据）</h4><div class="ai-diff">${esc(text)}</div></div>`;
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
        <p style="font-size:13.5px;color:var(--text-2);margin-bottom:12px">数据只存在这台设备的浏览器里。当前：任务 ${st.tasks} 条、候选人 ${st.candidates} 位、项目 ${st.projects} 个、内容 ${st.contents} 条、工具 ${st.tools} 个、收集箱 ${st.inbox} 条。建议每周导出一次。</p>
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
      try {
        JSON.parse(text);
      } catch { toast('文件不是有效的 JSON', true); return; }
      const ok = await confirmBox('导入并覆盖当前数据', '导入会整体替换现有全部数据。建议先导出当前数据再导入。', { danger: true, okText: '导入覆盖' });
      if (!ok) return;
      try {
        importJSON(text);
        toast('导入成功');
        rerender();
      } catch (e) {
        toast('导入失败：' + e.message, true);
      }
    };
    inp.click();
  };
  view.querySelector('[data-action="reset"]').onclick = async () => {
    const ok = await confirmBox('清空所有数据', '这会删除你的全部任务、候选人、项目、内容和收集箱记录，恢复成示例数据。此操作不可撤销！', { danger: true, okText: '我确定，清空' });
    if (ok) { resetAll(); toast('已重置'); rerender(); }
  };
}

// ============ 使用说明 ============
export function renderDocs(view) {
  view.innerHTML = `
    <div class="page-head"><h2>使用说明</h2>${helpBtn('settings')}</div>
    <div class="card doc-body">
      <h3>这个工作台是什么</h3>
      <p>Rick工作台 是一个纯静态网页应用，面向招聘 COE 的日常工作：候选人跟踪、招聘项目、内容创作、工具开发，加上收集箱、跨模块搜索和 AI 帮手。电脑端和手机端打开同一个网址，界面自动适配。</p>
      <h3>账号与登录</h3>
      <p><b>没有账号系统，打开即用。</b>任何人拿到网址都能看到界面，但看不到你的数据——数据只存在你自己设备的浏览器里。</p>
      <h3>数据保存在哪</h3>
      <table>
        <tr><th>问题</th><th>答案</th></tr>
        <tr><td>存哪</td><td>浏览器 localStorage（本机）</td></tr>
        <tr><td>会上传服务器吗</td><td>不会。托管平台只存网页代码</td></tr>
        <tr><td>换设备能看到吗</td><td>不能，需要在旧设备「导出备份」，新设备「导入恢复」</td></tr>
        <tr><td>清浏览器缓存会怎样</td><td>数据全丢，无法找回。请每周导出备份</td></tr>
      </table>
      <h3>同步</h3>
      <p><b>本版未启用自动同步。</b>电脑和手机各存各的数据，靠导出/导入 JSON 手动搬运。自动同步需要服务器和数据库，属于后续迭代项。</p>
      <h3>AI 能力</h3>
      <table>
        <tr><th>层</th><th>能力</th><th>费用</th></tr>
        <tr><td>规则引擎（内置）</td><td>今日摘要、收集箱关键词归类</td><td>免费，离线可用</td></tr>
        <tr><td>大模型（可选）</td><td>更准的归类、周推进建议</td><td>填自己的 DeepSeek/Kimi Key，按你自己账号用量计费，Key 只存本机</td></tr>
      </table>
      <p>重要原则：AI 的建议（如收集箱归位）必须你确认后才执行；AI 不会自动修改任何数据。</p>
      <h3>导出 / 备份 / 恢复 / 迁移</h3>
      <ul>
        <li>导出：设置与数据 → 导出备份，得到一个 JSON 文件</li>
        <li>恢复：设置与数据 → 导入恢复，选择之前的 JSON（会覆盖当前数据，先确认）</li>
        <li>迁移到新设备：旧设备导出 → 文件传到新设备 → 新设备导入</li>
      </ul>
      <h3>服务器、数据库、API 与费用</h3>
      <table>
        <tr><th>项</th><th>现状</th><th>费用</th></tr>
        <tr><td>服务器</td><td>GitHub Pages 静态托管，无后端</td><td>免费</td></tr>
        <tr><td>数据库</td><td>无服务端数据库，用浏览器 localStorage</td><td>免费</td></tr>
        <tr><td>API</td><td>仅大模型功能调用 DeepSeek/Kimi 官方 API（你启用时）</td><td>你自己的 Key，按量计费（DeepSeek 约为每百万 token 数元）</td></tr>
        <tr><td>域名</td><td>GitHub 免费二级域名</td><td>免费</td></tr>
      </table>
      <h3>本版未启用的能力（如实说明）</h3>
      <ul>
        <li>多设备自动同步、云端数据库</li>
        <li>账号登录与多人协作</li>
        <li>读取本地文件（浏览器安全限制，网页访问不到你的磁盘文件）</li>
        <li>Obsidian 等外部知识库直连（已规划为后续迭代）</li>
        <li>微信/抖音/招聘平台的数据抓取与自动发布</li>
      </ul>
      <h3>出错怎么办</h3>
      <ul>
        <li>页面异常：刷新页面；数据仍在</li>
        <li>数据异常：设置 → 导入最近一次备份</li>
        <li>AI 报错：检查 Key、余额、网络；规则引擎不受影响</li>
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
