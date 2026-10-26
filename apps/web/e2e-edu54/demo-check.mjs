import { chromium } from "@playwright/test";
const b = await chromium.launch({ executablePath: process.env.CHROME });
for (const [p, ed] of [[8300, "k12"], [8350, "university"]]) {
  const pg = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  await pg.addInitScript(() => localStorage.setItem("umanah.tour.off", "1"));
  await pg.goto(`http://192.168.4.41:${p}/`);
  await pg.getByText("Just looking? Try the demo").waitFor();
  await pg.screenshot({ path: `/srv/ai-node/storage/ssd/edu54/exports/screenshots/${ed}/01-login-demo.png` });
  const btns = await pg.locator("section[aria-label='Try the demo'] button").allInnerTexts();
  await pg.getByRole("button", { name: /Try as a student/ }).click();
  await pg.getByRole("complementary", { name: "Main navigation" }).waitFor({ timeout: 30000 });
  const h = await pg.locator("main h1").first().innerText();
  console.log(ed, btns, "->", h, "| banner:", (await pg.locator("body").innerText()).includes("Demo with sample data"));
}
await b.close();
