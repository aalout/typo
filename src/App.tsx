import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
const slopeRemPerVw = (remA: number, remB: number, pxA: number, pxB: number) =>
  +((remB - remA) / ((pxB - pxA) / 100)).toFixed(6);
const interceptRem = (remAtA: number, slope: number, pxA: number) =>
  +(remAtA - slope * (pxA / 100)).toFixed(6);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
}) => (
  <div className="panel">
    <div className="row" style={{ justifyContent: "space-between" }}>
      <strong>{title}</strong>
      <div className="actions">
        <button
          className="btn btn-secondary"
          onClick={onCopy}
          aria-label={`Скопировать ${title}`}
        >
          Копировать
        </button>
      </div>
    </div>
    <div className="code" role="region" aria-label={title} tabIndex={0}>
      <pre>{text}</pre>
    </div>
  </div>
);

export default function App() {
  const {
    baseRemPx,
    breakpoints,
    tokens,
    setBaseRemPx,
    setBreakpoints,
    setTokens,
  } = useStore();
  const [compatCss, setCompatCss] = useState("");
  const [cssVars, setCssVars] = useState("");
  const [cssMixins, setCssMixins] = useState("");

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
      // Strip comments from base part
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

      // optionally set breakpoints if detected
      if (smallMax && midMin && midMax) {
        const bps: Breakpoints = [
          { id: "min", label: String(smallMax + 1), value: smallMax + 1 },
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
        // capture multiplicative factor after (100vw - XXrem) * factor
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

          // mid and min from clamp first args inside corresponding media
          const midVal = declMid[nameVar];
          const minVal = declSmall[nameVar];
          const midRem = midVal ? clampFirstArgRem(midVal) : undefined;
          const minRem = minVal ? clampFirstArgRem(minVal) : undefined;
          // if base wasn't parsed, try to recover max from clamp third arg
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

      const slopeMinMid = slopeRemPerVw(sMin, sMid, minPx, midPx);
      const icptMinMid = interceptRem(sMin, slopeMinMid, minPx);
      const slopeMidMax = slopeRemPerVw(sMid, sMax, midPx, maxPx);
      const icptMidMax = interceptRem(sMid, slopeMidMax, midPx);

      midLines.push(
        `\t\t--${t.name}: clamp(${sMid}rem, ${icptMidMax}rem + ${slopeMidMax}vw, ${sMax}rem);`
      );
      midLines.push(`\t\t--${t.name}-lh: ${lhMid};`);

      smallLines.push(
        `\t\t--${t.name}: clamp(${sMin}rem, ${icptMinMid}rem + ${slopeMinMid}vw, ${sMid}rem);`
      );
      smallLines.push(`\t\t--${t.name}-lh: ${lhMin};`);

      const slopeBeyond = +(
        (sMax - sMid) /
        ((maxPx - midPx) / baseRemPx)
      ).toFixed(6);
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

    // compose
    baseLines.push("");
    baseLines.push(
      `\t@media (min-width: ${midPx}px) and (max-width: ${maxPx}px) {`
    );
    baseLines.push(...midLines);
    baseLines.push(`\t}`);

    baseLines.push("");
    baseLines.push(
      `\t@media (min-width: ${minPx}px) and (max-width: ${midPx - 1}px) {`
    );
    baseLines.push(...smallLines);
    baseLines.push(`\t}`);

    baseLines.push("");
    baseLines.push(`\t@media (min-width: ${maxPx + 1}px) {`);
    baseLines.push(...largeLines);
    baseLines.push(`\t}`);

    baseLines.push("}");

    setCssVars(baseLines.join("\n"));
    setCssMixins(mixinLines.join("\n"));
  };

  return (
    <div className="container">
      <h2>@typo — генератор типографики</h2>
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
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>Брейкпоинты</strong>
              <div className="actions">
                <button className="btn btn-secondary" onClick={addBreakpoint}>
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

        <div className="panel" aria-label="Обратная совместимость" tabIndex={0}>
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
          <AutoResizeTextarea
            ariaLabel="css-compat"
            value={compatCss}
            onChange={setCompatCss}
            placeholder=":root {\n  --token: 1rem;\n  --token-lh: 1.25;\n  @media (min-width: 1024px) and (max-width: 1440px) {\n    --token: clamp(1rem, 1rem + 0vw, 1rem);\n    --token-lh: 1.25;\n  }\n  @media (max-width: 1023px) {\n    --token: clamp(1rem, 1rem + 0vw, 1rem);\n    --token-lh: 1.25;\n  }\n  @media (min-width: 1441px) {\n    --token: calc(1rem + (0 * (100vw - 90rem) * 1));\n  }\n}"
          />
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
          Размеры и line-height указываются в px или коэффициент (=3)
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
    </div>
  );
}
