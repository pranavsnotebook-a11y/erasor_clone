const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const BASE_URL = 'https://erasor-clone-nine.vercel.app';

  page.on('console', msg => {
    console.log('  [Console]', msg.text());
  });

  console.log('=== FILE CREATION TEST ===\n');

  // Login
  console.log('1. Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(2000);
  await page.fill('input[id="username"]', 'NOTEBOOK');
  await page.fill('input[id="password"]', 'eeyertiaMihtsawA');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  // Go to dashboard
  console.log('\n2. Going to dashboard...');
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForTimeout(5000);

  // Check file count before
  const filesBefore = await page.$$('table tbody tr');
  console.log('3. Files before:', filesBefore.length);

  // Create file
  console.log('\n4. Creating file...');
  await page.click('button:has-text("New File")');
  await page.waitForTimeout(1500);

  const fileName = 'TestFile' + Date.now();
  await page.fill('input[placeholder="Enter File Name"]', fileName);
  await page.waitForTimeout(500);

  await page.click('button:has-text("Create")');
  await page.waitForTimeout(5000);

  // Check file count after
  const filesAfter = await page.$$('table tbody tr');
  console.log('5. Files after:', filesAfter.length);

  if (filesAfter.length > filesBefore.length) {
    console.log('\n✅ FILE CREATION SUCCESSFUL!');
  } else {
    console.log('\n❌ File not created');
  }

  // Check for toast
  const toasts = await page.$$('[data-sonner-toast]');
  for (const t of toasts) {
    console.log('   Toast:', await t.textContent());
  }

  await browser.close();
})();
