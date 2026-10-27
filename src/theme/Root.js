// Хэсэг бүр өөр өнгөтэй + анх ороход «Та хэн бэ?» сонголт (эзэн 10-27: «түрээслэгч, оршин суугчийг тусдаа
// попапаар … өнгө солигдож байгаа мэдрэмж»). html[data-role] → src/css/custom.css.
import React, { useEffect, useState } from "react";
import { useHistory, useLocation } from "@docusaurus/router";

const KEY = "spacehub-help-role";
const roleOf = (path) => (/^\/(owner|lessor)(\/|$)/.test(path) ? "owner" : "resident");

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
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="img-zoom" role="dialog" aria-modal="true" aria-label={alt || "Зураг"} onClick={onClose}>
      <img src={src} alt={alt} />
      <button type="button" className="img-zoom__close" aria-label="Хаах">✕</button>
    </div>
  );
}

export default function Root({ children }) {
  const { pathname } = useLocation();
  const history = useHistory();
  const [ask, setAsk] = useState(false);
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    const open = (e) => {
      const img = e.target.closest && e.target.closest(".markdown img");
      if (img && !img.closest("a")) setZoom({ src: img.currentSrc || img.src, alt: img.alt });
    };
    document.addEventListener("click", open);
    return () => document.removeEventListener("click", open);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.role = roleOf(pathname);
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
