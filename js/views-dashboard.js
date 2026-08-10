// 仪表盘：可自定义卡片的主页
import { data, update, save, todayStr, DEFAULT_DASHBOARD } from './store.js';
import { icon } from './icons.js';
import { esc, toast, openModal, confirmBox, helpBtn, fmtDate, fmtFull } from './ui.js';

const rerender = () => import('./app.js').then(m => m.renderCurrent());

// 卡片注册表
const CARD_TYPES = {
  'stats': { name: '今日概览', desc: '面试/入职/待办/逾期 四个数字' },
  'tasks': { name: '今日待办', desc: '今天要做和待确认的事' },
  'overdue': { name: '逾期工作', desc: '已过期未完成的任务' },
  'interview-today': { name: '今日面试', desc: '今天有面试的候选人' },
  'pending-stages': { name: '待面试 / 待入职', desc: '两个阶段的候选人数' },
  'week-done': { name: '近 7 天完成', desc: '最近一周完成的事项' },
  'positions': { name: '我负责的岗位', desc: '进行中的招聘项目' },
  'gantt': { name: '项目甘特图', desc: '校招等项目的时间线' },
};

function getCards() {
  const d = data();
  if (!d.settings.dashboardCards) return [...DEFAULT_DASHBOARD];
  return d.settings.dashboardCards;
}

function saveCards(cards) {
  data().settings.dashboardCards = cards;
  save();
}

export function renderDashboard(view) {
  const d = data();
  const today = todayStr();
  const cards = getCards().filter(c => c.visible);
  const week = ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()];

  view.innerHTML = `
    <div class="dash-header">
      <div>
        <div class="dash-date">${fmtFull(today)} · 星期${week}</div>
        <h2 class="dash-title">工作台</h2>
      </div>
      <div class="spacer"></div>
      ${helpBtn('dashboard')}
      <button class="btn" data-action="customize">${icon('settings')}管理卡片</button>
    </div>
    <div class="dash-grid" id="dash-grid">
      ${cards.map(c => renderCard(c, d)).join('')}
    </div>
    ${cards.length === 0 ? `
      <div class="empty">${icon('more')}<p>没有显示的卡片。点「管理卡片」添加你需要的模块。</p>
      <button class="btn primary" data-action="customize">${icon('settings')}管理卡片</button></div>` : ''}
  `;

  view.querySelectorAll('[data-action="customize"]').forEach(b => b.onclick = () => customizeModal());
  bindCardActions(view);
}

function renderCard(card, d) {
  const today = todayStr();
  const cands = d.candidates.filter(c => !c.deleted);
  const openTasks = d.tasks.filter(t => t.status !== 'done');
  const doneTasks = d.tasks.filter(t => t.status === 'done');
  const overdue = openTasks.filter(t => t.due && t.due < today);
  const todayTasks = openTasks.filter(t => t.due === today || t.status === 'confirm');
  const todayInterviews = cands.filter(c => c.interviewDate === today);
  const pendingInterview = cands.filter(c => c.stage === '待面试');
  const pendingOnboard = cands.filter(c => c.stage === 'Offer');
  const todayOnboard = cands.filter(c => c.onboardDate === today);

  let body = '';
  let cardClass = 'dash-card';

  switch (card.type) {
    case 'stats': {
      cardClass += ' dash-card-stats';
      body = `
        <div class="stat-grid">
          <div class="stat-cell"><b>${todayInterviews.length}</b><span>今日面试</span></div>
          <div class="stat-cell"><b>${todayOnboard.length}</b><span>今日入职</span></div>
          <div class="stat-cell"><b>${todayTasks.length}</b><span>今日待办</span></div>
          <div class="stat-cell${overdue.length ? ' warn' : ''}"><b>${overdue.length}</b><span>逾期</span></div>
        </div>`;
      break;
    }
    case 'tasks': {
      if (!todayTasks.length) { body = emptyMini('今日没有待办'); break; }
      body = todayTasks.slice(0, 5).map(t => `
        <div class="dash-task" data-task-id="${t.id}">
          <button class="check" data-act="toggle-task" data-id="${t.id}" aria-label="完成">
            ${t.status === 'done' ? icon('task') : ''}
          </button>
          <span class="dash-task-title">${esc(t.title)}</span>
          ${t.status === 'confirm' ? '<span class="tag pink">待确认</span>' : ''}
        </div>`).join('');
      if (todayTasks.length > 5) body += `<div class="dash-more"><a href="#/tasks">查看全部 ${todayTasks.length} 条</a></div>`;
      break;
    }
    case 'overdue': {
      if (!overdue.length) { body = emptyMini('没有逾期，很好'); break; }
      cardClass += ' dash-card-warn';
      body = overdue.slice(0, 5).map(t => `
        <div class="dash-task overdue-item" data-task-id="${t.id}">
          <span class="dash-task-title">${esc(t.title)}</span>
          <span class="tag pink">逾期 ${daysBetween(t.due, today)} 天</span>
        </div>`).join('');
      break;
    }
    case 'interview-today': {
      if (!todayInterviews.length) { body = emptyMini('今天没有面试安排'); break; }
      body = todayInterviews.map(c => `
        <div class="dash-cand" data-cand-id="${c.id}">
          <b>${esc(c.name)}</b>
          <span>${esc(c.role)}</span>
          <span class="tag blue">${esc(c.project)}</span>
        </div>`).join('');
      break;
    }
    case 'pending-stages': {
      cardClass += ' dash-card-duo';
      body = `
        <div class="duo-grid">
          <div class="duo-cell">
            <b>${pendingInterview.length}</b>
            <span>待面试</span>
            ${pendingInterview.slice(0, 3).map(c => `<div class="duo-name" data-cand-id="${c.id}">${esc(c.name)}</div>`).join('')}
          </div>
          <div class="duo-cell">
            <b>${pendingOnboard.length}</b>
            <span>待入职</span>
            ${pendingOnboard.slice(0, 3).map(c => `<div class="duo-name" data-cand-id="${c.id}">${esc(c.name)}</div>`).join('')}
          </div>
        </div>`;
      break;
    }
    case 'week-done': {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const recent = doneTasks.filter(t => t.updatedAt >= weekAgo).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      if (!recent.length) { body = emptyMini('近 7 天没有完成记录'); break; }
      body = recent.slice(0, 5).map(t => `
        <div class="dash-task done">
          <span class="dash-task-title done">${esc(t.title)}</span>
          <span class="dash-task-date">${fmtDate(t.updatedAt)}</span>
        </div>`).join('');
      break;
    }
    case 'positions': {
      const active = d.projects.filter(p => p.status !== '已收尾');
      if (!active.length) { body = emptyMini('没有进行中的项目'); break; }
      body = active.map(p => {
        const count = cands.filter(c => c.project === p.name).length;
        return `
          <div class="dash-proj" data-proj-name="${esc(p.name)}">
            <div class="dash-proj-head">
              <b>${esc(p.name)}</b>
              <span class="tag ${p.status === '进行中' ? 'green' : 'yellow'}">${esc(p.status)}</span>
            </div>
            <div class="dash-proj-meta">${esc(p.type)} · ${count} 人在流程中</div>
          </div>`;
      }).join('');
      break;
    }
    case 'gantt': {
      body = renderGantt(d);
      break;
    }
    default:
      body = emptyMini('未知卡片类型');
  }

  return `
    <div class="${cardClass}" data-card-id="${card.id}">
      <div class="dash-card-head">
        <h3>${esc(card.title)}</h3>
        <div class="spacer"></div>
        <button class="mini-btn dash-card-menu" data-card-menu="${card.id}" aria-label="卡片设置">${icon('settings')}</button>
      </div>
      <div class="dash-card-body">${body}</div>
    </div>`;
}

function renderGantt(d) {
  const withPhases = d.projects.filter(p => p.phases && p.phases.length);
  if (!withPhases.length) return emptyMini('没有设阶段的项目。在项目编辑里添加阶段后自动生成甘特图。');

  return withPhases.map(p => {
    const phases = p.phases;
    const allStarts = phases.map(ph => ph.start).sort();
    const allEnds = phases.map(ph => ph.end).sort();
    const rangeStart = allStarts[0];
    const rangeEnd = allEnds[allEnds.length - 1];
    const totalDays = daysBetween(rangeStart, rangeEnd) || 1;

    return `
      <div class="gantt-proj">
        <div class="gantt-proj-name">${esc(p.name)}</div>
        <div class="gantt-chart">
          ${phases.map(ph => {
            const left = (daysBetween(rangeStart, ph.start) / totalDays * 100).toFixed(1);
            const width = Math.max((daysBetween(ph.start, ph.end) / totalDays * 100), 2).toFixed(1);
            const cls = ph.status === '已完成' ? 'done' : ph.status === '进行中' ? 'active' : '';
            return `
              <div class="gantt-row">
                <span class="gantt-label">${esc(ph.name)}</span>
                <div class="gantt-track">
                  <div class="gantt-bar ${cls}" style="left:${left}%;width:${width}%"
                       title="${esc(ph.name)}：${ph.start} ~ ${ph.end}（${esc(ph.status)}）"></div>
                </div>
                <span class="gantt-dates">${ph.start.slice(5)} ~ ${ph.end.slice(5)}</span>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');
}

function bindCardActions(view) {
  // 任务完成/恢复
  view.querySelectorAll('[data-act="toggle-task"]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const t = data().tasks.find(x => x.id === btn.dataset.id);
      if (t) {
        update('tasks', t.id, { status: t.status === 'done' ? 'todo' : 'done' });
        rerender();
      }
    };
  });
  // 候选人点击跳详情
  view.querySelectorAll('[data-cand-id]').forEach(el => {
    el.style.cursor = 'pointer';
    el.onclick = () => location.hash = '#/candidates/' + el.dataset.candId;
  });
  // 项目点击跳候选池
  view.querySelectorAll('[data-proj-name]').forEach(el => {
    el.style.cursor = 'pointer';
    el.onclick = () => location.hash = '#/candidates';
  });
  // 卡片菜单（隐藏）
  view.querySelectorAll('[data-card-menu]').forEach(btn => {
    btn.onclick = () => {
      const cards = getCards();
      const card = cards.find(c => c.id === btn.dataset.cardMenu);
      if (card) {
        card.visible = false;
        saveCards(cards);
        toast(`已隐藏「${card.title}」，在「管理卡片」中可恢复`);
        rerender();
      }
    };
  });
}

// 卡片管理弹窗
function customizeModal() {
  const cards = getCards();
  const allTypes = Object.entries(CARD_TYPES);
  const activeIds = new Set(cards.map(c => c.id));

  const { close, el } = openModal('管理仪表盘卡片', `
    <p style="font-size:13.5px;color:var(--text-2);margin-bottom:14px">勾选要显示的卡片，拖动排序（上下按钮调整顺序）。</p>
    <div id="card-list">
      ${allTypes.map(([type, info]) => {
        const existing = cards.find(c => c.type === type);
        const isOn = existing ? existing.visible : false;
        return `
        <div class="card-toggle" data-type="${type}">
          <label class="card-toggle-label">
            <input type="checkbox" ${isOn ? 'checked' : ''} data-toggle="${type}">
            <span class="card-toggle-name">${info.name}</span>
            <span class="card-toggle-desc">${info.desc}</span>
          </label>
        </div>`;
      }).join('')}
    </div>
    <div class="form-actions">
      <button class="btn ghost" data-close>取消</button>
      <button class="btn primary" data-save-cards>保存</button>
    </div>`, { helpKey: 'dashboard' });

  el.querySelector('[data-save-cards]').onclick = () => {
    const toggles = el.querySelectorAll('[data-toggle]');
    const newCards = [];
    for (const t of toggles) {
      if (t.checked) {
        const type = t.dataset.toggle;
        const existing = cards.find(c => c.type === type);
        if (existing) {
          newCards.push({ ...existing, visible: true });
        } else {
          newCards.push({ id: type + '-' + Date.now(), type, title: CARD_TYPES[type].name, visible: true });
        }
      }
    }
    saveCards(newCards);
    close();
    toast('仪表盘已更新');
    rerender();
  };
}

function emptyMini(text) {
  return `<div class="dash-empty">${esc(text)}</div>`;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}
