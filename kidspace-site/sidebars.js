// KidSpace-ийн тусдаа сайтын цэс. id нь ../docs/kidspace доторх файлын зам (.md-гүй; дэд хавтас бол «concepts/x»).
// Дугаар 1. → 1.1 (help.spacehub.mn-тэй ижил): CSS counters() тавина (src/css/custom.css «.sb-num») — нэрт дугаар
// бичихгүй (Docusaurus 2.3 хуудасны sidebar_label-ийг давуу үздэг). Нүүр, «Цэс бүрийн хуудас» дугааргүй.
const doc = (id) => ({ type: "doc", id, className: "sb-num" });
const group = (label, items) => ({ type: "category", label, collapsed: true, className: "sb-num", items: items.map(doc) });

module.exports = {
  kidspace: [
    { type: "doc", id: "index", label: "🏫 Нүүр" },
    group("🚀 Эхлэх", ["nevtruulelt/index", "tutorial/sar-buriin-ajil", "tutorial/shine-jil", "tutorial/huuhed-garah", "role/menejer", "role/bagsh"]),
    group("❓ Түгээмэл асуулт", ["asuult/elselt", "asuult/tolbor", "asuult/irts", "asuult/tolult", "asuult/harilsaa", "asuult/baiguullaga", "asuult/nevtreh", "nehemjleh-uusgeegui", "sms-ochoogui", "erhgui"]),
    group("💡 Ойлголт", ["glossary", "concepts/elselt-buleg-jil", "concepts/tolbor-urgal", "concepts/honglolt-butsaalt", "concepts/irts-tolbor", "concepts/tolov"]),
    doc("tsetserlegiin-toim"),
    group("👧 Элсэлт, анги", ["elselt-burtgel", "elseltiin-huselt", "elseltiin-haalt", "ehleh-ognoo-zasah", "angi-shiljuuleh-devshuuleh", "davhar-huuhed-negtgeh", "bulguud", "3d-angi", "suragchid", "ger-bul"]),
    group("📅 Ирц, хөгжил", ["irts-zhurnal", "hogjliin-zhurnal"]),
    group("💬 Харилцаа", ["sanal-huselt", "niitlel", "medeelel-hyanah", "nuusan-aguulga"]),
    group("💳 Тооцоо", ["tolbor-nehemjleh", "tolboriin-huvaar", "tolbor-jagsaalt", "honglolt", "nehemjleh-ilgeeh", "tolult", "butsaalt", "saryn-tootsoo-tailan"]),
    group("⚙️ Авто туслагч", ["tolboriin-ajillagaa", "dansnii-huulga", "huvaariin-ajil"]),
    group("🏢 Байгууллага", ["baiguullaga", "tailant-uye-haah", "hicheeliin-jil", "bagsh-ajilchid", "baraa-uilchilgee", "bagts", "nehemjleh-tohirgoo", "bank-dans", "veb-tses-hyazgaarlalt"]),
    group("👤 Хувийн тохиргоо", ["huviin-burtgel", "nuuts-ug", "ajlyn-talbar", "tolgoi-mor"]),
    { type: "doc", id: "list/index", label: "📋 Цэс бүрийн хуудас" },
  ],
};
