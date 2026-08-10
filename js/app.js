// 应用入口：路由 + 导航装配
import { load } from './store.js';
import { icon } from './icons.js';
import { bindHelp, closeHelp } from './ui.js';
import { renderDashboard } from './views-dashboard.js';
import { renderTasks, renderInbox, quickAdd } from './views-today.js';
import { renderCandidates, renderContent } from './views-work.js';
import { renderMore, renderSearch, renderAI, renderSettings, renderDocs, renderChangelog } from './views-system.js';

const ROUTES = [
  { path: 'dashboard', title: '工作台', icon: 'today', render: renderDashboard, nav: 'main' },
  { path: 'tasks', title: '任务', icon: 'task', render: renderTasks, nav: 'main' },
  { path: 'candidates', title: '候选池', icon: 'candidates', render: renderCandidates, nav: 'main' },
  { path: 'inbox', title: '收集箱', icon: 'inbox', render: renderInbox, nav: 'side' },
  { path: 'search', title: '搜索', icon: 'search', render: renderSearch, nav: 'side' },
  { path: 'ai', title: 'AI 帮手', icon: 'ai', render: renderAI, nav: 'side' },
  { path: 'content', title: '内容创作', icon: 'content', render: renderContent, nav: 'none' },
  { path: 'settings', title: '设置与数据', icon: 'settings', render: renderSettings, nav: 'side' },
  { path: 'docs', title: '使用说明', icon: 'doc', render: renderDocs, nav: 'none' },
  { path: 'changelog', title: '更新日志', icon: 'history', render: renderChangelog, nav: 'none' },
  { path: 'more', title: '更多', icon: 'more', render: renderMore, nav: 'none' },
];

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [path, param] = hash.split('/');
  const base = path.split('?')[0] || 'dashboard';
  const route = ROUTES.find(r => r.path === base) || ROUTES[0];
  return { route, param: param ? param.split('?')[0] : null };
}

export function renderCurrent() {
  const { route, param } = currentRoute();
  const view = document.getElementById('view');
  closeHelp();
  try {
    route.render(view, param);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="err-box">页面渲染出错：${e.message}。数据未受影响，可刷新重试。</div>`;
  }
  document.getElementById('topbar-title').textContent = route.title;
  document.title = `${route.title} · Rick工作台`;
  markActive(route.path);
  document.getElementById('main').scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

function markActive(path) {
  document.querySelectorAll('#side-nav a, #bottom-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === path);
  });
}

function buildSideNav() {
  const nav = document.getElementById('side-nav');
  const main = ROUTES.filter(r => r.nav === 'main');
  const side = ROUTES.filter(r => r.nav === 'side');
  nav.innerHTML = `
    ${main.map(r => `<a href="#/${r.path}" data-route="${r.path}">${icon(r.icon)}${r.title}</a>`).join('')}
    <div class="nav-group">公共能力</div>
    ${side.map(r => `<a href="#/${r.path}" data-route="${r.path}">${icon(r.icon)}${r.title}</a>`).join('')}`;
}

// 手机底部导航：工作台 / 候选池 / ＋ / 更多
function buildBottomNav() {
  const nav = document.getElementById('bottom-nav');
  nav.innerHTML = `
    <a href="#/dashboard" data-route="dashboard">${icon('today')}<span>工作台</span></a>
    <a href="#/candidates" data-route="candidates">${icon('candidates')}<span>候选池</span></a>
    <button class="fab" id="fab-add" aria-label="快速记录"><span class="fab-circle">${icon('plus')}</span><span>记录</span></button>
    <a href="#/more" data-route="more">${icon('more')}<span>更多</span></a>`;
  nav.querySelector('#fab-add').onclick = () => quickAdd();
}

function buildTopbar() {
  const menuBtn = document.getElementById('topbar-menu');
  const searchBtn = document.getElementById('topbar-search');
  menuBtn.innerHTML = icon('menu');
  searchBtn.innerHTML = icon('search');
  menuBtn.onclick = () => { location.hash = '#/more'; };
  searchBtn.onclick = () => { location.hash = '#/search'; };
}

function boot() {
  load();
  buildSideNav();
  buildBottomNav();
  buildTopbar();
  bindHelp(document);
  if (!location.hash) location.hash = '#/dashboard';
  window.addEventListener('hashchange', renderCurrent);
  renderCurrent();
}

boot();
