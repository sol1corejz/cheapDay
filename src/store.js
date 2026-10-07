import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DAY_MS, applyTtl, buildPlan, freshDays, parseMoney, todayISO } from "./plan.js";

const KEY = "cheapday.v2";

function systemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const ttlStorage = {
  getItem(name) {
    const raw = localStorage.getItem(name);
    if (!raw) return null;
    try {
      return JSON.stringify(applyTtl(JSON.parse(raw), Date.now()));
    } catch {
      return null;
    }
  },
  setItem(name, value) {
    localStorage.setItem(name, value);
  },
  removeItem(name) {
    localStorage.removeItem(name);
  },
};

export const useStore = create(
  persist(
    (set, get) => ({
      theme: systemTheme(),
      budget: "7000",
      dayCount: 7,
      error: "",
      plan: null,
      hint: true,
      editing: false,
      expiresAt: null,
      setBudget: (budget) => set({ budget, error: "" }),
      setDays: (dayCount) => set({ dayCount }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      startEdit: () => {
        const { plan } = get();
        set({
          editing: true,
          error: "",
          budget: plan ? String(plan.total) : get().budget,
          dayCount: plan ? plan.dayCount : get().dayCount,
        });
      },
      cancelEdit: () => set({ editing: false, error: "" }),
      commit: () => {
        const total = parseMoney(get().budget);
        if (!total || total < 50) {
          set({ error: "Нужна сумма хотя бы 50 ₽." });
          return;
        }
        if (total > 1000000) {
          set({ error: "Пока считаю бюджет до 1 000 000 ₽." });
          return;
        }
        const dayCount = get().dayCount;
        set({
          error: "",
          editing: false,
          expiresAt: Date.now() + dayCount * DAY_MS,
          plan: buildPlan({
            total,
            dayCount,
            start: todayISO(),
            days: freshDays(dayCount),
          }),
        });
      },
      dropItem: (index, id) => {
        const plan = get().plan;
        const days = plan.days.map((day, i) => (
          i === index
            ? { ...day, locked: true, items: day.items.filter((item) => item !== id) }
            : day
        ));
        set({ hint: false, plan: buildPlan({ ...plan, days }) });
      },
      reshuffle: (index) => {
        const plan = get().plan;
        const days = plan.days.map((day, i) => (
          i === index ? { ...day, locked: false, seed: day.seed + 1 } : day
        ));
        set({ plan: buildPlan({ ...plan, days }) });
      },
    }),
    {
      name: KEY,
      storage: createJSONStorage(() => ttlStorage),
      partialize: (state) => ({
        theme: state.theme,
        budget: state.budget,
        dayCount: state.dayCount,
        plan: state.plan,
        hint: state.hint,
        expiresAt: state.expiresAt,
      }),
    },
  ),
);
