import { useEffect, useRef } from "react";

export function SourcesDialog({ open, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="glass"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <h2>Откуда цены</h2>
      <p>Живых цен Пятёрочки, Магнита или Ленты в открытом доступе нет. FatSecret берёт не полку магазина, а свою базу продуктов и калорий: доступ по ключу, который выдают по заявке.</p>
      <ul>
        <li><a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> — открытый каталог: названия, состав, штрихкоды. Ключ не нужен, цен магазинов там почти нет.</li>
        <li><a href="https://prices.openfoodfacts.org" target="_blank" rel="noopener">Open Prices</a> — цены, которые присылают люди. Нормально покрыта Европа, России в базе почти нет.</li>
      </ul>
      <p>Поэтому здесь свой набор порций со средними ценами. Он нужен, чтобы день сходился с бюджетом, а остаток честно переезжал дальше.</p>
      <button className="primary" type="button" onClick={onClose}>Понятно</button>
    </dialog>
  );
}
