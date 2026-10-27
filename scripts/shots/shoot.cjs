#!/usr/bin/env node
// shoot.cjs — гарын авлагын дэлгэцийн зургийг прод app.spacehub.mn-ээс автоматаар авна (HELP_PLAN §11).
// ЗӨВХӨН УНШИНА: цэсээр жагсаалт нээж, товчийг улаан хүрээ + дугаараар тэмдэглээд зураг авна. Toolbar товч ДАРАХГҮЙ.
// Хувийн мэдээллийн багана (PII_TH) анхдагчаар бүдгэрнэ. Зураг бүрийг Dev_Research шалгана.
//
//   node scripts/shots/shoot.cjs                 # бүх мөр
//   node scripts/shots/shoot.cjs <id> [<id>…]    # зөвхөн эдгээр (help_impact-ийн 🔴/🟡 хуудсуудад)
//
// Шаардлага: Spacehub23/tests/e2e (playwright + .env TEST_USER/TEST_PASS). Өөр газар бол SPACEHUB_E2E=<зам>.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const E2E = process.env.SPACEHUB_E2E || "E:/Projects/spacehub-mn/Spacehub23/tests/e2e";
require(path.join(E2E, "node_modules/dotenv")).config({ path: path.join(E2E, ".env") });
const { chromium } = require(path.join(E2E, "node_modules/playwright"));

const APP = "https://app.spacehub.mn/";
const VIEWPORT = { width: 1600, height: 900 };
const QUALITY = 0.8;
// Багана нэр нь апп дээр «Регистер» гэж бичигдсэн (Contract_ListView) — хоёуланг нь барина
const PII_TH = ["Харилцагч", "Бизнес нэр", "Регистр", "Регистер", "Утас", "Имэйл", "Данс", "Нэр"];
const SHOTS = JSON.parse(fs.readFileSync(path.join(__dirname, "shots.json"), "utf8"));
const only = process.argv.slice(2);

const idle = (page) => page.locator("#xaf-loading.show").waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});

// Баганын гарчгаар (thead th) нүдийг бүдгэрүүлнэ; дансны сонголт («5005904493 Нэр…») ч бүдгэрнэ
async function blur(page, extraTh, account) {
  return page.evaluate(({ heads, account }) => {
    const css = document.getElementById("hs-css") || document.head.appendChild(Object.assign(document.createElement("style"), { id: "hs-css" }));
    css.textContent = ".hs-pii{filter:blur(7px)!important}";
    let n = 0;
    document.querySelectorAll("table").forEach((t) => {
      const ths = [...t.querySelectorAll("thead th")];
      ths.forEach((th, i) => {
        if (!th.offsetParent || !heads.some((h) => th.innerText.includes(h))) return;
        t.querySelectorAll("tbody tr").forEach((tr) => { const td = tr.children[i]; if (td) { td.classList.add("hs-pii"); n++; } });
      });
    });
    if (account) document.querySelectorAll("input").forEach((el) => { if (el.offsetParent && /^\d{6,}\s/.test(el.value)) { el.classList.add("hs-pii"); n++; } });
    return n;
  }, { heads: [...PII_TH, ...extraTh], account });
}

async function box(page, m) {
  if (m.account) {
    // Дансны сонголт = утга нь «тоо + нэр» input
    return page.evaluate(() => {
      const el = [...document.querySelectorAll("input")].find((e) => e.offsetParent && /^\d{6,}\s/.test(e.value));
      const r = el && (el.closest(".dxbl-combobox, .dxbl-text-edit") || el).getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
    });
  }
  if (m.btn) {
    // Дүрстэй товчны нэр ихэвчлэн title (tooltip)-д байдаг — текст ба title хоёуланг хайна
    return page.evaluate(({ t, exact }) => {
      // XAF хаалттай табын toolbar дэлгэцээс гадна (x < 0) үлддэг — зөвхөн харагдаж буйг ав
      const el = [...document.querySelectorAll("button")].find((b) => { const r = b.getBoundingClientRect(); return b.offsetParent && r.x >= 0 && r.y >= 0 && (exact ? [(b.innerText || "").trim(), (b.title || "").split(/\r?\n/)[0].trim()].includes(t) : ((b.innerText || "") + " " + (b.title || "")).includes(t)); });
      const r = el && el.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
    }, { t: m.btn, exact: !!m.exact });
  }
  const loc = page.locator("thead th:visible").filter({ hasText: new RegExp(`^\\s*${m.th}\\s*$`) }).first();
  return (await loc.count()) ? loc.boundingBox() : null;
}

// DOM дээр давхарга зурна: улаан хүрээ + 1 2 3 дугаар (зургийн дараа зурахгүй — хэмжээ өөрчлөгдсөн ч зөв байрлана)
async function mark(page, boxes) {
  await page.evaluate((boxes) => {
    document.querySelectorAll(".hs-mark").forEach((e) => e.remove());
    boxes.forEach((b, i) => {
      const r = document.createElement("div");
      r.className = "hs-mark";
      Object.assign(r.style, { position: "fixed", left: b.x - 3 + "px", top: b.y - 3 + "px", width: b.width + 6 + "px", height: b.height + 6 + "px",
        border: "3px solid #e11d48", borderRadius: "6px", zIndex: 2147483646, pointerEvents: "none", boxSizing: "border-box" });
      const n = document.createElement("div");
      n.className = "hs-mark";
      n.textContent = b.n || String(i + 1);
      Object.assign(n.style, { position: "fixed", left: Math.max(0, b.x - 12) + "px", top: Math.max(0, b.y - 14) + "px", minWidth: "20px", height: "20px", padding: "0 4px", boxSizing: "border-box",
        borderRadius: "10px", background: "#e11d48", color: "#fff", font: "700 12px/20px Segoe UI,Arial", textAlign: "center", zIndex: 2147483647, pointerEvents: "none" });
      document.body.append(r, n);
    });
  }, boxes);
}

// PNG → webp (Chromium-ийн canvas-аар, нэмэлт сангүй)
async function toWebp(page, png) {
  const b64 = await page.evaluate(async ({ src, q }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", q).split(",")[1];
  }, { src: "data:image/png;base64," + png.toString("base64"), q: QUALITY });
  return Buffer.from(b64, "base64");
}

(async () => {
  const todo = SHOTS.filter((s) => !only.length || only.includes(s.id));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.goto(APP);
  await page.getByLabel(/user\s*name|нэр/i).fill(process.env.TEST_USER);
  await page.getByLabel(/password|нууц/i).fill(process.env.TEST_PASS);
  await page.getByRole("button", { name: /log\s*in|нэвтр/i }).click();
  await page.getByRole("treeitem").first().waitFor({ timeout: 60000 });
  await idle(page);

  const report = [];
  for (const s of todo) {
    // Өргөн хүснэгтэд хуудас тус бүрийн өргөн (гүйлгэвэл сонгох нүд, Код харагдахгүй болдог — Dev_Research 10-26)
    const vw = { width: s.width || VIEWPORT.width, height: VIEWPORT.height };
    await page.setViewportSize(vw);
    const [group, item] = s.nav;
    const leaf = page.getByRole("treeitem", { name: item, exact: true }).first();
    if (!(await leaf.isVisible())) { await page.getByText(group, { exact: true }).first().click({ force: true }); await page.waitForTimeout(700); }
    await leaf.click();
    await idle(page);
    if (s.waitTh) await page.locator("thead th:visible", { hasText: s.waitTh }).first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.mouse.move(vw.width - 5, vw.height - 5); // tooltip гаргахгүй
    // Хүснэгтийг хэвтээ гүйлгэж заасан баганыг харагдуулна (зөвхөн харагдах байдал, өгөгдөл өөрчлөхгүй)
    if (s.scrollTh) await page.locator("thead th:visible", { hasText: s.scrollTh }).first().evaluate((th) => th.scrollIntoView({ block: "nearest", inline: "end" }));
    await page.waitForTimeout(400);
    const blurred = await blur(page, s.blurTh || [], !!s.blurAccount);
    const boxes = [];
    const missing = [];
    for (const m of s.marks) {
      const b = await box(page, m);
      // Дэлгэцээс гадуур (баруун тийш гүйлгэх шаардлагатай) багана = олдоогүй гэж тооцно
      if (b && b.x + b.width <= vw.width && b.y + b.height <= vw.height) boxes.push({ ...b, label: m.label, n: m.n });
      else missing.push(m.label || m.btn || m.th);
    }
    // Дугаарыг уншигдах дарааллаар (мөр, дараа нь зүүнээс баруун) — хуудасны тайлбар энэ дарааллаар
    // m.n өгсөн бол (жагсаалтын «Товчнууд»-ын 1., 1.1 дугаар) дарааллыг хөндөхгүй — зураг ба бичвэрийн дугаар таарна
    if (!s.marks.some((m) => m.n)) boxes.sort((a, b) => Math.round(a.y / 40) - Math.round(b.y / 40) || a.x - b.x);
    await mark(page, boxes);
    await page.waitForTimeout(300);
    // clipHeight: доод хоосон хэсгийг тайрна (богино жагсаалт)
    const webp = await toWebp(page, await page.screenshot(s.clipHeight ? { clip: { x: 0, y: 0, width: vw.width, height: s.clipHeight } } : {}));
    const out = path.join(ROOT, "static", "img", s.id + ".webp");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    // Өмнөхтэй байт ижил бол файлыг солихгүй — git түүх хоосон өөрчлөлтөөр өсөхгүй
    const same = fs.existsSync(out) && fs.readFileSync(out).equals(webp);
    if (!same) fs.writeFileSync(out, webp);
    const view = page.url().replace(APP, "");
    report.push({ id: s.id, page: s.page, view, kb: Math.round(webp.length / 1024), legend: boxes.map((b) => b.label), missing, blurred, changed: !same });
    console.log(`${missing.length ? "⚠️" : "✅"} ${s.id} ${view} ${Math.round(webp.length / 1024)}KB тэмдэг ${boxes.length}/${s.marks.length} blur ${blurred}${missing.length ? " олдоогүй: " + missing.join(", ") : ""}`);
  }
  await browser.close();
  // Хэсэгчлэн ажиллуулсан бол бусад мөрийн өмнөх тайланг хадгална
  const rp = path.join(__dirname, "shots-report.json");
  const prev = fs.existsSync(rp) ? JSON.parse(fs.readFileSync(rp, "utf8")).report : [];
  const merged = SHOTS.map((s) => report.find((r) => r.id === s.id) || prev.find((r) => r.id === s.id)).filter(Boolean);
  fs.writeFileSync(rp, JSON.stringify({ at: new Date().toISOString(), report: merged }, null, 1) + "\n");
  process.exit(report.some((r) => r.missing.length) ? 1 : 0);
})().catch((e) => { console.error("ERR", e.message.split("\n")[0]); process.exit(1); });
