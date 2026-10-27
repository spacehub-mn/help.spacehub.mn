// Алхмын нэг мөрийн дугаарлалт (эзэн 10-27 «дугаарлалт болж байна, дэд дугаарууд бас ашиглах»):
//   алхмын хэсэг (## …)          → «1. …», «2. …»
//   «## Товчнууд» доторх ### товч → «1. «Товч»», «2. …»
//   алхмын доорх дугаартай жагсаалт → 1.1, 1.2 … (CSS: ol.substeps, src/css/custom.css)
// Бичвэрт гараар бичсэн «Алхам 3 — », «3. » угтварыг авч, дугаарыг энд дахин тавина — дугаар хэзээ ч зөрөхгүй.
// Хамрах хүрээ: frontmatter type-тай хуудас (oilgolt, lavlah-ийн нэр томьёо биш); legacy хуудсанд зөвхөн 1.1 үгүй.
const fs = require("fs");

// Алхам биш хэсгүүд — дугаарлахгүй
const META = /^(Энэ юу|Энэ юунд|Хаана|Багана|Шүүлт|Товчнууд|Анхаар|Түгээмэл асуулт|🔗|Холбоотой|Бусад|Нэр томьёо|Хайлтын)/u;
const PREFIX = /^\s*(Алхам\s+)?\d+(\.\d+)*\s*[.)—–-]?\s*[—–-]?\s*/u;
// Нэр томьёо/ойлголтын хуудсанд H2 нь алхам биш, нэр томьёо
const NO_STEPS = ["oilgolt", "nuur", "hab"];

function typeOf(path) {
  try {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(path, "utf8"));
    return fm && (/^type:\s*(\S+)/m.exec(fm[1]) || [])[1];
  } catch {
    return undefined;
  }
}

const textOf = (n) => (n.type === "text" || n.type === "inlineCode" ? n.value : (n.children || []).map(textOf).join(""));

/** Гарчгийн эхний текстээс гар угтварыг авч «N. » тавина. */
function renumber(heading, label) {
  const first = heading.children.find((c) => c.type === "text");
  if (first) first.value = first.value.replace(PREFIX, "");
  // «1. Нэр», дэд нь «1.1 Нэр» (цэс, 1.1 жагсаалттай ижил)
  heading.children.unshift({ type: "text", value: label.includes(".") ? `${label} ` : `${label}. ` });
}

function plugin() {
  return (tree, file) => {
    const path = file.path || file.history?.[0];
    if (!path) return;
    const type = typeOf(path);
    if (!type || NO_STEPS.includes(type)) return;

    const kids = tree.children;
    // «Товчнууд» доторх ### нь товч («…») эсвэл доороо #### товчтой бүлэг бол дугаарлана (Гэрээ: 1. бүлэг → 1.1 товч).
    // Зөвлөгөөний ### («Аль товчийг сонгох») дугааргүй — зурган дээрх дугаар товчны дугаартай таарна.
    const isGroup = (i) => {
      const next = kids.slice(i + 1).find((n) => n.type === "heading");
      return next && next.depth === 4;
    };
    let step = ""; // одоогийн алхмын дугаар ("" = алхам биш хэсэгт)
    let h2 = 0;
    let inButtons = false;
    let btn = 0;
    let sub = 0;
    kids.forEach((node, i) => {
      if (node.type === "heading" && node.depth === 2) {
        const t = textOf(node).trim();
        inButtons = /^Товчнууд/u.test(t);
        btn = 0;
        if (META.test(t)) { step = ""; return; }
        step = String(++h2);
        renumber(node, step);
      } else if (node.type === "heading" && node.depth === 3 && inButtons) {
        const t = textOf(node).trim();
        if (/^Бусад/u.test(t) || !(t.startsWith("«") || isGroup(i))) { step = ""; return; }
        step = String(++btn);
        sub = 0;
        renumber(node, step);
      } else if (node.type === "heading" && node.depth === 4 && inButtons && btn) {
        step = `${btn}.${++sub}`;
        renumber(node, step);
      } else if (node.type === "list" && node.ordered && step) {
        node.data = node.data || {};
        node.data.hProperties = { ...(node.data.hProperties || {}), className: ["substeps"] };
        for (const li of node.children) {
          li.data = li.data || {};
          li.data.hProperties = { ...(li.data.hProperties || {}), "data-step": String(step) };
        }
      }
    });
  };
}

module.exports = plugin;
module.exports.META = META;
module.exports.PREFIX = PREFIX;
