// 交互测试：新建任务→完成→快速记录→AI规则建议→归位→导出
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8899';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const out = {};

  await page.goto(BASE + '/index.html#/tasks', { waitUntil: 'networkidle' });

  // 1. 新建任务
  await page.click('[data-action="new-task"]');
  await page.fill('.modal [name=title]', '交互测试任务甲');
  await page.selectOption('.modal [name=status]', 'confirm');
  await page.click('.modal [data-save]');
  await page.waitForTimeout(300);
  out.taskCreated = (await page.textContent('#view')).includes('交互测试任务甲');

  // 2. 完成任务（点圆圈）
  const row = page.locator('.task-row', { hasText: '交互测试任务甲' });
  await row.locator('[data-act="toggle"]').click();
  await page.waitForTimeout(300);
  out.taskToggled = await page.locator('.task-row', { hasText: '交互测试任务甲' }).count() === 0; // confirm→done 后从待确认区消失

  // 3. 快速记录到收集箱
  await page.goto(BASE + '/index.html#/inbox', { waitUntil: 'networkidle' });
  await page.click('[data-action="quick"]');
  await page.fill('.modal [name=content]', '这个候选人简历质量不错，约面试');
  await page.click('.modal [data-save]');
  await page.waitForTimeout(300);
  out.inboxSaved = (await page.textContent('#view')).includes('约面试');

  // 4. AI 规则建议（无 key 时走规则引擎）
  await page.click('[data-act="ai-suggest"]');
  await page.waitForTimeout(500);
  const cardText = await page.textContent('#view');
  out.aiSuggested = cardText.includes('建议归入「候选池」');

  // 5. 确认归位（会弹确认框）
  await page.click('[data-act="accept"]');
  await page.waitForTimeout(200);
  await page.click('.modal [data-yes]');
  await page.waitForTimeout(300);
  out.sortedMarked = (await page.textContent('#view')).includes('已归位');

  // 6. 归位产物出现在候选池（作为项目）
  await page.goto(BASE + '/index.html#/candidates', { waitUntil: 'networkidle' });
  out.landedInCandidates = (await page.textContent('#view')).includes('候选人简历质量不错');

  // 7. 帮助问号弹层
  await page.click('.page-head .help-dot');
  await page.waitForTimeout(300);
  out.helpPopShown = await page.isVisible('.help-pop');
  out.helpHas5Sections = (await page.textContent('.help-pop')).includes('出错怎么办');

  // 8. 搜索找回
  await page.goto(BASE + '/index.html#/search', { waitUntil: 'networkidle' });
  await page.fill('#search-input', '交互测试');
  await page.waitForTimeout(200);
  out.searchFound = await page.locator('.result-item').count() > 0;

  // 9. 删除确认框出现
  await page.goto(BASE + '/index.html#/tasks', { waitUntil: 'networkidle' });
  const doneRow = page.locator('.task-row', { hasText: '交互测试任务甲' });
  out.doneTaskVisible = await doneRow.count() > 0;
  if (out.doneTaskVisible) {
    await doneRow.locator('[data-act="del"]').click();
    await page.waitForTimeout(200);
    out.confirmShown = await page.isVisible('.modal');
    await page.click('.modal [data-yes]');
    await page.waitForTimeout(300);
    out.taskDeleted = await page.locator('.task-row', { hasText: '交互测试任务甲' }).count() === 0;
  }

  out.pageErrors = errors;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
