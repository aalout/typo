import { useMemo, useState } from "react";
import Section from "../../../shared/ui/Section";
import NumberInput from "../../../shared/ui/NumberInput";
import type { Breakpoints } from "../../../shared/types";

type CommonProps = {
  sortedBps: Breakpoints;
  defaultVwRefWidth?: number;
};

const clamp = (n: number, min: number, max: number) => {
  if (n < min) return min;
  if (n > max) return max;
  return n;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const MixinsPreviewPanel = ({
  sortedBps,
  defaultVwRefWidth = 1440,
}: CommonProps) => {
  const [simWidthResponsive, setSimWidthResponsive] = useState<number>(() => {
    const min = sortedBps[0]?.value ?? 320;
    const max = sortedBps[sortedBps.length - 1]?.value ?? 1440;
    return clamp(Math.round((min + max) / 2), min, max);
  });

  const [propertyName, setPropertyName] = useState<string>("margin-top");
  const [mobileVal, setMobileVal] = useState<number | "">(16);
  const [tabletVal, setTabletVal] = useState<number | "">(20);
  const [desktopVal, setDesktopVal] = useState<number | "">(24);

  const [vwProperty, setVwProperty] = useState<string>("margin-top");
  const [vwSize, setVwSize] = useState<number | "">(18);
  const [vwRefWidth, setVwRefWidthLocal] = useState<number | "">(
    defaultVwRefWidth
  );
  const [simWidthVw, setSimWidthVw] = useState<number>(() => {
    const min = sortedBps[0]?.value ?? 320;
    const max = sortedBps[sortedBps.length - 1]?.value ?? 1440;
    return clamp(Math.round((min + max) / 2), min, max);
  });

  const { minPx, midPx, maxPx } = useMemo(() => {
    const min = sortedBps[0]?.value ?? 320;
    const mid =
      sortedBps[Math.max(1, Math.floor((sortedBps.length - 1) / 2))]?.value ??
      768;
    const max = sortedBps[sortedBps.length - 1]?.value ?? 1440;
    return { minPx: min, midPx: mid, maxPx: max };
  }, [sortedBps]);

  const responsiveValue = useMemo(() => {
    if (mobileVal === "" || tabletVal === "" || desktopVal === "") return "";
    const w = clamp(simWidthResponsive, minPx, maxPx);
    if (w < midPx) {
      const t = (w - minPx) / Math.max(1, midPx - minPx);
      return lerp(mobileVal, tabletVal, t);
    }
    if (w < maxPx) {
      const t = (w - midPx) / Math.max(1, maxPx - midPx);
      return lerp(tabletVal, desktopVal, t);
    }
    return desktopVal;
  }, [
    simWidthResponsive,
    minPx,
    midPx,
    maxPx,
    mobileVal,
    tabletVal,
    desktopVal,
  ]);

  const vwValue = useMemo(() => {
    if (vwSize === "") return "";
    const ref = typeof vwRefWidth === "number" ? vwRefWidth : defaultVwRefWidth;
    const v = (Number(vwSize) * simWidthVw) / Math.max(1, Number(ref));
    return v;
  }, [vwSize, simWidthVw, vwRefWidth, defaultVwRefWidth]);

  const previewBoxStyle = useMemo(() => {
    const style: React.CSSProperties = {
      border: "1px dashed var(--border-color, #ccc)",
      padding: 12,
      borderRadius: 8,
      background: "var(--panel-bg, #fafafa)",
    };
    if (responsiveValue !== "") {
      (style as any)[propertyName] = `${Math.round(Number(responsiveValue))}px`;
    }
    return style;
  }, [propertyName, responsiveValue]);

  const vwPreviewStyle = useMemo(() => {
    const style: React.CSSProperties = {
      border: "1px dashed var(--border-color, #ccc)",
      padding: 12,
      borderRadius: 8,
      background: "var(--panel-bg, #fafafa)",
    };
    if (vwValue !== "") {
      (style as any)[vwProperty] = `${Math.round(Number(vwValue))}px`;
    }
    return style;
  }, [vwProperty, vwValue]);

  return (
    <>
      <Section
        title="Mixin responsive — превью"
        ariaLabel="Превью responsive миксина"
      >
        <div className="muted" style={{ marginBottom: 8 }}>
          <span>{`Ширина: ${simWidthResponsive}px (мин: ${minPx}px, mid: ${midPx}px, макс: ${maxPx}px)`}</span>
        </div>
        <div
          className="row"
          style={{ gap: 12, alignItems: "center", marginBottom: 12 }}
        >
          <label className="row-8" style={{ alignItems: "center", gap: 8 }}>
            <span className="muted">Ширина:</span>
            <input
              type="range"
              min={minPx}
              max={maxPx}
              value={simWidthResponsive}
              onChange={(e) => setSimWidthResponsive(Number(e.target.value))}
              aria-label="Симулируемая ширина для responsive"
            />
          </label>
          <NumberInput
            ariaLabel="Точная ширина симуляции для responsive"
            value={simWidthResponsive}
            onChange={(v) =>
              setSimWidthResponsive(v === "" ? minPx : Number(v))
            }
            min={minPx}
            step={1}
            className="input-compact"
          />
        </div>

        <div
          className="row"
          style={{ gap: 12, marginTop: 8, flexWrap: "wrap" }}
        >
          <label className="row-8">
            <span className="muted">Свойство</span>
            <select
              aria-label="CSS-свойство для responsive"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
            >
              <option value="margin-top">margin-top</option>
              <option value="padding-left">padding-left</option>
            </select>
          </label>
          <label className="row-8">
            <span className="muted">mobile (px)</span>
            <NumberInput
              ariaLabel="Значение mobile для responsive"
              value={mobileVal}
              onChange={setMobileVal}
              step={1}
              min={0}
              className="input-compact"
            />
          </label>
          <label className="row-8">
            <span className="muted">tablet (px)</span>
            <NumberInput
              ariaLabel="Значение tablet для responsive"
              value={tabletVal}
              onChange={setTabletVal}
              step={1}
              min={0}
              className="input-compact"
            />
          </label>
          <label className="row-8">
            <span className="muted">desktop (px)</span>
            <NumberInput
              ariaLabel="Значение desktop для responsive"
              value={desktopVal}
              onChange={setDesktopVal}
              step={1}
              min={0}
              className="input-compact"
            />
          </label>
        </div>

        <div style={{ marginTop: 8 }}>
          <code style={{ fontSize: 12 }}>
            {`@mixin responsive ${propertyName}, ${mobileVal || 0}, ${
              tabletVal || 0
            }, ${desktopVal || 0};`}
          </code>
        </div>

        <div className="muted" style={{ marginTop: 8 }}>
          {responsiveValue !== "" && (
            <span aria-live="polite">
              Текущее значение: {Math.round(Number(responsiveValue))}px
            </span>
          )}
        </div>
        <div style={{ marginTop: 8 }}>
          <div
            style={previewBoxStyle}
            tabIndex={0}
            aria-label="Превью responsive"
          >
            <div style={{ fontSize: 14 }} className="muted">
              Пример элемента со свойством {propertyName}
            </div>
            <p style={{ margin: 0 }}>
              Съешь ещё этих мягких французских булок, да выпей чаю.
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Mixin vw-responsive — превью"
        ariaLabel="Превью vw-responsive миксина"
      >
        <div className="muted" style={{ marginBottom: 8 }}>
          <span>{`Ширина: ${simWidthVw}px (мин: ${minPx}px, mid: ${midPx}px, макс: ${maxPx}px)`}</span>
        </div>
        <div
          className="row"
          style={{ gap: 12, alignItems: "center", marginBottom: 12 }}
        >
          <label className="row-8" style={{ alignItems: "center", gap: 8 }}>
            <span className="muted">Ширина:</span>
            <input
              type="range"
              min={minPx}
              max={maxPx}
              value={simWidthVw}
              onChange={(e) => setSimWidthVw(Number(e.target.value))}
              aria-label="Симулируемая ширина для vw-responsive"
            />
          </label>
          <NumberInput
            ariaLabel="Точная ширина симуляции для vw-responsive"
            value={simWidthVw}
            onChange={(v) => setSimWidthVw(v === "" ? minPx : Number(v))}
            min={minPx}
            step={1}
            className="input-compact"
          />
        </div>

        <div
          className="row"
          style={{ gap: 12, marginTop: 8, flexWrap: "wrap" }}
        >
          <label className="row-8">
            <span className="muted">Свойство</span>
            <select
              aria-label="CSS-свойство для vw-responsive"
              value={vwProperty}
              onChange={(e) => setVwProperty(e.target.value)}
            >
              <option value="margin-top">margin-top</option>
              <option value="padding-left">padding-left</option>
            </select>
          </label>
          <label className="row-8">
            <span className="muted">size (px)</span>
            <NumberInput
              ariaLabel="Базовый размер для vw"
              value={vwSize}
              onChange={setVwSize}
              step={1}
              min={0}
              className="input-compact"
            />
          </label>
          <label className="row-8">
            <span className="muted">ref width (px)</span>
            <NumberInput
              ariaLabel="Референсная ширина для vw"
              value={vwRefWidth}
              onChange={setVwRefWidthLocal}
              step={1}
              min={320}
              className="input-compact"
            />
          </label>
        </div>

        <div style={{ marginTop: 8 }}>
          <code style={{ fontSize: 12 }}>
            {`@mixin vw-responsive ${vwProperty}, ${vwSize || 0};`}
          </code>
        </div>

        <div className="muted" style={{ marginTop: 8 }}>
          {vwValue !== "" && (
            <span aria-live="polite">
              Текущее значение: {Math.round(Number(vwValue))}px
            </span>
          )}
        </div>
        <div style={{ marginTop: 8 }}>
          <div
            style={vwPreviewStyle}
            tabIndex={0}
            aria-label="Превью vw-responsive"
          >
            <div style={{ fontSize: 14 }} className="muted">
              Пример элемента со свойством {vwProperty}
            </div>
            <p style={{ margin: 0 }}>
              Съешь ещё этих мягких французских булок, да выпей чаю.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
};

export default MixinsPreviewPanel;
