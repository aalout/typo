import { useLayoutEffect, useMemo, useState } from "react";
import MarkdownTab from "./MarkdownTab";
import CodeBlock from "./components/CodeBlock";
import { useStore } from "./store/typoStore";
import { uid } from "./utils/typoMath";
import { parseCompatCss } from "./utils/compatImport";
import { generateCss } from "./utils/cssGen";
import ParametersPanel from "./components/ParametersPanel";
import CompatImportPanel from "./components/CompatImportPanel";
import TokensPanel from "./components/TokensPanel";
import PreviewPanel from "./components/PreviewPanel";
import NumberInput from "./components/NumberInput";
import Section from "./components/Section";
import MixinsPreviewPanel from "./components/MixinsPreviewPanel";

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
  const [responsiveMixin, setResponsiveMixin] = useState("");
  const [vwMixin, setVwMixin] = useState("");
  const [useResponsive, setUseResponsive] = useState(true);
  const [useVw, setUseVw] = useState(false);
  const [vwRefWidth, setVwRefWidth] = useState<number>(
    typeof window !== "undefined" ? 1440 : 1440
  );
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useLayoutEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize, { passive: true } as any);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // логика overflow перенесена в CompatImportPanel

  const sortedBps = useMemo(
    () => [...breakpoints].sort((a, b) => a.value - b.value),
    [breakpoints]
  );

  const handleCompatImport = () => {
    try {
      const { tokens: parsedTokens, breakpoints: parsedBps } = parseCompatCss(
        compatCss,
        baseRemPx
      );
      if (parsedBps) setBreakpoints(parsedBps);
      setTokens(parsedTokens);
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
    const { varsCss, mixinsCss } = generateCss(tokens, baseRemPx, bpIds, bpPx);
    setCssVars(varsCss);
    setCssMixins(mixinsCss);
    if (useResponsive && bpPx.length >= 3) {
      const minPx = bpPx[0];
      const midPx = bpPx[Math.max(1, Math.floor((bpPx.length - 1) / 2))];
      const maxPx = bpPx[bpPx.length - 1];
      const responsive = `/* prettier-ignore */\n\n@define-mixin responsive $property, $mobile, $tablet, $desktop {\n    $(property): $(mobile)px;\n\n    @media (min-width: ${minPx}px) {\n        $(property): calc(\n            $(mobile)px +\n            ($(tablet) - $(mobile)) *\n            ((100vw - ${minPx}px) / (${midPx} - ${minPx}))\n        );\n    }\n\n    @media (min-width: ${midPx}px) {\n        $(property): calc(\n            $(tablet)px +\n            ($(desktop) - $(tablet)) *\n            ((100vw - ${midPx}px) / (${maxPx} - ${midPx}))\n        );\n    }\n\n    @media (min-width: ${maxPx}px) {\n        $(property): calc(\n            $(desktop)px +\n            ($(desktop) - $(tablet)) *\n            ((100vw - ${maxPx}px) / (${maxPx} - ${midPx}))\n        );\n    }\n}`;
      setResponsiveMixin(responsive);
    } else {
      setResponsiveMixin("");
    }

    if (useVw) {
      const refWidth = Number(vwRefWidth) || bpPx[bpPx.length - 1] || 1440;
      const vwResponsive = `/* prettier-ignore */\n\n@define-mixin vw-responsive $property, $size {\n    $(property): calc($(size) * (100vw / ${refWidth}));\n}`;
      setVwMixin(vwResponsive);
    } else {
      setVwMixin("");
    }
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
            <ParametersPanel
              baseRemPx={baseRemPx}
              breakpoints={breakpoints}
              setBaseRemPx={setBaseRemPx}
              setBreakpoints={setBreakpoints}
              addBreakpoint={() => {
                const value = Number(prompt("Ширина bp в px", "768"));
                if (!value) return;
                const id =
                  prompt("название брейкпоинта (например, mid)", "md") || uid();
                setBreakpoints([
                  ...breakpoints,
                  { id, label: String(value), value },
                ]);
              }}
              removeBreakpoint={(id) =>
                setBreakpoints(breakpoints.filter((b) => b.id !== id))
              }
            />

            <CompatImportPanel
              compatCss={compatCss}
              setCompatCss={setCompatCss}
              onImport={handleCompatImport}
            />
          </div>

          <div className="stack">
            <TokensPanel
              tokens={tokens}
              sortedBps={sortedBps}
              setTokens={setTokens}
              addToken={() =>
                setTokens([
                  ...tokens,
                  {
                    id: uid(),
                    name: "token",
                    sizes: Object.fromEntries(sortedBps.map((b) => [b.id, 16])),
                    lh: Object.fromEntries(sortedBps.map((b) => [b.id, 1.25])),
                    growFactorLg: 1,
                  },
                ])
              }
              removeToken={(id) => setTokens(tokens.filter((t) => t.id !== id))}
            />

            <Section title="Миксины" ariaLabel="Настройки миксинов">
              <div className="mixin-controls">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={useResponsive}
                    onChange={(e) => setUseResponsive(e.target.checked)}
                    aria-label="Включить миксин responsive"
                  />
                  <span>Mixin responsive</span>
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={useVw}
                    onChange={(e) => setUseVw(e.target.checked)}
                    aria-label="Включить миксин vw-responsive"
                  />
                  <span>Mixin vw-responsive</span>
                </label>
                {useVw && (
                  <label className="row-8">
                    <span className="muted">Референсная ширина (px):</span>
                    <NumberInput
                      ariaLabel="Референсная ширина для vw-responsive"
                      min={320}
                      step={1}
                      value={vwRefWidth}
                      onChange={(v) =>
                        setVwRefWidth(v === "" ? 320 : Number(v))
                      }
                      className="input-compact"
                    />
                  </label>
                )}
              </div>
            </Section>

            <div className="row justify-between">
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
              <div className="grid">
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
                {responsiveMixin && (
                  <CodeBlock
                    title="Миксин responsive"
                    text={responsiveMixin}
                    onCopy={() =>
                      navigator.clipboard.writeText(responsiveMixin)
                    }
                  />
                )}
                {vwMixin && (
                  <CodeBlock
                    title="Миксин vw-responsive"
                    text={vwMixin}
                    onCopy={() => navigator.clipboard.writeText(vwMixin)}
                  />
                )}
              </div>
            )}
            {cssVars && <style dangerouslySetInnerHTML={{ __html: cssVars }} />}

            {cssVars && tokens.length > 0 && (
              <>
                <PreviewPanel
                  tokens={tokens}
                  sortedBps={sortedBps}
                  windowWidth={windowWidth}
                />
                <MixinsPreviewPanel
                  sortedBps={sortedBps}
                  defaultVwRefWidth={vwRefWidth}
                />
              </>
            )}
          </div>
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
