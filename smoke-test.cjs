// 冒烟测试：加载页面、抓控制台错误、三个手机尺寸检查底部导航/横向滚动/触控区
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8899';
const SIZES = [
  { name: '360x800', width: 360, height: 800 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
];

(async () => {
  const browser = await chromium.launch();
  const results = { consoleErrors: [], sizes: {}, desktop: {} };

  // 桌面端检查
  const dpage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  dpage.on('console', m => { if (m.type() === 'error') results.consoleErrors.push('[desktop] ' + m.text()); });
  dpage.on('pageerror', e => results.consoleErrors.push('[desktop pageerror] ' + e.message));
  await dpage.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
  await dpage.waitForTimeout(600);
  results.desktop.sidebarVisible = await dpage.isVisible('#sidebar');
  results.desktop.bottomNavHidden = !(await dpage.isVisible('#bottom-nav'));
  results.desktop.title = await dpage.textContent('#topbar-title').catch(() => '(顶栏隐藏)');
  results.desktop.todayRendered = (await dpage.textContent('#view')).includes('今日');
  // 桌面走查各路由
  for (const r of ['candidates', 'content', 'tools', 'inbox', 'search', 'ai', 'settings', 'docs', 'changelog', 'more']) {
    await dpage.goto(BASE + '/index.html#/' + r, { waitUntil: 'networkidle' });
    await dpage.waitForTimeout(300);
    const len = (await dpage.textContent('#view')).trim().length;
    if (r === 'search') {
      results.desktop['route_' + r] = (await dpage.isVisible('#search-input')) ? 'OK(输入框就绪)' : 'NO INPUT!';
      // 交互验证：搜示例关键词应出结果
      await dpage.fill('#search-input', '示例');
      await dpage.waitForTimeout(200);
      results.desktop['route_search_hits'] = await dpage.locator('.result-item').count();
      continue;
    }
    results.desktop['route_' + r] = len > 20 ? 'OK(' + len + '字符)' : 'EMPTY!';
  }
  await dpage.close();

  // 手机三尺寸检查
  for (const s of SIZES) {
    const page = await browser.newPage({ viewport: { width: s.width, height: s.height } });
    page.on('console', m => { if (m.type() === 'error') results.consoleErrors.push(`[${s.name}] ` + m.text()); });
    page.on('pageerror', e => results.consoleErrors.push(`[${s.name} pageerror] ` + e.message));
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const r = {};
    r.bottomNavVisible = await page.isVisible('#bottom-nav');
    r.sidebarHidden = !(await page.isVisible('#sidebar'));
    r.navEntryCount = await page.locator('#bottom-nav > *').count();
    // 底部导航占满宽度：各入口等宽
    const widths = await page.locator('#bottom-nav > *').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().width)));
    r.navWidths = widths;
    r.navEqualWidth = widths.every(w => Math.abs(w - widths[0]) <= 1);
    // 横向滚动检测
    r.noHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    // 触控区：底部导航入口 >= 44px 高
    r.touchHeights = await page.locator('#bottom-nav > *').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
    r.minTouchOk = r.touchHeights.every(h => h >= 44);
    // 内容不被底部导航遮挡：主内容底部 padding
    r.contentNotCovered = await page.evaluate(() => {
      const main = document.getElementById('main');
      const padBottom = parseFloat(getComputedStyle(main).paddingBottom);
      const navH = document.getElementById('bottom-nav').getBoundingClientRect().height;
      return padBottom >= navH;
    });
    // 更多页不为空白
    await page.goto(BASE + '/index.html#/more', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    r.morePageCells = await page.locator('.menu-cell').count();
    results.sizes[s.name] = r;
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
