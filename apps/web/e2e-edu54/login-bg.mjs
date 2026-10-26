// Sign-in backgrounds: screenshots at 0 s, 9 s and 17 s (green, red, blue) on both editions; checks the retired line is gone.
import { chromium } from "@playwright/test";
const b = await chromium.launch({ executablePath: process.env.CHROME });
for (const [p, ed] of [[8300, "k12"], [8350, "university"]]) {
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await pg.goto(`http://192.168.4.41:${p}/`);
  await pg.getByText("Just looking? Try the demo").waitFor({ timeout: 60000 });
  const text = await pg.locator("body").innerText();
  console.log(ed, "open-source line:", text.includes("Built on open-source"), "| layers:", await pg.locator(".login-bg").count());
  for (const [i, s] of [[0, 1500], [1, 9000], [2, 8000]]) { await pg.waitForTimeout(s); await pg.screenshot({ path: `/srv/ai-node/storage/ssd/edu54/exports/screenshots/${ed}/02-login-bg-${i}.png` }); }
}
await b.close();
