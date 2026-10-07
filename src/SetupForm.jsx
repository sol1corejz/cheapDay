import { useEffect, useRef } from "react";
import { describeDraft, plural } from "./plan.js";
import { useStore } from "./store.js";

export function SetupForm({ onAbout }) {
  const budget = useStore((state) => state.budget);
  const dayCount = useStore((state) => state.dayCount);
  const error = useStore((state) => state.error);
  const plan = useStore((state) => state.plan);
  const setBudget = useStore((state) => state.setBudget);
  const setDays = useStore((state) => state.setDays);
  const commit = useStore((state) => state.commit);
  const cancelEdit = useStore((state) => state.cancelEdit);
  const inputRef = useRef(null);
  const draft = describeDraft(budget, dayCount);

  useEffect(() => {
    if (plan) inputRef.current?.focus();
  }, [plan]);

  return (
    <form
      className="setup panel glass"
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <div className="field">
        <label htmlFor="budget">Бюджет на все дни</label>
        <div className="money-input">
          <input
            id="budget"
            ref={inputRef}
            inputMode="decimal"
            autoComplete="off"
            spellCheck="false"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
          <em>₽</em>
        </div>
      </div>
      <div className="field">
        <span className="step-label" id="days-label">Сколько дней</span>
        <div className="stepper" role="group" aria-labelledby="days-label">
          <button type="button" aria-label="Меньше дней" onClick={() => setDays(Math.max(1, dayCount - 1))}>−</button>
          <strong>{dayCount}</strong>
          <button type="button" aria-label="Больше дней" onClick={() => setDays(Math.min(31, dayCount + 1))}>+</button>
        </div>
      </div>
      <div className="preview">
        <p className="big">{draft.big}</p>
        <p className="sub">{draft.sub}</p>
      </div>
      <p className="error" role="alert">{error}</p>
      <button className="primary" type="submit">{plan ? "Пересчитать заново" : "Собрать дни"}</button>
      {plan ? (
        <button className="ghost" type="button" onClick={cancelEdit}>Оставить как есть</button>
      ) : (
        <button className="linkish" type="button" onClick={onAbout}>Откуда цены</button>
      )}
      <p className="sub">План сохранится на {dayCount} {plural(dayCount, "день", "дня", "дней")}, потом сотрётся.</p>
    </form>
  );
}
