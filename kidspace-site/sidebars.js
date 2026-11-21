// KidSpace-ийн тусдаа сайтын цэс. id нь ../docs/kidspace доторх файлын зам (.md-гүй; дэд хавтас бол «concepts/x»).
const group = (label, items) => ({ type: "category", label, collapsed: false, items });

module.exports = {
  kidspace: [
    { type: "doc", id: "index", label: "🏫 Нүүр" },
    group("🚀 Эхлэх", ["nevtruulelt/index", "tutorial/sar-buriin-ajil", "role/menejer", "role/bagsh"]),
    group("❓ Түгээмэл асуулт", ["asuult/elselt", "asuult/tolbor", "asuult/irts", "nehemjleh-uusgeegui", "sms-ochoogui", "erhgui"]),
    group("💡 Ойлголт", ["glossary", "concepts/elselt-buleg-jil", "concepts/tolbor-urgal", "concepts/honglolt-butsaalt"]),
    "tsetserlegiin-toim",
    group("1. 👧 Элсэлт, анги", ["elselt-burtgel", "elseltiin-huselt", "elseltiin-haalt", "ehleh-ognoo-zasah", "angi-shiljuuleh-devshuuleh", "davhar-huuhed-negtgeh", "bulguud", "3d-angi", "suragchid"]),
    group("2. 📅 Ирц, хөгжил", ["irts-zhurnal", "hogjliin-zhurnal"]),
    group("3. 💬 Харилцаа", ["sanal-huselt", "niitlel", "medeelel-hyanah", "nuusan-aguulga"]),
    group("4. 💳 Тооцоо", ["tolbor-nehemjleh", "tolboriin-huvaar", "tolbor-jagsaalt", "honglolt", "nehemjleh-ilgeeh", "tolult", "butsaalt", "saryn-tootsoo-tailan"]),
    group("5. ⚙️ Авто туслагч", ["tolboriin-ajillagaa", "dansnii-huulga", "huvaariin-ajil"]),
    group("6. 🏢 Байгууллага", ["baiguullaga", "tailant-uye-haah", "hicheeliin-jil", "bagsh-ajilchid"]),
    { type: "doc", id: "list/index", label: "📋 Цэс бүрийн хуудас" },
  ],
};
