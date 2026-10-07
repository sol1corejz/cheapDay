import { useEffect, useState } from "react";
import { PlanView } from "./PlanView.jsx";
import { SetupForm } from "./SetupForm.jsx";
import { SourcesDialog } from "./SourcesDialog.jsx";
import { useStore } from "./store.js";

function ThemeIcon({ theme }) {
  if (theme === "dark") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 1.5v1.8M9 14.7v1.8M1.5 9h1.8M14.7 9h1.8M3.4 3.4l1.3 1.3M13.3 13.3l1.3 1.3M14.6 3.4l-1.3 1.3M4.7 13.3l-1.3 1.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M12.2 11.6A5.2 5.2 0 0 1 6.4 5.8 5.2 5.2 0 1 0 12.2 11.6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function App() {
  const theme = useStore((state) => state.theme);
  const plan = useStore((state) => state.plan);
  const editing = useStore((state) => state.editing);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const [ready, setReady] = useState(() => useStore.persist.hasHydrated());
  const [about, setAbout] = useState(false);

  useEffect(() => {
    setReady(useStore.persist.hasHydrated());
    return useStore.persist.onFinishHydration(() => setReady(true));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#161411" : "#cfc7b8";
  }, [theme]);

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1 className="wordmark">на день</h1>
          {plan ? null : (
            <p className="lede">Сумма делится поровну. На каждый день набирается еда, а остаток переходит дальше.</p>
          )}
        </div>
        <button
          className="icon-btn"
          type="button"
          aria-label={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          onClick={toggleTheme}
        >
          <ThemeIcon theme={theme} />
        </button>
      </header>
      {ready && (plan && !editing ? null : <SetupForm onAbout={() => setAbout(true)} />)}
      {ready && plan ? <PlanView onAbout={() => setAbout(true)} /> : null}
      <p className="fine">Цены — ориентир порций на одного человека, не ценник полки. Набор можно урезать, деньги не сгорают.</p>
      <SourcesDialog open={about} onClose={() => setAbout(false)} />
    </div>
  );
}
