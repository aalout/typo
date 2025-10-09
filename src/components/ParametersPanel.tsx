import { Breakpoints } from "../types";
import Section from "./Section";
import NumberInput from "./NumberInput";

const ParametersPanel = ({
  baseRemPx,
  breakpoints,
  setBaseRemPx,
  setBreakpoints,
  addBreakpoint,
  removeBreakpoint,
}: {
  baseRemPx: number;
  breakpoints: Breakpoints;
  setBaseRemPx: (n: number) => void;
  setBreakpoints: (b: Breakpoints) => void;
  addBreakpoint: () => void;
  removeBreakpoint: (id: string) => void;
}) => {
  const sortedBps = [...breakpoints].sort((a, b) => a.value - b.value);
  return (
    <Section title="Параметры" ariaLabel="Параметры">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <label className="label">baseRemPx</label>
        <NumberInput
          ariaLabel="baseRemPx"
          value={baseRemPx}
          onChange={(v) => setBaseRemPx(v === "" ? 0 : Number(v))}
          step={1}
          className="input"
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
        <table className="table" role="table" aria-label="Таблица брейкпоинтов">
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
                  <NumberInput
                    ariaLabel={`bp-${bp.id}`}
                    value={bp.value}
                    onChange={(v) =>
                      setBreakpoints(
                        breakpoints.map((b) =>
                          b.id === bp.id
                            ? { ...b, value: v === "" ? 0 : Number(v) }
                            : b
                        )
                      )
                    }
                    className="input"
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
    </Section>
  );
};

export default ParametersPanel;
