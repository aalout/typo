import { Breakpoints, Token } from "../types";
import Section from "./Section";
import NumberInput from "./NumberInput";

const TokensPanel = ({
  tokens,
  sortedBps,
  setTokens,
  addToken,
  removeToken,
}: {
  tokens: Token[];
  sortedBps: Breakpoints;
  setTokens: (t: Token[]) => void;
  addToken: () => void;
  removeToken: (id: string) => void;
}) => {
  return (
    <Section
      title="Токены"
      ariaLabel="Токены"
      actions={
        <button className="btn" onClick={addToken}>
          Добавить токен
        </button>
      }
    >
      <div className="muted" style={{ marginTop: 6 }}>
        Все размеры указываются в px, line-height указывается в коэффициентах
        или в px
      </div>
      <table className="table" role="table" aria-label="Таблица токенов">
        <thead>
          <tr>
            <th>name</th>
            {sortedBps.map((bp) => (
              <th key={bp.id}>{`size@${bp.id}`}</th>
            ))}
            {sortedBps.map((bp) => (
              <th key={`${bp.id}:lh`}>{`lh@${bp.id}`}</th>
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
                  className="input"
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
                  <NumberInput
                    ariaLabel={`size-${t.name}-${bp.id}`}
                    value={t.sizes[bp.id] ?? 16}
                    onChange={(v) =>
                      setTokens(
                        tokens.map((x) =>
                          x.id === t.id
                            ? {
                                ...x,
                                sizes: {
                                  ...x.sizes,
                                  [bp.id]: v === "" ? 0 : Number(v),
                                },
                              }
                            : x
                        )
                      )
                    }
                    className="input"
                  />
                </td>
              ))}
              {sortedBps.map((bp) => (
                <td key={`${t.id}-lh-${bp.id}`}>
                  <NumberInput
                    ariaLabel={`lh-${t.name}-${bp.id}`}
                    step={0.001}
                    value={t.lh[bp.id] ?? 1.25}
                    onChange={(v) =>
                      setTokens(
                        tokens.map((x) =>
                          x.id === t.id
                            ? {
                                ...x,
                                lh: {
                                  ...x.lh,
                                  [bp.id]: v === "" ? 0 : Number(v),
                                },
                              }
                            : x
                        )
                      )
                    }
                    className="input"
                  />
                </td>
              ))}
              <td style={{ width: 90 }}>
                <NumberInput
                  ariaLabel={`grow-${t.id}`}
                  step={0.01}
                  value={t.growFactorLg ?? 1}
                  onChange={(v) =>
                    setTokens(
                      tokens.map((x) =>
                        x.id === t.id
                          ? { ...x, growFactorLg: v === "" ? 0 : Number(v) }
                          : x
                      )
                    )
                  }
                  className="input"
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
    </Section>
  );
};

export default TokensPanel;
