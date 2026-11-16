#!/usr/bin/env node
// ks-shoot.cjs — KidSpace гарын авлагын дэлгэцийн зураг. ЗӨВХӨН локал туршилтын орчин (KS_BASE, анхдагч http://localhost:3090).
// Нэвтрэх утгыг KS_LOGIN_JSON (director: {phone, password}) файлаас скрипт дотор уншина — хэвлэхгүй, репод бичихгүй.
//
//   node scripts/shots/ks-shoot.cjs                # ks-shots.json-ийн бүх мөр
//   node scripts/shots/ks-shoot.cjs <id> [<id>…]
//   node scripts/shots/ks-shoot.cjs --probe /path  # тэмдэггүй зураг scratch руу (KS_PROBE_OUT)
//
// ks-shots.json мөр: { id, page, url, wait?, steps?: [{click|fill|press|waitText|check, ...}], marks: [{n, text, role?, exact?, nth?}],
//                      blurText?: [..], clip?: {x,y,w,h}, full?: bool, alt }
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const E2E = require(path.join(__dirname, "..", "local-paths.cjs"))("e2e");
if (!E2E) throw new Error("e2e орчны зам алга — SPACEHUB_E2E эсвэл help_local_paths.json (e2e)");
const { chromium } = require(path.join(E2E, "node_modules/playwright"));

const BASE = process.env.KS_BASE || "http://localhost:3090";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("ЗӨВХӨН локал орчин: " + BASE);
const LOGIN = process.env.KS_LOGIN_JSON;
const OUT = path.join(ROOT, "kidspace-site", "static", "img");
const W = 1600, H = 900;

const args = process.argv.slice(2);
const probe = args[0] === "--probe" ? args.slice(1) : null;
const SHOTS = probe ? [] : JSON.parse(fs.readFileSync(path.join(__dirname, "ks-shots.json"), "utf8"));
const only = probe ? [] : args;

async function login(page) {
  if (!LOGIN) throw new Error("KS_LOGIN_JSON алга");
  const d = JSON.parse(fs.readFileSync(LOGIN, "utf8")).director;
  await page.goto(BASE + "/login");
  await page.getByRole("tab", { name: "Нууц үгээр" }).click();
  await page.locator("#login-phone").fill(d.phone);
  await page.locator("#login-password").fill(d.password);
  await page.getByRole("button", { name: "Нэвтрэх", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
}

async function idle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
}

function loc(page, m) {
  if (m.role) return page.getByRole(m.role, { name: m.text, exact: !!m.exact }).nth(m.nth || 0);
  return page.getByText(m.text, { exact: !!m.exact }).nth(m.nth || 0);
}

// Харагдаж буй элементийг текст / placeholder / aria-label-аар олж, дарагдах эцгийн (button, a, input, combobox…) хүрээг буцаана.
// m: { text, nth?, within? (dialog = зөвхөн нээлттэй цонх дотор), contains? (хэсэгчлэн таарах) }
async function findBox(page, m) {
  for (let t = 0; t < 20; t++) {
    const r = await page.evaluate((m) => {
      const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
      const want = norm(m.text);
      const root = m.within === "dialog" ? [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].pop() || document : document;
      const vis = (el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; };
      const hit = (s) => (m.contains ? norm(s).includes(want) : norm(s) === want);
      const out = [];
      for (const el of root.querySelectorAll("*")) {
        if (!vis(el)) continue;
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ");
        if (hit(el.getAttribute("placeholder")) || hit(el.getAttribute("aria-label")) || (hit(el.innerText) && [...el.children].every((c) => !hit(c.innerText))) || (own.trim() && hit(own))) out.push(el);
      }
      const el = out[m.nth || 0];
      if (!el) return null;
      let target = m.self ? el : (el.closest('button,a,input,textarea,select,label,[role="combobox"],[role="tab"],[role="menuitem"],[role="option"],[role="checkbox"],th,td') || el);
      for (let i = 0; i < (m.up || 0) && target.parentElement; i++) target = target.parentElement;
      const b = target.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    }, m);
    if (r) return r;
    await page.waitForTimeout(500);
  }
  return null;
}

async function clickText(page, m) {
  const b = await findBox(page, m);
  if (!b) throw new Error(`дарах «${m.text}» олдсонгүй`);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

async function runSteps(page, steps = []) {
  for (const st of steps) {
    if (st.goto) await page.goto(BASE + st.goto);
    else if (st.click) await clickText(page, { text: st.click, nth: st.nth, within: st.within, contains: st.contains, self: st.self });
    else if (st.fill) await page.getByLabel(st.fill, { exact: !!st.exact }).first().fill(st.value);
    else if (st.press) await page.keyboard.press(st.press);
    else if (st.waitText) await page.getByText(st.waitText).first().waitFor({ timeout: 20000 });
    else if (st.check) await page.getByRole("checkbox").nth(st.check).check();
    await idle(page);
  }
}

// Улаан хүрээ + дугаар (#e11d48, цагаан хүрээ, 32px) — DOM дээр давхарга
async function drawMarks(page, boxes) {
  await page.evaluate((boxes) => {
    for (const b of boxes) {
      const r = document.createElement("div");
      Object.assign(r.style, { position: "fixed", left: b.x - 4 + "px", top: b.y - 4 + "px", width: b.w + 8 + "px", height: b.h + 8 + "px",
        border: "3px solid #e11d48", borderRadius: "8px", zIndex: 2147483646, pointerEvents: "none", boxSizing: "border-box" });
      const n = document.createElement("div");
      const bw = Math.max(32, 12 + 9 * String(b.n).length); const bx = Math.max(2, b.x - 4 - bw - 4), by = Math.max(2, b.y + b.h / 2 - 16);
      Object.assign(n.style, { position: "fixed", left: (b.side === "top" ? b.x + b.w - bw : b.side === "right" || b.x - 4 - bw - 4 < 2 ? b.x + b.w + 8 : bx) + "px", top: (b.side === "top" ? Math.max(2, b.y - 40) : by) + "px", minWidth: "32px", height: "32px", padding: "0 6px",
        borderRadius: "16px", background: "#e11d48", color: "#fff", border: "2px solid #fff", font: "700 16px/28px sans-serif",
        textAlign: "center", zIndex: 2147483647, pointerEvents: "none", boxSizing: "border-box", boxShadow: "0 1px 4px rgba(0,0,0,.4)" });
      n.textContent = b.n;
      document.body.append(r, n);
    }
  }, boxes);
}

async function blurTexts(page, texts = []) {
  for (const t of texts) {
    const els = await page.getByText(t).all();
    for (const e of els) await e.evaluate((el) => { el.style.filter = "blur(6px)"; }).catch(() => {});
  }
}

async function toWebp(page, png, file) {
  const b64 = await page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", 0.8).split(",")[1];
  }, "data:image/png;base64," + png.toString("base64"));
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  return fs.statSync(file).size;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: "mn-MN" });
  const page = await ctx.newPage();
  await login(page);
  if (probe) {
    const out = process.env.KS_PROBE_OUT || ".";
    for (const u of probe) {
      await page.goto(BASE + u); await idle(page);
      const f = path.join(out, "probe" + u.replace(/[\/]/g, "_") + ".png");
      await page.screenshot({ path: f });
      console.log("probe", u, "→", f);
    }
    await browser.close();
    return;
  }
  fs.mkdirSync(path.join(OUT, "kidspace"), { recursive: true });
  const conv = await ctx.newPage();
  let fail = 0;
  for (const s of SHOTS.filter((x) => !only.length || only.includes(x.id))) {
    try {
      await page.goto(BASE + s.url); await idle(page);
      if (s.wait) await page.getByText(s.wait).first().waitFor({ timeout: 20000 });
      await runSteps(page, s.steps);
      await blurTexts(page, s.blurText);
      const boxes = [];
      for (const m of s.marks || []) {
        const bb = await findBox(page, m);
        if (!bb) throw new Error(`тэмдэг ${m.n} «${m.text}» олдсонгүй`);
        boxes.push({ x: bb.x, y: bb.y, w: bb.width, h: bb.height, n: m.n, side: m.side });
      }
      await drawMarks(page, boxes);
      const png = await page.screenshot(s.clip ? { clip: s.clip } : { fullPage: !!s.full });
      const size = await toWebp(conv, png, path.join(OUT, s.id + ".webp"));
      console.log("✅", s.id, Math.round(size / 1024) + "KB");
    } catch (e) {
      fail++;
      console.log("❌", s.id, String(e.message).split("\n")[0]);
    }
  }
  await browser.close();
  process.exitCode = fail ? 1 : 0;
})();
