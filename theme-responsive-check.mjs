export default async function run(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/');
  await page.evaluate(() => localStorage.setItem('alqirsh-theme', 'light'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(150);
  const light = await page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), background: getComputedStyle(document.body).backgroundColor, scrollWidth: document.documentElement.scrollWidth, width: innerWidth }));
  const toggle = page.getByRole('button', { name: /المظهر/ });
  await toggle.click();
  await page.waitForTimeout(100);
  const dark = await page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), background: getComputedStyle(document.body).backgroundColor, scrollWidth: document.documentElement.scrollWidth, width: innerWidth }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(150);
  const persisted = await page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), background: getComputedStyle(document.body).backgroundColor }));
  return { light, dark, persisted };
}
