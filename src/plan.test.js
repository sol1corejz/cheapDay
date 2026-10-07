import { ITEMS, applyTtl, buildPlan, freshDays } from "./plan.js";

const failures = [];
const check = (cond, message) => {
  if (!cond) failures.push(message);
};

[300, 2500, 7000, 14000, 40000].forEach((total) => {
  const plan = buildPlan({ total, dayCount: 7, start: "2026-10-08", days: freshDays(7) });
  const spent = plan.days.reduce((sum, day) => sum + day.spent, 0);
  check(spent + plan.leftover === total, `${total}: spent+left ${spent}+${plan.leftover}`);
  plan.days.forEach((day, index) => {
    check(day.spent <= day.allowance, `${total} day ${index} overspent`);
  });
});

const sample = buildPlan({ total: 7000, dayCount: 7, start: "2026-10-08", days: freshDays(7) });
check(new Set(sample.days.map((day) => day.items.join(","))).size > 1, "days should vary");
const expensive = sample.days[0].items.slice().sort((a, b) => ITEMS[b].price - ITEMS[a].price)[0];
const days = sample.days.map((day, index) => (
  index === 0
    ? { ...day, locked: true, items: day.items.filter((item) => item !== expensive) }
    : day
));
const shifted = buildPlan({ ...sample, days });
check(shifted.days[1].allowance > sample.days[1].allowance, "removal should raise the next day");
check(!shifted.days[0].items.includes(expensive), "removed item stays gone");

const saved = {
  state: { plan: { total: 1 }, budget: "100", dayCount: 3, hint: false, theme: "dark", expiresAt: 1000 },
};
const expired = applyTtl(saved, 1001);
check(expired.state.plan === null, "expired plan cleared");
check(expired.state.theme === "dark", "theme survives ttl");
check(expired.state.dayCount === 7, "days reset");
check(applyTtl(saved, 999).state.plan.total === 1, "unexpired plan kept");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("ok");
