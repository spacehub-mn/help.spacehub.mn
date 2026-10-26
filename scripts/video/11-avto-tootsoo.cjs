#!/usr/bin/env node
// 11 — «Авто тооцоо гараагүй» видео (SCRIPTS.md 11, HELP_PLAN §11). Прод app.spacehub.mn, тест эрх, туршилтын owner.
// ЗӨВХӨН УНШИНА: зөвхөн цэс нээж, хүснэгтийг гүйлгэнэ. «Next Auto Job +», «Job Create» зэрэг товчийг хулганаар
// ЗААНА, ДАРАХГҮЙ. Хувийн мэдээллийн багана бүдгэрнэ. Нэвтрэлт бичлэгт орохгүй.
//
//   node scripts/video/11-avto-tootsoo.cjs <гаралтын хавтас>   → raw .webm + timing.json; дараа нь build.py
const fs = require("fs");
const path = require("path");

const E2E = process.env.SPACEHUB_E2E || "E:/Projects/spacehub-mn/Spacehub23/tests/e2e";
require(path.join(E2E, "node_modules/dotenv")).config({ path: path.join(E2E, ".env") });
const { chromium } = require(path.join(E2E, "node_modules/playwright"));

const APP = "https://app.spacehub.mn/";
const OUT = path.resolve(process.argv[2] || ".");
// 1280 өргөнд toolbar зөвхөн дүрстэй болдог тул товчны нэр харагдахаар 1600×900 (Dev_Research 10-26)
const SIZE = { width: 1600, height: 900 };
const PII_TH = ["Харилцагч", "Бизнес нэр", "Регистр", "Регистер", "Утас", "Имэйл", "Данс"];

// Хадмал, хулганы цэг, PII blur, улаан хүрээ — бүгд хуудсан дээрх давхарга
const OVERLAY = `(() => {
  const PII = ${JSON.stringify(PII_TH)};
  const css = document.createElement('style');
  css.textContent = '#hv-cap{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;'
    + 'background:rgba(20,20,20,.85);color:#fff;font:600 22px Segoe UI,Arial,sans-serif;padding:10px 22px;border-radius:10px;'
    + 'max-width:1150px;text-align:center;pointer-events:none}'
    + '#hv-cur{position:fixed;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;z-index:2147483646;'
    + 'background:rgba(255,120,0,.45);border:2px solid #ff7800;pointer-events:none}'
    + '.hv-box{position:fixed;border:3px solid #e11d48;border-radius:6px;z-index:2147483645;pointer-events:none;box-sizing:border-box}'
    + '.hv-num{position:fixed;width:22px;height:22px;border-radius:50%;background:#e11d48;color:#fff;font:700 13px/22px Segoe UI,Arial;text-align:center;z-index:2147483646;pointer-events:none}'
    + '.hv-pii,.dash-page{filter:blur(8px)!important}';
  const add = () => {
    if (!document.body || document.getElementById('hv-cap')) return;
    document.head.appendChild(css);
    const cap = document.createElement('div'); cap.id = 'hv-cap'; cap.style.display = 'none'; document.body.appendChild(cap);
    const cur = document.createElement('div'); cur.id = 'hv-cur'; document.body.appendChild(cur);
    document.addEventListener('mousemove', e => { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; }, true);
  };
  const mask = () => document.querySelectorAll('table').forEach(t => {
    [...t.querySelectorAll('thead th')].forEach((th, i) => {
      if (!PII.some(p => th.innerText.includes(p))) return;
      t.querySelectorAll('tbody tr').forEach(tr => { const td = tr.children[i]; if (td) td.classList.add('hv-pii'); });
    });
  });
  window.hvCaption = s => { add(); const c = document.getElementById('hv-cap'); c.textContent = s; c.style.display = s ? 'block' : 'none'; };
  // Хүрээ бүрт ① ② дугаар — хадмалын дараалалтай таарна
  window.hvBoxes = rs => { document.querySelectorAll('.hv-box,.hv-num').forEach(e => e.remove());
    rs.forEach((r, i) => { const d = document.createElement('div'); d.className = 'hv-box';
      Object.assign(d.style, { left: r.x - 3 + 'px', top: r.y - 3 + 'px', width: r.width + 6 + 'px', height: r.height + 6 + 'px' }); document.body.appendChild(d);
      const n = document.createElement('div'); n.className = 'hv-num'; n.textContent = i + 1;
      Object.assign(n.style, { left: Math.max(0, r.x - 13) + 'px', top: Math.max(0, r.y - 15) + 'px' }); document.body.appendChild(n); }); };
  setInterval(() => { add(); mask(); }, 150);
})();`;

const idle = (page) => page.locator("#xaf-loading.show").waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});

(async () => {
  // 1) Бичлэггүй нэвтрэлт → cookie
  let browser = await chromium.launch();
  let context = await browser.newContext({ viewport: SIZE });
  let page = await context.newPage();
  await page.goto(APP);
  await page.getByLabel(/user\s*name|нэр/i).fill(process.env.TEST_USER);
  await page.getByLabel(/password|нууц/i).fill(process.env.TEST_PASS);
  await page.getByRole("button", { name: /log\s*in|нэвтр/i }).click();
  await page.getByRole("treeitem").first().waitFor({ timeout: 60000 });
  const state = await context.storageState();
  await browser.close();

  // 2) Бичлэгтэй контекст
  browser = await chromium.launch();
  context = await browser.newContext({ viewport: SIZE, storageState: state, recordVideo: { dir: path.join(OUT, "raw"), size: SIZE } });
  await context.addInitScript(OVERLAY);
  page = await context.newPage();
  const t0 = Date.now();
  const now = () => (Date.now() - t0) / 1000;
  const cues = [];
  const cuts = []; // жагсаалт ачааллах хүлээлт — дараа нь тайрна
  const cap = async (text) => {
    if (cues.length) cues[cues.length - 1].end = now();
    if (text) cues.push({ start: now(), end: null, text });
    await page.evaluate((x) => window.hvCaption && window.hvCaption(x), text || "");
  };
  const moveTo = async (loc) => {
    const b = await loc.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 });
    await page.waitForTimeout(300);
    return b;
  };
  const openMenu = async (group, item) => {
    const leaf = page.getByRole("treeitem", { name: item, exact: true }).first();
    if (!(await leaf.isVisible())) { await moveTo(page.getByText(group, { exact: true }).first()); await page.getByText(group, { exact: true }).first().click({ force: true }); await page.waitForTimeout(700); }
    await moveTo(leaf);
    await leaf.click();
    const c = now();
    await idle(page);
    return c;
  };
  const th = (name) => page.locator("thead th:visible").filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) }).first();
  const btn = (title) => page.locator(`button:visible[title*="${title}"], button:visible:has-text("${title}")`).first();
  const boxes = async (locs) => page.evaluate((rs) => window.hvBoxes(rs), await Promise.all(locs.map((l) => l.boundingBox())));

  await page.goto(APP);
  await page.getByRole("treeitem").first().waitFor({ timeout: 60000 });
  await idle(page);
  await page.waitForTimeout(1500);
  const tLead = now();

  await cap("1. «Автоматжуулалт» → «Авто ажил»-ыг нээ");
  let c1 = await openMenu("Автоматжуулалт", "Авто ажил");
  await th("Авто ажил статус").waitFor({ timeout: 60000 });
  cuts.push([c1, now()]);
  await page.waitForTimeout(1500);

  await cap("2. Тухайн сарын ажил (1) байгаа, статус (2) нь «Ажиллаж байна» эсэхийг шалга");
  await th("Авто ажил статус").evaluate((e) => e.scrollIntoView({ block: "nearest", inline: "end" }));
  await page.waitForTimeout(500);
  await boxes([th("Сар"), th("Авто ажил статус")]);
  await moveTo(th("Авто ажил статус"));
  await page.waitForTimeout(3500);

  await cap("3. Ажил алга бол өмнөх сарын ажлыг сонгоод (1) «Next Auto Job +», дараа нь (2) «Job Create»");
  // Сонгох нүд, Код харагдахаар буцааж зүүн тийш гүйлгэнэ
  await boxes([]);
  await th("Код").evaluate((e) => e.scrollIntoView({ block: "nearest", inline: "start" }));
  await page.waitForTimeout(500);
  await boxes([btn("Next Auto Job"), btn("Job Create")]);
  await moveTo(btn("Next Auto Job"));
  await page.waitForTimeout(2200);
  await moveTo(btn("Job Create"));
  await page.waitForTimeout(2200);
  await boxes([]);

  await cap("4. Гэрээ «Автомат ажил»-д орсон эсэхийг «Гэрээ» жагсаалтаас шалга");
  c1 = await openMenu("Менежмент", "Гэрээ");
  await th("Автомат ажил").waitFor({ state: "attached", timeout: 60000 });
  cuts.push([c1, now()]);
  await page.waitForTimeout(800);
  await th("Автомат ажил").evaluate((e) => e.scrollIntoView({ block: "nearest", inline: "center" }));
  await page.waitForTimeout(600);
  await boxes([th("Автомат ажил")]);
  await moveTo(th("Автомат ажил"));
  await page.waitForTimeout(3500);

  await cap("5. Байгууллага, объект, гэрээ — гурвууланд «Автомат ажил» асаалттай байх ёстой");
  await page.mouse.move(700, 420, { steps: 15 });
  await page.waitForTimeout(3500);
  await boxes([]);
  await cap(null);
  const tEnd = now();

  const video = page.video();
  await context.close();
  await browser.close();
  fs.writeFileSync(path.join(OUT, "timing.json"), JSON.stringify({ video: await video.path(), tLead, tEnd, cuts, cues }, null, 1));
  console.log(JSON.stringify({ tLead, tEnd, cuts, n: cues.length }));
})().catch((e) => { console.error("ERR", e.message.split("\n")[0]); process.exit(1); });
