#!/usr/bin/env node
// Нийтлэг видео бичигч — scripts/video/specs/<name>.json-оор. Прод app.spacehub.mn, тест эрх, туршилтын owner.
// ЗӨВХӨН ХАРАХ: цэс нээх, хүснэгт гүйлгэх, товч дээр хулгана аваачиж ЗААХ. Үйлдлийн товчийг ДАРАХГҮЙ.
// Цонх нээх алхам (open) нь зөвхөн mustSee текст гарвал үргэлжилнэ; цонхыг Esc → «Хаах/Болих/Үгүй»-оор хаана.
// Хувийн мэдээлэл гарахгүйн тулд хүснэгтийн бүх нүд (keep баганаас бусад), нийлбэр бүдгэрнэ.
// Нэвтрэлт бичлэгт орохгүй.
//
//   node scripts/video/run.cjs <spec.json> <гаралтын хавтас>   → raw .webm + timing.json; дараа нь build.py
const fs = require("fs");
const path = require("path");

const E2E = require(path.join(__dirname, "..", "local-paths.cjs"))("e2e");
if (!E2E) throw new Error("e2e орчны зам алга — SPACEHUB_E2E эсвэл help_local_paths.json (e2e)");
require(path.join(E2E, "node_modules/dotenv")).config({ path: path.join(E2E, ".env") });
const { chromium } = require(path.join(E2E, "node_modules/playwright"));

const APP = "https://app.spacehub.mn/";
const SPEC = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const OUT = path.resolve(process.argv[3] || ".");
const SIZE = { width: 1600, height: 900 };
// Цонх нээх товчны нэрийн хориг — хадгалах/илгээх/төлөх/баталгаажуулах/устгахыг хэзээ ч дарахгүй
const DENY = /хадгал|илгээ|төлө|тийм|^за$|^ok$|устга|нийтлэ|блок|шийдсэн|цуцал|буцаах|гаргах|шинэчлэх|хуваарила|create|start|stop|delete|save|send/i;

const OVERLAY = `(() => {
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
  const mail = /[\\w.+-]+@[\\w-]+\\./;
  // Бүх нүд бүдгэр, зөвхөн сонгох нүд ба window.hvKeep баганууд ил
  const blur = () => {
    const keep = (window.hvKeep || []);
    const rs = [...document.querySelectorAll('thead th')].filter(th => th.offsetParent && keep.includes(th.innerText.replace(/\\s+/g, ' ').trim())).map(th => th.getBoundingClientRect());
    document.querySelectorAll('tbody td').forEach(td => {
      if (td.cellIndex === 0) return;
      const q = td.getBoundingClientRect();
      if (rs.some(r => q.left >= r.left - 2 && q.right <= r.right + 2)) return;
      td.classList.add('hv-pii');
    });
    document.querySelectorAll('tfoot, .dxbl-grid-footer, [class*=grid-footer], [class*=group-footer]').forEach(e => e.classList.add('hv-pii'));
    document.querySelectorAll('body *').forEach(e => {
      const own = e.tagName === 'INPUT' ? e.value : [...e.childNodes].filter(c => c.nodeType === 3).map(c => c.textContent).join('');
      // Имэйл, 8+ оронтой тоо (данс, регистр, утас), Sum/Count — аль ч элемент, input-ийн утгад
      if (mail.test(own || '') || /\\d{8,}/.test(own || '') || /^(Sum|Count):/.test((own || '').trim())) e.classList.add('hv-pii');
    });
    document.querySelectorAll('.xaf-view-caption, .header-title, .ob-top-name, .ob-detail, .dxbl-modal input, .dxbl-modal textarea').forEach(e => e.classList.add('hv-pii'));
  };
  window.hvCaption = s => { add(); const c = document.getElementById('hv-cap'); c.textContent = s; c.style.display = s ? 'block' : 'none'; };
  window.hvBoxes = rs => { document.querySelectorAll('.hv-box,.hv-num').forEach(e => e.remove());
    rs.forEach((r, i) => { if (!r) return; const d = document.createElement('div'); d.className = 'hv-box';
      Object.assign(d.style, { left: r.x - 3 + 'px', top: r.y - 3 + 'px', width: r.width + 6 + 'px', height: r.height + 6 + 'px' }); document.body.appendChild(d);
      const n = document.createElement('div'); n.className = 'hv-num'; n.textContent = i + 1;
      Object.assign(n.style, { left: Math.max(0, r.x - 13) + 'px', top: Math.max(0, r.y - 15) + 'px' }); document.body.appendChild(n); }); };
  setInterval(() => { add(); blur(); }, 150);
})();`;

const idle = (page) => page.locator("#xaf-loading.show").waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});

(async () => {
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

  browser = await chromium.launch();
  context = await browser.newContext({ viewport: SIZE, storageState: state, recordVideo: { dir: path.join(OUT, "raw"), size: SIZE } });
  await context.addInitScript(OVERLAY);
  page = await context.newPage();
  const t0 = Date.now();
  const now = () => (Date.now() - t0) / 1000;
  const cues = [];
  const cuts = [];
  const cap = async (text) => {
    if (cues.length) cues[cues.length - 1].end = now();
    if (text) cues.push({ start: now(), end: null, text });
    await page.evaluate((x) => window.hvCaption && window.hvCaption(x), text || "");
  };
  const moveTo = async (loc) => {
    const b = await loc.boundingBox();
    if (!b) return null;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 });
    await page.waitForTimeout(300);
    return b;
  };
  // Сонгогч: th (баганын толгой), btn (title/текст), tree (цэсний мөр), text (яг текст), sel (CSS)
  const loc = (m) => {
    if (m.th) return page.locator("thead th:visible").filter({ hasText: m.th }).first(); // shoot.cjs-тэй ижил: агуулсан текст
    if (m.btn) return page.locator(`button:visible[title^="${m.btn}"], button:visible:has-text("${m.btn}"), [role=button]:visible:has-text("${m.btn}")`).first();
    if (m.tree) return page.getByRole("treeitem", { name: m.tree, exact: true }).first();
    if (m.text) return page.getByText(m.text, { exact: true }).first();
    return page.locator(m.sel).first();
  };
  const openMenu = async (group, item) => {
    const leaf = page.getByRole("treeitem", { name: item, exact: true }).first();
    for (const g of [].concat(group)) {
      if (await leaf.isVisible()) break;
      const el = page.getByText(g, { exact: true }).first();
      const exp = await el.evaluate((e) => e.closest("[role=treeitem]")?.getAttribute("aria-expanded")).catch(() => null);
      if (exp !== "true") { await moveTo(el); await el.click({ force: true }); await page.waitForTimeout(700); }
    }
    await moveTo(leaf);
    await leaf.click();
    const c = now();
    await idle(page);
    return c;
  };

  await page.goto(APP);
  await page.getByRole("treeitem").first().waitFor({ timeout: 60000 });
  await idle(page);
  await page.waitForTimeout(1500);
  const tLead = now();

  let lastMust = null;
  for (const s of SPEC.steps) {
    if (s.keep !== undefined) await page.evaluate((k) => { window.hvKeep = k; }, s.keep);
    if (s.cap !== undefined) await cap(s.cap);
    if (s.nav) {
      const c = await openMenu(s.nav.slice(0, -1), s.nav[s.nav.length - 1]);
      if (s.waitTh) await loc({ th: s.waitTh }).waitFor({ state: "attached", timeout: 60000 });
      else await page.waitForTimeout(3000);
      cuts.push([c, now()]);
      await page.waitForTimeout(800);
    }
    if (s.scrollTh) { await loc({ th: s.scrollTh }).evaluate((e) => e.scrollIntoView({ block: "nearest", inline: "center" })); await page.waitForTimeout(500); }
    if (s.open) {
      const t = s.open.btn || s.open.text || "";
      if (DENY.test(t)) throw new Error(`open «${t}» зөвшөөрөгдөөгүй — зогсов`);
      if (!s.mustSee) throw new Error("open-д mustSee заавал");
      lastMust = s.mustSee;
      const o = loc(s.open); await moveTo(o); await o.click();
      try { await page.getByText(s.mustSee).first().waitFor({ timeout: 10000 }); }
      catch { throw new Error(`«${s.mustSee}» гарсангүй — АЮУЛГҮЙН ҮҮДНЭЭС ЗОГСОВ`); }
      await idle(page); await page.waitForTimeout(800);
    }
    if (s.boxes) {
      const rs = await Promise.all(s.boxes.map((m) => loc(m).boundingBox().catch(() => null)));
      if (rs.some((r) => !r)) console.log("⚠️ олдоогүй хүрээ:", JSON.stringify(s.boxes.filter((_, i) => !rs[i])));
      await page.evaluate((x) => window.hvBoxes(x), rs);
      for (const i of [].concat(s.hover ?? [])) { const m = s.boxes[i]; if (m) await moveTo(loc(m)); await page.waitForTimeout(s.hoverWait || 1800); }
    }
    if (s.mouse) await page.mouse.move(s.mouse[0], s.mouse[1], { steps: 15 });
    await page.waitForTimeout(s.wait ?? 3000);
    if (s.boxes && !s.keepBoxes) await page.evaluate(() => window.hvBoxes([]));
    if (s.close) {
      // shoot.cjs-тэй ижил: Esc → mustSee үлдвэл зөвхөн «Хаах/Болих/Үгүй/Cancel/No/Close» товч
      const seen = () => page.getByText(lastMust).first().isVisible().catch(() => false);
      await page.keyboard.press("Escape"); await page.waitForTimeout(800);
      if (await seen()) { const b = page.getByRole("button", { name: /^(Үгүй|Болих|Хаах|Cancel|No|Close)$/ }).last(); if (await b.isVisible().catch(() => false)) await b.click(); await page.waitForTimeout(800); }
      if (await seen()) throw new Error("цонх хаагдсангүй — зогсов");
    }
  }
  await cap(null);
  const tEnd = now();
  const video = page.video();
  await context.close();
  await browser.close();
  fs.writeFileSync(path.join(OUT, "timing.json"), JSON.stringify({ video: await video.path(), tLead, tEnd, cuts, cues }, null, 1));
  console.log(JSON.stringify({ tLead, tEnd, cuts, n: cues.length }));
})().catch((e) => { console.error("ERR", e.message.split("\n")[0]); process.exit(1); });
