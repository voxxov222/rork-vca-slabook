import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  const base = process.env.VCA_SMOKE_URL ?? 'https://6cu1lfh2z1a14gllh5wnf-web.rork.live';
  await page.goto(`${base}/scanner`);
  await page.getByRole('button', { name: 'Search without a photo' }).click();
  await page.getByLabel('Card name', { exact: true }).fill('Charizard');
  await page.getByLabel('Set (optional)', { exact: true }).fill('Base Set');
  await page.getByLabel('Number', { exact: true }).fill('4/102');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: /Charizard.*Base Set.*4\/102/ }).first().click({ timeout: 45000 });
  await page.getByRole('combobox').first().selectOption('Holofoil');
  await page.getByRole('button', { name: 'Confirm this card' }).click();
  await page.getByRole('heading', { name: 'Charizard', exact: true }).waitFor();
  await page.getByText('TCGPlayer via TCGdex', { exact: false }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Add to collection', exact: true }).click();
  await page.getByRole('button', { name: 'Slab Studio', exact: true }).click();
  await page.getByRole('heading', { name: 'Made to be displayed.' }).waitFor();
  await page.getByRole('button', { name: 'Create ungraded digital display' }).click();
  await page.getByRole('button', { name: 'Digital display saved' }).waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  await page.screenshot({ path: '/tmp/vca-studio-mobile.png', fullPage: true });
  if (overflow || errors.length) throw new Error(JSON.stringify({ overflow, errors }));
  console.log('PASS: live catalog search → exact confirmation → USD quote → collection → ungraded studio display. Mobile layout has no horizontal overflow.');
} catch (error) { console.log((await page.locator('main').innerText()).slice(-3500)); await page.screenshot({ path: '/tmp/vca-smoke-failure.png', fullPage: true }); throw error; } finally { await browser.close(); }
