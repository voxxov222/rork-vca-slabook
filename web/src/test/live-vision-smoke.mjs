import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
// Optional test-only setting for sandboxes whose Chromium trust store lacks the network CA.
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: process.env.VCA_SMOKE_ALLOW_SANDBOX_CA === '1' });
page.on('response', async response => { if (response.url().includes('/chat/completions')) { try { const body = await response.json(); console.log('VISION RESPONSE', JSON.stringify({ status: response.status(), keys: Object.keys(body), finish: body.choices?.[0]?.finish_reason, contentLength: body.choices?.[0]?.message?.content?.length, usage: body.usage })); } catch { console.log('VISION RESPONSE non-JSON', response.status()); } } });
page.on('requestfailed', request => console.log('REQUEST FAILED', new URL(request.url()).origin + new URL(request.url()).pathname, request.failure()?.errorText));
page.on('console', message => { if (message.type() === 'error') console.log('BROWSER ERROR', message.text().slice(0, 700)); });
try {
  const base = process.env.VCA_SMOKE_URL ?? 'https://6cu1lfh2z1a14gllh5wnf-web.rork.live';
  await page.goto(`${base}/scanner`);
  const photo = await fetch('https://assets.tcgdex.net/en/base/base1/4/high.webp');
  if (!photo.ok) throw new Error('Reference card image unavailable');
  await page.locator('input[type=file]').setInputFiles({ name: 'reference-charizard.webp', mimeType: 'image/webp', buffer: Buffer.from(await photo.arrayBuffer()) });
  await page.getByRole('button', { name: 'Identify this photo' }).click();
  await Promise.race([page.getByRole('heading', { name: 'Confirm the exact printing.' }).waitFor({ timeout: 50000 }), page.getByRole('alert').waitFor({ timeout: 50000 }).then(async () => { throw new Error(await page.getByRole('alert').innerText()); })]);
  await page.getByRole('button', { name: 'Search', exact: true }).waitFor({ timeout: 20000 });
  const name = await page.getByLabel('Card name', { exact: true }).inputValue();
  if (!/charizard/i.test(name)) throw new Error(`Photo was not identified as the expected reference card: ${name}`);
  console.log('PASS: real uploaded reference image → Gemini photo identification → manual printing confirmation. This validates the service connection, not physical card authentication.');
} catch (error) { console.log((await page.locator('main').innerText()).slice(-2200)); throw error; } finally { await browser.close(); }
