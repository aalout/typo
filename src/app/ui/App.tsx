import { useEffect, useMemo, useState } from "react";
import { TypoPage } from "../../views/typo-page";
import { CanvasPage } from "../../views/canvas-page";

export default function App() {
  const [route, setRoute] = useState<string>(
    () => location.hash?.replace(/^#\/?/, "") || "typo"
  );

  useEffect(() => {
    const onHashChange = () =>
      setRoute(location.hash?.replace(/^#\/?/, "") || "typo");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const nav = useMemo(
    () => (
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 8 }}>
          <a
            href="#/typo"
            className="tab"
            aria-label="К типографике"
            tabIndex={0}
          >
            @typo
          </a>
          <a
            href="#/canvas"
            className="tab"
            aria-label="К канвасу"
            tabIndex={0}
          >
            @canvas
          </a>
        </div>
      </div>
    ),
    []
  );

  return (
    <div className="container">
      {nav}
      {route === "canvas" ? <CanvasPage /> : <TypoPage />}
    </div>
  );
}
