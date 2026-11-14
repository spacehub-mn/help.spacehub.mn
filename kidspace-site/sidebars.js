// KidSpace-ийн тусдаа сайтын цэс. id нь ../docs/kidspace доторх файлын нэр (угтваргүй).
const group = (label, items) => ({ type: "category", label, collapsed: false, items });

module.exports = {
  kidspace: [
    { type: "doc", id: "index", label: "🏫 Нүүр" },
    group("1. 👧 Элсэлт, анги", ["ehleh-ognoo-zasah", "angi-shiljuuleh-devshuuleh"]),
    group("2. 💳 Тооцоо", ["tolbor-nehemjleh", "honglolt"]),
  ],
};
