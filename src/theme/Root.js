// Хэсэг бүр өөр өнгөтэй + анх ороход «Та хэн бэ?» сонголт (эзэн 10-27: «түрээслэгч, оршин суугчийг тусдаа
// попапаар … өнгө солигдож байгаа мэдрэмж»). html[data-role] → src/css/custom.css.
import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "@docusaurus/router";

const KEY = "spacehub-help-role";
// Нэрэндээ хоосон зайтай хуучин хаяг: src/pages-аар хийхэд route нь «%20»-оор кодлогдож таарахгүй (build 10-28) —
// 404 хуудас ачаалагдмагц энд шилжүүлнэ. Бусад хуучин хаяг src/pages/**-д.
const OLD = { "/workspace/reguest-obect copy": "/dashboard/reguest-write" };
const decode = (p) => {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
};

const roleOf = (path) => (/^\/(owner|lessor|changelog)(\/|$)/.test(path) ? "owner" : "resident");

function read() {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function save(role) {
  try {
    window.localStorage.setItem(KEY, role);
  } catch {
    /* хувийн цонх — сонголт хадгалагдахгүй, ажиллагаа хэвээр */
  }
}

function RolePick({ onPick }) {
  return (
    <div className="role-pick" role="dialog" aria-modal="true" aria-labelledby="role-pick-title">
      <div className="role-pick__box">
        <h2 id="role-pick-title">Та хэн бэ?</h2>
        <p>Өөрт тохирох тусламжаа сонгоно уу. Дараа нь дээд цэснээс солиж болно.</p>
        <div className="role-pick__cards">
          <button type="button" className="role-pick__card role-pick__card--resident" onClick={() => onPick("resident")}>
            <div className="role-pick__icon">🏠</div>
            <b>Түрээслэгч, оршин суугч</b>
            <span>Гар утасны апп: төлбөр төлөх, нэхэмжлэх харах</span>
          </button>
          <button type="button" className="role-pick__card role-pick__card--owner" onClick={() => onPick("owner")}>
            <div className="role-pick__icon">🏢</div>
            <b>Эзэмшигч, менежер</b>
            <span>Вэб програм: гэрээ, тооцоо, нэхэмжлэх, хуулга</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Зураг дээр дарахад томоор (эзэн 10-27 «зураг дээр дарж томруулж хардаг, дугаар харагдахгүй байна»)
function Zoom({ src, alt, onClose }) {
  // Эхлээд дэлгэцэнд БҮТНЭЭР нь багтаана; зураг дээр дарвал жинхэнэ хэмжээ ↔ багтаах, жинхэнэ хэмжээнд хоёр тийш гүйлгэнэ
  // (эзэн 10-27: «хэт томорч, гүйлгэж болохгүй байна»). Зургаас гадна, ✕, Esc = хаах.
  const [full, setFull] = useState(false);
  const [w, setW] = useState(0); // 2× зургийн жинхэнэ (CSS) өргөн = naturalWidth / 2
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className={`img-zoom${full ? " img-zoom--full" : ""}`} role="dialog" aria-modal="true" aria-label={alt || "Зураг"} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <img src={src} alt={alt} onLoad={(e) => setW(e.currentTarget.naturalWidth / 2)} style={full && w ? { width: w } : undefined} onClick={() => setFull((f) => !f)} title={full ? "Дэлгэцэнд багтаах" : "Жинхэнэ хэмжээгээр"} />
      <div className="img-zoom__hint">{full ? "Гүйлгэж харна · зураг дээр дарвал багтаана" : "Зураг дээр дарвал томорно"} · Esc / ✕ хаах</div>
      <button type="button" className="img-zoom__close" aria-label="Хаах" onClick={onClose}>✕</button>
    </div>
  );
}

export default function Root({ children }) {
  const { pathname } = useLocation();
  const history = useHistory();
  const [ask, setAsk] = useState(false);
  const [zoom, setZoom] = useState(null);

  // Дугаартай зургийг (2× нягтрал) жинхэнэ хэмжээгээр нь (naturalWidth / 2) харуулна — утсан дээр жижигрэхгүй,
  // тэмдэг 32px хэвээр; өргөн бол хажуу тийш гүйлгэнэ (Qa_Spacehub 10-27: 390px өргөнд тэмдэг 6–11px болж байсан).
  // Сайт доторх шилжилтэд агуулга дараа нь render хийгддэг тул MutationObserver-ээр шинэ зураг бүрийг барина.
  useEffect(() => {
    // build-д зураг /assets/images/*.webp эсвэл жижиг нь data:image/webp болж орно — shoot.cjs-ийн зураг бүгд webp, 2×
    const isShot = (i) => i.closest(".markdown") && /\.webp($|\?)|^data:image\/webp/.test(i.getAttribute("src") || "");
    const fit = (img) => {
      if (!img.naturalWidth) return;
      img.style.width = `${img.naturalWidth / 2}px`;
      img.style.maxWidth = "none";
      img.parentElement?.classList.add("img-scroll");
    };
    const watch = (img) => {
      if (!isShot(img) || img.dataset.fit) return;
      img.dataset.fit = "1";
      if (img.complete) fit(img);
      else img.addEventListener("load", () => fit(img), { once: true });
    };
    document.querySelectorAll(".markdown img").forEach(watch);
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        // React нэг <img>-ийг өөр src-тэйгээр дахин ашиглаж болно
        if (m.type === "attributes" && m.target.tagName === "IMG") { delete m.target.dataset.fit; m.target.style.width = ""; watch(m.target); continue; }
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.tagName === "IMG") watch(n);
          else n.querySelectorAll?.("img").forEach(watch);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const open = (e) => {
      const img = e.target.closest && e.target.closest(".markdown img");
      if (img && !img.closest("a")) setZoom({ src: img.currentSrc || img.src, alt: img.alt });
    };
    document.addEventListener("click", open);
    return () => document.removeEventListener("click", open);
  }, []);

  useEffect(() => {
    const to = OLD[decode(pathname)];
    if (to) history.replace(to);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const role = roleOf(pathname);
    document.documentElement.dataset.role = role;
    // Дээд мөрний «… үү? →» холбоосоор шилжвэл сонголтыг санана — дараа нүүрэнд ороход дахин асуухгүй
    if (new URLSearchParams(window.location.search).get("role") === role) save(role);
  }, [pathname]);

  // Зөвхөн нүүр хуудсанд, анх удаа. Апп-ын «?» товчноос шууд хуудас руу орсон бол асуухгүй.
  useEffect(() => {
    if (pathname === "/" && !read()) setAsk(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (role) => {
    save(role);
    setAsk(false);
    if (role === "owner") history.push("/owner");
  };

  return (
    <>
      {children}
      {ask && <RolePick onPick={pick} />}
      {zoom && <Zoom {...zoom} onClose={() => setZoom(null)} />}
    </>
  );
}
