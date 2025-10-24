import { useEffect, useMemo, useState } from "react";
import CodeBlock from "../../../shared/ui/CodeBlock";

type SettingProps = {
  title: string;
  hint: string;
  children: React.ReactNode;
};

const Setting = ({ title, hint, children }: SettingProps) => {
  const [show, setShow] = useState(false);
  return (
    <div
      className="panel"
      style={{ position: "relative" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      aria-label={title}
    >
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>{title}</strong>
      </div>
      {children}
      <div
        role="tooltip"
        style={{
          position: "absolute",
          right: 8,
          top: 8,
          maxWidth: 320,
          fontSize: 12,
          color: "#c9d5ff",
          background: "rgba(22,27,40,0.95)",
          border: "1px solid #2a3150",
          borderRadius: 6,
          padding: "8px 10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          transition: "opacity 160ms ease, transform 160ms ease",
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(-4px)",
          pointerEvents: show ? "auto" : "none",
        }}
      >
        {hint}
      </div>
    </div>
  );
};

const docsMd = `
# Шаблон Canvas 2D

Зачем нужен шаблон:
- Масштабирование под DPR (ретина) через setTransform(dpr, 0, 0, dpr, 0, 0).
- Авто-ресайз через ResizeObserver + window.resize.
- Очистка холста в CSS-координатах.

Минимальный цикл анимации добавим позже: requestAnimationFrame и deltaTime.
`;

export default function CanvasGenerator() {
  const [activeTab, setActiveTab] = useState<"gen" | "docs">("gen");

  // Настройки генератора шаблона
  const [api, setApi] = useState<"2d" | "webgl2">("2d");
  const [useDesync, setUseDesync] = useState(true);
  const [useReadFreq, setUseReadFreq] = useState(false);
  const [useRO, setUseRO] = useState(true);
  const [useWinResize, setUseWinResize] = useState(true);
  const [useFocusHandlers, setUseFocusHandlers] = useState(true);
  const [clearMode, setClearMode] = useState<"css" | "buffer" | "none">("css");
  const [asReact, setAsReact] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useRAF, setUseRAF] = useState(false);
  const [pauseOnHidden, setPauseOnHidden] = useState(true);
  const [dprMode, setDprMode] = useState<"auto" | "fixed">("auto");
  const [fixedDpr, setFixedDpr] = useState<number>(2);
  const [fixedBuffer, setFixedBuffer] = useState(false);
  const [bufW, setBufW] = useState<number>(800);
  const [bufH, setBufH] = useState<number>(600);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgColor, setBgColor] = useState<string>("#00000000");
  const [glClear, setGlClear] = useState<string>("0, 0, 0, 0");

  useEffect(() => {
    // предпросмотр отключён — холст не создаём
  }, []);

  const docsHtml = useMemo(() => {
    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
    const lines = docsMd
      .trim()
      .split(/\n\n/)
      .map((p) => {
        if (p.startsWith("# ")) return `<h1>${escapeHtml(p.slice(2))}</h1>`;
        if (p.startsWith("- "))
          return `<ul>${p
            .split(/\n/)
            .map((l) => `<li>${escapeHtml(l.replace(/^[-*]\s+/, ""))}</li>`)
            .join("")}</ul>`;
        return `<p>${escapeHtml(p)}</p>`;
      })
      .join("\n");
    return lines;
  }, []);

  const generatedCode = useMemo(() => {
    if (api === "2d") {
      const opts: string[] = [];
      opts.push(`alpha: true`);
      if (useDesync) opts.push(`desynchronized: true`);
      if (useReadFreq) opts.push(`willReadFrequently: true`);

      const clearBlockCss = `\n    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);`;
      const clearBlockBuf = `\n    ctx.save();\n    ctx.setTransform(1, 0, 0, 1, 0, 0);\n    ctx.clearRect(0, 0, canvas.width, canvas.height);\n    ctx.restore();`;
      const clearBlock =
        clearMode === "css"
          ? clearBlockCss
          : clearMode === "buffer"
          ? clearBlockBuf
          : "";

      const withRO = useRO
        ? `\n  const ro = new ResizeObserver(handleResize);\n  ro.observe(canvas);`
        : "";
      const withWinResize = useWinResize
        ? `\n  window.addEventListener('resize', handleResize, { passive: true });`
        : "";
      const withFocus = useFocusHandlers
        ? `\n\n  const handlePointerDown = () => { if (document.activeElement !== canvas) canvas.focus(); };\n  canvas.addEventListener('pointerdown', handlePointerDown, { passive: true });`
        : "";

      if (asReact) {
        return `import { useEffect, useRef } from 'react';\n\nexport const CanvasTemplate = () => {\n  const ref = useRef(null);\n  useEffect(() => {\n    const canvas = ref.current;\n    if (!(canvas instanceof HTMLCanvasElement)) return;\n    /** @type {CanvasRenderingContext2D | null} */\n    const ctx = canvas.getContext('2d', { ${opts.join(
          ", "
        )} });\n    if (!ctx) return;\n    const getDpr = () => window.devicePixelRatio || 1;\n    const handleResize = () => {\n      const dpr = getDpr();\n      const { clientWidth, clientHeight } = canvas;\n      if (!clientWidth || !clientHeight) return;\n      const nextW = Math.ceil(clientWidth * dpr);\n      const nextH = Math.ceil(clientHeight * dpr);\n      if (canvas.width !== nextW || canvas.height !== nextH) {\n        canvas.width = nextW;\n        canvas.height = nextH;\n        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);\n      }${clearBlock}\n    };${withRO}${withWinResize}${withFocus}\n    handleResize();\n    return () => {${
          useRO ? ` ro.disconnect();` : ``
        }${
          useWinResize
            ? ` window.removeEventListener('resize', handleResize);`
            : ``
        }${
          useFocusHandlers
            ? ` canvas.removeEventListener('pointerdown', handlePointerDown);`
            : ``
        } };\n  }, []);\n  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;\n};`;
      }

      return `(() => {\n  const canvas = document.getElementById('canvas');\n  if (!(canvas instanceof HTMLCanvasElement)) return;\n  /** @type {CanvasRenderingContext2D | null} */\n  const ctx = canvas.getContext('2d', { ${opts.join(
        ", "
      )} });\n  if (!ctx) return;\n  const getDpr = () => window.devicePixelRatio || 1;\n  const handleResize = () => {\n    const dpr = getDpr();\n    const { clientWidth, clientHeight } = canvas;\n    if (!clientWidth || !clientHeight) return;\n    const nextW = Math.ceil(clientWidth * dpr);\n    const nextH = Math.ceil(clientHeight * dpr);\n    if (canvas.width !== nextW || canvas.height !== nextH) {\n      canvas.width = nextW;\n      canvas.height = nextH;\n      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);\n    }${clearBlock}\n  };${withRO}${withWinResize}\n  handleResize();\n})();`;
    }

    // WebGL2
    const attrs: string[] = [];
    if (useDesync) attrs.push(`desynchronized: true`);
    const withRO = useRO
      ? `\n  const ro = new ResizeObserver(handleResize);\n  ro.observe(canvas);`
      : "";
    const withWinResize = useWinResize
      ? `\n  window.addEventListener('resize', handleResize, { passive: true });`
      : "";
    const withFocus = useFocusHandlers
      ? `\n\n  const handlePointerDown = () => { if (document.activeElement !== canvas) canvas.focus(); };\n  canvas.addEventListener('pointerdown', handlePointerDown, { passive: true });`
      : "";

    if (asReact) {
      return `import { useEffect, useRef } from 'react';\n\nexport const CanvasTemplate = () => {\n  const ref = useRef(null);\n  useEffect(() => {\n    const canvas = ref.current;\n    if (!(canvas instanceof HTMLCanvasElement)) return;\n    /** @type {WebGL2RenderingContext | null} */\n    const gl = canvas.getContext('webgl2'${
        attrs.length ? `, { ${attrs.join(", ")} }` : ""
      });\n    if (!gl) return;\n    const getDpr = () => window.devicePixelRatio || 1;\n    const handleResize = () => {\n      const dpr = getDpr();\n      const cssW = canvas.clientWidth;\n      const cssH = canvas.clientHeight;\n      if (!cssW || !cssH) return;\n      const nextW = Math.ceil(cssW * dpr);\n      const nextH = Math.ceil(cssH * dpr);\n      if (canvas.width !== nextW || canvas.height !== nextH) {\n        canvas.width = nextW;\n        canvas.height = nextH;\n      }\n      gl.viewport(0, 0, canvas.width, canvas.height);\n      gl.clearColor(0, 0, 0, 0);\n      gl.clear(gl.COLOR_BUFFER_BIT);\n    };${withRO}${withWinResize}${withFocus}\n    handleResize();\n    return () => {${
        useRO ? ` ro.disconnect();` : ``
      }${
        useWinResize
          ? ` window.removeEventListener('resize', handleResize);`
          : ``
      }${
        useFocusHandlers
          ? ` canvas.removeEventListener('pointerdown', handlePointerDown);`
          : ``
      } };\n  }, []);\n  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;\n};`;
    }

    return `(() => {\n  const canvas = document.getElementById('canvas');\n  if (!(canvas instanceof HTMLCanvasElement)) return;\n  /** @type {WebGL2RenderingContext | null} */\n  const gl = canvas.getContext('webgl2'${
      attrs.length ? `, { ${attrs.join(", ")} }` : ""
    });\n  if (!gl) return;\n  const getDpr = () => window.devicePixelRatio || 1;\n  const handleResize = () => {\n    const dpr = getDpr();\n    const cssW = canvas.clientWidth;\n    const cssH = canvas.clientHeight;\n    if (!cssW || !cssH) return;\n    const nextW = Math.ceil(cssW * dpr);\n    const nextH = Math.ceil(cssH * dpr);\n    if (canvas.width !== nextW || canvas.height !== nextH) {\n      canvas.width = nextW;\n      canvas.height = nextH;\n    }\n    gl.viewport(0, 0, canvas.width, canvas.height);\n    gl.clearColor(0.0, 0.0, 0.0, 0.0);\n    gl.clear(gl.COLOR_BUFFER_BIT);\n  };${withRO}${withWinResize}${withFocus}\n  handleResize();\n})();`;
  }, [
    api,
    useDesync,
    useReadFreq,
    useRO,
    useWinResize,
    useFocusHandlers,
    clearMode,
    asReact,
  ]);

  return (
    <div className="container">
      <h2>@canvas — конструктор шаблона</h2>

      <div className="tabs" role="tablist" aria-label="Переключатель разделов">
        <button
          id="tab-gen"
          className={`tab ${activeTab === "gen" ? "active" : ""}`}
          role="tab"
          aria-selected={activeTab === "gen"}
          aria-controls="panel-gen"
          tabIndex={0}
          onClick={() => setActiveTab("gen")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setActiveTab("gen");
            if (e.key === "ArrowRight") setActiveTab("docs");
          }}
        >
          Генератор
        </button>
        <button
          id="tab-docs"
          className={`tab ${activeTab === "docs" ? "active" : ""}`}
          role="tab"
          aria-selected={activeTab === "docs"}
          aria-controls="panel-docs"
          tabIndex={0}
          onClick={() => setActiveTab("docs")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setActiveTab("docs");
            if (e.key === "ArrowLeft") setActiveTab("gen");
          }}
        >
          Документация
        </button>
      </div>

      {activeTab === "gen" && (
        <div
          className="panel-gen"
          id="panel-gen"
          role="tabpanel"
          aria-labelledby="tab-gen"
        >
          <div className="panel" aria-label="Опции шаблона" tabIndex={0}>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Setting
                title="API"
                hint="2D для обычной 2D‑графики; WebGL2 — когда нужны 3D/шейдеры/большие сцены."
              >
                <div className="row" style={{ gap: 12 }}>
                  <label className="checkbox">
                    <input
                      type="radio"
                      name="api"
                      checked={api === "2d"}
                      onChange={() => setApi("2d")}
                    />
                    <span>2D</span>
                  </label>
                  <label className="checkbox">
                    <input
                      type="radio"
                      name="api"
                      checked={api === "webgl2"}
                      onChange={() => setApi("webgl2")}
                    />
                    <span>WebGL2</span>
                  </label>
                </div>
              </Setting>

              <Setting
                title="desynchronized"
                hint="Включай для интерактива с низким лагом (игры, рисование). Может игнорироваться браузером."
              >
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={useDesync}
                    onChange={(e) => setUseDesync(e.target.checked)}
                  />
                  <span>Включить</span>
                </label>
              </Setting>

              <Setting
                title="willReadFrequently (2D)"
                hint="Используй, если часто делаешь getImageData/putImageData. Иначе оставь выключенным."
              >
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={useReadFreq}
                    onChange={(e) => setUseReadFreq(e.target.checked)}
                    disabled={api !== "2d"}
                  />
                  <span>Включить</span>
                </label>
              </Setting>

              <Setting
                title="ResizeObserver"
                hint="Нужен, когда размер контейнера меняется лэйаутом (флекс/проценты/переключатели)."
              >
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={useRO}
                    onChange={(e) => setUseRO(e.target.checked)}
                  />
                  <span>Включить</span>
                </label>
              </Setting>

              <Setting
                title="window.resize"
                hint="Полезно при перетаскивании окна между мониторами (меняется DPR) и ресайзе окна."
              >
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={useWinResize}
                    onChange={(e) => setUseWinResize(e.target.checked)}
                  />
                  <span>Включить</span>
                </label>
              </Setting>

              <Setting
                title="Фокус по клику"
                hint="Включай, если будут хоткеи/ввод с клавиатуры: даёт фокус по клику/тачу."
              >
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={useFocusHandlers}
                    onChange={(e) => setUseFocusHandlers(e.target.checked)}
                  />
                  <span>Включить</span>
                </label>
              </Setting>

              <Setting
                title="Очистка (2D)"
                hint="CSS‑очистка — по умолчанию; буфер — если нужна точная пиксель‑координатная очистка."
              >
                <label className="row-8">
                  <span className="muted">Метод:</span>
                  <select
                    className="input"
                    value={clearMode}
                    onChange={(e) =>
                      setClearMode(e.target.value as "css" | "buffer" | "none")
                    }
                    disabled={api !== "2d"}
                    aria-label="Выбор метода очистки"
                  >
                    <option value="css">clearRect в CSS-координатах</option>
                    <option value="buffer">
                      clearRect в буфере (reset transform)
                    </option>
                    <option value="none">не очищать</option>
                  </select>
                </label>
              </Setting>

              <Setting
                title="React-компонент"
                hint="Сгенерировать как React-компонент (useRef/useEffect) вместо IIFE."
              >
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={asReact}
                    onChange={(e) => setAsReact(e.target.checked)}
                  />
                  <span>Генерировать как React</span>
                </label>
              </Setting>
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                aria-label="Расширенные настройки"
                onClick={() => setShowAdvanced((s) => !s)}
              >
                {showAdvanced
                  ? "Скрыть расширенные настройки"
                  : "Расширенные настройки"}
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div
              className="panel"
              aria-label="Расширенные настройки"
              tabIndex={0}
            >
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Setting
                  title="Цикл анимации"
                  hint="Включай rAF для постоянной анимации; с паузой при скрытой вкладке экономит батарею."
                >
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={useRAF}
                      onChange={(e) => setUseRAF(e.target.checked)}
                    />
                    <span>requestAnimationFrame</span>
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={pauseOnHidden}
                      onChange={(e) => setPauseOnHidden(e.target.checked)}
                      disabled={!useRAF}
                    />
                    <span>Пауза при скрытой вкладке</span>
                  </label>
                </Setting>

                <Setting
                  title="DPR"
                  hint="Auto — устройство; Fixed — закрепи DPR (например 1 для скорости на ретине)."
                >
                  <label className="row-8">
                    <select
                      className="input input-compact"
                      value={dprMode}
                      onChange={(e) => setDprMode(e.target.value as any)}
                      aria-label="Режим DPR"
                    >
                      <option value="auto">Auto</option>
                      <option value="fixed">Fixed</option>
                    </select>
                    <input
                      className="input input-compact"
                      type="number"
                      min={1}
                      max={4}
                      value={fixedDpr}
                      onChange={(e) => setFixedDpr(Number(e.target.value) || 1)}
                      disabled={dprMode !== "fixed"}
                      aria-label="Фиксированный DPR"
                    />
                  </label>
                </Setting>

                <Setting
                  title="Размер буфера"
                  hint="Fixed — пиксельный размер буфера, независимо от CSS. Полезно для рендера в текстуру/скриншотов."
                >
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={fixedBuffer}
                      onChange={(e) => setFixedBuffer(e.target.checked)}
                    />
                    <span>Fixed buffer size</span>
                  </label>
                  <label className="row-8">
                    <span className="muted">W×H:</span>
                    <input
                      className="input input-compact"
                      type="number"
                      min={1}
                      value={bufW}
                      onChange={(e) => setBufW(Number(e.target.value) || 1)}
                      disabled={!fixedBuffer}
                      aria-label="Buffer width"
                    />
                    <input
                      className="input input-compact"
                      type="number"
                      min={1}
                      value={bufH}
                      onChange={(e) => setBufH(Number(e.target.value) || 1)}
                      disabled={!fixedBuffer}
                      aria-label="Buffer height"
                    />
                  </label>
                </Setting>

                {api === "2d" && (
                  <Setting
                    title="Фон (2D)"
                    hint="Заливка фона после очистки. Удобно для статичного бэкграунда."
                  >
                    <label className="row-8">
                      <input
                        type="checkbox"
                        checked={bgEnabled}
                        onChange={(e) => setBgEnabled(e.target.checked)}
                      />
                      <span>Заливать фон</span>
                      <input
                        className="input input-compact"
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        placeholder="#00000000 / rgba(0,0,0,0)"
                        aria-label="Цвет фона"
                      />
                    </label>
                  </Setting>
                )}

                {api === "webgl2" && (
                  <Setting
                    title="clearColor (WebGL2)"
                    hint="Начальный цвет очистки фреймбуфера, формат rgba(r,g,b,a)."
                  >
                    <label className="row-8">
                      <span className="muted">rgba(...):</span>
                      <input
                        className="input"
                        type="text"
                        value={glClear}
                        onChange={(e) => setGlClear(e.target.value)}
                        placeholder="0, 0, 0, 0"
                        aria-label="gl.clearColor"
                      />
                    </label>
                  </Setting>
                )}
              </div>
            </div>
          )}

          <div className="panel" aria-label="Сгенерированный код" tabIndex={0}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>Сгенерированный шаблон</strong>
              <button
                className="btn btn-secondary"
                onClick={() => navigator.clipboard.writeText(generatedCode)}
                aria-label="Скопировать код"
              >
                Копировать
              </button>
            </div>
            <CodeBlock
              title={`${asReact ? "React " : ""}${
                api === "2d" ? "2D" : "WebGL2"
              } Template`}
              text={generatedCode}
              onCopy={() => navigator.clipboard.writeText(generatedCode)}
            />
          </div>
        </div>
      )}

      {activeTab === "docs" && (
        <div id="panel-docs" role="tabpanel" aria-labelledby="tab-docs">
          <div className="panel" aria-label="Документация" tabIndex={0}>
            <div
              className="md-preview"
              dangerouslySetInnerHTML={{ __html: docsHtml }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
