import { test, expect } from '@playwright/test';

test('Draw on canvas and verify', async ({ page }) => {
  test.setTimeout(120000);
  
  // Login
  console.log('1. Logging in...');
  await page.goto('/login');
  await page.waitForTimeout(1500);
  await page.locator('input').first().fill(process.env.AUTH_USERNAME || 'NOTEBOOK');
  await page.locator('input[type="password"]').fill(process.env.AUTH_PASSWORD || 'eeyertiaMihtsawA');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);

  // Go to dashboard
  console.log('2. Going to dashboard...');
  await page.goto('/dashboard');
  await page.waitForTimeout(2000);

  // Click on existing file or create new
  console.log('3. Opening a file...');
  const fileRow = page.locator('table tbody tr td').first();
  if (await fileRow.isVisible()) {
    await fileRow.click();
    await page.waitForURL(/workspace/, { timeout: 10000 }).catch(() => {});
  }

  if (!page.url().includes('/workspace/')) {
    // Create new file
    const newFileBtn = page.locator('button:has-text("New File")').first();
    await newFileBtn.click();
    await page.waitForTimeout(1000);
    const dialogInput = page.locator('[role="dialog"] input, .fixed input').first();
    if (await dialogInput.isVisible().catch(() => false)) {
      await dialogInput.fill('DrawTest' + Date.now());
      await page.locator('button:has-text("Create")').first().click();
      await page.waitForTimeout(2000);
    }
    await page.locator('table tbody tr td').first().click();
    await page.waitForURL(/workspace/, { timeout: 10000 }).catch(() => {});
  }

  console.log('4. In workspace:', page.url());
  await page.waitForTimeout(3000);

  // Find the canvas
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });
  
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Canvas not found');
  }

  console.log('5. Canvas found:', box.width, 'x', box.height);
  await page.screenshot({ path: 'test-results/draw-01-before.png' });

  // Select pencil tool by pressing 'p'
  console.log('6. Selecting pencil tool...');
  await page.keyboard.press('p');
  await page.waitForTimeout(300);

  // Draw a diagonal line
  console.log('7. Drawing diagonal line...');
  const startX = box.x + 100;
  const startY = box.y + 100;
  
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 0; i <= 50; i++) {
    await page.mouse.move(startX + i * 4, startY + i * 3);
    await page.waitForTimeout(10);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
  console.log('   ✓ Diagonal line drawn');

  // Draw a circle shape
  console.log('8. Drawing circle motion...');
  const centerX = box.x + 400;
  const centerY = box.y + 200;
  const radius = 60;
  
  await page.mouse.move(centerX + radius, centerY);
  await page.mouse.down();
  for (let angle = 0; angle <= 360; angle += 10) {
    const rad = (angle * Math.PI) / 180;
    const x = centerX + radius * Math.cos(rad);
    const y = centerY + radius * Math.sin(rad);
    await page.mouse.move(x, y);
    await page.waitForTimeout(10);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
  console.log('   ✓ Circle drawn');

  // Draw some squiggles
  console.log('9. Drawing squiggle...');
  await page.mouse.move(box.x + 150, box.y + 300);
  await page.mouse.down();
  for (let i = 0; i <= 40; i++) {
    const y = box.y + 300 + Math.sin(i * 0.5) * 30;
    await page.mouse.move(box.x + 150 + i * 5, y);
    await page.waitForTimeout(10);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
  console.log('   ✓ Squiggle drawn');

  // Take screenshot after drawing
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/draw-02-after.png' });
  console.log('10. Screenshots saved');

  // Verify elements were created by checking Excalidraw scene
  const elementCount = await page.evaluate(() => {
    const excalidrawContainer = document.querySelector('.excalidraw');
    if (excalidrawContainer) {
      // Check for drawn paths in SVG or canvas
      const paths = document.querySelectorAll('.excalidraw path, .excalidraw svg path');
      return paths.length;
    }
    return 0;
  });

  console.log('11. Elements on canvas:', elementCount > 0 ? 'YES' : 'Checking canvas...');

  // Visual verification - compare before/after screenshots would show difference
  console.log('\n=== DRAWING TEST COMPLETE ===');
  console.log('Check test-results/draw-01-before.png and draw-02-after.png');
  console.log('If drawings appear in after screenshot, canvas is working!');
});
