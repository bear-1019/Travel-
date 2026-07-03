import { hasSupabaseConfig, getSupabaseClient } from "./supabase-client.js";

const STORAGE_KEY = "tripboard_state_v1";
const APP_VERSION = "1.1.0-google-sheets";
const GOOGLE_SYNC_SETTINGS_KEY = "tripboard_google_sync_v1";

function hasGoogleSyncConfig() {
  const url = window.TRIPBOARD_GOOGLE_SCRIPT_URL || "";
  return Boolean(url && !url.includes("PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"));
}

function googleScriptUrl() {
  return window.TRIPBOARD_GOOGLE_SCRIPT_URL || "";
}

const navItems = [
  { key: "dashboard", label: "首頁", emoji: "🏠" },
  { key: "itinerary", label: "行程", emoji: "🗓️" },
  { key: "transport", label: "交通", emoji: "🚇" },
  { key: "flights", label: "航班", emoji: "✈️" },
  { key: "stays", label: "住宿", emoji: "🏨" },
  { key: "packing", label: "行李", emoji: "🧳" },
  { key: "documents", label: "文件", emoji: "🎟️" },
  { key: "budget", label: "預算", emoji: "💳" },
  { key: "todos", label: "待辦", emoji: "✅" },
  { key: "places", label: "地點庫", emoji: "📍" },
  { key: "emergency", label: "緊急資訊", emoji: "🆘" },
  { key: "settings", label: "同步設定", emoji: "⚙️" }
];

const mobileNavItems = ["dashboard", "itinerary", "transport", "documents", "settings"];

const collections = [
  "trips", "flights", "stays", "itineraryItems", "transportSegments", "packingItems",
  "documents", "expenses", "todos", "places", "emergencyInfos"
];

let state = loadState();
let ui = {
  view: "dashboard",
  filterDate: "all",
  session: null,
  syncStatus: "local",
  cloudUpdatedAt: null
};

const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");

init();

async function init() {
  if (!state.trips.length) {
    state = createSeedState();
    saveState(false);
  }
  registerServiceWorker();
  await initSupabaseSession();
  render();
}

function uid(prefix = "id") {
  if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "未設定";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", weekday: "short" }).format(date);
}

function formatDateLong(value) {
  if (!value) return "未設定";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function currency(amount, currencyCode = "TWD") {
  const n = Number(amount || 0);
  const currencyMap = { TWD: "NT$", EUR: "€", JPY: "¥", USD: "US$", GBP: "£", KRW: "₩" };
  const prefix = currencyMap[currencyCode] || `${currencyCode} `;
  return `${prefix}${new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(n)}`;
}

function parseNumber(value) {
  const n = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(n) ? n : 0;
}

function daysBetween(start, end) {
  if (!start || !end) return [];
  const days = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return [];
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function activeTrip() {
  return state.trips.find((trip) => trip.id === state.activeTripId) || state.trips[0];
}

function byTrip(collection) {
  const trip = activeTrip();
  if (!trip) return [];
  return state[collection].filter((item) => item.tripId === trip.id);
}

function sortByDateTime(items, dateKey = "date", timeKey = "startTime") {
  return [...items].sort((a, b) => `${a[dateKey] || "9999-99-99"} ${a[timeKey] || "99:99"}`.localeCompare(`${b[dateKey] || "9999-99-99"} ${b[timeKey] || "99:99"}`));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (error) {
    console.error(error);
    return createEmptyState();
  }
}

function normalizeState(input) {
  const base = createEmptyState();
  const next = { ...base, ...input };
  for (const key of collections) {
    if (!Array.isArray(next[key])) next[key] = [];
  }
  if (!next.activeTripId && next.trips.length) next.activeTripId = next.trips[0].id;
  return next;
}

function createEmptyState() {
  return {
    version: APP_VERSION,
    activeTripId: null,
    updatedAt: new Date().toISOString(),
    trips: [],
    flights: [],
    stays: [],
    itineraryItems: [],
    transportSegments: [],
    packingItems: [],
    documents: [],
    expenses: [],
    todos: [],
    places: [],
    emergencyInfos: []
  };
}

function createSeedState() {
  const tripId = uid("trip");
  return normalizeState({
    version: APP_VERSION,
    activeTripId: tripId,
    updatedAt: new Date().toISOString(),
    trips: [{
      id: tripId,
      name: "巴黎跨年 2026",
      destination: "法國｜巴黎、東法",
      startDate: "2026-12-23",
      endDate: "2027-01-01",
      status: "規劃中",
      budget: 80000,
      currency: "TWD",
      travelers: "2 人",
      note: "這是一筆範例資料。你可以直接編輯、刪除，或建立自己的旅程。"
    }],
    flights: [{
      id: uid("flight"), tripId, type: "去程", airline: "Emirates", flightNumber: "EK367 / EK073",
      bookingRef: "待填", fromAirport: "TPE 台北桃園", toAirport: "CDG 巴黎戴高樂",
      departure: "2026-12-23T00:30", arrival: "2026-12-23T12:25", terminal: "待確認", gate: "待確認",
      seat: "待選位", cabin: "Economy", checkedBaggage: "30kg", carryOn: "7kg", price: 40000, notes: "確認轉機時間、線上報到與行李規定。"
    }],
    stays: [{
      id: uid("stay"), tripId, name: "Hotel Eiffel Seine", type: "飯店", checkInDate: "2026-12-23", checkOutDate: "2026-12-24",
      address: "3 Boulevard de Grenelle, Paris", mapUrl: "", checkInTime: "15:00", checkOutTime: "11:00",
      platform: "Booking.com", bookingNumber: "待填", roomType: "Balcony Room", price: 15000,
      paidStatus: "待付款", cancellationDeadline: "2026-12-10", luggageStorage: "可詢問", contact: "待填", notes: "希望有陽台或鐵塔景。"
    }],
    itineraryItems: [
      { id: uid("item"), tripId, date: "2026-12-23", startTime: "12:25", endTime: "13:30", type: "機場", title: "抵達巴黎 CDG", placeName: "Charles de Gaulle Airport", address: "CDG Airport", mapUrl: "", website: "", openingHours: "", lastEntry: "", ticketRequired: "否", ticketStatus: "不需", ticketPrice: 0, ticketLink: "", reservationNumber: "", budget: 0, status: "已排入", priority: "必去", weatherType: "室內", notes: "入境、領行李、確認進市區交通。" },
      { id: uid("item"), tripId, date: "2026-12-24", startTime: "10:00", endTime: "13:00", type: "景點", title: "羅浮宮", placeName: "Musée du Louvre", address: "Rue de Rivoli, Paris", mapUrl: "", website: "", openingHours: "09:00-18:00", lastEntry: "17:00", ticketRequired: "是", ticketStatus: "待購買", ticketPrice: 22, ticketLink: "", reservationNumber: "", budget: 22, status: "想去", priority: "必去", weatherType: "室內", notes: "建議提早 15 分鐘到，先確認閉館日與預約時段。" }
    ],
    transportSegments: [{
      id: uid("transport"), tripId, date: "2026-12-24", startTime: "09:20", fromName: "Hotel Eiffel Seine", toName: "羅浮宮",
      method: "地鐵", duration: "25 分鐘", cost: 2.15, currency: "EUR", route: "Metro Line 6 → Line 1",
      departStation: "Bir-Hakeim", arrivalStation: "Palais Royal - Musée du Louvre", transferInfo: "Charles de Gaulle - Étoile 轉乘",
      luggageFriendly: "中", bookingStatus: "不需預約", ticketInfo: "單程票 / Navigo", mapUrl: "", backup: "Uber 約 €18", notes: "尖峰時段人多，建議提早出門。"
    }],
    packingItems: [
      { id: uid("pack"), tripId, name: "護照", category: "文件", quantity: 1, location: "隨身包", status: "已準備", required: true, responsible: "自己", returnCheck: true, notes: "效期確認。" },
      { id: uid("pack"), tripId, name: "歐規轉接頭", category: "電子用品", quantity: 1, location: "登機箱", status: "未準備", required: true, responsible: "自己", returnCheck: true, notes: "法國使用 Type C/E。" }
    ],
    documents: [{
      id: uid("doc"), tripId, name: "羅浮宮門票", type: "門票", relatedDate: "2026-12-24", relatedTo: "羅浮宮", bookingNumber: "待購買",
      amount: 22, currency: "EUR", attachmentUrl: "", notes: "購票後貼上 QR Code 圖片連結或 PDF 連結。"
    }],
    expenses: [{ id: uid("exp"), tripId, date: "2026-12-23", category: "機票", title: "台北巴黎來回機票", amount: 40000, currency: "TWD", paidBy: "自己", splitWith: "自己", status: "已付款", notes: "先填範例，可自行刪除。" }],
    todos: [{ id: uid("todo"), tripId, title: "確認 CDG 到巴黎市區交通", dueDate: "2026-12-01", priority: "高", status: "未完成", owner: "自己", relatedTo: "抵達巴黎", notes: "比較 RER、巴士、Uber。" }],
    places: [{ id: uid("place"), tripId, name: "Café de Flore", type: "咖啡廳", city: "Paris", address: "172 Bd Saint-Germain", mapUrl: "", status: "想去", tags: "經典咖啡廳,拍照", notes: "可排早餐或下午茶。" }],
    emergencyInfos: [{ id: uid("emg"), tripId, title: "歐洲緊急電話", type: "電話", value: "112", notes: "歐盟通用緊急電話。" }]
  });
}

function saveState(show = true) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (show) toast("已儲存在這台裝置");
}

function render() {
  const trip = activeTrip();
  app.innerHTML = `
    <div class="app-shell">
      ${renderSidebar(trip)}
      <main class="main">
        ${renderView(trip)}
      </main>
      ${renderMobileTabs()}
    </div>
  `;
  bindGlobalEvents();
}

function renderSidebar(trip) {
  const tripOptions = state.trips.map((item) => `<option value="${item.id}" ${item.id === state.activeTripId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
  const googleConfigured = hasGoogleSyncConfig();
  const syncDot = googleConfigured ? "online" : ui.session ? "online" : hasSupabaseConfig() ? "warn" : "";
  const syncText = googleConfigured ? "Google Sheets 同步" : ui.session ? "雲端已登入" : hasSupabaseConfig() ? "可登入同步" : "本機模式";
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">TB</div>
        <div>
          <div class="brand-title">TripBoard</div>
          <div class="brand-subtitle">旅行總管 PWA</div>
        </div>
      </div>
      <div class="trip-switcher">
        <div class="trip-label">目前旅程</div>
        <select class="trip-select" data-action="switch-trip">${tripOptions}</select>
      </div>
      <nav class="nav">
        ${navItems.map((item) => `
          <button type="button" data-view="${item.key}" class="${ui.view === item.key ? "active" : ""}">
            <span class="nav-emoji">${item.emoji}</span><span class="nav-label">${item.label}</span>
          </button>
        `).join("")}
      </nav>
      <div class="sidebar-footer">
        <div class="sync-pill"><span class="dot ${syncDot}"></span>${syncText}</div>
        <button class="btn small" data-action="new-trip">＋ 新增旅程</button>
      </div>
    </aside>
  `;
}

function renderMobileTabs() {
  return `
    <nav class="mobile-tabs">
      ${navItems.filter((item) => mobileNavItems.includes(item.key)).map((item) => `
        <button type="button" data-view="${item.key}" class="${ui.view === item.key ? "active" : ""}">
          <span>${item.emoji}</span><span>${item.label}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

function renderView(trip) {
  if (!trip) return renderNoTrip();
  const viewMap = {
    dashboard: renderDashboard,
    itinerary: renderItinerary,
    transport: renderTransport,
    flights: renderFlights,
    stays: renderStays,
    packing: renderPacking,
    documents: renderDocuments,
    budget: renderBudget,
    todos: renderTodos,
    places: renderPlaces,
    emergency: renderEmergency,
    settings: renderSettings
  };
  return (viewMap[ui.view] || renderDashboard)(trip);
}

function renderNoTrip() {
  return `
    <section class="topbar">
      <div><div class="eyebrow">TripBoard</div><h1>建立第一趟旅程</h1><p class="subtitle">新增旅程後，就可以開始記錄航班、住宿、行程、交通、行李與文件。</p></div>
      <div class="actions"><button class="btn primary" data-action="new-trip">＋ 新增旅程</button></div>
    </section>
  `;
}

function topbar({ eyebrow, title, subtitle, actions = "" }) {
  return `
    <section class="topbar">
      <div>
        <div class="eyebrow">${escapeHtml(eyebrow)}</div>
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
      </div>
      <div class="actions">${actions}</div>
    </section>
  `;
}

function renderDashboard(trip) {
  const tripDays = daysBetween(trip.startDate, trip.endDate);
  const items = byTrip("itineraryItems");
  const transports = byTrip("transportSegments");
  const documents = byTrip("documents");
  const todos = byTrip("todos");
  const packing = byTrip("packingItems");
  const expenses = byTrip("expenses");
  const doneTodos = todos.filter((t) => t.status === "完成").length;
  const packed = packing.filter((p) => ["已準備", "已放入行李"].includes(p.status)).length;
  const totalExpense = expenses.reduce((sum, item) => sum + parseNumber(item.amount), 0);
  const nextItem = sortByDateTime(items).find((item) => `${item.date || "9999-99-99"} ${item.startTime || "99:99"}` >= `${todayISO()} 00:00`) || sortByDateTime(items)[0];
  const nextStay = byTrip("stays").find((stay) => stay.checkOutDate >= todayISO()) || byTrip("stays")[0];

  return `
    ${topbar({
      eyebrow: trip.status || "旅程",
      title: trip.name,
      subtitle: `${escapeHtml(trip.destination || "未設定目的地")}｜${formatDateLong(trip.startDate)} - ${formatDateLong(trip.endDate)}｜${escapeHtml(trip.travelers || "未設定旅伴")}`,
      actions: `<button class="btn" data-action="edit-trip" data-id="${trip.id}">編輯旅程</button><button class="btn primary" data-action="new-itinerary">＋ 新增行程</button>`
    })}

    <section class="grid four">
      ${statCard("天數", `${tripDays.length || 0}`, "含出發與回程日")}
      ${statCard("行程點", `${items.length}`, `${transports.length} 段交通已記錄`)}
      ${statCard("文件票券", `${documents.length}`, "門票、訂單、保險、eSIM")}
      ${statCard("預算使用", currency(totalExpense, trip.currency || "TWD"), `目標 ${currency(trip.budget, trip.currency || "TWD")}`)}
    </section>

    <section class="section grid two">
      <div class="card">
        <div class="section-head"><h2>下一個行程</h2><button class="btn small" data-view="itinerary">查看行程</button></div>
        ${nextItem ? renderItemPreview(nextItem) : emptyBlock("還沒有行程", "新增景點、餐廳、活動或機場資訊。")}
      </div>
      <div class="card">
        <div class="section-head"><h2>今晚住宿</h2><button class="btn small" data-view="stays">住宿</button></div>
        ${nextStay ? renderStayPreview(nextStay) : emptyBlock("還沒有住宿", "記錄飯店、Airbnb、訂房編號與入住資訊。")}
      </div>
    </section>

    <section class="section grid three">
      <div class="card compact">
        <div class="stat-label">待辦完成度</div>
        <div class="stat-value">${todos.length ? Math.round(doneTodos / todos.length * 100) : 0}%</div>
        <div class="progress"><span style="width:${todos.length ? doneTodos / todos.length * 100 : 0}%"></span></div>
        <div class="stat-note">${doneTodos}/${todos.length} 已完成</div>
      </div>
      <div class="card compact">
        <div class="stat-label">行李準備度</div>
        <div class="stat-value">${packing.length ? Math.round(packed / packing.length * 100) : 0}%</div>
        <div class="progress"><span style="width:${packing.length ? packed / packing.length * 100 : 0}%"></span></div>
        <div class="stat-note">${packed}/${packing.length} 已準備</div>
      </div>
      <div class="card compact">
        <div class="stat-label">雲端同步</div>
        <div class="stat-value">${ui.session ? "已登入" : "本機"}</div>
        <div class="stat-note">${ui.session ? escapeHtml(ui.session.user.email) : "到同步設定連接 Supabase"}</div>
      </div>
    </section>

    <section class="section card">
      <div class="section-head"><h2>旅程備註</h2></div>
      <p class="subtitle">${escapeHtml(trip.note || "尚未填寫旅程備註。")}</p>
    </section>
  `;
}

function statCard(label, value, note) {
  return `<div class="card compact stat"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${escapeHtml(value)}</div><div class="stat-note">${escapeHtml(note)}</div></div>`;
}

function renderItemPreview(item) {
  return `
    <div class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHtml(item.startTime || "時間未定")}｜${escapeHtml(item.title)}</div>
          <div class="item-meta">${formatDateLong(item.date)}｜${escapeHtml(item.placeName || item.address || "地點未填")}</div>
        </div>
        <div class="badges"><span class="badge dark">${escapeHtml(item.type || "行程")}</span></div>
      </div>
      <div class="badges">
        ${item.ticketRequired === "是" ? `<span class="badge amber">門票：${escapeHtml(item.ticketStatus || "未設定")}</span>` : ""}
        ${item.openingHours ? `<span class="badge blue">營業 ${escapeHtml(item.openingHours)}</span>` : ""}
        ${item.priority ? `<span class="badge green">${escapeHtml(item.priority)}</span>` : ""}
      </div>
      <div class="item-meta">${escapeHtml(item.notes || "")}</div>
    </div>
  `;
}

function renderStayPreview(stay) {
  return `
    <div class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHtml(stay.name)}</div>
          <div class="item-meta">${formatDate(stay.checkInDate)} - ${formatDate(stay.checkOutDate)}｜${escapeHtml(stay.address || "地址未填")}</div>
        </div>
        <span class="badge dark">${escapeHtml(stay.type || "住宿")}</span>
      </div>
      <div class="badges">
        <span class="badge amber">Check-in ${escapeHtml(stay.checkInTime || "未定")}</span>
        <span class="badge">${escapeHtml(stay.paidStatus || "付款未定")}</span>
        <span class="badge">寄放行李：${escapeHtml(stay.luggageStorage || "未確認")}</span>
      </div>
      <div class="item-meta">${escapeHtml(stay.notes || "")}</div>
    </div>
  `;
}

function renderItinerary(trip) {
  const days = daysBetween(trip.startDate, trip.endDate);
  const items = sortByDateTime(byTrip("itineraryItems"));
  const transports = sortByDateTime(byTrip("transportSegments"));
  const dateButtons = [`<button class="${ui.filterDate === "all" ? "active" : ""}" data-filter-date="all">全部</button>`]
    .concat(days.map((day, index) => `<button class="${ui.filterDate === day ? "active" : ""}" data-filter-date="${day}">D${index + 1}</button>`)).join("");
  const showDays = ui.filterDate === "all" ? days : [ui.filterDate];

  return `
    ${topbar({
      eyebrow: "Itinerary",
      title: "每日行程",
      subtitle: "用時間軸記錄景點、餐廳、營業時間、門票、預約、備註，交通段會穿插顯示在行程之間。",
      actions: `<button class="btn" data-action="new-transport">＋ 交通</button><button class="btn primary" data-action="new-itinerary">＋ 行程</button>`
    })}
    <div class="seg-control">${dateButtons}</div>
    <section class="section timeline">
      ${showDays.map((day, index) => renderDayTimeline(day, days.indexOf(day) + 1 || index + 1, items.filter((item) => item.date === day), transports.filter((item) => item.date === day))).join("") || emptyBlock("日期尚未設定", "請先編輯旅程的開始與結束日期。")}
    </section>
  `;
}

function renderDayTimeline(day, dayNo, items, transports) {
  const blocks = [];
  for (const item of items) {
    const relatedTransport = transports.find((t) => t.startTime && item.startTime && t.startTime <= item.startTime && !blocks.includes(t.id));
    if (relatedTransport) {
      blocks.push(relatedTransport.id);
      blocks.push(renderTransportInline(relatedTransport));
    }
    blocks.push(renderTimelineItem(item));
  }
  const unusedTransports = transports.filter((t) => !blocks.includes(t.id)).map(renderTransportInline).join("");
  return `
    <article class="card day-card">
      <div class="day-head">
        <div><div class="day-title">Day ${dayNo}</div><div class="day-date">${formatDateLong(day)}</div></div>
        <button class="btn small" data-action="new-itinerary" data-date="${day}">＋ 新增</button>
      </div>
      <div class="timeline-body">
        ${blocks.filter((x) => typeof x === "string" && x.startsWith("<")).join("")}
        ${unusedTransports}
        ${items.length || transports.length ? "" : `<div class="empty"><strong>這一天還沒有安排</strong>新增景點、餐廳、活動或交通。</div>`}
      </div>
    </article>
  `;
}

function renderTimelineItem(item) {
  return `
    <div class="timeline-item">
      <div class="timeline-time">${escapeHtml(item.startTime || "未定")}</div>
      <div class="timeline-content">
        <div class="item-row">
          <div>
            <div class="item-title">${escapeHtml(item.title)}</div>
            <div class="item-meta">${escapeHtml(item.placeName || item.address || "地點未填")} ${item.endTime ? `｜至 ${escapeHtml(item.endTime)}` : ""}</div>
          </div>
          <div class="item-actions">
            <button class="btn small" data-action="edit-itinerary" data-id="${item.id}">編輯</button>
            <button class="btn small danger" data-action="delete" data-collection="itineraryItems" data-id="${item.id}">刪除</button>
          </div>
        </div>
        <div class="badges">
          <span class="badge dark">${escapeHtml(item.type || "行程")}</span>
          ${item.openingHours ? `<span class="badge blue">營業 ${escapeHtml(item.openingHours)}</span>` : ""}
          ${item.lastEntry ? `<span class="badge">最後入場 ${escapeHtml(item.lastEntry)}</span>` : ""}
          ${item.ticketRequired === "是" ? `<span class="badge amber">門票 ${escapeHtml(item.ticketStatus || "待確認")}</span>` : ""}
          ${item.budget ? `<span class="badge green">預算 ${currency(item.budget, activeTrip().currency || "TWD")}</span>` : ""}
          ${item.weatherType ? `<span class="badge">${escapeHtml(item.weatherType)}</span>` : ""}
        </div>
        ${renderLinks(item)}
        ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ""}
      </div>
    </div>
  `;
}

function renderTransportInline(item) {
  return `<div class="transport-inline">↓ <strong>${escapeHtml(item.method || "交通")}</strong> ${escapeHtml(item.fromName || "起點")} → ${escapeHtml(item.toName || "終點")}｜${escapeHtml(item.duration || "時間未填")}｜${currency(item.cost, item.currency || "TWD")}</div>`;
}

function renderLinks(item) {
  const links = [
    item.mapUrl ? `<a class="badge blue" href="${escapeHtml(item.mapUrl)}" target="_blank" rel="noreferrer">地圖</a>` : "",
    item.ticketLink ? `<a class="badge amber" href="${escapeHtml(item.ticketLink)}" target="_blank" rel="noreferrer">票券</a>` : "",
    item.website ? `<a class="badge" href="${escapeHtml(item.website)}" target="_blank" rel="noreferrer">官網</a>` : ""
  ].filter(Boolean).join("");
  return links ? `<div class="badges">${links}</div>` : "";
}

function renderTransport(trip) {
  const items = sortByDateTime(byTrip("transportSegments"));
  return `
    ${topbar({ eyebrow: "Transport", title: "點到點交通", subtitle: "每一段交通獨立記錄起點、終點、路線、轉乘、費用、票券、行李友善度與備案。", actions: `<button class="btn primary" data-action="new-transport">＋ 新增交通</button>` })}
    <section class="section list">
      ${items.map(renderTransportCard).join("") || emptyBlock("還沒有交通段", "建議把每兩個行程點之間的交通都獨立記錄。")}
    </section>
  `;
}

function renderTransportCard(item) {
  return `
    <article class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${formatDate(item.date)} ${escapeHtml(item.startTime || "時間未定")}｜${escapeHtml(item.fromName || "起點")} → ${escapeHtml(item.toName || "終點")}</div>
          <div class="item-meta">${escapeHtml(item.route || item.method || "交通方式未填")}</div>
        </div>
        <div class="item-actions">
          <button class="btn small" data-action="edit-transport" data-id="${item.id}">編輯</button>
          <button class="btn small danger" data-action="delete" data-collection="transportSegments" data-id="${item.id}">刪除</button>
        </div>
      </div>
      <div class="badges">
        <span class="badge dark">${escapeHtml(item.method || "交通")}</span>
        <span class="badge blue">${escapeHtml(item.duration || "時間未填")}</span>
        <span class="badge green">${currency(item.cost, item.currency || "TWD")}</span>
        <span class="badge">行李友善度：${escapeHtml(item.luggageFriendly || "未填")}</span>
        <span class="badge amber">${escapeHtml(item.bookingStatus || "票券未填")}</span>
      </div>
      <dl class="kv">
        <dt>上車 / 出發</dt><dd>${escapeHtml(item.departStation || "未填")}</dd>
        <dt>下車 / 抵達</dt><dd>${escapeHtml(item.arrivalStation || "未填")}</dd>
        <dt>轉乘資訊</dt><dd>${escapeHtml(item.transferInfo || "未填")}</dd>
        <dt>備案</dt><dd>${escapeHtml(item.backup || "未填")}</dd>
      </dl>
      ${item.mapUrl ? `<div class="badges"><a class="badge blue" href="${escapeHtml(item.mapUrl)}" target="_blank" rel="noreferrer">開啟地圖</a></div>` : ""}
      ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ""}
    </article>
  `;
}

function renderFlights(trip) {
  const items = byTrip("flights").sort((a, b) => String(a.departure || "").localeCompare(String(b.departure || "")));
  return renderCollectionPage({
    eyebrow: "Flights",
    title: "航班",
    subtitle: "記錄航班編號、訂位代號、機場、航廈、座位、行李額度、票價與備註。",
    action: "new-flight",
    actionLabel: "＋ 新增航班",
    items,
    emptyTitle: "還沒有航班",
    emptyText: "新增去程、回程或轉機資訊。",
    renderCard: renderFlightCard
  });
}

function renderFlightCard(item) {
  return `
    <article class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHtml(item.type || "航班")}｜${escapeHtml(item.airline || "航空公司")} ${escapeHtml(item.flightNumber || "")}</div>
          <div class="item-meta">${escapeHtml(item.fromAirport || "出發機場")} → ${escapeHtml(item.toAirport || "抵達機場")}</div>
        </div>
        ${rowActions("flight", "flights", item.id)}
      </div>
      <div class="badges">
        <span class="badge blue">出發 ${formatDateTime(item.departure)}</span>
        <span class="badge green">抵達 ${formatDateTime(item.arrival)}</span>
        <span class="badge">座位 ${escapeHtml(item.seat || "未選")}</span>
        <span class="badge amber">${escapeHtml(item.checkedBaggage || "行李未填")}</span>
      </div>
      <dl class="kv">
        <dt>PNR</dt><dd>${escapeHtml(item.bookingRef || "未填")}</dd>
        <dt>航廈 / Gate</dt><dd>${escapeHtml(item.terminal || "未填")} / ${escapeHtml(item.gate || "未填")}</dd>
        <dt>艙等</dt><dd>${escapeHtml(item.cabin || "未填")}</dd>
        <dt>價格</dt><dd>${currency(item.price, activeTrip().currency || "TWD")}</dd>
      </dl>
      ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ""}
    </article>
  `;
}

function renderStays(trip) {
  const items = byTrip("stays").sort((a, b) => String(a.checkInDate || "").localeCompare(String(b.checkInDate || "")));
  return renderCollectionPage({
    eyebrow: "Stays",
    title: "住宿",
    subtitle: "記錄飯店、訂房平台、房型、付款、取消期限、寄放行李、地址與聯絡資訊。",
    action: "new-stay",
    actionLabel: "＋ 新增住宿",
    items,
    emptyTitle: "還沒有住宿",
    emptyText: "新增飯店、Airbnb 或青旅資訊。",
    renderCard: renderStayCard
  });
}

function renderStayCard(item) {
  return `
    <article class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHtml(item.name || "住宿名稱")}</div>
          <div class="item-meta">${formatDate(item.checkInDate)} - ${formatDate(item.checkOutDate)}｜${escapeHtml(item.address || "地址未填")}</div>
        </div>
        ${rowActions("stay", "stays", item.id)}
      </div>
      <div class="badges">
        <span class="badge dark">${escapeHtml(item.type || "住宿")}</span>
        <span class="badge amber">入住 ${escapeHtml(item.checkInTime || "未填")}</span>
        <span class="badge">退房 ${escapeHtml(item.checkOutTime || "未填")}</span>
        <span class="badge green">${currency(item.price, activeTrip().currency || "TWD")}</span>
        <span class="badge">${escapeHtml(item.paidStatus || "付款未填")}</span>
      </div>
      <dl class="kv">
        <dt>平台 / 訂單</dt><dd>${escapeHtml(item.platform || "未填")} / ${escapeHtml(item.bookingNumber || "未填")}</dd>
        <dt>房型</dt><dd>${escapeHtml(item.roomType || "未填")}</dd>
        <dt>取消期限</dt><dd>${formatDateLong(item.cancellationDeadline)}</dd>
        <dt>寄放行李</dt><dd>${escapeHtml(item.luggageStorage || "未確認")}</dd>
        <dt>聯絡方式</dt><dd>${escapeHtml(item.contact || "未填")}</dd>
      </dl>
      ${item.mapUrl ? `<div class="badges"><a class="badge blue" href="${escapeHtml(item.mapUrl)}" target="_blank" rel="noreferrer">開啟地圖</a></div>` : ""}
      ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ""}
    </article>
  `;
}

function renderPacking(trip) {
  const items = byTrip("packingItems").sort((a, b) => `${a.category || ""}${a.name || ""}`.localeCompare(`${b.category || ""}${b.name || ""}`));
  const grouped = groupBy(items, "category");
  const done = items.filter((item) => ["已準備", "已放入行李"].includes(item.status)).length;
  return `
    ${topbar({ eyebrow: "Packing", title: "行李清單", subtitle: `完成度 ${items.length ? Math.round(done / items.length * 100) : 0}%｜可以分隨身包、登機箱、托運、回程檢查與負責人。`, actions: `<button class="btn" data-action="packing-template">套用歐洲冬天模板</button><button class="btn primary" data-action="new-packing">＋ 新增物品</button>` })}
    <section class="section grid two">
      ${Object.keys(grouped).map((category) => `
        <div class="card">
          <div class="section-head"><h2>${escapeHtml(category || "未分類")}</h2><span class="badge">${grouped[category].length} 件</span></div>
          <div class="list">${grouped[category].map(renderPackingCard).join("")}</div>
        </div>
      `).join("") || emptyBlock("還沒有行李清單", "可以套用模板或新增自己的物品。")}
    </section>
  `;
}

function renderPackingCard(item) {
  const checked = ["已準備", "已放入行李"].includes(item.status) ? "checked" : "";
  return `
    <article class="item">
      <div class="item-row">
        <div class="checkbox-row">
          <input type="checkbox" ${checked} data-action="toggle-packing" data-id="${item.id}" aria-label="${escapeHtml(item.name)}" />
          <div>
            <div class="item-title">${escapeHtml(item.name)} × ${escapeHtml(item.quantity || 1)}</div>
            <div class="item-meta">${escapeHtml(item.location || "未指定位置")}｜${escapeHtml(item.responsible || "未指定負責人")}</div>
          </div>
        </div>
        ${rowActions("packing", "packingItems", item.id)}
      </div>
      <div class="badges">
        <span class="badge ${item.required ? "red" : ""}">${item.required ? "必帶" : "可選"}</span>
        <span class="badge ${checked ? "green" : "amber"}">${escapeHtml(item.status || "未準備")}</span>
        ${item.returnCheck ? `<span class="badge">回程檢查</span>` : ""}
      </div>
      ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ""}
    </article>
  `;
}

function renderDocuments(trip) {
  const items = byTrip("documents").sort((a, b) => `${a.relatedDate || "9999-99-99"}${a.type || ""}`.localeCompare(`${b.relatedDate || "9999-99-99"}${b.type || ""}`));
  const todayDocs = items.filter((item) => item.relatedDate === todayISO());
  return `
    ${topbar({ eyebrow: "Documents", title: "文件與票券", subtitle: "集中管理護照、簽證、機票、住宿訂單、門票、QR Code、保險、eSIM、交通票券與訂位資料。", actions: `<button class="btn primary" data-action="new-document">＋ 新增文件</button>` })}
    ${todayDocs.length ? `<section class="section card"><div class="section-head"><h2>今日需要</h2></div><div class="list">${todayDocs.map(renderDocumentCard).join("")}</div></section>` : ""}
    <section class="section list">
      ${items.map(renderDocumentCard).join("") || emptyBlock("還沒有文件", "把票券、訂單、保險、eSIM、QR Code 連結集中放在這裡。")}
    </section>
  `;
}

function renderDocumentCard(item) {
  return `
    <article class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHtml(item.name || "文件")}</div>
          <div class="item-meta">${formatDate(item.relatedDate)}｜${escapeHtml(item.relatedTo || "未連結行程")}</div>
        </div>
        ${rowActions("document", "documents", item.id)}
      </div>
      <div class="badges">
        <span class="badge dark">${escapeHtml(item.type || "文件")}</span>
        <span class="badge amber">編號 ${escapeHtml(item.bookingNumber || "未填")}</span>
        <span class="badge green">${currency(item.amount, item.currency || activeTrip().currency || "TWD")}</span>
        ${item.attachmentUrl ? `<a class="badge blue" href="${escapeHtml(item.attachmentUrl)}" target="_blank" rel="noreferrer">開啟附件</a>` : ""}
      </div>
      ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ""}
    </article>
  `;
}

function renderBudget(trip) {
  const items = byTrip("expenses").sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const total = items.reduce((sum, item) => sum + parseNumber(item.amount), 0);
  const grouped = groupBy(items, "category");
  return `
    ${topbar({ eyebrow: "Budget", title: "預算與支出", subtitle: `目前記錄 ${currency(total, trip.currency || "TWD")}，目標預算 ${currency(trip.budget, trip.currency || "TWD")}。`, actions: `<button class="btn primary" data-action="new-expense">＋ 新增支出</button>` })}
    <section class="grid three">
      ${statCard("總支出", currency(total, trip.currency || "TWD"), "所有已記錄費用")}
      ${statCard("剩餘預算", currency(parseNumber(trip.budget) - total, trip.currency || "TWD"), "依旅程主幣別粗估")}
      ${statCard("支出筆數", String(items.length), "可用於分帳與結算")}
    </section>
    <section class="section grid two">
      <div class="card">
        <div class="section-head"><h2>分類合計</h2></div>
        <div class="list">
          ${Object.keys(grouped).map((key) => {
            const sum = grouped[key].reduce((acc, item) => acc + parseNumber(item.amount), 0);
            return `<div class="item-row"><strong>${escapeHtml(key || "未分類")}</strong><span>${currency(sum, trip.currency || "TWD")}</span></div>`;
          }).join("") || `<div class="empty"><strong>尚無支出</strong>新增機票、住宿、交通、餐費或門票。</div>`}
        </div>
      </div>
      <div class="card">
        <div class="section-head"><h2>支出明細</h2></div>
        <div class="list">${items.map(renderExpenseCard).join("") || emptyBlock("尚無支出", "新增一筆預算或實際花費。")}</div>
      </div>
    </section>
  `;
}

function renderExpenseCard(item) {
  return `
    <article class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHtml(item.title || "支出")}</div>
          <div class="item-meta">${formatDate(item.date)}｜${escapeHtml(item.category || "未分類")}</div>
        </div>
        ${rowActions("expense", "expenses", item.id)}
      </div>
      <div class="badges">
        <span class="badge green">${currency(item.amount, item.currency || activeTrip().currency || "TWD")}</span>
        <span class="badge">${escapeHtml(item.status || "狀態未填")}</span>
        <span class="badge amber">墊付：${escapeHtml(item.paidBy || "未填")}</span>
        <span class="badge">分帳：${escapeHtml(item.splitWith || "未填")}</span>
      </div>
      ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ""}
    </article>
  `;
}

function renderTodos(trip) {
  const items = byTrip("todos").sort((a, b) => `${a.status === "完成" ? 1 : 0}${a.dueDate || "9999-99-99"}`.localeCompare(`${b.status === "完成" ? 1 : 0}${b.dueDate || "9999-99-99"}`));
  return renderCollectionPage({
    eyebrow: "Tasks",
    title: "待辦事項",
    subtitle: "出發前要買票、訂位、確認飯店、換匯、買 eSIM，都可以放在這裡並指定負責人。",
    action: "new-todo",
    actionLabel: "＋ 新增待辦",
    items,
    emptyTitle: "還沒有待辦",
    emptyText: "新增旅行前需要處理的事項。",
    renderCard: renderTodoCard
  });
}

function renderTodoCard(item) {
  const done = item.status === "完成";
  return `
    <article class="item">
      <div class="item-row">
        <div class="checkbox-row">
          <input type="checkbox" ${done ? "checked" : ""} data-action="toggle-todo" data-id="${item.id}" />
          <div>
            <div class="item-title">${escapeHtml(item.title || "待辦")}</div>
            <div class="item-meta">截止 ${formatDateLong(item.dueDate)}｜${escapeHtml(item.relatedTo || "未連結")}</div>
          </div>
        </div>
        ${rowActions("todo", "todos", item.id)}
      </div>
      <div class="badges"><span class="badge ${done ? "green" : "amber"}">${escapeHtml(item.status || "未完成")}</span><span class="badge red">${escapeHtml(item.priority || "優先度未填")}</span><span class="badge">負責：${escapeHtml(item.owner || "未填")}</span></div>
      ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ""}
    </article>
  `;
}

function renderPlaces(trip) {
  const items = byTrip("places").sort((a, b) => `${a.type || ""}${a.name || ""}`.localeCompare(`${b.type || ""}${b.name || ""}`));
  return renderCollectionPage({
    eyebrow: "Place Library",
    title: "地點庫",
    subtitle: "先把想去景點、餐廳、咖啡廳、購物點放進地點庫，再慢慢排進每日行程。",
    action: "new-place",
    actionLabel: "＋ 新增地點",
    items,
    emptyTitle: "還沒有收藏地點",
    emptyText: "新增景點、餐廳、咖啡廳或購物清單。",
    renderCard: renderPlaceCard
  });
}

function renderPlaceCard(item) {
  return `
    <article class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHtml(item.name || "地點")}</div>
          <div class="item-meta">${escapeHtml(item.city || "城市未填")}｜${escapeHtml(item.address || "地址未填")}</div>
        </div>
        <div class="item-actions">
          <button class="btn small" data-action="place-to-itinerary" data-id="${item.id}">排入行程</button>
          ${rowActions("place", "places", item.id)}
        </div>
      </div>
      <div class="badges"><span class="badge dark">${escapeHtml(item.type || "地點")}</span><span class="badge amber">${escapeHtml(item.status || "想去")}</span>${item.tags ? item.tags.split(",").map((tag) => `<span class="badge">${escapeHtml(tag.trim())}</span>`).join("") : ""}</div>
      ${item.mapUrl ? `<div class="badges"><a class="badge blue" href="${escapeHtml(item.mapUrl)}" target="_blank" rel="noreferrer">開啟地圖</a></div>` : ""}
      ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ""}
    </article>
  `;
}

function renderEmergency(trip) {
  const items = byTrip("emergencyInfos");
  return renderCollectionPage({
    eyebrow: "Emergency",
    title: "緊急資訊",
    subtitle: "保險公司、當地緊急電話、駐外館處、信用卡掛失、飯店聯絡、醫療資訊都放這裡。",
    action: "new-emergency",
    actionLabel: "＋ 新增資訊",
    items,
    emptyTitle: "還沒有緊急資訊",
    emptyText: "新增當地緊急電話、保險或聯絡資訊。",
    renderCard: renderEmergencyCard
  });
}

function renderEmergencyCard(item) {
  return `
    <article class="item">
      <div class="item-row">
        <div><div class="item-title">${escapeHtml(item.title || "緊急資訊")}</div><div class="item-meta">${escapeHtml(item.value || "內容未填")}</div></div>
        ${rowActions("emergency", "emergencyInfos", item.id)}
      </div>
      <div class="badges"><span class="badge red">${escapeHtml(item.type || "資訊")}</span></div>
      ${item.notes ? `<div class="item-meta">${escapeHtml(item.notes)}</div>` : ""}
    </article>
  `;
}

function renderSettings(trip) {
  const googleConfigured = hasGoogleSyncConfig();
  const supabaseConfigured = hasSupabaseConfig();
  return `
    ${topbar({ eyebrow: "Settings", title: "同步設定", subtitle: "目前資料會先存在這台裝置。若設定 Google Sheets 共享碼同步，你和旅伴可以用同一組共享碼手動上傳/下載同一份資料。", actions: `<button class="btn" data-action="export-json">匯出 JSON</button><button class="btn" data-action="import-json">匯入 JSON</button>` })}
    <section class="grid two">
      <div class="card">
        <div class="section-head"><h2>同步狀態</h2></div>
        <div class="list">
          <div class="item-row"><strong>Google Sheets 設定</strong><span class="badge ${googleConfigured ? "green" : "amber"}">${googleConfigured ? "已填入" : "尚未填入"}</span></div>
          <div class="item-row"><strong>本機更新</strong><span>${formatDateTime(state.updatedAt)}</span></div>
          <div class="item-row"><strong>雲端更新</strong><span>${ui.cloudUpdatedAt ? formatDateTime(ui.cloudUpdatedAt) : "尚未讀取"}</span></div>
        </div>
        <p class="subtitle">共享碼同步不是即時多人共同編輯。修改完請手動按「儲存到共享雲端」，另一台裝置再按「從共享雲端載入」。</p>
      </div>
      <div class="card">
        <div class="section-head"><h2>Google Sheets 共享同步</h2></div>
        ${googleConfigured ? renderGoogleSyncPanel() : renderGoogleSyncInstructions()}
      </div>
    </section>
    ${supabaseConfigured ? `
    <section class="grid two">
      <div class="card">
        <div class="section-head"><h2>Supabase 備用同步</h2></div>
        <div class="list">
          <div class="item-row"><strong>登入狀態</strong><span class="badge ${ui.session ? "green" : ""}">${ui.session ? escapeHtml(ui.session.user.email) : "未登入"}</span></div>
        </div>
      </div>
      <div class="card">${renderSyncPanel()}</div>
    </section>` : ""}
    <section class="section card">
      <div class="section-head"><h2>危險操作</h2></div>
      <div class="actions" style="justify-content:flex-start">
        <button class="btn danger" data-action="reset-sample">重置成範例資料</button>
        <button class="btn danger" data-action="clear-local">清空本機資料</button>
      </div>
    </section>
  `;
}

function renderGoogleSyncPanel() {
  const saved = getGoogleSyncFields();
  return `
    <p class="subtitle">你和旅伴輸入同一組共享碼與 PIN，就會讀寫同一份旅行資料。暱稱只用來記錄最後修改者。</p>
    <div class="form-grid">
      <div class="field"><label>共享碼</label><input id="google-share-code" placeholder="例如 PARIS2026" value="${escapeHtml(saved.shareCode || "")}" /></div>
      <div class="field"><label>PIN</label><input id="google-pin" type="password" inputmode="numeric" placeholder="例如 1019" value="${escapeHtml(saved.pin || "")}" /></div>
      <div class="field full"><label>暱稱</label><input id="google-user-name" placeholder="例如 Bear / 女朋友" value="${escapeHtml(saved.userName || "")}" /></div>
    </div>
    <div class="grid">
      <button class="btn primary block" data-action="google-cloud-save">儲存到共享雲端</button>
      <button class="btn block" data-action="google-cloud-load">從共享雲端載入</button>
      <button class="btn block" data-action="google-cloud-metadata">檢查雲端更新時間</button>
    </div>
    <p class="subtitle">提醒：不要把護照號碼、票券 QR Code、信用卡資訊直接放進共享資料。</p>
  `;
}

function renderGoogleSyncInstructions() {
  return `
    <p class="subtitle">尚未設定 Google Apps Script Web App URL。請依 README 裡的 Google Sheets 共享同步步驟建立後，編輯 <code>google-sync-config.js</code>。</p>
    <div class="empty"><strong>目前仍是本機模式</strong>你可以先照常使用 App，資料會存在這台裝置的瀏覽器。</div>
  `;
}

function renderCollectionPage({ eyebrow, title, subtitle, action, actionLabel, items, emptyTitle, emptyText, renderCard }) {
  return `
    ${topbar({ eyebrow, title, subtitle, actions: `<button class="btn primary" data-action="${action}">${actionLabel}</button>` })}
    <section class="section list">
      ${items.map(renderCard).join("") || emptyBlock(emptyTitle, emptyText)}
    </section>
  `;
}

function rowActions(type, collection, id) {
  return `
    <div class="item-actions">
      <button class="btn small" data-action="edit-${type}" data-id="${id}">編輯</button>
      <button class="btn small danger" data-action="delete" data-collection="${collection}" data-id="${id}">刪除</button>
    </div>
  `;
}

function emptyBlock(title, text) {
  return `<div class="empty"><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}</div>`;
}

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "未分類";
    if (!acc[value]) acc[value] = [];
    acc[value].push(item);
    return acc;
  }, {});
}

function bindGlobalEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    ui.view = button.dataset.view;
    render();
  }));

  document.querySelector("[data-action='switch-trip']")?.addEventListener("change", (event) => {
    state.activeTripId = event.target.value;
    ui.filterDate = "all";
    saveState(false);
    render();
  });

  document.querySelectorAll("[data-filter-date]").forEach((button) => button.addEventListener("click", () => {
    ui.filterDate = button.dataset.filterDate;
    render();
  }));

  document.querySelectorAll("[data-action]:not(input[type='checkbox'])").forEach((el) => el.addEventListener("click", handleAction));
  document.querySelectorAll("input[type='checkbox'][data-action]").forEach((el) => el.addEventListener("change", handleAction));
}

async function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  const id = event.currentTarget.dataset.id;
  const collection = event.currentTarget.dataset.collection;
  const date = event.currentTarget.dataset.date;

  const actionMap = {
    "new-trip": () => openTripForm(),
    "edit-trip": () => openTripForm(id),
    "new-itinerary": () => openItineraryForm(null, date),
    "edit-itinerary": () => openItineraryForm(id),
    "new-transport": () => openTransportForm(null, date),
    "edit-transport": () => openTransportForm(id),
    "new-flight": () => openFlightForm(),
    "edit-flight": () => openFlightForm(id),
    "new-stay": () => openStayForm(),
    "edit-stay": () => openStayForm(id),
    "new-packing": () => openPackingForm(),
    "edit-packing": () => openPackingForm(id),
    "new-document": () => openDocumentForm(),
    "edit-document": () => openDocumentForm(id),
    "new-expense": () => openExpenseForm(),
    "edit-expense": () => openExpenseForm(id),
    "new-todo": () => openTodoForm(),
    "edit-todo": () => openTodoForm(id),
    "new-place": () => openPlaceForm(),
    "edit-place": () => openPlaceForm(id),
    "new-emergency": () => openEmergencyForm(),
    "edit-emergency": () => openEmergencyForm(id),
    "delete": () => deleteRecord(collection, id),
    "toggle-packing": () => togglePacking(id, event.currentTarget.checked),
    "toggle-todo": () => toggleTodo(id, event.currentTarget.checked),
    "packing-template": () => applyPackingTemplate(),
    "place-to-itinerary": () => placeToItinerary(id),
    "login-email": () => loginEmail(),
    "cloud-save": () => saveCloudState(),
    "cloud-load": () => loadCloudState(true),
    "google-cloud-save": () => saveGoogleState(),
    "google-cloud-load": () => loadGoogleState(true),
    "google-cloud-metadata": () => refreshGoogleMetadata(true),
    "logout": () => logout(),
    "export-json": () => exportJson(),
    "import-json": () => importJson(),
    "reset-sample": () => resetSample(),
    "clear-local": () => clearLocal()
  };

  if (actionMap[action]) await actionMap[action]();
}

const fieldOptions = {
  statusTrip: ["規劃中", "已確認", "旅行中", "已結束"],
  currency: ["TWD", "EUR", "JPY", "USD", "GBP", "KRW"],
  yesNo: ["是", "否"],
  ticketStatus: ["不需", "待購買", "已購買", "需現場買", "已預約"],
  itineraryType: ["景點", "餐廳", "咖啡廳", "購物", "交通", "住宿", "活動", "展覽", "夜景", "機場", "車站", "休息", "備案"],
  itemStatus: ["想去", "已排入", "已預約", "已完成", "取消"],
  priority: ["必去", "可去", "備案"],
  weather: ["室內", "室外", "雨天備案", "天氣好再去"],
  transport: ["步行", "地鐵", "巴士", "火車", "高鐵", "Uber", "計程車", "自駕", "飛機", "船", "其他"],
  luggageFriendly: ["高", "中", "低", "未知"],
  bookingStatus: ["不需預約", "待購票", "已購票", "需訂位", "已訂位"],
  stayType: ["飯店", "Airbnb", "公寓", "青旅", "民宿", "朋友家", "其他"],
  paidStatus: ["已付款", "待付款", "部分付款", "到店付款", "免費取消"],
  packStatus: ["未準備", "已準備", "已放入行李", "不帶了"],
  docType: ["護照", "簽證", "機票", "住宿訂單", "門票", "餐廳訂位", "交通票券", "保險", "eSIM", "租車文件", "退稅資料", "信用卡權益", "其他"],
  expenseCategory: ["機票", "住宿", "交通", "餐費", "門票", "購物", "保險", "eSIM", "雜費", "預備金"],
  expenseStatus: ["預估", "已付款", "未付款", "待分帳", "已結算"],
  todoStatus: ["未完成", "進行中", "完成", "取消"],
  taskPriority: ["高", "中", "低"],
  placeType: ["景點", "餐廳", "咖啡廳", "購物", "飯店", "車站", "機場", "活動", "備案", "其他"],
  placeStatus: ["想去", "已排入", "已去過", "取消"],
  emergencyType: ["電話", "地址", "保險", "醫療", "信用卡", "大使館/辦事處", "其他"]
};

function openTripForm(id) {
  const item = id ? state.trips.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯旅程" : "新增旅程",
    fields: [
      text("name", "旅程名稱", true), text("destination", "目的地"), dateField("startDate", "開始日期", true), dateField("endDate", "結束日期", true),
      selectField("status", "狀態", fieldOptions.statusTrip), numberField("budget", "預算"), selectField("currency", "主幣別", fieldOptions.currency), text("travelers", "旅伴"), textarea("note", "旅程備註", true)
    ],
    item: item || { currency: "TWD", status: "規劃中" },
    onSubmit: (data) => {
      if (item) Object.assign(item, data);
      else {
        const newTrip = { id: uid("trip"), ...data };
        state.trips.push(newTrip);
        state.activeTripId = newTrip.id;
      }
      saveAndRender("旅程已儲存");
    }
  });
}

function openItineraryForm(id, defaultDate) {
  const item = id ? state.itineraryItems.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯行程" : "新增行程",
    fields: [
      dateField("date", "日期", true), timeField("startTime", "開始時間"), timeField("endTime", "結束時間"), selectField("type", "類型", fieldOptions.itineraryType),
      text("title", "行程名稱", true), text("placeName", "地點名稱"), text("address", "地址"), urlField("mapUrl", "Google Maps 連結"), urlField("website", "官網 / 參考連結"),
      text("openingHours", "營業時間"), text("lastEntry", "最後入場"), selectField("ticketRequired", "是否需門票", fieldOptions.yesNo), selectField("ticketStatus", "門票狀態", fieldOptions.ticketStatus),
      numberField("ticketPrice", "門票價格"), urlField("ticketLink", "購票 / 票券連結"), text("reservationNumber", "預約 / 訂位編號"), numberField("budget", "預估花費"),
      selectField("status", "狀態", fieldOptions.itemStatus), selectField("priority", "重要性", fieldOptions.priority), selectField("weatherType", "天氣條件", fieldOptions.weather), textarea("notes", "備註", true)
    ],
    item: item || { date: defaultDate || activeTrip().startDate || todayISO(), type: "景點", ticketRequired: "否", ticketStatus: "不需", status: "想去", priority: "可去", weatherType: "室內" },
    onSubmit: (data) => upsert("itineraryItems", item, data, "item")
  });
}

function openTransportForm(id, defaultDate) {
  const item = id ? state.transportSegments.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯交通" : "新增交通",
    fields: [
      dateField("date", "日期", true), timeField("startTime", "出發時間"), text("fromName", "起點", true), text("toName", "終點", true), selectField("method", "交通方式", fieldOptions.transport),
      text("duration", "所需時間"), numberField("cost", "費用"), selectField("currency", "幣別", fieldOptions.currency), text("route", "路線"), text("departStation", "上車 / 出發站"),
      text("arrivalStation", "下車 / 抵達站"), text("transferInfo", "轉乘資訊"), selectField("luggageFriendly", "行李友善度", fieldOptions.luggageFriendly),
      selectField("bookingStatus", "票券 / 預約狀態", fieldOptions.bookingStatus), text("ticketInfo", "交通票資訊"), urlField("mapUrl", "地圖 / 導航連結"), text("backup", "備案交通"), textarea("notes", "注意事項", true)
    ],
    item: item || { date: defaultDate || activeTrip().startDate || todayISO(), method: "地鐵", currency: activeTrip().currency || "TWD", luggageFriendly: "中", bookingStatus: "不需預約" },
    onSubmit: (data) => upsert("transportSegments", item, data, "transport")
  });
}

function openFlightForm(id) {
  const item = id ? state.flights.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯航班" : "新增航班",
    fields: [
      selectField("type", "類型", ["去程", "回程", "轉機", "國內段", "其他"]), text("airline", "航空公司", true), text("flightNumber", "航班編號", true), text("bookingRef", "訂位代號 / PNR"),
      text("fromAirport", "出發機場", true), text("toAirport", "抵達機場", true), datetimeField("departure", "出發時間"), datetimeField("arrival", "抵達時間"),
      text("terminal", "航廈"), text("gate", "登機門"), text("seat", "座位"), text("cabin", "艙等"), text("checkedBaggage", "託運行李"), text("carryOn", "手提行李"), numberField("price", "票價"), textarea("notes", "備註", true)
    ],
    item: item || { type: "去程", cabin: "Economy" },
    onSubmit: (data) => upsert("flights", item, data, "flight")
  });
}

function openStayForm(id) {
  const item = id ? state.stays.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯住宿" : "新增住宿",
    fields: [
      text("name", "住宿名稱", true), selectField("type", "類型", fieldOptions.stayType), dateField("checkInDate", "入住日期", true), dateField("checkOutDate", "退房日期", true),
      text("address", "地址"), urlField("mapUrl", "Google Maps 連結"), timeField("checkInTime", "Check-in 時間"), timeField("checkOutTime", "Check-out 時間"),
      text("platform", "訂房平台"), text("bookingNumber", "訂單編號"), text("roomType", "房型"), numberField("price", "價格"), selectField("paidStatus", "付款狀態", fieldOptions.paidStatus),
      dateField("cancellationDeadline", "取消期限"), text("luggageStorage", "是否可寄放行李"), text("contact", "聯絡方式"), textarea("notes", "備註", true)
    ],
    item: item || { type: "飯店", paidStatus: "待付款", checkInTime: "15:00", checkOutTime: "11:00" },
    onSubmit: (data) => upsert("stays", item, data, "stay")
  });
}

function openPackingForm(id) {
  const item = id ? state.packingItems.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯行李" : "新增行李",
    fields: [
      text("name", "物品名稱", true), text("category", "分類"), numberField("quantity", "數量"), text("location", "放在哪裡"), selectField("status", "狀態", fieldOptions.packStatus),
      checkboxField("required", "必帶"), text("responsible", "負責人"), checkboxField("returnCheck", "回程檢查"), textarea("notes", "備註", true)
    ],
    item: item || { quantity: 1, category: "未分類", status: "未準備", required: false, returnCheck: true },
    onSubmit: (data) => upsert("packingItems", item, data, "pack")
  });
}

function openDocumentForm(id) {
  const item = id ? state.documents.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯文件" : "新增文件",
    fields: [
      text("name", "文件名稱", true), selectField("type", "類型", fieldOptions.docType), dateField("relatedDate", "使用日期"), text("relatedTo", "對應行程 / 地點"), text("bookingNumber", "訂單 / 票券編號"),
      numberField("amount", "金額"), selectField("currency", "幣別", fieldOptions.currency), urlField("attachmentUrl", "附件 / QR Code 連結"), textarea("notes", "備註", true)
    ],
    item: item || { type: "門票", currency: activeTrip().currency || "TWD" },
    onSubmit: (data) => upsert("documents", item, data, "doc")
  });
}

function openExpenseForm(id) {
  const item = id ? state.expenses.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯支出" : "新增支出",
    fields: [
      dateField("date", "日期", true), selectField("category", "分類", fieldOptions.expenseCategory), text("title", "名稱", true), numberField("amount", "金額", true), selectField("currency", "幣別", fieldOptions.currency),
      text("paidBy", "誰先付款"), text("splitWith", "分帳對象"), selectField("status", "狀態", fieldOptions.expenseStatus), textarea("notes", "備註", true)
    ],
    item: item || { date: todayISO(), category: "餐費", currency: activeTrip().currency || "TWD", status: "預估" },
    onSubmit: (data) => upsert("expenses", item, data, "exp")
  });
}

function openTodoForm(id) {
  const item = id ? state.todos.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯待辦" : "新增待辦",
    fields: [
      text("title", "待辦事項", true), dateField("dueDate", "截止日"), selectField("priority", "優先度", fieldOptions.taskPriority), selectField("status", "狀態", fieldOptions.todoStatus),
      text("owner", "負責人"), text("relatedTo", "對應行程 / 項目"), textarea("notes", "備註", true)
    ],
    item: item || { priority: "中", status: "未完成", owner: "自己" },
    onSubmit: (data) => upsert("todos", item, data, "todo")
  });
}

function openPlaceForm(id) {
  const item = id ? state.places.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯地點" : "新增地點",
    fields: [
      text("name", "地點名稱", true), selectField("type", "類型", fieldOptions.placeType), text("city", "城市"), text("address", "地址"), urlField("mapUrl", "Google Maps 連結"),
      selectField("status", "狀態", fieldOptions.placeStatus), text("tags", "標籤，用逗號分隔"), textarea("notes", "備註", true)
    ],
    item: item || { type: "景點", status: "想去" },
    onSubmit: (data) => upsert("places", item, data, "place")
  });
}

function openEmergencyForm(id) {
  const item = id ? state.emergencyInfos.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯緊急資訊" : "新增緊急資訊",
    fields: [
      text("title", "標題", true), selectField("type", "類型", fieldOptions.emergencyType), text("value", "內容 / 電話 / 地址", true), textarea("notes", "備註", true)
    ],
    item: item || { type: "電話" },
    onSubmit: (data) => upsert("emergencyInfos", item, data, "emg")
  });
}

function upsert(collection, existing, data, prefix) {
  if (existing) Object.assign(existing, data);
  else state[collection].push({ id: uid(prefix), tripId: activeTrip().id, ...data });
  saveAndRender("已儲存");
}

function openForm({ title, fields, item, onSubmit }) {
  const formId = uid("form");
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${formId}-title" onclick="event.stopPropagation()">
        <div class="modal-head">
          <div><h2 id="${formId}-title">${escapeHtml(title)}</h2><p class="subtitle">欄位可以先填重要的，其他之後再補。</p></div>
          <button class="btn small" data-action="close-modal">關閉</button>
        </div>
        <form class="modal-body" id="${formId}">
          <div class="form-grid">
            ${fields.map((field) => renderField(field, item)).join("")}
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" data-action="close-modal">取消</button>
            <button type="submit" class="btn primary">儲存</button>
          </div>
        </form>
      </div>
    </div>
  `;

  modalRoot.querySelectorAll("[data-action='close-modal']").forEach((el) => el.addEventListener("click", closeModal));
  const form = modalRoot.querySelector(`#${formId}`);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = {};
    for (const field of fields) {
      const input = form.elements[field.name];
      if (!input) continue;
      if (field.type === "checkbox") data[field.name] = input.checked;
      else if (field.type === "number") data[field.name] = parseNumber(input.value);
      else data[field.name] = input.value.trim();
    }
    onSubmit(data);
    closeModal();
  });
}

function renderField(field, item) {
  const value = item?.[field.name] ?? "";
  const required = field.required ? "required" : "";
  const full = field.full ? "full" : "";
  if (field.type === "textarea") {
    return `<div class="field ${full}"><label>${escapeHtml(field.label)}</label><textarea name="${field.name}" ${required}>${escapeHtml(value)}</textarea></div>`;
  }
  if (field.type === "select") {
    return `<div class="field ${full}"><label>${escapeHtml(field.label)}</label><select name="${field.name}" ${required}>${field.options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
  }
  if (field.type === "checkbox") {
    return `<div class="field ${full}"><label>${escapeHtml(field.label)}</label><label class="checkbox-row"><input type="checkbox" name="${field.name}" ${value ? "checked" : ""} /> 是</label></div>`;
  }
  return `<div class="field ${full}"><label>${escapeHtml(field.label)}</label><input type="${field.type}" name="${field.name}" value="${escapeHtml(value)}" ${required} /></div>`;
}

function text(name, label, full = false, required = false) { return { name, label, type: "text", full, required }; }
function textarea(name, label, full = false) { return { name, label, type: "textarea", full }; }
function dateField(name, label, required = false) { return { name, label, type: "date", required }; }
function timeField(name, label, required = false) { return { name, label, type: "time", required }; }
function datetimeField(name, label, required = false) { return { name, label, type: "datetime-local", required }; }
function numberField(name, label, required = false) { return { name, label, type: "number", required }; }
function urlField(name, label, required = false) { return { name, label, type: "url", required, full: true }; }
function selectField(name, label, options, required = false) { return { name, label, type: "select", options, required }; }
function checkboxField(name, label) { return { name, label, type: "checkbox" }; }

function closeModal() {
  modalRoot.innerHTML = "";
}

function saveAndRender(message = "已儲存") {
  saveState(false);
  toast(message);
  render();
}

function deleteRecord(collection, id) {
  if (!collection || !id) return;
  if (!confirm("確定要刪除嗎？")) return;
  state[collection] = state[collection].filter((item) => item.id !== id);
  saveAndRender("已刪除");
}

function togglePacking(id, checked) {
  const item = state.packingItems.find((x) => x.id === id);
  if (!item) return;
  item.status = checked ? "已準備" : "未準備";
  saveAndRender("行李狀態已更新");
}

function toggleTodo(id, checked) {
  const item = state.todos.find((x) => x.id === id);
  if (!item) return;
  item.status = checked ? "完成" : "未完成";
  saveAndRender("待辦狀態已更新");
}

function applyPackingTemplate() {
  const tripId = activeTrip().id;
  const names = new Set(byTrip("packingItems").map((item) => item.name));
  const template = [
    ["護照", "文件", "隨身包", true, "確認效期與影本"], ["信用卡", "文件", "隨身包", true, "至少兩張不同銀行"], ["旅平險資料", "文件", "隨身包", true, "保單號碼與電話"],
    ["歐規轉接頭", "電子用品", "登機箱", true, "Type C/E"], ["行動電源", "電子用品", "隨身包", true, "不可托運"], ["充電線", "電子用品", "隨身包", true, "iPhone / USB-C"],
    ["發熱衣", "衣物", "托運行李", true, "依天數調整"], ["厚外套", "衣物", "身上", true, "冬天歐洲必備"], ["圍巾手套", "衣物", "托運行李", false, "怕冷建議帶"],
    ["常備藥", "藥品", "隨身包", true, "感冒、腸胃、止痛"], ["保濕用品", "盥洗", "托運行李", false, "冬天乾燥"], ["折疊傘", "雜物", "登機箱", false, "雨天備用"]
  ];
  for (const [name, category, location, required, notes] of template) {
    if (!names.has(name)) state.packingItems.push({ id: uid("pack"), tripId, name, category, quantity: 1, location, status: "未準備", required, responsible: "自己", returnCheck: true, notes });
  }
  saveAndRender("已套用模板");
}

function placeToItinerary(id) {
  const place = state.places.find((x) => x.id === id);
  if (!place) return;
  openItineraryForm(null, activeTrip().startDate || todayISO());
  const form = modalRoot.querySelector("form");
  if (form) {
    form.elements.title.value = place.name || "";
    form.elements.placeName.value = place.name || "";
    form.elements.type.value = place.type || "景點";
    form.elements.address.value = place.address || "";
    form.elements.mapUrl.value = place.mapUrl || "";
    form.elements.notes.value = place.notes || "";
  }
}

async function initSupabaseSession() {
  if (!hasSupabaseConfig()) return;
  try {
    const supabase = await getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    ui.session = data.session;
    if (ui.session) await refreshCloudMetadata();
    supabase.auth.onAuthStateChange(async (_event, session) => {
      ui.session = session;
      if (session) await refreshCloudMetadata();
      render();
    });
  } catch (error) {
    console.warn(error);
    ui.syncStatus = "error";
  }
}

async function loginEmail() {
  const email = document.querySelector("#login-email")?.value?.trim();
  if (!email) return toast("請輸入 Email");
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.href.split("#")[0] }
    });
    if (error) throw error;
    toast("登入連結已寄出，請檢查 Email");
  } catch (error) {
    toast(`登入失敗：${error.message}`);
  }
}

async function refreshCloudMetadata() {
  if (!ui.session) return;
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from("tripboard_app_state").select("updated_at").eq("user_id", ui.session.user.id).maybeSingle();
    if (error) throw error;
    ui.cloudUpdatedAt = data?.updated_at || null;
  } catch (error) {
    console.warn(error);
  }
}

async function saveCloudState() {
  if (!ui.session) return toast("請先登入");
  try {
    const supabase = await getSupabaseClient();
    const payload = { ...state, updatedAt: new Date().toISOString() };
    const { error } = await supabase.from("tripboard_app_state").upsert({ user_id: ui.session.user.id, app_state: payload, updated_at: new Date().toISOString() });
    if (error) throw error;
    ui.cloudUpdatedAt = new Date().toISOString();
    toast("已上傳到雲端");
    render();
  } catch (error) {
    toast(`上傳失敗：${error.message}`);
  }
}

async function loadCloudState(confirmFirst = false) {
  if (!ui.session) return toast("請先登入");
  if (confirmFirst && !confirm("這會用雲端資料覆蓋這台裝置目前資料，確定嗎？")) return;
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.from("tripboard_app_state").select("app_state, updated_at").eq("user_id", ui.session.user.id).maybeSingle();
    if (error) throw error;
    if (!data?.app_state) return toast("雲端目前沒有資料");
    state = normalizeState(data.app_state);
    ui.cloudUpdatedAt = data.updated_at;
    saveState(false);
    toast("已從雲端下載");
    render();
  } catch (error) {
    toast(`下載失敗：${error.message}`);
  }
}

function getGoogleSyncFields() {
  try {
    return JSON.parse(localStorage.getItem(GOOGLE_SYNC_SETTINGS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function readGoogleSyncFields() {
  const fields = {
    shareCode: document.querySelector("#google-share-code")?.value?.trim() || "",
    pin: document.querySelector("#google-pin")?.value?.trim() || "",
    userName: document.querySelector("#google-user-name")?.value?.trim() || ""
  };
  localStorage.setItem(GOOGLE_SYNC_SETTINGS_KEY, JSON.stringify(fields));
  return fields;
}

function validateGoogleSyncFields(fields) {
  if (!hasGoogleSyncConfig()) {
    toast("尚未設定 Google Apps Script Web App URL");
    return false;
  }
  if (!fields.shareCode) {
    toast("請輸入共享碼");
    return false;
  }
  if (!fields.pin) {
    toast("請輸入 PIN");
    return false;
  }
  return true;
}

function googleJsonp(params) {
  return new Promise((resolve, reject) => {
    const callbackName = `tripboardGoogleCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const query = new URLSearchParams({ ...params, callback: callbackName });
    const script = document.createElement("script");
    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("讀取逾時，請確認 Apps Script URL 或網路狀態"));
    }, 15000);
    window[callbackName] = (data) => {
      clearTimeout(timeout);
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error("讀取失敗，請確認 Apps Script 已部署成 Web App"));
    };
    const baseUrl = googleScriptUrl();
    script.src = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${query.toString()}`;
    document.body.appendChild(script);
  });
}

async function saveGoogleState() {
  const fields = readGoogleSyncFields();
  if (!validateGoogleSyncFields(fields)) return;
  try {
    const payload = {
      action: "save",
      shareCode: fields.shareCode,
      pin: fields.pin,
      updatedBy: fields.userName || "未命名旅伴",
      appState: { ...state, updatedAt: new Date().toISOString() }
    };
    await fetch(googleScriptUrl(), {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    ui.cloudUpdatedAt = new Date().toISOString();
    toast("已送出儲存請求；可按「檢查雲端更新時間」確認");
    setTimeout(() => refreshGoogleMetadata(false), 1200);
    render();
  } catch (error) {
    toast(`儲存失敗：${error.message}`);
  }
}

async function refreshGoogleMetadata(showToast = false) {
  const fields = readGoogleSyncFields();
  if (!validateGoogleSyncFields(fields)) return;
  try {
    const result = await googleJsonp({ action: "metadata", shareCode: fields.shareCode, pin: fields.pin });
    if (!result.ok) throw new Error(result.error || "讀取失敗");
    ui.cloudUpdatedAt = result.updatedAt || null;
    if (showToast) toast(result.updatedAt ? `雲端更新：${formatDateTime(result.updatedAt)}` : "雲端目前沒有資料");
    render();
  } catch (error) {
    if (showToast) toast(`檢查失敗：${error.message}`);
  }
}

async function loadGoogleState(confirmFirst = false) {
  const fields = readGoogleSyncFields();
  if (!validateGoogleSyncFields(fields)) return;
  if (confirmFirst && !confirm("這會用共享雲端資料覆蓋這台裝置目前資料，確定嗎？")) return;
  try {
    const result = await googleJsonp({ action: "load", shareCode: fields.shareCode, pin: fields.pin });
    if (!result.ok) throw new Error(result.error || "讀取失敗");
    if (!result.appState) return toast("共享雲端目前沒有資料，請先從其中一台裝置儲存到雲端");
    state = normalizeState(result.appState);
    ui.cloudUpdatedAt = result.updatedAt || null;
    saveState(false);
    toast("已從共享雲端載入");
    render();
  } catch (error) {
    toast(`載入失敗：${error.message}`);
  }
}

async function logout() {
  try {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
    ui.session = null;
    toast("已登出");
    render();
  } catch (error) {
    toast(`登出失敗：${error.message}`);
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tripboard-${activeTrip()?.name || "backup"}.json`.replace(/[\\/:*?"<>|]/g, "-");
  link.click();
  URL.revokeObjectURL(url);
  toast("已匯出 JSON");
}

function importJson() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      state = normalizeState(JSON.parse(text));
      saveAndRender("已匯入 JSON");
    } catch (error) {
      toast("匯入失敗，請確認 JSON 格式");
    }
  });
  input.click();
}

function resetSample() {
  if (!confirm("確定要重置成範例資料？目前本機資料會被覆蓋。")) return;
  state = createSeedState();
  ui.view = "dashboard";
  saveAndRender("已重置成範例資料");
}

function clearLocal() {
  if (!confirm("確定要清空這台裝置的 TripBoard 資料？")) return;
  state = createEmptyState();
  localStorage.removeItem(STORAGE_KEY);
  render();
  toast("本機資料已清空");
}

function toast(message) {
  const container = document.querySelector("#toast");
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  container.appendChild(node);
  setTimeout(() => node.remove(), 2800);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => console.warn("Service worker failed", error));
  });
}
