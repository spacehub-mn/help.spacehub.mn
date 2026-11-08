#!/usr/bin/env node
// annotate.cjs — гар утасны аппын дэлгэцийн зураг (adb screencap PNG) дээр shoot.cjs-тэй ижил улаан хүрээ + дугаар тавьж,
// хувийн мэдээллийг бүдгэрүүлээд static/img/<id>.webp болгоно. Нэмэлт сангүй: кодын репогийн tests/e2e-ийн Playwright Chromium canvas.
//
//   node scripts/shots/annotate.cjs                # app-shots.json-ийн бүх мөр
//   node scripts/shots/annotate.cjs <id> [<id>…]
//
// app-shots.json мөр: { id, src (PNG зам), crop?: {x,y,w,h}, blur?: [{x,y,w,h}], marks: [{x,y,w,h,n,below?}] } — бүх тоо эх PNG-ийн пикселээр.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const E2E = require(path.join(__dirname, "..", "local-paths.cjs"))("e2e");
if (!E2E) throw new Error("e2e орчны зам алга — SPACEHUB_E2E эсвэл help_local_paths.json (e2e)");
const { chromium } = require(path.join(E2E, "node_modules/playwright"));
const SHOTS = JSON.parse(fs.readFileSync(path.join(__dirname, "app-shots.json"), "utf8"));
const only = process.argv.slice(2);
// Утасны зураг өндөр нягтралтай (1080px өргөн) — дугаарыг вэбийн 32px × 2-той ойролцоо харагдуулна
const BADGE = 64;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const s of SHOTS.filter((x) => !only.length || only.includes(x.id))) {
    const src = "data:image/png;base64," + fs.readFileSync(path.resolve(ROOT, s.src)).toString("base64");
    const b64 = await page.evaluate(async ({ src, s, BADGE }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = s.crop || { x: 0, y: 0, w: img.width, h: img.height };
      const cv = Object.assign(document.createElement("canvas"), { width: c.w, height: c.h });
      const g = cv.getContext("2d");
      g.drawImage(img, -c.x, -c.y);
      // Бүдгэрүүлэлт: тухайн хэсгийг blur шүүлтүүрээр дахин зурна
      for (const r of s.blur || []) {
        g.save(); g.beginPath(); g.rect(r.x - c.x, r.y - c.y, r.w, r.h); g.clip();
        g.filter = "blur(18px)"; g.drawImage(img, -c.x, -c.y); g.restore();
      }
      const placed = [];
      // badge: вэбийн дэлгэцийн зурагт жижиг дугаар (32); left: дугаар хүрээний зүүн талд, голд нь (товч/checkbox-ийг дарахгүй)
      const B = s.badge || BADGE;
      for (const m of s.marks) {
        const x = m.x - c.x, y = m.y - c.y;
        g.lineWidth = B >= 64 ? 8 : 4; g.strokeStyle = "#e11d48";
        g.beginPath(); g.roundRect(x - 4, y - 4, m.w + 8, m.h + 8, 14); g.stroke();
        g.font = `800 ${B * 0.62}px Segoe UI, Arial`;
        const w = Math.max(B, g.measureText(m.n).width + 28);
        // Дугаар хүрээний зүүн дээд буланд, шугам дээр нь (below: зүүн доод буланд) — дараалсан мөрүүдийн дугаар давхцахгүй
        let left = Math.min(Math.max(0, x - 12), c.w - w);
        let top = Math.min(Math.max(0, (m.below ? y + m.h : y) - B / 2), c.h - B);
        if (m.under) top = Math.min(y + m.h + 8, c.h - B); // under: дугаар хүрээнээс бүтэн доор
        if (m.left) { left = Math.max(0, x - w - 12); top = Math.min(Math.max(0, y + m.h / 2 - B / 2), c.h - B); }
        for (let k = 0; k < 8 && placed.some((p) => left < p.left + p.w + 6 && p.left < left + w + 6 && Math.abs(p.top - top) < B); k++) left = Math.min(left + w + 12, c.w - w);
        placed.push({ left, top, w });
        g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 10;
        g.fillStyle = "#e11d48"; g.beginPath(); g.roundRect(left, top, w, B, B / 2); g.fill();
        g.shadowBlur = 0; g.lineWidth = 5; g.strokeStyle = "#fff"; g.stroke();
        g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(m.n, left + w / 2, top + B / 2 + 2);
      }
      return cv.toDataURL("image/webp", 0.8).split(",")[1];
    }, { src, s, BADGE });
    const out = path.join(ROOT, "static", "img", s.id + ".webp");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(b64, "base64"));
    console.log(`✅ ${s.id} тэмдэг ${s.marks.length} blur ${(s.blur || []).length}`);
  }
  await browser.close();
})().catch((e) => { console.error("ERR", e.message.split("\n")[0]); process.exit(1); });
