// The illustrative demo batch shown on the marketing page — data ported
// verbatim from penny_prototype.html. Narratives carry <b>…</b> emphasis
// markers rendered by CaseExplorer (never via innerHTML).

export const DUTY_LABELS = {
  "3WM": "Three-way match",
  DUP: "Duplicate payment",
  STL: "Settlement recon.",
  LP: "Loss prevention",
  COGS: "COGS leakage",
  CS: "Cash over/short",
} as const;

export type DutyShort = keyof typeof DUTY_LABELS;
export type DutyFilter = DutyShort | "ALL";
export type CaseStatus = "flagged" | "cleared";
export type TraceKind = "read" | "tool" | "decide";

export interface PennyCase {
  id: string;
  dutyShort: DutyShort;
  status: CaseStatus;
  title: string;
  store: string;
  amount: number;
  evidence: ReadonlyArray<readonly [string, string]>;
  trace: ReadonlyArray<readonly [TraceKind, string]>;
  narrative: string;
  eff: { tools: number; calls: number; cost: number; secs: number };
}

export const DUTY_ORDER: readonly DutyShort[] = ["3WM", "DUP", "STL", "LP", "COGS", "CS"];

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function fmtUSD(n: number): string {
  return usd.format(n);
}

export const CASES: readonly PennyCase[] = [
  {
    id: "3WM-1",
    dutyShort: "3WM",
    status: "flagged",
    title: "Bun count billed above what was received",
    store: "Store #0902 · Denver, CO",
    amount: 109.2,
    evidence: [
      ["Purchase Order", "PO-55890 · 40 cases hamburger buns @ $18.20/case"],
      ["Goods Receipt", "GR-90211 · 40 cases received, signed 06/11"],
      ["Invoice", "INV-TX-4471 · billed 46 cases, $1,127.20 total"],
      ["Mismatch", "6 cases billed but never received — $109.20 overbilled"],
    ],
    trace: [
      ["read", "read_purchase_order(PO-55890)"],
      ["read", "read_goods_receipt(GR-90211)"],
      ["read", "read_invoice(INV-TX-4471)"],
      ["tool", "compare_quantities(ordered=40, received=40, billed=46) → mismatch: 6"],
      ["tool", "compute_line_variance(6 × $18.20) → $109.20"],
      ["decide", "receipt agrees with PO, invoice doesn't → corroborated → FLAG"],
    ],
    narrative:
      "The receiving log and the invoice don't agree, and the gap lines up exactly on quantity. <b>Flagged</b> because two independent records — what the store signed for, and what the vendor billed — disagree by a clean, round number.",
    eff: { tools: 2, calls: 5, cost: 0.06, secs: 8 },
  },
  {
    id: "DUP-1",
    dutyShort: "DUP",
    status: "flagged",
    title: "Same invoice paid twice, nine days apart",
    store: "Store #1188 · Austin, TX",
    amount: 4210.0,
    evidence: [
      ["Vendor", "Titan Beef Co."],
      ["Payment A", "ACH · 06/14 · Invoice #TB-88231 · $4,210.00"],
      ["Payment B", "ACH · 06/23 · Invoice #TB-88231A · $4,210.00"],
      ["Match", "Same PO #55231, same line items, same delivery date"],
    ],
    trace: [
      ["read", 'read_payments(vendor="Titan Beef Co.")'],
      ["tool", "fuzzy_match_invoice_numbers(TB-88231, TB-88231A) → similarity 0.96"],
      ["read", "read_purchase_order(PO-55231) ×2"],
      ["tool", "compare_line_items(payment A, payment B) → identical"],
      ["decide", "same PO + items + delivery, near-identical invoice # → corroborated → FLAG"],
    ],
    narrative:
      "Two payments, nine days apart, same amount, same PO, same delivery — the only difference is a trailing letter on the invoice number. <b>Flagged</b> because the underlying PO and delivery record are identical, not just the amount.",
    eff: { tools: 2, calls: 5, cost: 0.05, secs: 7 },
  },
  {
    id: "DUP-2",
    dutyShort: "DUP",
    status: "cleared",
    title: "Two same-amount invoices — but genuinely two deliveries",
    store: "Store #0447 · Tulsa, OK",
    amount: 612.4,
    evidence: [
      ["Vendor", "Sunrise Produce"],
      ["Invoice A", "06/02 · $612.40 · PO-71190 (partial delivery, 60%)"],
      ["Invoice B", "06/05 · $612.40 · PO-71190-B (remainder delivery)"],
      ["Match", "Same PO family, sequential delivery numbers, different receiving docs"],
    ],
    trace: [
      ["read", 'read_payments(vendor="Sunrise Produce")'],
      ["tool", "fuzzy_match_invoice_numbers → same-amount candidate found"],
      ["read", "read_purchase_order(PO-71190), read_purchase_order(PO-71190-B)"],
      ["read", "read_goods_receipt ×2 → two distinct signed receiving docs"],
      ["decide", "different receipts, split delivery → not corroborated → CLEAR"],
    ],
    narrative:
      "Same vendor, same amount, three days apart — this is what a naive duplicate check flags on sight. But the PO was split into two deliveries, each with its own signed receiving document. <b>Correctly cleared</b> — the same signal that meant fraud in DUP-1 means nothing here.",
    eff: { tools: 1, calls: 5, cost: 0.05, secs: 7 },
  },
  {
    id: "STL-1",
    dutyShort: "STL",
    status: "cleared",
    title: "Card sales vs. bank deposit gap — explained by processor fees",
    store: "Store #1345 · Sacramento, CA",
    amount: 70.05,
    evidence: [
      ["Register card total", "$8,220.14"],
      ["Bank deposit received", "$8,150.09"],
      ["Gap", "$70.05 (0.85% of card total)"],
      ["Match", "Equals this store's contracted processor interchange rate exactly"],
    ],
    trace: [
      ["read", "read_register_totals(store=1345)"],
      ["read", "read_bank_deposit(store=1345)"],
      ["tool", "compute_variance($8220.14, $8150.09) → $70.05"],
      ["read", "read_processor_contract_rate(store=1345) → 0.85%"],
      ["tool", "compute_expected_fee($8220.14 × 0.0085) → $69.87 ≈ $70.05"],
      ["decide", "gap explained by contracted fee → CLEAR"],
    ],
    narrative:
      "$70 missing between the till and the bank looks like a shortfall on its face. It's exactly this store's standard processing fee, to the cent. <b>Correctly cleared</b> — flagging this daily would be noise a controller learns to ignore.",
    eff: { tools: 2, calls: 6, cost: 0.06, secs: 8 },
  },
  {
    id: "LP-1",
    dutyShort: "LP",
    status: "flagged",
    title: "No-sale drawer opens spiking on one shift pattern",
    store: "Store #0733 · Newark, NJ",
    amount: 860.0,
    evidence: [
      ["Till", "Register 2, evening shift (2–6 PM)"],
      ["No-sale opens", "14 in 2 weeks vs. store median of 2/week"],
      ["Correlated signal", "Cash variance dips on the same shifts, same register"],
      ["Control check", "Same cashier's morning shifts show normal patterns"],
    ],
    trace: [
      ["read", "read_no_sale_events(store=0733, register=2)"],
      ["tool", "compute_frequency_zscore(14 vs median 2/week) → high outlier"],
      ["read", "read_cash_variance(store=0733, register=2, same shifts)"],
      ["tool", "correlate(no_sale_spikes, cash_variance) → correlated"],
      ["read", "read_same_cashier_other_shifts → normal"],
      ["decide", "correlated + isolated to one shift window → corroborated → FLAG for review"],
    ],
    narrative:
      "One signal alone isn't enough to act on. It's the correlation that matters: same register, same shift window, cash variance moving with it, while the same person's other shifts look normal. <b>Flagged for review</b>, not accusation.",
    eff: { tools: 2, calls: 6, cost: 0.07, secs: 9 },
  },
  {
    id: "COGS-1",
    dutyShort: "COGS",
    status: "flagged",
    title: "One store using 34% more bun per burger than recipe",
    store: "Store #1590 · Columbus, OH",
    amount: 1340.0,
    evidence: [
      ["Recipe spec", "1.0 bun per burger sold"],
      ["This store, 3-week avg", "1.34 buns used per burger sold"],
      ["Sibling stores (6, same region)", "1.02 buns per burger (in line with spec)"],
      ["Price check", "Bun unit cost unchanged in this period"],
    ],
    trace: [
      ["read", 'read_recipe_spec(item="burger", ingredient="bun")'],
      ["read", "read_usage_data(store=1590, weeks=3)"],
      ["tool", "compute_usage_ratio(actual, spec) → 1.34×"],
      ["read", "read_sibling_store_usage(region) → 1.02× avg"],
      ["read", 'read_price_history(ingredient="bun") → unchanged'],
      ["decide", "isolated to one store, price flat → corroborated → FLAG"],
    ],
    narrative:
      "Not a price story — unit cost hasn't moved, and every sibling store tracks right at spec. One store, three weeks running, using a third more bun than every burger sold should require. <b>Flagged</b> as portioning or waste.",
    eff: { tools: 1, calls: 6, cost: 0.06, secs: 8 },
  },
  {
    id: "COGS-2",
    dutyShort: "COGS",
    status: "cleared",
    title: "Beef cost jump — matches a published vendor price increase",
    store: "Region-wide (11 stores)",
    amount: 0,
    evidence: [
      ["Beef cost, prior month", "$4.10/lb"],
      ["Beef cost, this month", "$4.55/lb"],
      ["Vendor price sheet", "Published increase to $4.55/lb, effective same week, all regions"],
      ["Portioning check", "Usage-per-burger unchanged across all 11 stores"],
    ],
    trace: [
      ["read", 'read_price_history(ingredient="beef")'],
      ["tool", "compute_cost_delta(prior, current) → +11%"],
      ["read", "read_vendor_price_sheet → published increase, same effective date"],
      ["read", "read_usage_ratio(all 11 stores) → unchanged"],
      ["decide", "explained by market price move, portioning unchanged → CLEAR"],
    ],
    narrative:
      "An 11% jump in cost per pound looks alarming until you check where it came from — the vendor's own published price sheet, the exact same week, every store in the region. <b>Correctly cleared</b> — a real cost move, not a leak.",
    eff: { tools: 1, calls: 4, cost: 0.04, secs: 6 },
  },
  {
    id: "CS-1",
    dutyShort: "CS",
    status: "flagged",
    title: "One till persistently short, same window, 11 days straight",
    store: "Store #0261 · Tempe, AZ",
    amount: 198.0,
    evidence: [
      ["Till", "Register 3"],
      ["Pattern", "$18 average shortfall/day, 11 consecutive business days"],
      ["Fee check", "No matching processor fee or refund explains the gap"],
      ["Other tills, same store", "Registers 1 and 2 balance normally over the same period"],
    ],
    trace: [
      ["read", "read_till_history(store=0261, register=3, days=14)"],
      ["tool", "compute_daily_variance → -$18 avg, 11 consecutive days"],
      ["read", "read_processor_fees(store=0261) → none matching"],
      ["read", "read_other_registers(store=0261) → balanced"],
      ["decide", "isolated, persistent, unexplained → corroborated → FLAG"],
    ],
    narrative:
      "A single short day is normal. Eleven days straight, on one specific till, while the other two registers balance fine, is a different thing. <b>Flagged</b> — small enough to hide in a monthly report, persistent enough to be real.",
    eff: { tools: 1, calls: 4, cost: 0.04, secs: 6 },
  },
];
