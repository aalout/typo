import type { CSSProperties } from "react";
import Section from "../../../shared/ui/Section";
import { Breakpoints, Token } from "../../../shared/types";

const PreviewPanel = ({
  tokens,
  sortedBps,
  windowWidth,
}: {
  tokens: Token[];
  sortedBps: Breakpoints;
  windowWidth: number;
}) => {
  return (
    <Section title="Превью типографики" ariaLabel="Превью типографики">
      <div className="muted">
        {sortedBps.length > 0 && (
          <span>
            {`bp: ${sortedBps[0]?.id} (${sortedBps[0]?.value}px), ширина окна: ${windowWidth}px`}
          </span>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {tokens.map((t) => {
          const lower = t.name.toLowerCase();
          const isH = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(lower);

          const commonStyle: CSSProperties = {
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
              style={{ alignItems: "baseline", gap: 16, marginBottom: 12 }}
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
    </Section>
  );
};

export default PreviewPanel;
