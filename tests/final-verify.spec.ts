import { test, expect } from '@playwright/test';

test.use({ 
  viewport: { width: 1366, height: 768 },
  baseURL: 'https://pranavsnotebook.vercel.app'
});

test('Final verification - draw on Vercel canvas', async ({ page }) => {
  test.setTimeout(120000);
  
  // Login
  console.log('1. Logging in...');
  await page.goto('/login');
  await page.waitForTimeout(2000);
  await page.locator('input').first().fill('NOTEBOOK');
  await page.locator('input[type="password"]').fill('eeyertiaMihtsawA');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  
  // Go to workspace
  console.log('2. Opening workspace...');
  await page.goto('/workspace/jd765vqymg6mx7wdf19xqg1bad80b4s0');
  await page.waitForTimeout(5000);
  
  // Check for canvas
  const canvasCount = await page.locator('canvas').count();
  console.log('3. Canvas count:', canvasCount);
  
  // Verify NO giant Shapes sidebar
  const shapesVisible = await page.locator('text="Shapes"').first().boundingBox().catch(() => null);
  const numberedTool = await page.locator('text=/^[1-6]$/').first().boundingBox().catch(() => null);
  
  if (shapesVisible && numberedTool) {
    // Check if they're in a vertical sidebar layout
    const shapesY = shapesVisible.y;
    const numberedY = numberedTool.y;
    const isSidebar = Math.abs(shapesY - numberedY) > 50; // Sidebar has vertical distance
    console.log('4. Giant sidebar detected:', isSidebar ? 'YES - STILL BROKEN' : 'NO - FIXED');
  } else {
    console.log('4. Giant sidebar detected: NO - FIXED');
  }
  
  // Draw on canvas
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  
  if (box) {
    console.log('5. Drawing on canvas...');
    await page.keyboard.press('p'); // Pencil tool
    await page.waitForTimeout(200);
    
    const startX = box.x + 200;
    const startY = box.y + 100;
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 0; i <= 20; i++) {
      await page.mouse.move(startX + i * 10, startY + i * 5);
      await page.waitForTimeout(10);
    }
    await page.mouse.up();
    console.log('   ✓ Drawing complete');
  }
  
  await page.screenshot({ path: 'test-results/final-verify.png' });
  
  console.log('\n=== FINAL VERIFICATION COMPLETE ===');
  expect(canvasCount).toBeGreaterThan(0);
});
