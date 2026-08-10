// 仪表盘专项测试：卡片渲染、甘特图、管理卡片、拖拽属性
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8899';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const out = {};

  await page.goto(BASE + '/index.html#/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  // 1. 默认卡片渲染
  out.cardCount = await page.locator('.dash-card').count();
  const text = await page.textContent('#view');
  out.hasStatsCard = text.includes('今日面试') && text.includes('今日入职');
  out.hasGantt = text.includes('项目甘特图') && text.includes('院校清单确认');
  out.hasPositions = text.includes('2027届校园招聘') && text.includes('注塑机辅机高级产品经理');
  out.hasPendingStages = text.includes('待面试') && text.includes('待入职');

  // 2. 甘特条渲染
  out.ganttBars = await page.locator('.gantt-bar').count();
  out.ganttActiveBar = await page.locator('.gantt-bar.active').count();

  // 3. 管理卡片弹窗
  await page.click('[data-action="customize"]');
  await page.waitForTimeout(200);
  out.customizeModalShown = await page.isVisible('.modal');
  out.toggleCount = await page.locator('[data-toggle]').count();
  // 隐藏「近 7 天完成」
  await page.uncheck('[data-toggle="week-done"]');
  await page.click('[data-save-cards]');
  await page.waitForTimeout(300);
  out.cardHiddenWorks = !(await page.textContent('#view')).includes('近 7 天完成');
  // 恢复
  await page.click('[data-action="customize"]');
  await page.check('[data-toggle="week-done"]');
  await page.click('[data-save-cards]');
  await page.waitForTimeout(300);
  out.cardRestoreWorks = (await page.textContent('#view')).includes('近 7 天完成');

  // 4. 看板拖拽属性
  await page.goto(BASE + '/index.html#/candidates', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  out.draggableCards = await page.locator('.board-card[draggable="true"]').count();
  out.dropZones = await page.locator('.board-drop').count();

  // 5. 模拟拖拽（Playwright dragTo）
  const src = page.locator('.board-card', { hasText: '周示例' });
  const target = page.locator('[data-drop-stage="待面试"]');
  await src.dragTo(target);
  await page.waitForTimeout(400);
  out.dragMovedCard = (await page.locator('[data-drop-stage="待面试"]').textContent()).includes('周示例');

  // 6. 候选人表单新字段
  await page.click('[data-action="new-cand"]');
  await page.waitForTimeout(200);
  out.hasInterviewDateField = await page.isVisible('.modal [name=interviewDate]');
  out.hasOnboardDateField = await page.isVisible('.modal [name=onboardDate]');
  await page.click('.modal [data-close]');

  // 7. 项目表单甘特阶段字段
  await page.click('[data-action="new-project"]');
  await page.waitForTimeout(200);
  out.hasPhasesField = await page.isVisible('.modal [name=phases]');
  await page.click('.modal [data-close]');

  // 8. 底部导航是「工作台」
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mob.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await mob.waitForTimeout(300);
  out.mobileNavLabels = await mob.locator('#bottom-nav a span, #bottom-nav button > span:last-child').allTextContents();
  await mob.close();

  out.pageErrors = errors;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
