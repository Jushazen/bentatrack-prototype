// Shared prototype code: saving and loading the data, who is logged in, the app frame (sidebar,
// top bar, phone tabs), theme, toasts, and small helpers. Each page includes data.js, then this
// file, then its own script.

(function () {
  // ---------- Storage (who is logged in, theme). Fails quietly in private windows. ----------
  function readStore(store, key) {
    try {
      return window[store].getItem(key);
    } catch {
      return null;
    }
  }
  function writeStore(store, key, value) {
    try {
      if (value === null) window[store].removeItem(key);
      else window[store].setItem(key, value);
    } catch {
      /* Storage blocked: the prototype still works, it just forgets. */
    }
  }

  // ---------- Theme (set before the page draws, so there is no flash) ----------
  function isDark() {
    const saved = readStore("localStorage", "bt-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function applyTheme() {
    document.documentElement.dataset.theme = isDark() ? "dark" : "light";
  }
  applyTheme();

  // ---------- Formatting ----------
  const pesoFormat = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
  const peso = (centavos) => pesoFormat.format(centavos / 100);

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function plural(count, one, many) {
    return `${count.toLocaleString("en-PH")} ${count === 1 ? one : many || one + "s"}`;
  }

  /** Date for a sample record: `day` days ago at `time` ("16:42"). */
  function dateOf(day, time) {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    d.setDate(d.getDate() - day);
    return d;
  }

  const timeFormat = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" });
  const dayFormat = new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric" });
  const longDayFormat = new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  function when(day, time) {
    const d = dateOf(day, time);
    const label = day === 0 ? "Today" : day === 1 ? "Yesterday" : dayFormat.format(d);
    return `${label}, ${timeFormat.format(d)}`;
  }

  // ---------- Saved data ----------
  // All the data lives in the arrays from data.js. The first time, they hold the sample data;
  // after any change, save() stores them in localStorage and every page loads them from there.
  const DATA_KEY = "bt-data-v1";
  const TABLES = { CATEGORIES, SUPPLIERS, USERS, PRODUCTS, SALES, REFUNDS, MANUAL_CHANGES };

  /** Whole days between a date and today (0 = today). */
  function daysAgo(date) {
    const start = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((start(new Date()) - start(date)) / 86400000);
  }

  /**
   * Gives every sale, refund and stock change a real date (`at`), and works out `day` (days ago)
   * and `time` from it. Sample records start as "today at 4:42 PM"; once saved they keep that
   * date, so tomorrow they show as yesterday, like in the real system.
   */
  function normalize() {
    fitTodaysSampleTimes();
    for (const list of [SALES, REFUNDS, MANUAL_CHANGES])
      for (const r of list) {
        if (!r.at) r.at = dateOf(r.day, r.time).toISOString();
        const d = new Date(r.at);
        r.day = daysAgo(d);
        r.time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    SALES.sort((a, b) => new Date(b.at) - new Date(a.at));
    // A sale keeps the price it was sold at, even if the product's price changes later.
    for (const sale of SALES)
      for (const item of sale.items)
        if (item.unitPrice == null) item.unitPrice = PRODUCTS.find((p) => p.id === item.productId).price;
  }

  /**
   * Today's sample records have fixed times (up to 4:42 PM). Opened earlier in the day, they
   * would be in the future, and a new sale wouldn't show as the newest. So the first time, spread
   * them between 8:00 AM and 15 minutes ago, keeping their order.
   */
  function fitTodaysSampleTimes() {
    const records = [SALES, REFUNDS, MANUAL_CHANGES].flat().filter((r) => !r.at && r.day === 0);
    if (!records.length) return;
    const minutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    const now = new Date();
    const latestAllowed = now.getHours() * 60 + now.getMinutes() - 15;
    const open = 8 * 60;
    const latest = Math.max(...records.map((r) => minutes(r.time)));
    if (latest <= latestAllowed || latestAllowed <= open) return;
    for (const r of records) {
      const m = Math.round(open + ((minutes(r.time) - open) * (latestAllowed - open)) / (latest - open));
      r.time = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    }
  }

  function loadData() {
    if (new URLSearchParams(window.location.search).has("reset")) {
      writeStore("localStorage", DATA_KEY, null);
      writeStore("sessionStorage", "bt-user", null);
    }
    const raw = readStore("localStorage", DATA_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        for (const [name, list] of Object.entries(TABLES))
          if (Array.isArray(saved[name])) list.splice(0, list.length, ...saved[name]);
      } catch {
        /* Damaged saved data: start again from the sample data. */
      }
    }
    normalize();
  }

  /** Saves every change. Call it after changing any of the data arrays. */
  function save() {
    normalize();
    writeStore("localStorage", DATA_KEY, JSON.stringify(TABLES));
  }

  /** Next id for a new record, e.g. nextId(PRODUCTS, "p") → "p21". */
  function nextId(list, prefix) {
    const numbers = list.map((r) => Number(String(r.id).replace(/\D/g, "")) || 0);
    return prefix + String(Math.max(0, ...numbers) + 1).padStart(prefix ? 2 : 4, "0");
  }

  loadData();

  // ---------- Icons (simplified Lucide shapes, drawn inline so the prototype works offline) ----------
  const ICONS = {
    dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>',
    package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="m7.5 4.27 9 5.15"/>',
    packagePlus: '<path d="M16 16h6"/><path d="M19 13v6"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><path d="M3.29 7 12 12l8.71-5"/><path d="M12 22V12"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    tags: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    key: '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    login: '<path d="m10 17 5-5-5-5"/><path d="M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
    logout: '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
    archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
    history: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  };

  function icon(name, extra = "") {
    return `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  // ---------- Who is logged in ----------
  const STAFF_CAPABILITIES = new Set([
    "sales.create",
    "sales.read",
    "refunds.create",
    "products.read",
    "products.create",
    "products.update",
    "inventory.restock",
    "inventory.history",
  ]);

  /** The logged-in account, or undefined. A deactivated account counts as logged out. */
  function currentUser() {
    const id = readStore("sessionStorage", "bt-user");
    return USERS.find((u) => u.id === id && u.active);
  }
  function role() {
    return currentUser()?.role;
  }
  function isLoggedIn() {
    return Boolean(currentUser());
  }
  function logIn(userId) {
    writeStore("sessionStorage", "bt-user", userId);
  }
  function can(capability) {
    return role() === "OWNER" || (role() === "STAFF" && STAFF_CAPABILITIES.has(capability));
  }

  // ---------- Data helpers ----------
  const product = (id) => PRODUCTS.find((p) => p.id === id);
  /** Products that can be sold. Archived (discontinued) ones are left out of selling and stock figures. */
  const activeProducts = () => PRODUCTS.filter((p) => !p.archived);
  const userName = (id) => (USERS.find((u) => u.id === id) || { name: "Unknown" }).name;
  const supplierName = (id) => (SUPPLIERS.find((s) => s.id === id) || { name: "No supplier" }).name;
  const PAYMENT_LABEL = { CASH: "Cash", GCASH: "GCash" };

  function status(p) {
    if (p.stock <= 0) return { key: "out", label: "Out of Stock", tone: "danger" };
    if (p.stock <= p.threshold) return { key: "low", label: "Low Stock", tone: "warn" };
    return { key: "active", label: "Active", tone: "ok" };
  }
  function statusBadge(p) {
    const s = status(p);
    return `<span class="badge ${s.tone}">${s.label}</span>`;
  }
  function lowStock() {
    return activeProducts().filter((p) => status(p).key !== "active").sort((a, b) => a.stock - b.stock);
  }

  function discountAmount(subtotal, discount) {
    if (!discount) return 0;
    if (discount.type === "PERCENT") return Math.round((subtotal * discount.value) / 100);
    return Math.min(discount.value, subtotal);
  }

  /** Totals for a sale, with any refunds against it. */
  function saleTotals(sale) {
    const lines = sale.items.map((item) => ({ ...item, product: product(item.productId), amount: item.unitPrice * item.qty }));
    const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
    const discount = discountAmount(subtotal, sale.discount);
    const total = subtotal - discount;
    const refunds = REFUNDS.filter((r) => r.saleId === sale.id);
    const refundedQty = {};
    for (const r of refunds) for (const i of r.items) refundedQty[i.productId] = (refundedQty[i.productId] || 0) + i.qty;
    // A refunded unit gives back its share of what was actually paid (after the discount).
    const refunded = lines.reduce(
      (sum, l) => sum + Math.round(((refundedQty[l.productId] || 0) * l.unitPrice * total) / (subtotal || 1)),
      0,
    );
    const units = lines.reduce((sum, l) => sum + l.qty, 0);
    return { lines, subtotal, discount, total, refunded, refundedQty, units, refunds };
  }

  /** Every stock change, newest first, with the stock left after each one. */
  function inventoryLog() {
    const events = [];
    for (const sale of SALES)
      for (const item of sale.items)
        events.push({ type: "SALE", productId: item.productId, delta: -item.qty, at: sale.at, day: sale.day, time: sale.time, by: sale.by, note: `Sale #${sale.id}`, link: `sale.html?id=${sale.id}` });
    for (const refund of REFUNDS)
      for (const item of refund.items)
        events.push({ type: "REFUND", productId: item.productId, delta: refund.returnToStock ? item.qty : 0, at: refund.at, day: refund.day, time: refund.time, by: refund.by, note: `Refund on sale #${refund.saleId} · ${refund.reason}`, link: `sale.html?id=${refund.saleId}` });
    for (const change of MANUAL_CHANGES) events.push({ ...change });

    // Exact saved times (to the millisecond), so changes made in the same minute stay in order.
    events.sort((a, b) => new Date(b.at) - new Date(a.at));
    const running = Object.fromEntries(PRODUCTS.map((p) => [p.id, p.stock]));
    for (const e of events) {
      const p = e.productId ? product(e.productId) : null;
      e.productName = p ? p.name : e.productName;
      e.productCode = p ? p.code : e.productCode;
      if (p) {
        e.stockAfter = running[p.id];
        running[p.id] -= e.delta;
      }
    }
    return events;
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  // ---------- Toasts ----------
  function toast(message, tone = "ok") {
    let box = document.getElementById("toasts");
    if (!box) {
      box = document.createElement("div");
      box.id = "toasts";
      box.className = "toasts";
      box.setAttribute("role", "status");
      document.body.appendChild(box);
    }
    const el = document.createElement("div");
    el.className = `toast ${tone}`;
    el.innerHTML = `${icon(tone === "ok" ? "check" : tone === "warn" ? "alert" : "alert")}<span>${esc(message)}</span>`;
    box.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }

  // ---------- Navigation ----------
  const NAV_GROUPS = [
    {
      label: "Sell",
      items: [
        { key: "dashboard", href: "dashboard.html", label: "Dashboard", short: "Home", icon: "dashboard", capability: "sales.read" },
        { key: "checkout", href: "checkout.html", label: "Checkout", icon: "cart", capability: "sales.create" },
        { key: "sales", href: "sales.html", label: "Sales", icon: "receipt", capability: "sales.read" },
      ],
    },
    {
      label: "Stock",
      items: [
        { key: "products", href: "products.html", label: "Products", icon: "package", capability: "products.read", lowStockBadge: true },
        { key: "inventory-history", href: "inventory-history.html", label: "Inventory history", short: "History", icon: "clipboard", capability: "inventory.history" },
      ],
    },
    {
      label: "Owner",
      items: [
        { key: "reports", href: "reports.html", label: "Reports", icon: "chart", capability: "reports.read" },
        { key: "categories", href: "categories.html", label: "Categories", icon: "tags", capability: "categories.manage" },
        { key: "suppliers", href: "suppliers.html", label: "Suppliers", icon: "truck", capability: "suppliers.manage" },
        { key: "users", href: "users.html", label: "Users", icon: "users", capability: "users.manage" },
        { key: "account", href: "account.html", label: "My account", short: "Account", icon: "key", capability: "account.password" },
      ],
    },
  ];
  const PHONE_TABS = ["dashboard", "checkout", "products"];

  function navGroups() {
    return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(i.capability)) })).filter((g) => g.items.length);
  }

  function navHtml(active) {
    const count = lowStock().length;
    return navGroups()
      .map(
        (g) => `<div><p class="nav-group-label">${g.label}</p>${g.items
          .map(
            (i) => `<a class="nav-link" href="${i.href}" ${i.key === active ? 'aria-current="page"' : ""}>${icon(i.icon)}<span>${i.label}</span>${i.lowStockBadge && count ? `<span class="count-badge" aria-label="${count} low on stock">${count}</span>` : ""}</a>`,
          )
          .join("")}</div>`,
      )
      .join("");
  }

  function accountHtml() {
    const user = currentUser();
    return `<div class="account-block">
      <p class="who"><strong>${esc(user.name)}</strong><span class="muted"> · ${user.role === "OWNER" ? "Owner" : "Staff"}</span></p>
      <button type="button" class="btn btn-ghost" data-action="theme">${isDark() ? icon("sun") + "<span>Light theme</span>" : icon("moon") + "<span>Dark theme</span>"}</button>
      <button type="button" class="btn btn-ghost" data-action="logout">${icon("logout")}<span>Log out</span></button>
    </div>`;
  }

  function wordmark(compact) {
    return `<span class="wordmark ${compact ? "compact" : ""}"><span class="name">Estetika</span><span class="sub">BentaTrack</span></span>`;
  }

  function labelFor(active) {
    for (const g of NAV_GROUPS) for (const i of g.items) if (i.key === active) return i.label;
    return "BentaTrack";
  }

  function noAccessHtml() {
    return `<div class="page narrow"><div class="card stack">
      <h1>No access</h1>
      <p class="muted">This page is for the owner. Staff accounts can sell, refund, restock, and add or edit products.</p>
      <div class="btn-row"><a class="btn btn-primary" href="dashboard.html">${icon("dashboard", "icon-sm")}<span>Go to dashboard</span></a></div>
    </div></div>`;
  }

  /**
   * Draws the app frame around a page.
   * active: nav key to highlight. capability: needed to see the page (staff get "No access").
   * render(): returns the page HTML. after(): wires up the page once it is on screen.
   */
  function mount({ active, capability, title, render, after }) {
    if (!isLoggedIn()) {
      window.location.replace("index.html");
      return;
    }
    const allowed = !capability || can(capability);
    document.title = `${title || labelFor(active)} · BentaTrack prototype`;
    const items = navGroups().flatMap((g) => g.items);
    const tabs = PHONE_TABS.map((k) => items.find((i) => i.key === k)).filter(Boolean);
    const moreActive = !PHONE_TABS.includes(active);
    const count = lowStock().length;

    document.body.innerHTML = `
      <div class="shell">
        <aside class="sidebar">
          <a href="dashboard.html" aria-label="Estetika BentaTrack, go to dashboard">${wordmark(false)}</a>
          <nav aria-label="Main">${navHtml(active)}</nav>
          ${accountHtml()}
        </aside>
        <div class="main-col">
          <header class="topbar">
            <a class="wordmark-link" href="dashboard.html" aria-label="Estetika, go to dashboard">${wordmark(true)}</a>
            <p class="page-label">${esc(labelFor(active))}</p>
            <span class="status">${icon("wifi", "icon-sm")}<span>Online</span></span>
          </header>
          <main class="content" id="page">${allowed ? render() : noAccessHtml()}</main>
        </div>
        <nav class="tabs" aria-label="Main">
          ${tabs
            .map(
              (t) => `<a class="tab" href="${t.href}" ${t.key === active ? 'aria-current="page"' : ""}><span class="tab-icon">${icon(t.icon)}${t.lowStockBadge && count ? `<span class="tab-count">${count}</span>` : ""}</span><span>${t.short || t.label}</span></a>`,
            )
            .join("")}
          <button type="button" class="tab" id="open-more" ${moreActive ? 'aria-current="page"' : ""}>${icon("more")}<span>More</span></button>
        </nav>
        <dialog class="sheet" id="more-sheet" aria-label="More pages">
          <div class="sheet-head"><p><strong>More</strong></p><button type="button" class="btn btn-ghost" id="close-more">${icon("x")}<span>Close</span></button></div>
          <nav class="sheet-body" aria-label="All pages">${navHtml(active)}${accountHtml()}</nav>
        </dialog>
      </div>`;

    wireShell();
    if (allowed && after) after();
  }

  function wireShell() {
    const sheet = document.getElementById("more-sheet");
    document.getElementById("open-more")?.addEventListener("click", () => sheet.showModal());
    document.getElementById("close-more")?.addEventListener("click", () => sheet.close());
    sheet?.addEventListener("click", (e) => {
      if (e.target === sheet) sheet.close();
    });
    document.querySelectorAll('[data-action="theme"]').forEach((b) =>
      b.addEventListener("click", () => {
        writeStore("localStorage", "bt-theme", isDark() ? "light" : "dark");
        window.location.reload();
      }),
    );
    document.querySelectorAll('[data-action="logout"]').forEach((b) =>
      b.addEventListener("click", () => {
        logIn(null);
        window.location.href = "index.html";
      }),
    );
  }

  window.App = {
    esc,
    peso,
    plural,
    icon,
    when,
    dateOf,
    timeFormat,
    longDayFormat,
    role,
    logIn,
    can,
    currentUser,
    save,
    nextId,
    daysAgo,
    product,
    activeProducts,
    userName,
    supplierName,
    PAYMENT_LABEL,
    status,
    statusBadge,
    lowStock,
    discountAmount,
    saleTotals,
    inventoryLog,
    params,
    toast,
    wordmark,
    mount,
    applyTheme,
  };
})();
