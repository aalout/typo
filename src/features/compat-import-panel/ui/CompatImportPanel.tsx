import { useLayoutEffect, useRef, useState } from "react";
import AutoResizeTextarea from "../../../shared/ui/AutoResizeTextarea";
import Section from "../../../shared/ui/Section";

const CompatImportPanel = ({
  compatCss,
  setCompatCss,
  onImport,
}: {
  compatCss: string;
  setCompatCss: (v: string) => void;
  onImport: () => void;
}) => {
  const [cssAreaOverflowing, setCssAreaOverflowing] = useState(false);
  const [cssInputExpanded, setCssInputExpanded] = useState(false);
  const cssAreaRef = useRef<HTMLDivElement | null>(null);

  const recalcCssOverflow = () => {
    const el = cssAreaRef.current;
    if (!el) return;
    const textarea = el.querySelector("textarea") as HTMLTextAreaElement | null;
    const contentHeight = textarea?.scrollHeight || el.scrollHeight;
    const capPx = Math.min(500, Math.round((window.innerHeight || 0) * 0.3));
    setCssAreaOverflowing(contentHeight > capPx);
    el.scrollTop = 0;
  };

  useLayoutEffect(() => {
    const el = cssAreaRef.current;
    if (!el) return;
    recalcCssOverflow();
    const ro = new ResizeObserver(recalcCssOverflow);
    ro.observe(el);
    const ta = el.querySelector("textarea");
    if (ta) ro.observe(ta as Element);
    const onResize = () => recalcCssOverflow();
    window.addEventListener("resize", onResize);
    requestAnimationFrame(() => requestAnimationFrame(recalcCssOverflow));
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [compatCss, cssInputExpanded]);

  return (
    <Section
      title="Импорт CSS (обратная совместимость)"
      ariaLabel="Обратная совместимость"
      actions={
        <button className="btn btn-secondary" onClick={onImport}>
          Импортировать CSS
        </button>
      }
    >
      <div>
        <div
          ref={cssAreaRef}
          className={`area-block ${cssInputExpanded ? "expanded" : "capped"} ${
            cssAreaOverflowing ? "clickable" : ""
          }`}
          role="region"
          aria-label="Поле CSS для импорта"
          tabIndex={0}
          aria-expanded={cssInputExpanded}
        >
          <AutoResizeTextarea
            ariaLabel="css-compat"
            value={compatCss}
            onChange={(v) => {
              setCompatCss(v);
              requestAnimationFrame(() =>
                requestAnimationFrame(recalcCssOverflow)
              );
            }}
            placeholder=":root {\n  --token: 1rem;\n  --token-lh: 1.25;\n  @media (min-width: 1024px) and (max-width: 1440px) {\n    --token: clamp(1rem, 1rem + 0vw, 1rem);\n    --token-lh: 1.25;\n  }\n  @media (max-width: 1023px) {\n    --token: clamp(1rem, 1rem + 0vw, 1rem);\n    --token-lh: 1.25;\n  }\n  @media (min-width: 1441px) {\n    --token: calc(1rem + (0 * (100vw - 90rem) * 1));\n  }\n}"
          />
          {!cssInputExpanded && cssAreaOverflowing && (
            <div className="gradient-fade" aria-hidden />
          )}
          {(cssAreaOverflowing || cssInputExpanded) && (
            <button
              type="button"
              className="area-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setCssInputExpanded((v) => !v);
              }}
              aria-expanded={cssInputExpanded}
              aria-label={cssInputExpanded ? "Свернуть" : "Развернуть"}
            >
              <span
                className={`chevron ${cssInputExpanded ? "open" : ""}`}
                aria-hidden
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {cssInputExpanded ? "Свернуть" : "Развернуть"}
            </button>
          )}
        </div>
      </div>
    </Section>
  );
};

export default CompatImportPanel;
