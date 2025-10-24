import { useLayoutEffect, useRef, useState } from "react";
import Section from "../Section";

const CodeBlock = ({
  title,
  text,
  onCopy,
}: {
  title: string;
  text: string;
  onCopy: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const regionId = `code-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const ref = useRef<HTMLDivElement | null>(null);

  const recalcOverflow = () => {
    const el = ref.current;
    if (!el) return;
    const pre = el.querySelector("pre") as HTMLPreElement | null;
    const contentHeight = pre?.scrollHeight || el.scrollHeight;
    const capPx = Math.min(500, Math.round((window.innerHeight || 0) * 0.3));
    setIsOverflowing(contentHeight > capPx);
    el.scrollTop = 0;
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    recalcOverflow();
    const ro = new ResizeObserver(recalcOverflow);
    ro.observe(el);
    const pre = el.querySelector("pre");
    if (pre) ro.observe(pre as Element);
    const onResize = () => recalcOverflow();
    window.addEventListener("resize", onResize);
    // два rAF для корректной оценки после перерисовки
    requestAnimationFrame(() => requestAnimationFrame(recalcOverflow));
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [text, expanded]);

  const handleToggleExpand = () => {
    if (!isOverflowing && !expanded) return;
    setExpanded((v) => !v);
  };

  return (
    <Section
      title={title}
      actions={
        <button
          className="btn btn-secondary"
          onClick={onCopy}
          aria-label={`Скопировать ${title}`}
        >
          Копировать
        </button>
      }
    >
      <div
        ref={ref}
        id={regionId}
        className={`code code-block ${expanded ? "expanded" : "capped"} ${
          isOverflowing ? "clickable" : ""
        }`}
        role="region"
        aria-label={title}
        tabIndex={0}
        aria-expanded={expanded}
      >
        <pre>{text}</pre>
        {!expanded && isOverflowing && (
          <div className="gradient-fade" aria-hidden />
        )}
        {(isOverflowing || expanded) && (
          <button
            type="button"
            className="area-toggle"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand();
            }}
            aria-expanded={expanded}
            aria-label={expanded ? "Свернуть" : "Развернуть"}
          >
            <span className={`chevron ${expanded ? "open" : ""}`} aria-hidden>
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
            {expanded ? "Свернуть" : "Развернуть"}
          </button>
        )}
      </div>
    </Section>
  );
};

export default CodeBlock;
