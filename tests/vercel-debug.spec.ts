import { test, expect } from '@playwright/test';

test.describe('Debug Vercel UI at different viewports', () => {
  
  test('Check at user tablet size (1366x768)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    
    // Login
    await page.goto('https://pranavsnotebook.vercel.app/login');
    await page.waitForTimeout(2000);
    await page.locator('input').first().fill('NOTEBOOK');
    await page.locator('input[type="password"]').fill('eeyertiaMihtsawA');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    
    // Go to workspace
    await page.goto('https://pranavsnotebook.vercel.app/workspace/jd765vqymg6mx7wdf19xqg1bad80b4s0');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'test-results/vercel-1366.png' });
    
    // Get page content to analyze
    const html = await page.content();
    const hasShapesSidebar = html.includes('Shapes') && html.includes('>1<') && html.includes('>2<');
    console.log('1366px - Has Shapes sidebar pattern:', hasShapesSidebar);
  });

  test('Check at 1280px (xl breakpoint)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    
    await page.goto('https://pranavsnotebook.vercel.app/login');
    await page.waitForTimeout(2000);
    await page.locator('input').first().fill('NOTEBOOK');
    await page.locator('input[type="password"]').fill('eeyertiaMihtsawA');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    
    await page.goto('https://pranavsnotebook.vercel.app/workspace/jd765vqymg6mx7wdf19xqg1bad80b4s0');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'test-results/vercel-1280.png' });
  });

  test('Check at 1024px (tablet)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    
    await page.goto('https://pranavsnotebook.vercel.app/login');
    await page.waitForTimeout(2000);
    await page.locator('input').first().fill('NOTEBOOK');
    await page.locator('input[type="password"]').fill('eeyertiaMihtsawA');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    
    await page.goto('https://pranavsnotebook.vercel.app/workspace/jd765vqymg6mx7wdf19xqg1bad80b4s0');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'test-results/vercel-1024.png' });
  });
});
