import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage();
const base = process.env.APP_URL || 'http://127.0.0.1:3000';
await mkdir(new URL('./screenshots/', import.meta.url), {recursive:true});
for (const [name,width,height] of [['desktop',1400,900],['mobile',390,844]]) {
 await page.setViewportSize({width,height});
 await page.goto(base);
 await page.getByRole('heading',{name:'Campus Signup',exact:true}).waitFor();
 await page.screenshot({path:new URL(`./screenshots/${name}.png`,import.meta.url).pathname.replace(/^\/(.:)/,'$1')});
}
await browser.close();
