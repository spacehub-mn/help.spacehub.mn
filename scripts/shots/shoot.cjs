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
const PII_TH = ["Харилцагч", "Түрээслэгч", "Бизнес нэр", "Регистр", "Регистер", "Утас", "Имэйл", "Данс", "Нэр"];
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
    // Хайлтын талбарт өмнөх хайлт (регистр, нэр) үлдсэн байж болно — үргэлж бүдгэрүүлнэ
    document.querySelectorAll("input").forEach((el) => { if (el.offsetParent && el.value && /хай/i.test(el.placeholder || "")) { el.classList.add("hs-pii"); n++; } });
    // Имэйл (Бүртгэсэн хэрэглэгч г.м.) — хаана ч байсан бүдгэрүүлнэ
    const mail = /[\w.+-]+@[\w-]+(\.[\w-]+)*|@\S*\.\.\./;
    document.querySelectorAll("td, a, span, input").forEach((el) => {
      if (!el.offsetParent || el.closest(".hs-pii")) return;
      const own = el.tagName === "INPUT" ? el.value : [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join("");
      if (mail.test(own || "")) { el.classList.add("hs-pii"); n++; }
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
  if (m.tree) {
    // Зүүн цэсний мөр (алхам 1: «… цэсийг нээ»)
    // Цэсний нэрийн текст + зүүн талын дүрс (дэд мөртэй мөрийн бүтэн хайрцаг биш)
    // Бүлгийн мөрийн (Тооцоо г.м.) нэр нь дэд цэсийг агуулдаг тул treeitem доторх яг тэр бичгийг хайна
    const txt = page.getByRole("treeitem").getByText(m.tree, { exact: true }).locator("visible=true").first();
    const t = (await txt.isVisible().catch(() => false)) ? await txt.boundingBox() : null;
    return t ? { x: t.x - 30, y: t.y - 4, width: t.width + 36, height: t.height + 8 } : null;
  }
  if (m.text) {
    // Цонх доторх бичиг / талбарын шошго
    const all = page.getByText(m.text, { exact: !!m.exact }); const loc = m.first ? all.first() : all.last(); // first: дэд таб (баганын толгойтой ижил нэртэй)
    return (await loc.isVisible().catch(() => false)) ? loc.boundingBox() : null;
  }
  if ("value" in m) {
    // Сонголтын талбар (шүүлт г.м.) — одоогийн утгаар; хүрээ = бүтэн combobox
    return page.evaluate((v) => {
      // placeholder-гүй input = сонголтын талбар (цэсний «Filter…», «Энд бичиж хай…» нүд placeholder-тэй)
      const el = [...document.querySelectorAll("input")].find((e) => e.offsetParent && !e.placeholder && e.value === v && e.getBoundingClientRect().x >= 0);
      const r = el && (el.closest("[class*=combo]") || el.parentElement).getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
    }, m.value);
  }
  if (m.input) {
    // Хайлтын нүд г.м. — placeholder-оор (утга нь бүдгэрсэн хэвээр)
    const loc = page.locator(`input[placeholder*="${m.input}"]:visible`).first();
    return (await loc.isVisible().catch(() => false)) ? loc.boundingBox() : null;
  }
  if (m.rowCheck) {
    // Эхний мөрийн сонгох нүд (алхам: «гүйлгээг сонго») — зөвхөн тэмдэглэнэ, дарахгүй
    return page.evaluate(() => {
      const el = [...document.querySelectorAll("tbody tr td:first-child")].find((td) => td.offsetParent && td.getBoundingClientRect().x >= 0);
      const r = el && el.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
    });
  }
  if (m.btn) {
    // Дүрстэй товчны нэр ихэвчлэн title (tooltip)-д байдаг — текст ба title хоёуланг хайна
    return page.evaluate(({ t, exact, last }) => {
      // XAF хаалттай табын toolbar дэлгэцээс гадна (x < 0) үлддэг — зөвхөн харагдаж буйг ав
      // last: дэд табын toolbar (үндсэн toolbar-тай ижил нэртэй товч) — DOM-д сүүлд байдаг
      const el = [...document.querySelectorAll("button")][last ? "findLast" : "find"]((b) => { const r = b.getBoundingClientRect(); return b.offsetParent && r.x >= 0 && r.y >= 0 && (exact ? [(b.innerText || "").trim(), (b.title || "").split(/\r?\n/)[0].trim()].includes(t) : ((b.innerText || "") + " " + (b.title || "")).includes(t)); });
      const r = el && el.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
    }, { t: m.btn, exact: !!m.exact, last: !!m.last });
  }
  const loc = page.locator("thead th:visible").filter({ hasText: new RegExp(`^\\s*${m.th}\\s*$`) }).first();
  return (await loc.count()) ? loc.boundingBox() : null;
}

// DOM дээр давхарга зурна: улаан хүрээ + ТОМ дугаар (эзэн 10-27: тэмдэг ≥32px, утсан дээр уншигдана).
// Дугаар товчны ДЭЭР голлож байрлана; хөрш тэмдэгтэй давхцвал товчны ДООР — хоёулаа уншигдана.
const BADGE = 32;
async function mark(page, boxes) {
  return page.evaluate(({ boxes, BADGE }) => {
    document.querySelectorAll(".hs-mark").forEach((e) => e.remove());
    const placed = [];
    const out = [];
    boxes.forEach((b, i) => {
      const r = document.createElement("div");
      r.className = "hs-mark";
      Object.assign(r.style, { position: "fixed", left: b.x - 3 + "px", top: b.y - 3 + "px", width: b.width + 6 + "px", height: b.height + 6 + "px",
        border: "4px solid #e11d48", borderRadius: "8px", zIndex: 2147483646, pointerEvents: "none", boxSizing: "border-box" });
      const n = document.createElement("div");
      n.className = "hs-mark";
      n.textContent = b.n || String(i + 1);
      Object.assign(n.style, { position: "fixed", minWidth: BADGE + "px", height: BADGE + "px", padding: "0 8px", boxSizing: "border-box",
        borderRadius: BADGE / 2 + "px", background: "#e11d48", color: "#fff", font: `800 20px/${BADGE - 6}px Segoe UI,Arial`, textAlign: "center",
        border: "3px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.45)", zIndex: 2147483647, pointerEvents: "none" });
      document.body.append(r, n);
      const w = n.getBoundingClientRect().width;
      // right: цэсний мөр — дээр/доорх мөрийг дарахгүй; left: талбарын шошго — баруун талын утга/чагтыг дарахгүй
      const left = b.right ? b.x + b.width + 6 : b.left ? Math.max(0, b.x - w - 8) : Math.max(0, b.x + b.width / 2 - w / 2);
      let top = b.below ? b.y + b.height + 6 : Math.max(0, b.y - BADGE - 6);
      if (b.right || b.left) { top = b.y + (b.height - BADGE) / 2; } // below: дээр нь чухал бичиг байвал (гарчиг г.м.)
      const hit = (t) => placed.some((p) => left < p.left + p.w + 2 && p.left < left + w + 2 && Math.abs(p.top - t) < BADGE);
      if (hit(top)) top = b.y + b.height + 6;
      Object.assign(n.style, { left: left + "px", top: top + "px" });
      placed.push({ left, top, w });
      out.push({ x: left, y: top, width: w, height: BADGE });
    });
    return out; // clip "auto"-д тэмдгийн байрлалыг оруулна
  }, { boxes, BADGE });
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
  // 2× нягтрал: зураг дээр дарж томруулахад дугаар тод (эзэн 10-27)
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
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
    if (s.url) { await page.goto(APP + s.url); await idle(page); } // url: дэд цэс (Харилцагч → Хэрэглэгч г.м.) — зөвхөн харах
    else if (!s.navOnly) await leaf.click(); // navOnly: зөвхөн бүлгийг дэлгэнэ (дээр дэлгэсэн)
    await idle(page);
    if (s.waitTh) await page.locator("thead th:visible", { hasText: s.waitTh }).first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.mouse.move(vw.width - 5, vw.height - 5); // tooltip гаргахгүй
    // Хүснэгтийг хэвтээ гүйлгэж заасан баганыг харагдуулна (зөвхөн харагдах байдал, өгөгдөл өөрчлөхгүй)
    if (s.scrollTh) await page.locator("thead th:visible", { hasText: s.scrollTh }).first().evaluate((th) => th.scrollIntoView({ block: "nearest", inline: "end" }));
    await page.waitForTimeout(400);
    // Цонхны алхмын зураг (эзэн 10-27 А, CEO 11:2x): мөр СОНГООД товчоор цонх НЭЭНЭ, зураг аваад Esc / «Үгүй, Хаах»-аар хаана.
    // Хадгалах / илгээх / төлөх / «Тийм»-ийг ХЭЗЭЭ Ч дарахгүй, талбарт бичихгүй. mustSee текст гарахгүй бол бүх ажлыг зогсооно.
    // Зөвхөн харах шилжилт: эхний мөрийн карт нээх (rowOpen = баганын индекс), таб сонгох (tab)
    // Огнооны шүүлтийг арилгах (✕) — зөвхөн харагдац, өгөгдөл хөндөхгүй; хоосон жагсаалтад мөр гаргана
    if (s.clearDate) { const x = page.locator("button[title^=\"Огнооны шүүлтийг арилгах\"]:visible").first(); if (await x.isEnabled().catch(() => false)) { await x.click(); await idle(page); await page.waitForTimeout(2500); } }
    if (s.rowOpen != null) { await page.locator("tbody tr:visible").first().locator("td").nth(s.rowOpen).click(); await idle(page); await page.waitForTimeout(2500); }
    if (s.tab) { await page.getByText(s.tab, { exact: true }).first().click(); await idle(page); await page.waitForTimeout(2000); }
    // Дэд таб (Үндсэн мэдээлэл доторх «Тоолуур» г.м.) — role=tab-аар, гүйлгэж харагдуулна; зөвхөн харах
    if (s.subTab) { const t = page.getByText(s.subTab, { exact: true }).last(); await t.scrollIntoViewIfNeeded(); await t.click(); await idle(page); await page.waitForTimeout(2500); }
    if (s.open) {
      if (s.selectRow) await page.locator("tbody tr td:first-child input[type=checkbox]:visible, tbody tr td:first-child .dxbl-checkbox:visible").first().click();
      await page.waitForTimeout(800);
      const ob = await box(page, s.open);
      if (!ob) throw new Error(`${s.id}: нээх товч олдсонгүй — зогсов`);
      await page.mouse.click(ob.x + ob.width / 2, ob.y + ob.height / 2);
      try { await page.getByText(s.mustSee).first().waitFor({ timeout: 10000 }); }
      catch { throw new Error(`${s.id}: «${s.mustSee}» цонх гарсангүй — АЮУЛГҮЙН ҮҮДНЭЭС ЗОГСОВ`); }
      await idle(page);
      await page.waitForTimeout(800);
      await page.mouse.move(vw.width - 5, vw.height - 5);
    }
    // Цонх доторх хувийн мэдээлэл: «Хайлт түргэвчлэгч»-ийн үгс (гүйлгээний утгаас — компани/хүний нэр), гарчгийн 2-р мөр, хайлтын утга
    if (s.blurDialog) await page.evaluate(() => {
      const pii = (el) => el && el.classList.add("hs-pii");
      const chipsLabel = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /^Хайлт түргэвчлэгч/.test((e.textContent || "").trim()));
      if (chipsLabel) [...chipsLabel.parentElement.querySelectorAll("button, span, a")].filter((e) => e !== chipsLabel && e.offsetParent).forEach(pii);
      const title = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /^Гэрээ сонгох \(хурдан/.test((e.textContent || "").trim()));
      if (title) [...title.parentElement.children].filter((e) => e !== title).forEach(pii);
      document.querySelectorAll(".dxbl-modal input[type=text], .dxbl-popup input[type=text], [role=dialog] input[type=text]").forEach(pii);
    });
    const blurred = await blur(page, s.blurTh || [], !!s.blurAccount);
    const boxes = [];
    const missing = [];
    for (const m of s.marks) {
      const b = await box(page, m);
      // Дэлгэцээс гадуур (баруун тийш гүйлгэх шаардлагатай) багана = олдоогүй гэж тооцно
      if (b && b.x + b.width <= vw.width && b.y + b.height <= vw.height) boxes.push({ ...b, label: m.label, n: m.n, below: !!m.below, right: m.right ?? !!m.tree, left: !!m.left });
      else missing.push(m.label || m.btn || m.th);
    }
    // Дугаарыг уншигдах дарааллаар (мөр, дараа нь зүүнээс баруун) — хуудасны тайлбар энэ дарааллаар
    // m.n өгсөн бол (жагсаалтын «Товчнууд»-ын 1., 1.1 дугаар) дарааллыг хөндөхгүй — зураг ба бичвэрийн дугаар таарна
    if (!s.marks.some((m) => m.n)) boxes.sort((a, b) => Math.round(a.y / 40) - Math.round(b.y / 40) || a.x - b.x);
    const badges = await mark(page, boxes);
    await page.waitForTimeout(300);
    // clipHeight: доод хоосон хэсгийг тайрна (богино жагсаалт); clip {x,y,width,height}: зөвхөн toolbar — хуудсанд жижгэрэхгүй
    // clip "auto": бүх тэмдгийг багтаасан хамгийн бага хэсэг (+ зай) — цэс, toolbar, багана нэг зурагт
    let clip = s.clip;
    if (clip === "auto" && boxes.length) {
      const all = [...boxes, ...badges];
      const x0 = Math.max(0, Math.min(...all.map((b) => b.x)) - 24 - (s.padLeft || 0)), y0 = Math.max(0, Math.min(...all.map((b) => b.y)) - 12);
      const x1 = Math.min(vw.width, Math.max(...all.map((b) => b.x + b.width)) + 24 + (s.padRight || 0)), y1 = Math.min(vw.height, Math.max(...all.map((b) => b.y + b.height)) + 12 + (s.padBottom || 0));
      clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    } else if (clip === "auto") clip = undefined;
    if (clip === "dialog") {
      // Нээгдсэн цонхны бүтэн хэмжээ (+ тэмдэг гарах зай)
      const d = await page.evaluate(() => {
        const c = [...document.querySelectorAll("[role=dialog], .dxbl-modal-content, .dxbl-popup-content, .dxbl-window")].filter((e) => e.offsetParent || e.getClientRects().length)
          .map((e) => e.getBoundingClientRect()).filter((r) => r.width > 200 && r.height > 100).sort((a, b) => b.width * b.height - a.width * a.height)[0];
        return c ? { x: c.x, y: c.y, width: c.width, height: c.height } : null;
      });
      clip = d ? { x: Math.max(0, d.x - 24), y: Math.max(0, d.y - 44), width: Math.min(vw.width - Math.max(0, d.x - 24), d.width + 48), height: Math.min(vw.height - Math.max(0, d.y - 44), d.height + 60) } : undefined;
    }
    const webp = await toWebp(page, await page.screenshot(clip ? { clip } : s.clipHeight ? { clip: { x: 0, y: 0, width: vw.width, height: s.clipHeight } } : {}));
    const out = path.join(ROOT, "static", "img", s.id + ".webp");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    // Өмнөхтэй байт ижил бол файлыг солихгүй — git түүх хоосон өөрчлөлтөөр өсөхгүй
    const same = fs.existsSync(out) && fs.readFileSync(out).equals(webp);
    if (!same) fs.writeFileSync(out, webp);
    if (s.open) {
      // Хаах: Esc → үлдвэл зөвхөн «Үгүй / Болих / Хаах / Cancel / No» товч. Дараа нь хуудсыг дахин ачаална.
      await page.evaluate(() => document.querySelectorAll(".hs-mark").forEach((e) => e.remove()));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
      if (await page.getByText(s.mustSee).first().isVisible().catch(() => false)) {
        const cancel = page.getByRole("button", { name: /^(Үгүй|Болих|Хаах|Cancel|No|Close)$/ }).last();
        if (await cancel.isVisible().catch(() => false)) await cancel.click();
        await page.waitForTimeout(800);
      }
      const still = await page.getByText(s.mustSee).first().isVisible().catch(() => false);
      console.log(`   ↳ цонх хаагдсан: ${still ? "❌ ҮГҮЙ — гараар шалга" : "✅"}`);
      if (still) throw new Error(`${s.id}: цонх хаагдсангүй — зогсов`);
      await page.reload(); await idle(page); await page.getByRole("treeitem").first().waitFor({ timeout: 60000 });
    }
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
