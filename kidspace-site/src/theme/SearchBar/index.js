// help.kidspace.mn-ийн хайлт (help.spacehub.mn-ийн Algolia индекс энэ сайтыг хамардаггүй).
// Индекс = /search-index.json — scripts/prep-docs.mjs build бүрд docs/kidspace-аас үүсгэнэ (гарчиг, цэсний нэр,
// keywords, ## гарчиг + анкор). Гадны үйлчилгээ, шинэ сан 0. Монгол үсгийн ялгааг тэгшитгэнэ (ө→о, ү→у, ё→е).
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "@docusaurus/Link";
import { useHistory } from "@docusaurus/router";
import useBaseUrl from "@docusaurus/useBaseUrl";
import styles from "./styles.module.css";
import { search } from "../../search-core.mjs";

export default function SearchBar() {
  const indexUrl = useBaseUrl("/search-index.json");
  const history = useHistory();
  const [index, setIndex] = useState(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef(null);

  const load = useCallback(() => {
    if (index) return;
    fetch(indexUrl)
      .then((r) => (r.ok ? r.json() : []))
      .then(setIndex)
      .catch(() => setIndex([]));
  }, [index, indexUrl]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = index && q ? search(index, q) : [];
  const go = (url) => {
    setOpen(false);
    setQ("");
    history.push(url);
  };

  return (
    <div className={styles.wrap} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <input
        ref={input}
        className={styles.input}
        type="search"
        placeholder="Хайх"
        aria-label="Тусламжаас хайх"
        value={q}
        onFocus={() => {
          load();
          setOpen(true);
        }}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && results[0]) go(results[0].url);
        }}
      />
      {open && q.trim().length >= 2 && (
        <div className={styles.panel} role="listbox">
          {index === null ? (
            <div className={styles.empty}>Ачаалж байна…</div>
          ) : results.length === 0 ? (
            <div className={styles.empty}>Олдсонгүй. Өөр үгээр хайна уу.</div>
          ) : (
            results.map((r) => (
              <Link key={r.url} to={r.url} className={styles.hit} onClick={() => go(r.url)}>
                <span className={styles.title}>{r.title}</span>
                {r.sub && <span className={styles.sub}>{r.sub}</span>}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
