import { useLayoutEffect, useMemo, useRef, useState } from "react";
import MarkdownTab from "./MarkdownTab";
import { create } from "zustand";

type Breakpoints = { id: string; label: string; value: number }[];
type Token = {
  id: string;
  name: string;
  sizes: Record<string, number>;
  lh: Record<string, number>;
  growFactorLg?: number;
};

type Store = {
  baseRemPx: number;
  breakpoints: Breakpoints;
  tokens: Token[];
  setBaseRemPx: (n: number) => void;
  setBreakpoints: (b: Breakpoints) => void;
  setTokens: (t: Token[]) => void;
};

const useStore = create<Store>((set) => ({
  baseRemPx: 16,
  breakpoints: [
    { id: "min", label: "375", value: 375 },
    { id: "mid", label: "1024", value: 1024 },
    { id: "max", label: "1440", value: 1440 },
  ],
  tokens: [],
  setBaseRemPx: (baseRemPx) => set({ baseRemPx }),
  setBreakpoints: (breakpoints) => set({ breakpoints }),
  setTokens: (tokens) => set({ tokens }),
}));

const uid = () => Math.random().toString(36).slice(2, 9);

const toRem = (px: number, base: number) => +(px / base).toFixed(3);
const ratioFrom = (lh: number, fontPx: number) =>
  lh <= 3 ? +lh.toFixed(3) : +(lh / fontPx).toFixed(3);
const slopeRemPerVw = (
  remA: number,
  remB: number,
  pxA: number,
  pxB: number,
  base: number
) => {
  if (pxB === pxA) return 0;
  return +(((remB - remA) * base * 100) / (pxB - pxA)).toFixed(6);
};
const interceptRem = (
  remAtA: number,
  slopeVW: number,
  pxA: number,
  base: number
) => {
  if (slopeVW === 0) return +remAtA.toFixed(6);
  return +(remAtA - (slopeVW * (pxA / 100)) / base).toFixed(6);
};

const AutoResizeTextarea = ({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(() => {
    resize();
  }, [value]);
  return (
    <textarea
      ref={ref}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ overflow: "hidden" }}
    />
  );
};

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
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const regionId = `code-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const overflowing = el.scrollHeight > el.clientHeight + 2;
      setIsOverflowing(overflowing);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  useLayoutEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, []);

  const handleToggleExpand = () => {
    if (!isOverflowing && !expanded) return;
    setExpanded((v) => !v);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggleExpand();
    }
  };
  const handleCopyClick = () => {
    onCopy();
    setCopied(true);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, 3000);
  };

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>{title}</strong>
        <div className="actions">
          <button
            className={`btn ${copied ? "btn-success" : "btn-secondary"}`}
            onClick={handleCopyClick}
            aria-label={
              copied ? `Скопировано ${title}` : `Скопировать ${title}`
            }
          >
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
      </div>
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
        onClick={handleToggleExpand}
        onKeyDown={handleKeyDown}
      >
        <pre>{text}</pre>
        {!expanded && isOverflowing && (
          <div className="gradient-fade" aria-hidden />
        )}
        {isOverflowing && (
          <div className="code-hint" aria-hidden>
            {expanded ? "Свернуть" : "Нажмите, чтобы раскрыть"}
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const {
    baseRemPx,
    breakpoints,
    tokens,
    setBaseRemPx,
    setBreakpoints,
    setTokens,
  } = useStore();
  const [activeTab, setActiveTab] = useState<"typo" | "md">("typo");
  const [compatCss, setCompatCss] = useState("");
  const [cssVars, setCssVars] = useState("");
  const [cssMixins, setCssMixins] = useState("");
  const [cssInputCollapsed, setCssInputCollapsed] = useState(false);
  const [cssInputExpanded, setCssInputExpanded] = useState(false);
  const [cssAreaOverflowing, setCssAreaOverflowing] = useState(false);
  const cssAreaRef = useRef<HTMLDivElement | null>(null);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useLayoutEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize, { passive: true } as any);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useLayoutEffect(() => {
    const el = cssAreaRef.current;
    if (!el) return;
    const check = () => {
      const textarea = el.querySelector("textarea");
      const contentHeight =
        (textarea as HTMLTextAreaElement | null)?.scrollHeight ||
        el.scrollHeight;
      const capPx = Math.min(500, Math.round((window.innerHeight || 0) * 0.3));
      setCssAreaOverflowing(contentHeight > capPx);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    const ta = el.querySelector("textarea");
    if (ta) ro.observe(ta);
    const onResize = () => check();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [compatCss, cssInputExpanded]);

  const sortedBps = useMemo(
    () => [...breakpoints].sort((a, b) => a.value - b.value),
    [breakpoints]
  );

  const handleCompatImport = () => {
    try {
      const css = compatCss;
      const rootBlockMatch = css.match(/:root\s*\{([\s\S]*?)\}/);
      if (!rootBlockMatch) throw new Error("Не найден блок :root");
      const rootBlock = rootBlockMatch[1];
      const firstMediaIdx = rootBlock.search(/@media/i);
      const rootBaseOnly =
        firstMediaIdx >= 0 ? rootBlock.slice(0, firstMediaIdx) : rootBlock;
      const rootBaseNoComments = rootBaseOnly.replace(/\/\*[\s\S]*?\*\//g, "");

      const parseDecls = (block: string) => {
        const map: Record<string, string> = {};
        const re = /--([a-z0-9_-]+)\s*:\s*([^;]+);/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(block))) {
          map[m[1]] = m[2].trim();
        }
        return map;
      };

      const declRoot = parseDecls(rootBaseNoComments);

      const midBlockMatch = css.match(
        /@media\s*(?:screen\s+and\s+)?\(min-width:\s*(\d+)px\)\s*and\s*\(max-width:\s*(\d+)px\)\s*\{([\s\S]*?)\}/i
      );
      const smallBlockMatch = css.match(
        /@media\s*(?:screen\s+and\s+)?\(max-width:\s*(\d+)px\)\s*\{([\s\S]*?)\}/i
      );
      const largeBlockMatch = css.match(
        /@media\s*(?:screen\s+and\s+)?\(min-width:\s*(\d+)px\)\s*\{([\s\S]*?)\}/i
      );

      const midMin = midBlockMatch ? Number(midBlockMatch[1]) : undefined;
      const midMax = midBlockMatch ? Number(midBlockMatch[2]) : undefined;
      const smallMax = smallBlockMatch ? Number(smallBlockMatch[1]) : undefined;
      const largeMin = largeBlockMatch ? Number(largeBlockMatch[1]) : undefined;

      const declMid = midBlockMatch ? parseDecls(midBlockMatch[3]) : {};
      const declSmall = smallBlockMatch ? parseDecls(smallBlockMatch[2]) : {};
      const declLarge = largeBlockMatch ? parseDecls(largeBlockMatch[2]) : {};

      if (smallMax && midMin && midMax) {
        const DEFAULT_MIN = 375;
        let minCandidate = Math.min(DEFAULT_MIN, smallMax);
        if (minCandidate >= midMin) {
          minCandidate = Math.max(320, Math.min(DEFAULT_MIN, midMin - 1));
        }
        const bps: Breakpoints = [
          { id: "min", label: String(minCandidate), value: minCandidate },
          { id: "mid", label: String(midMin), value: midMin },
          { id: "max", label: String(midMax), value: midMax },
        ];
        setBreakpoints(bps);
      }

      const remToPx = (remStr: string) => {
        const n = parseFloat(remStr);
        if (Number.isNaN(n)) return undefined;
        return Math.round(n * baseRemPx);
      };

      const extractRemNumber = (val: string | undefined) => {
        if (!val) return undefined;
        const clean = val.trim();
        const m = clean.match(/([\d.]+)\s*rem\b/i);
        return m ? parseFloat(m[1]) : undefined;
      };

      const clampFirstArgRem = (val: string) => {
        const m = val.match(/clamp\(\s*([\d.]+)rem/i);
        return m ? parseFloat(m[1]) : undefined;
      };

      const clampLastArgRem = (val: string) => {
        const m = val.match(/clamp\([^,]+,[^,]+,\s*([\d.]+)rem\s*\)/i);
        return m ? parseFloat(m[1]) : undefined;
      };

      const calcFactor = (val: string) => {
        const m = val.match(/\(100vw\s*-\s*\d+rem\)\s*\*\s*([\d.]+)/i);
        if (m) return parseFloat(m[1]);
        return 1;
      };

      const tokensMap: Record<string, Token> = {};

      Object.keys(declRoot)
        .filter((k) => !k.endsWith("-lh"))
        .forEach((nameVar) => {
          const baseRemStr = declRoot[nameVar];
          const lhVar = `${nameVar}-lh`;
          const baseLhStr = declRoot[lhVar];

          let sizeMaxRem = extractRemNumber(baseRemStr);
          const sizeMaxPx = sizeMaxRem
            ? Math.round(sizeMaxRem * baseRemPx)
            : 16;
          const lhMax = baseLhStr ? parseFloat(baseLhStr) : 1.25;

          const midVal = declMid[nameVar];
          const minVal = declSmall[nameVar];
          const midRem = midVal ? clampFirstArgRem(midVal) : undefined;
          const minRem = minVal ? clampFirstArgRem(minVal) : undefined;
          if (!sizeMaxRem && midVal) sizeMaxRem = clampLastArgRem(midVal);
          const sizeMidPx = midRem
            ? remToPx(String(midRem))
            : sizeMaxRem
            ? remToPx(String(sizeMaxRem))
            : sizeMaxPx;
          const sizeMinPx = minRem ? remToPx(String(minRem)) : sizeMidPx;

          const lhMid = declMid[lhVar] ? parseFloat(declMid[lhVar]) : lhMax;
          const lhMin = declSmall[lhVar] ? parseFloat(declSmall[lhVar]) : lhMid;

          const largeVal = declLarge[nameVar];
          const grow = largeVal ? calcFactor(largeVal) : 1;

          tokensMap[nameVar] = {
            id: uid(),
            name: nameVar,
            sizes: { min: sizeMinPx, mid: sizeMidPx, max: sizeMaxPx },
            lh: { min: lhMin, mid: lhMid, max: lhMax },
            growFactorLg: grow,
          } as Token;
        });

      const tks = Object.values(tokensMap);
      if (tks.length === 0) throw new Error("Не найдены токены в :root");
      setTokens(tks);
    } catch (e: any) {
      alert("Ошибка CSS: " + e.message);
    }
  };

  const addBreakpoint = () => {
    const value = Number(prompt("Ширина bp в px", "768"));
    if (!value) return;
    const id = prompt("название брейкпоинта (например, mid)", "md") || uid();
    setBreakpoints([...breakpoints, { id, label: String(value), value }]);
  };
  const removeBreakpoint = (id: string) =>
    setBreakpoints(breakpoints.filter((b) => b.id !== id));

  const addToken = () =>
    setTokens([
      ...tokens,
      {
        id: uid(),
        name: "token",
        sizes: Object.fromEntries(sortedBps.map((b) => [b.id, 16])),
        lh: Object.fromEntries(sortedBps.map((b) => [b.id, 1.25])),
        growFactorLg: 1,
      },
    ]);
  const removeToken = (id: string) =>
    setTokens(tokens.filter((t) => t.id !== id));

  const canStart = tokens.length > 0 && sortedBps.length >= 2;

  const handleStart = () => {
    const bpIds = sortedBps.map((b) => b.id);
    const bpPx = sortedBps.map((b) => b.value);
    const minPx = bpPx[0];
    const midPx = bpPx[Math.max(1, Math.floor((bpPx.length - 1) / 2))];
    const maxPx = bpPx[bpPx.length - 1];

    const header = [
      "/*",
      " * @copyright Copyright (c) 2025, Oleg Chulakov Studio",
      " * @link https://chulakov.ru",
      " */",
      "",
    ].join("\n");

    const baseLines: string[] = [header, ":root {"];
    const midLines: string[] = [];
    const smallLines: string[] = [];
    const largeLines: string[] = [];
    const mixinLines: string[] = [];

    for (const t of tokens) {
      const sMin = toRem(t.sizes[bpIds[0]], baseRemPx);
      const sMid = toRem(
        t.sizes[bpIds[Math.max(1, Math.floor((bpIds.length - 1) / 2))]],
        baseRemPx
      );
      const sMax = toRem(t.sizes[bpIds[bpIds.length - 1]], baseRemPx);

      const lhMin = ratioFrom(t.lh[bpIds[0]], t.sizes[bpIds[0]]);
      const lhMid = ratioFrom(
        t.lh[bpIds[Math.max(1, Math.floor((bpIds.length - 1) / 2))]],
        t.sizes[bpIds[Math.max(1, Math.floor((bpIds.length - 1) / 2))]]
      );
      const lhMax = ratioFrom(
        t.lh[bpIds[bpIds.length - 1]],
        t.sizes[bpIds[bpIds.length - 1]]
      );

      baseLines.push(`\t--${t.name}: ${sMax}rem;`);
      baseLines.push(`\t--${t.name}-lh: ${lhMax};`);

      const slopeMinMid = slopeRemPerVw(sMin, sMid, minPx, midPx, baseRemPx);
      const icptMinMid = interceptRem(sMin, slopeMinMid, minPx, baseRemPx);
      const slopeMidMax = slopeRemPerVw(sMid, sMax, midPx, maxPx, baseRemPx);
      const icptMidMax = interceptRem(sMid, slopeMidMax, midPx, baseRemPx);

      midLines.push(
        `\t\t--${t.name}: clamp(${Math.min(
          sMid,
          sMax
        )}rem, ${icptMidMax}rem + ${slopeMidMax}vw, ${Math.max(
          sMid,
          sMax
        )}rem);`
      );
      midLines.push(`\t\t--${t.name}-lh: ${lhMid};`);

      smallLines.push(
        `\t\t--${t.name}: clamp(${Math.min(
          sMin,
          sMid
        )}rem, ${icptMinMid}rem + ${slopeMinMid}vw, ${Math.max(
          sMin,
          sMid
        )}rem);`
      );
      smallLines.push(`\t\t--${t.name}-lh: ${lhMin};`);

      const denom = (maxPx - midPx) / baseRemPx;
      const slopeBeyond = +(denom === 0 ? 0 : (sMax - sMid) / denom).toFixed(6);
      const factor = t.growFactorLg ?? 1;
      const maxRemWidth = +(maxPx / baseRemPx).toFixed(3);
      largeLines.push(
        `\t\t--${t.name}: calc(${sMax}rem + (${slopeBeyond} * (100vw - ${maxRemWidth}rem) * ${factor}));`
      );

      mixinLines.push(`@define-mixin font-${t.name} {`);
      mixinLines.push(`\tfont-size: var(--${t.name});`);
      mixinLines.push(`\tline-height: var(--${t.name}-lh);`);
      mixinLines.push("}\n");
    }

    baseLines.push("}");

    const midBlock: string[] = [];
    midBlock.push(
      `@media (min-width: ${midPx}px) and (max-width: ${maxPx}px) {`
    );
    midBlock.push(`\t:root {`);
    midBlock.push(...midLines);
    midBlock.push(`\t}`);
    midBlock.push(`}`);

    const smallBlock: string[] = [];
    smallBlock.push(`@media (max-width: ${midPx - 1}px) {`);
    smallBlock.push(`\t:root {`);
    smallBlock.push(...smallLines);
    smallBlock.push(`\t}`);
    smallBlock.push(`}`);

    const largeBlock: string[] = [];
    largeBlock.push(`@media (min-width: ${maxPx + 1}px) {`);
    largeBlock.push(`\t:root {`);
    largeBlock.push(...largeLines);
    largeBlock.push(`\t}`);
    largeBlock.push(`}`);

    setCssVars(
      [
        baseLines.join("\n"),
        midBlock.join("\n"),
        smallBlock.join("\n"),
        largeBlock.join("\n"),
      ].join("\n\n")
    );
    setCssMixins(mixinLines.join("\n"));
  };

  return (
    <div className="container">
      <h2>@typo — генератор типографики</h2>
      <div className="tabs" role="tablist" aria-label="Переключатель разделов">
        <button
          id="tab-typo"
          className={`tab ${activeTab === "typo" ? "active" : ""}`}
          role="tab"
          aria-selected={activeTab === "typo"}
          aria-controls="panel-typo"
          tabIndex={0}
          onClick={() => setActiveTab("typo")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setActiveTab("typo");
            if (e.key === "ArrowRight") setActiveTab("md");
          }}
        >
          Генератор
        </button>
        <button
          id="tab-md"
          className={`tab ${activeTab === "md" ? "active" : ""}`}
          role="tab"
          aria-selected={activeTab === "md"}
          aria-controls="panel-md"
          tabIndex={0}
          onClick={() => setActiveTab("md")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setActiveTab("md");
            if (e.key === "ArrowLeft") setActiveTab("typo");
          }}
        >
          Документация
        </button>
      </div>

      {activeTab === "typo" && (
        <div id="panel-typo" role="tabpanel" aria-labelledby="tab-typo">
          <div className="grid">
            <div className="panel" aria-label="Параметры" tabIndex={0}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <label>baseRemPx</label>
                <input
                  aria-label="baseRemPx"
                  type="number"
                  value={baseRemPx}
                  onChange={(e) => setBaseRemPx(Number(e.target.value))}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <div
                  className="row"
                  style={{ justifyContent: "space-between" }}
                >
                  <strong>Брейкпоинты</strong>
                  <div className="actions">
                    <button
                      className="btn btn-secondary"
                      onClick={addBreakpoint}
                    >
                      Добавить
                    </button>
                  </div>
                </div>
                <table
                  className="table"
                  role="table"
                  aria-label="Таблица брейкпоинтов"
                >
                  <thead>
                    <tr>
                      <th>id</th>
                      <th>px</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBps.map((bp) => (
                      <tr key={bp.id}>
                        <td>{bp.id}</td>
                        <td>
                          <input
                            aria-label={`bp-${bp.id}`}
                            type="number"
                            value={bp.value}
                            onChange={(e) =>
                              setBreakpoints(
                                breakpoints.map((b) =>
                                  b.id === bp.id
                                    ? { ...b, value: Number(e.target.value) }
                                    : b
                                )
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="btn btn-danger"
                            onClick={() => removeBreakpoint(bp.id)}
                            aria-label={`Удалить ${bp.id}`}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className="panel"
              aria-label="Обратная совместимость"
              tabIndex={0}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>Импорт CSS (обратная совместимость)</strong>
                <div className="actions">
                  <button
                    className="btn btn-secondary"
                    onClick={handleCompatImport}
                  >
                    Импортировать CSS
                  </button>
                </div>
              </div>
              <div>
                <div
                  ref={cssAreaRef}
                  className={`area-block ${
                    cssInputExpanded ? "expanded" : "capped"
                  } ${cssAreaOverflowing ? "clickable" : ""}`}
                  role="region"
                  aria-label="Поле CSS для импорта"
                  tabIndex={0}
                  aria-expanded={cssInputExpanded}
                >
                  <AutoResizeTextarea
                    ariaLabel="css-compat"
                    value={compatCss}
                    onChange={setCompatCss}
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
            </div>
          </div>

          <div
            className="panel"
            style={{ marginTop: 16 }}
            aria-label="Токены"
            tabIndex={0}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>Токены</strong>
              <div className="actions">
                <button className="btn" onClick={addToken}>
                  Добавить токен
                </button>
              </div>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Все размеры указываются в px, line-height указывается в
              коэффициентах или в px
            </div>
            <table className="table" role="table" aria-label="Таблица токенов">
              <thead>
                <tr>
                  <th>name</th>

                  {sortedBps.map((bp) => (
                    <th key={bp.id}>size@{bp.id}</th>
                  ))}
                  {sortedBps.map((bp) => (
                    <th key={bp.id + ":lh"}>lh@{bp.id}</th>
                  ))}
                  <th>grow max</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <input
                        aria-label={`name-${t.id}`}
                        value={t.name}
                        onChange={(e) =>
                          setTokens(
                            tokens.map((x) =>
                              x.id === t.id ? { ...x, name: e.target.value } : x
                            )
                          )
                        }
                      />
                    </td>
                    {sortedBps.map((bp) => (
                      <td key={`${t.id}-size-${bp.id}`}>
                        <input
                          aria-label={`size-${t.name}-${bp.id}`}
                          type="number"
                          value={t.sizes[bp.id] ?? 16}
                          onChange={(e) =>
                            setTokens(
                              tokens.map((x) =>
                                x.id === t.id
                                  ? {
                                      ...x,
                                      sizes: {
                                        ...x.sizes,
                                        [bp.id]: Number(e.target.value),
                                      },
                                    }
                                  : x
                              )
                            )
                          }
                        />
                      </td>
                    ))}
                    {sortedBps.map((bp) => (
                      <td key={`${t.id}-lh-${bp.id}`}>
                        <input
                          aria-label={`lh-${t.name}-${bp.id}`}
                          type="number"
                          step="0.001"
                          value={t.lh[bp.id] ?? 1.25}
                          onChange={(e) =>
                            setTokens(
                              tokens.map((x) =>
                                x.id === t.id
                                  ? {
                                      ...x,
                                      lh: {
                                        ...x.lh,
                                        [bp.id]: Number(e.target.value),
                                      },
                                    }
                                  : x
                              )
                            )
                          }
                        />
                      </td>
                    ))}
                    <td style={{ width: 90 }}>
                      <input
                        aria-label={`grow-${t.id}`}
                        type="number"
                        step="0.01"
                        value={t.growFactorLg ?? 1}
                        onChange={(e) =>
                          setTokens(
                            tokens.map((x) =>
                              x.id === t.id
                                ? { ...x, growFactorLg: Number(e.target.value) }
                                : x
                            )
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => removeToken(t.id)}
                        aria-label={`Удалить ${t.name}`}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="row"
            style={{ marginTop: 16, justifyContent: "space-between" }}
          >
            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={!canStart}
              aria-label="Старт"
              tabIndex={0}
            >
              Старт
            </button>
          </div>

          {cssVars && (
            <div className="grid" style={{ marginTop: 16 }}>
              <CodeBlock
                title="Переменные"
                text={cssVars}
                onCopy={() => navigator.clipboard.writeText(cssVars)}
              />
              <CodeBlock
                title="Миксины"
                text={cssMixins}
                onCopy={() => navigator.clipboard.writeText(cssMixins)}
              />
            </div>
          )}
          {cssVars && <style dangerouslySetInnerHTML={{ __html: cssVars }} />}

          {cssVars && tokens.length > 0 && (
            <div
              className="panel"
              style={{ marginTop: 16 }}
              aria-label="Превью типографики"
              tabIndex={0}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>Превью типографики</strong>
                <div className="muted">
                  {sortedBps.length > 0 && (
                    <span>
                      bp: {sortedBps[0]?.id} ({sortedBps[0]?.value}px), ширина
                      окна: {windowWidth}px
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                {tokens.map((t) => {
                  const lower = t.name.toLowerCase();
                  const isH = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(
                    lower
                  );

                  const commonStyle: React.CSSProperties = {
                    fontSize: `var(--${t.name})`,
                    lineHeight: `var(--${t.name}-lh)` as any,
                    margin: 0,
                  };

                  const sampleText = isH
                    ? `Заголовок ${lower.toUpperCase()}`
                    : "Пример абзаца. Съешь ещё этих мягких французских булок, да выпей чаю.";

                  return (
                    <div
                      key={`preview-${t.id}`}
                      className="row"
                      style={{
                        alignItems: "baseline",
                        gap: 16,
                        marginBottom: 12,
                      }}
                    >
                      <div className="muted" style={{ width: 120 }}>
                        {t.name}
                      </div>
                      <div style={{ flex: 1 }}>
                        {isH && lower === "h1" && (
                          <h1
                            aria-label={`Пример ${t.name}`}
                            tabIndex={0}
                            style={commonStyle}
                          >
                            {sampleText}
                          </h1>
                        )}
                        {isH && lower === "h2" && (
                          <h2
                            aria-label={`Пример ${t.name}`}
                            tabIndex={0}
                            style={commonStyle}
                          >
                            {sampleText}
                          </h2>
                        )}
                        {isH && lower === "h3" && (
                          <h3
                            aria-label={`Пример ${t.name}`}
                            tabIndex={0}
                            style={commonStyle}
                          >
                            {sampleText}
                          </h3>
                        )}
                        {isH && lower === "h4" && (
                          <h4
                            aria-label={`Пример ${t.name}`}
                            tabIndex={0}
                            style={commonStyle}
                          >
                            {sampleText}
                          </h4>
                        )}
                        {isH && lower === "h5" && (
                          <h5
                            aria-label={`Пример ${t.name}`}
                            tabIndex={0}
                            style={commonStyle}
                          >
                            {sampleText}
                          </h5>
                        )}
                        {isH && lower === "h6" && (
                          <h6
                            aria-label={`Пример ${t.name}`}
                            tabIndex={0}
                            style={commonStyle}
                          >
                            {sampleText}
                          </h6>
                        )}
                        {!isH && (
                          <p
                            aria-label={`Пример ${t.name}`}
                            tabIndex={0}
                            style={commonStyle}
                          >
                            {sampleText}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "md" && (
        <div id="panel-md" role="tabpanel" aria-labelledby="tab-md">
          <MarkdownTab />
        </div>
      )}
    </div>
  );
}
