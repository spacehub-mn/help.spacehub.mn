// KidSpace-ийн тусдаа сайтын цэс. id нь ../docs/kidspace доторх файлын нэр (угтваргүй).
const group = (label, items) => ({ type: "category", label, collapsed: false, items });

module.exports = {
  kidspace: [
    { type: "doc", id: "index", label: "🏫 Нүүр" },
    "tsetserlegiin-toim",
    group("1. 👧 Элсэлт, анги", ["elselt-burtgel", "elseltiin-huselt", "elseltiin-haalt", "ehleh-ognoo-zasah", "angi-shiljuuleh-devshuuleh", "bulguud", "3d-angi", "suragchid"]),
    group("2. 📅 Ирц, хөгжил", ["irts-zhurnal", "hogjliin-zhurnal"]),
    group("3. 💬 Харилцаа", ["sanal-huselt", "niitlel", "medeelel-hyanah", "nuusan-aguulga"]),
    group("4. 💳 Тооцоо", ["tolbor-nehemjleh", "tolboriin-huvaar", "tolbor-jagsaalt", "honglolt", "nehemjleh-ilgeeh", "tolult", "butsaalt", "saryn-tootsoo-tailan"]),
  ],
};
