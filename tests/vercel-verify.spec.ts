import { test, expect } from '@playwright/test';

// Test the live Vercel deployment
test.use({ 
  viewport: { width: 1024, height: 768 },
  baseURL: 'https://pranavsnotebook.vercel.app'
});

test('Verify Vercel deployment canvas UI', async ({ page }) => {
  test.setTimeout(120000);
  
  // Login first
  console.log('1. Logging in...');
  await page.goto('/login');
  await page.waitForTimeout(3000);
  
  await page.locator('input').first().fill(process.env.AUTH_USERNAME || 'NOTEBOOK');
  await page.locator('input[type="password"]').fill(process.env.AUTH_PASSWORD || 'eeyertiaMihtsawA');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(4000);
  
  // Navigate to the specific workspace
  console.log('2. Going to workspace...');
  await page.goto('/workspace/jd765vqymg6mx7wdf19xqg1bad80b4s0');
  await page.waitForTimeout(5000);
  
  console.log('3. URL:', page.url());
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/vercel-workspace.png' });
  
  // Check for canvas
  const canvasCount = await page.locator('canvas').count();
  console.log('4. Canvas count:', canvasCount);
  
  // Check for the giant Shapes sidebar (should NOT exist)
  const shapesText = await page.locator('text="Shapes"').first().isVisible().catch(() => false);
  console.log('5. Shapes text visible:', shapesText);
  
  // Check for numbered tool items (1, 2, 3, etc.) - should NOT be visible as big sidebar
  const numberedTools = await page.locator('text=/^[1-6]$/').count();
  console.log('6. Numbered tool items:', numberedTools);
  
  // Check Excalidraw loaded
  const excalidraw = await page.locator('.excalidraw').isVisible().catch(() => false);
  console.log('7. Excalidraw visible:', excalidraw);
  
  // Check layout - should be stacked on tablet
  const editorVisible = await page.locator('text="Document Name"').isVisible().catch(() => false);
  console.log('8. Editor visible:', editorVisible);
  
  console.log('\n=== VERCEL VERIFICATION COMPLETE ===');
  
  expect(canvasCount).toBeGreaterThan(0);
});
