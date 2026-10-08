import { useEffect, useState } from "react";
import {
  MEALS,
  addDays,
  carryText,
  formatDate,
  formatRange,
  getItem,
  isSameDay,
  money,
  plural,
} from "./plan.js";
import { useStore } from "./store.js";

function expiryLabel(expiresAt) {
  if (!expiresAt) return "";
  const date = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(expiresAt));
  return `В памяти до ${date}`;
}

export function PlanView({ onAbout }) {
  const plan = useStore((state) => state.plan);
  const hint = useStore((state) => state.hint);
  const expiresAt = useStore((state) => state.expiresAt);
  const startEdit = useStore((state) => state.startEdit);
  const dropItem = useStore((state) => state.dropItem);
  const reshuffle = useStore((state) => state.reshuffle);
  const [current, setCurrent] = useState(0);
  const spent = plan.days.reduce((sum, day) => sum + day.spent, 0);
  const share = plan.total / plan.dayCount;
  const shareText = Number.isInteger(share) ? money(share) : `около ${money(Math.round(share))}`;
  const today = new Date();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const nav = document.querySelector(".daynav");
      const probe = (nav?.getBoundingClientRect().bottom ?? 0) + 36;
      const nodes = [...document.querySelectorAll(".day")];
      let active = 0;
      nodes.forEach((node, index) => {
        if (node.getBoundingClientRect().top <= probe) active = index;
      });
      setCurrent(active);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [plan]);

  useEffect(() => {
    const nav = document.querySelector(".daynav");
    const button = nav?.querySelector(`[data-jump="${current}"]`);
    if (!nav || !button) return;
    const navRect = nav.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    if (buttonRect.left < navRect.left || buttonRect.right > navRect.right) {
      button.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }, [current]);

  return (
    <>
      <section className="summary panel glass">
        <div className="plan-line">
          <h2>{money(plan.total)}</h2>
          <p>{plan.dayCount} {plural(plan.dayCount, "день", "дня", "дней")}</p>
        </div>
        <p className="range">{formatRange(plan.start, plan.dayCount)} · равная доля {shareText}</p>
        <div className="strip" aria-hidden="true">
          {plan.days.map((day, index) => (
            <i key={index} style={{ width: `${(day.spent / plan.total) * 100}%` }} />
          ))}
          {plan.leftover > 0 ? <i className="rest" style={{ width: `${(plan.leftover / plan.total) * 100}%` }} /> : null}
        </div>
        <p className="spent-line">
          {money(spent)} в наборах
          {plan.leftover ? ` · ${money(plan.leftover)} свободно` : ""}
          {expiresAt ? ` · ${expiryLabel(expiresAt)}` : ""}
        </p>
        {plan.leftover > plan.total * 0.12 ? (
          <p className="hint">Дальше увеличивать порции уже незачем — эти деньги остаются свободными.</p>
        ) : null}
        {hint ? (
          <p className="hint">Уберите продукт — его цена прибавится к следующим дням, и набор там соберётся заново.</p>
        ) : null}
        <div className="tools">
          <button className="linkish" type="button" onClick={startEdit}>Изменить сумму</button>
          <button className="linkish" type="button" onClick={onAbout}>Откуда цены</button>
        </div>
      </section>

      <nav className="daynav glass" aria-label="Дни">
        {plan.days.map((_, index) => (
          <button
            key={index}
            type="button"
            data-jump={index}
            aria-current={index === current}
            onClick={() => {
              setCurrent(index);
              document.getElementById(`day-${index}`)?.scrollIntoView({ block: "start" });
            }}
          >
            {addDays(plan.start, index).getDate()}
          </button>
        ))}
      </nav>

      {plan.days.map((day, index) => {
        const date = addDays(plan.start, index);
        const label = formatDate(date);
        const kicker = isSameDay(date, today) ? `сегодня · ${label.kicker}` : label.kicker;
        return (
          <article className="day receipt" id={`day-${index}`} key={`${plan.start}-${index}-${day.seed}`}>
            <header className="receipt-head">
              <p className="receipt-brand">на день</p>
              <p className="receipt-kind">кассовый чек</p>
              <p className="kicker">{kicker}</p>
              <h3>{label.title}</h3>
              <p className="allow">лимит {money(day.allowance)}</p>
              {day.showPlus ? <p className="bonus">+{money(day.diff)} с прошлых дней</p> : null}
              {day.showMinus ? <p className="bonus">−{money(Math.abs(day.diff))} к равной доле</p> : null}
            </header>
            {day.items.length === 0 ? <p className="empty-day">На эту сумму набора нет.</p> : null}
            {MEALS.map((meal) => {
              const rows = day.items.filter((id) => getItem(id, plan.catalog)?.meal === meal);
              if (!rows.length) return null;
              return (
                <section className="meal" key={meal}>
                  <h4>{meal}</h4>
                  <ul>
                    {rows.map((id) => {
                      const item = getItem(id, plan.catalog);
                      return (
                        <li className="item" key={id}>
                          <div className="item-line">
                            <span className="name">{item.name}</span>
                            <span className="dots" aria-hidden="true" />
                            <span className="price">{money(item.price)}</span>
                          </div>
                          <div className="item-sub">
                            <span className="amt">{item.amount}</span>
                            <button
                              className="remove"
                              type="button"
                              aria-label={`Убрать «${item.name}», ${item.price} рублей перейдут дальше`}
                              onClick={() => dropItem(index, id)}
                            >
                              ×
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
            <div className="totals">
              <p><span>Итого</span><span>{money(day.spent)}</span></p>
              <p><span>Лимит дня</span><span>{money(day.allowance)}</span></p>
              <p className={day.carry > 0 ? "total-carry" : ""}>
                <span>Сдача</span>
                <span>{money(day.carry)}</span>
              </p>
            </div>
            <p className={day.carry > 0 ? "carry" : "quiet"}>{carryText(day.carry, index === plan.days.length - 1)}</p>
            <button className="reshuffle" type="button" onClick={() => reshuffle(index)}>Другой набор</button>
          </article>
        );
      })}
    </>
  );
}
