import { test, expect } from '@playwright/test';

test.describe('Manual Canvas UI Test', () => {

  test.setTimeout(180000);

  test('Navigate and draw on canvas', async ({ page }) => {
    // Login
    console.log('Logging in...');
    await page.goto('/login');
    await page.waitForTimeout(1500);

    await page.locator('input').first().fill(process.env.AUTH_USERNAME || 'NOTEBOOK');
    await page.locator('input[type="password"]').fill(process.env.AUTH_PASSWORD || 'eeyertiaMihtsawA');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);

    // Go to dashboard
    console.log('Going to dashboard...');
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/01-dashboard.png' });

    // Create file
    console.log('Creating file...');
    const newFileBtn = page.locator('button:has-text("New File")').first();
    if (await newFileBtn.isVisible()) {
      await newFileBtn.click();
      await page.waitForTimeout(1000);

      const dialogInput = page.locator('[role="dialog"] input, .fixed input').first();
      if (await dialogInput.isVisible().catch(() => false)) {
        await dialogInput.fill('Test' + Date.now());
        await page.locator('button:has-text("Create")').first().click();
        await page.waitForTimeout(2000);
      }
    }

    // Click on file name to open
    console.log('Opening file...');
    await page.waitForTimeout(1000);

    // Click on the first file name text
    const fileName = page.locator('table tbody tr td').first();
    if (await fileName.isVisible()) {
      console.log('Clicking file name...');
      await fileName.click();
      await page.waitForURL(/workspace/, { timeout: 10000 }).catch(() => {});
    }

    console.log('URL after click:', page.url());

    // If still not in workspace, try clicking the row
    if (!page.url().includes('/workspace/')) {
      console.log('Trying row click...');
      const fileRow = page.locator('table tbody tr').first();
      await fileRow.click();
      await page.waitForURL(/workspace/, { timeout: 10000 }).catch(() => {});
    }

    console.log('Final URL:', page.url());

    // Check workspace
    if (page.url().includes('/workspace/')) {
      console.log('✓ In workspace');
      await page.waitForTimeout(4000);
      await page.screenshot({ path: 'test-results/02-workspace.png' });

      // Check UI
      const pageContent = await page.content();
      const hasWelcomeHints = pageContent.includes('>Help</') && pageContent.includes('>Shapes</');
      console.log('WelcomeScreen hints:', hasWelcomeHints ? '❌ STILL SHOWING' : '✓ REMOVED');

      // Check Performance Monitor
      const perfVisible = await page.locator('text="Performance Monitor"').isVisible().catch(() => false);
      console.log('Performance Monitor:', perfVisible ? '✓ Visible' : '⚠ Not visible');

      // Check canvas
      const canvasCount = await page.locator('canvas').count();
      console.log('Canvas count:', canvasCount);

      // Draw
      if (canvasCount > 0) {
        const canvas = page.locator('canvas').first();
        const box = await canvas.boundingBox();
        if (box) {
          console.log('Drawing...');
          await page.mouse.click(box.x + 300, box.y + 200);
          await page.keyboard.press('p');
          await page.waitForTimeout(200);

          await page.mouse.move(box.x + 200, box.y + 150);
          await page.mouse.down();
          for (let i = 0; i <= 20; i++) {
            await page.mouse.move(box.x + 200 + i * 10, box.y + 150 + i * 8);
            await page.waitForTimeout(15);
          }
          await page.mouse.up();
          await page.waitForTimeout(500);
          console.log('✓ Drew stroke');
        }
      }

      await page.screenshot({ path: 'test-results/03-final.png' });

      // Verify
      console.log('\n=== RESULTS ===');
      console.log('WelcomeScreen removed:', !hasWelcomeHints ? 'PASS' : 'FAIL');
      console.log('Canvas works:', canvasCount > 0 ? 'PASS' : 'FAIL');

      expect(hasWelcomeHints).toBe(false);
      expect(canvasCount).toBeGreaterThan(0);
    } else {
      await page.screenshot({ path: 'test-results/ERROR.png' });
      throw new Error('Failed to reach workspace. URL: ' + page.url());
    }
  });

});
