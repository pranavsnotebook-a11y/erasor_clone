import { test, expect } from '@playwright/test';

// Test at tablet viewport (like Samsung tablet)
test.use({ viewport: { width: 1024, height: 768 } });

test('Canvas on tablet viewport', async ({ page }) => {
  test.setTimeout(120000);
  
  // Login
  console.log('1. Logging in...');
  await page.goto('/login');
  await page.waitForTimeout(2000);
  await page.locator('input').first().fill(process.env.AUTH_USERNAME || 'NOTEBOOK');
  await page.locator('input[type="password"]').fill(process.env.AUTH_PASSWORD || 'eeyertiaMihtsawA');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);

  // Go to dashboard
  console.log('2. Going to dashboard...');
  await page.goto('/dashboard');
  await page.waitForTimeout(4000);
  
  // Create or open file
  console.log('3. Opening file...');
  const fileCell = page.locator('table tbody tr td').first();
  const hasFile = await fileCell.isVisible().catch(() => false);
  
  if (hasFile) {
    await fileCell.click();
  } else {
    // Create new file
    await page.locator('button:has-text("New File")').click();
    await page.waitForTimeout(1000);
    await page.locator('input').last().fill('TabletTest' + Date.now());
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(2000);
    await page.locator('table tbody tr td').first().click();
  }
  
  await page.waitForTimeout(5000);
  console.log('4. URL:', page.url());
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/tablet-view.png' });
  
  if (page.url().includes('/workspace/')) {
    // Check for canvas
    const canvasCount = await page.locator('canvas').count();
    console.log('5. Canvas count:', canvasCount);
    
    // Check Excalidraw is visible
    const excalidraw = await page.locator('.excalidraw').isVisible().catch(() => false);
    console.log('6. Excalidraw visible:', excalidraw);
    
    expect(canvasCount).toBeGreaterThan(0);
  } else {
    console.log('Not in workspace, taking error screenshot');
    await page.screenshot({ path: 'test-results/tablet-error.png' });
    throw new Error('Failed to reach workspace');
  }
});
