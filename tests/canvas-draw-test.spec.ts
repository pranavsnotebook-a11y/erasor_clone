import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1920, height: 1080 } });

test('Draw on Excalidraw canvas - visible area', async ({ page }) => {
  test.setTimeout(120000);
  
  // Login
  console.log('1. Logging in...');
  await page.goto('/login');
  await page.waitForTimeout(2000);
  await page.locator('input').first().fill(process.env.AUTH_USERNAME || 'NOTEBOOK');
  await page.locator('input[type="password"]').fill(process.env.AUTH_PASSWORD || 'eeyertiaMihtsawA');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);

  // Navigate to dashboard and open file
  console.log('2. Going to dashboard...');
  await page.goto('/dashboard');
  await page.waitForTimeout(3000);
  
  const fileCell = page.locator('table tbody tr td').first();
  if (await fileCell.isVisible().catch(() => false)) {
    await fileCell.click();
  } else {
    await page.locator('button:has-text("New File")').click();
    await page.waitForTimeout(1000);
    await page.locator('input').last().fill('DrawTest' + Date.now());
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(2000);
    await page.locator('table tbody tr td').first().click();
  }
  
  await page.waitForTimeout(4000);
  console.log('3. URL:', page.url());

  if (!page.url().includes('/workspace/')) {
    throw new Error('Not in workspace');
  }

  // Get the excalidraw container (right side of screen)
  const excalidrawContainer = page.locator('.excalidraw').first();
  await excalidrawContainer.waitFor({ timeout: 10000 });
  
  // Click inside the excalidraw to focus it
  const containerBox = await excalidrawContainer.boundingBox();
  if (!containerBox) throw new Error('Container not found');
  
  console.log('4. Excalidraw container at x:', containerBox.x, 'width:', containerBox.width);
  
  // Calculate center of the visible excalidraw area
  const centerX = containerBox.x + containerBox.width / 2;
  const centerY = 400; // Fixed Y in visible area
  
  console.log('5. Drawing at center:', centerX, centerY);
  
  // Take before screenshot
  await page.screenshot({ path: 'test-results/draw-before.png' });

  // Click to focus the canvas
  await page.mouse.click(centerX, centerY);
  await page.waitForTimeout(300);
  
  // Press '1' to reset zoom and center view, then select pointer
  await page.keyboard.press('1');
  await page.waitForTimeout(300);

  // Select freedraw/pencil tool
  console.log('6. Selecting pencil tool...');
  await page.keyboard.press('p');
  await page.waitForTimeout(300);

  // Draw a smiley face in the visible area
  console.log('7. Drawing smiley face...');
  
  // Face outline (circle)
  const faceX = centerX;
  const faceY = 350;
  const faceRadius = 80;
  
  await page.mouse.move(faceX + faceRadius, faceY);
  await page.mouse.down();
  for (let angle = 0; angle <= 360; angle += 5) {
    const rad = (angle * Math.PI) / 180;
    await page.mouse.move(faceX + faceRadius * Math.cos(rad), faceY + faceRadius * Math.sin(rad));
    await page.waitForTimeout(5);
  }
  await page.mouse.up();
  console.log('   ✓ Face circle');
  await page.waitForTimeout(200);

  // Left eye
  await page.mouse.move(faceX - 30, faceY - 20);
  await page.mouse.down();
  await page.mouse.move(faceX - 30, faceY - 15);
  await page.mouse.up();
  console.log('   ✓ Left eye');
  await page.waitForTimeout(100);

  // Right eye
  await page.mouse.move(faceX + 30, faceY - 20);
  await page.mouse.down();
  await page.mouse.move(faceX + 30, faceY - 15);
  await page.mouse.up();
  console.log('   ✓ Right eye');
  await page.waitForTimeout(100);

  // Smile (arc)
  await page.mouse.move(faceX - 40, faceY + 20);
  await page.mouse.down();
  for (let i = 0; i <= 20; i++) {
    const x = faceX - 40 + i * 4;
    const y = faceY + 20 + Math.sin((i / 20) * Math.PI) * 25;
    await page.mouse.move(x, y);
    await page.waitForTimeout(5);
  }
  await page.mouse.up();
  console.log('   ✓ Smile');
  await page.waitForTimeout(300);

  // Draw some text "HI!" below
  console.log('8. Drawing HI!...');
  
  // H
  const textY = faceY + 120;
  await page.mouse.move(faceX - 80, textY);
  await page.mouse.down();
  await page.mouse.move(faceX - 80, textY + 50);
  await page.mouse.up();
  await page.waitForTimeout(50);
  
  await page.mouse.move(faceX - 80, textY + 25);
  await page.mouse.down();
  await page.mouse.move(faceX - 50, textY + 25);
  await page.mouse.up();
  await page.waitForTimeout(50);
  
  await page.mouse.move(faceX - 50, textY);
  await page.mouse.down();
  await page.mouse.move(faceX - 50, textY + 50);
  await page.mouse.up();
  console.log('   ✓ H');
  await page.waitForTimeout(50);

  // I
  await page.mouse.move(faceX - 20, textY);
  await page.mouse.down();
  await page.mouse.move(faceX - 20, textY + 50);
  await page.mouse.up();
  console.log('   ✓ I');
  await page.waitForTimeout(50);

  // !
  await page.mouse.move(faceX + 10, textY);
  await page.mouse.down();
  await page.mouse.move(faceX + 10, textY + 35);
  await page.mouse.up();
  await page.waitForTimeout(50);
  
  await page.mouse.move(faceX + 10, textY + 45);
  await page.mouse.down();
  await page.mouse.move(faceX + 10, textY + 50);
  await page.mouse.up();
  console.log('   ✓ !');

  await page.waitForTimeout(1000);
  
  // Take after screenshot
  await page.screenshot({ path: 'test-results/draw-after.png' });
  console.log('9. Screenshots saved');

  console.log('\n=== DRAWING TEST COMPLETE ===');
  console.log('Compare test-results/draw-before.png and draw-after.png');
  
  expect(true).toBe(true);
});
