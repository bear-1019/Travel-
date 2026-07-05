import { hasSupabaseConfig, getSupabaseClient } from "./supabase-client.js";

const STORAGE_KEY = "tripboard_state_v1";
const APP_VERSION = "2.11.1-countdown-quickadd-routine-inline";
const GOOGLE_SYNC_SETTINGS_KEY = "tripboard_google_sync_v1";
const THEME_STORAGE_KEY = "tripboard_theme_v1";

const THEMES = [
  { key: "oat", label: "奶茶藍", description: "溫暖奶茶底・深藍字體", preview: ["#f5f0e7", "#fffdf8", "#152746"], dark: false, themeColor: "#f5f0e7" },
  { key: "midnight", label: "夜幕藍", description: "深藍夜色・柔霧灰白", preview: ["#121826", "#1f2937", "#e5edf9"], dark: true, themeColor: "#121826" },
  { key: "mist", label: "晨霧灰", description: "霧灰白底・乾淨俐落", preview: ["#edf1f4", "#ffffff", "#304254"], dark: false, themeColor: "#edf1f4" },
  { key: "sage", label: "鼠尾草綠", description: "淡綠米色・墨綠文字", preview: ["#eef3ed", "#fbfdf9", "#234137"], dark: false, themeColor: "#eef3ed" },
  { key: "rose", label: "乾燥玫瑰", description: "霧粉裸色・酒紅文字", preview: ["#f7efef", "#fffafa", "#6f3745"], dark: false, themeColor: "#f7efef" },
  { key: "lavender", label: "薰衣草紫", description: "淡紫灰底・深紫字體", preview: ["#f1eff7", "#fbfaff", "#493d68"], dark: false, themeColor: "#f1eff7" },
  { key: "sky", label: "晴空藍", description: "淡天空藍・海軍藍文字", preview: ["#edf6fb", "#fbfdff", "#24506f"], dark: false, themeColor: "#edf6fb" },
  { key: "peach", label: "蜜桃杏", description: "柔杏粉底・磚紅文字", preview: ["#fbf0e9", "#fffaf6", "#7a4638"], dark: false, themeColor: "#fbf0e9" },
  { key: "sand", label: "沙丘棕", description: "沙色米底・深咖文字", preview: ["#f2eadc", "#fffaf1", "#5b4632"], dark: false, themeColor: "#f2eadc" },
  { key: "forest", label: "深林綠", description: "深墨綠底・柔白文字", preview: ["#12231e", "#1b3029", "#eaf5ef"], dark: true, themeColor: "#12231e" },
  { key: "ocean", label: "深海藍", description: "深海藍底・冰藍文字", preview: ["#0c2333", "#143247", "#e8f5fb"], dark: true, themeColor: "#0c2333" },
  { key: "plum", label: "深梅紫", description: "深紫紅底・柔粉白字", preview: ["#291a2d", "#38223d", "#f6eaf4"], dark: true, themeColor: "#291a2d" },
  { key: "coffee", label: "可可咖啡", description: "深咖啡底・奶油文字", preview: ["#2a211c", "#382c25", "#f7ecdd"], dark: true, themeColor: "#2a211c" },
  { key: "charcoal", label: "石墨黑", description: "深灰黑底・冷白文字", preview: ["#181a1f", "#24272e", "#f0f2f6"], dark: true, themeColor: "#181a1f" }
];
const THEME_MAP = Object.fromEntries(THEMES.map((theme) => [theme.key, theme]));

function hasGoogleSyncConfig() {
  const url = window.TRIPBOARD_GOOGLE_SCRIPT_URL || "";
  return Boolean(url && !url.includes("PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"));
}

function googleScriptUrl() {
  return window.TRIPBOARD_GOOGLE_SCRIPT_URL || "";
}

function normalizeTransportMethod(method = "") {
  const raw = String(method || "").trim();
  if (raw === "巴士") return "公車";
  return raw;
}

function transportMethodLabel(method = "") {
  return normalizeTransportMethod(method) || "交通";
}

function transportMethodIconName(method = "") {
  switch (normalizeTransportMethod(method)) {
    case "步行":
      return "walk";
    case "地鐵":
      return "subway";
    case "公車":
      return "bus";
    case "火車":
    case "高鐵":
      return "train";
    case "Uber":
    case "計程車":
    case "自駕":
      return "car";
    case "飛機":
      return "plane";
    case "船":
      return "ferry";
    default:
      return "route";
  }
}

function iconSvg(name, className = "app-icon") {
  const icons = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2"/>',
    sunrise: '<path d="M4 18h16"/><path d="M6 14a6 6 0 0 1 12 0"/><path d="M12 3v3M4.9 6.9 7 9M19.1 6.9 17 9M2 13h3M19 13h3"/>',
    door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M9 21V6h6v15M13 13h.01"/><path d="M3 21h18"/>',
    route: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h3a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3h-1"/><path d="m16 15 3 3-3 3"/>',
    bus: '<rect x="4" y="5" width="16" height="12" rx="3"/><path d="M7 17v2M17 17v2M7 9h10M8.5 13h.01M15.5 13h.01"/><path d="M6 9V7h12v2"/>',
    subway: '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M8 7h8M8 11h8"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M8 18l-2 3M16 18l2 3M10 21h4"/>',
    train: '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M8 7h8M8 11h8"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M8 18l-2 3M16 18l2 3M10 21h4"/>',
    car: '<path d="M5 15h14"/><path d="M7 15l1.4-4.2A2 2 0 0 1 10.3 9h3.4a2 2 0 0 1 1.9 1.3L17 15"/><rect x="4" y="11" width="16" height="5" rx="2"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>',
    ferry: '<path d="M4 15.5 12 5l8 10.5"/><path d="M6.5 12h11"/><path d="M3 18c1.6 1.3 3.1 2 4.5 2s2.9-.7 4.5-2c1.6 1.3 3.1 2 4.5 2s2.9-.7 4.5-2"/>',
    walk: '<path d="M9 5.5a1.8 1.8 0 1 0 0-.01"/><path d="M10 8.5 8.4 12l-2.2 1.4"/><path d="M10.7 9.2 13 11l2.5.2"/><path d="M9.3 12.2 11 15l-.7 5"/><path d="M12.2 11.2 13 14l2.8 2.2"/>',
    plane: '<path d="M12 2.5c.82 0 1.4.78 1.4 1.72v5.05l7.1 4.12v2.02l-7.1-2.08v5.08l2.42 1.82v1.42L12 20.55l-3.82 1.1v-1.42l2.42-1.82v-5.08l-7.1 2.08v-2.02l7.1-4.12V4.22c0-.94.58-1.72 1.4-1.72Z" fill="currentColor" stroke="none"/>',
    bed: '<path d="M3 19v-9M21 19v-7a3 3 0 0 0-3-3h-6v10"/><path d="M3 15h18M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>',
    luggage: '<path d="M7 7h10a2 2 0 0 1 2 2v10H5V9a2 2 0 0 1 2-2Z"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"/><path d="M9 11v5M15 11v5M7 19v2M17 19v2"/>',
    ticket: '<path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V6Z"/><path d="M12 6v12"/>',
    wallet: '<path d="M3 7h16a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2V7Z"/><path d="M3 7V5a2 2 0 0 1 2-2h12v4M16 12h5"/>',
    check: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 12 3 3 7-7"/>',
    pin: '<path d="M12 21s6.5-6.1 6.5-11a6.5 6.5 0 1 0-13 0c0 4.9 6.5 11 6.5 11Z"/><circle cx="12" cy="10" r="2.25"/>',
    alert: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
    sync: '<path d="M20 7.5A8 8 0 0 0 6.7 4.7L4.5 7"/><path d="M4.5 3.5V7H8"/><path d="M4 16.5a8 8 0 0 0 13.3 2.8l2.2-2.3"/><path d="M19.5 20.5V17H16"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    museum: '<path d="m3 9 9-5 9 5M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M4 20h16"/>',
    food: '<path d="M6 3v8M3 3v5a3 3 0 0 0 6 0V3M6 11v10M15 3v18M15 3c4 2 4 7 0 9"/>',
    cafe: '<path d="M4 8h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M16 10h2a3 3 0 0 1 0 6h-2M7 3v2M11 3v2"/>',
    shopping: '<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    activity: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    airport: '<path d="M4 11.2 20 4.8 14.1 19l-3.2-5.4L4 11.2Z"/><path d="m10.9 13.6 9.1-8.8"/>',
    station: '<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M8 7h8M8 14h8M8 19l-2 2M16 19l2 2"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/>',
    moon: '<path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>',
    rest: '<path d="M4 19h16M6 16h12M8 16V8h8v8M10 8V5h4v3"/>',
    fallback: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'
  };
  const body = icons[name] || icons.fallback;
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function itineraryTypeIcon(type = "") {
  const mapping = {
    "景點": "museum", "展覽": "museum", "餐廳": "food", "咖啡廳": "cafe",
    "購物": "shopping", "活動": "activity", "機場": "airport", "車站": "station",
    "夜景": "moon", "休息": "rest", "住宿": "bed", "交通": "route", "點心": "cafe", "備案": "pin"
  };
  return iconSvg(mapping[type] || "pin", "itinerary-type-icon-svg");
}

const navItems = [
  { key: "dashboard", label: "首頁", icon: "home" },
  { key: "itinerary", label: "行程", icon: "calendar" },
  { key: "transport", label: "交通", icon: "route" },
  { key: "flights", label: "航班", icon: "plane" },
  { key: "stays", label: "住宿", icon: "bed" },
  { key: "packing", label: "行李", icon: "luggage" },
  { key: "documents", label: "文件", icon: "ticket" },
  { key: "budget", label: "預算", icon: "wallet" },
  { key: "todos", label: "待辦", icon: "check" },
  { key: "places", label: "地點庫", icon: "pin" },
  { key: "emergency", label: "緊急資訊", icon: "alert" },
  { key: "settings", label: "同步設定", mobileLabel: "同步", icon: "sync" },
  { key: "more", label: "更多", icon: "more" }
];

// 簡化手機導覽：常用功能常駐，其餘集中在「更多」。
const mobileNavItems = ["dashboard", "itinerary", "flights", "stays", "more"];

function loadThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_MAP[saved] ? saved : "oat";
  } catch (error) {
    return "oat";
  }
}

function currentTheme() {
  return THEME_MAP[ui?.theme] || THEMES[0];
}

function applyTheme() {
  const theme = currentTheme();
  document.documentElement.dataset.theme = theme.key;
  document.body.dataset.theme = theme.key;
  document.documentElement.style.colorScheme = theme.dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme.themeColor);
}

function setThemePreference(key, showToast = true) {
  if (!THEME_MAP[key]) return;
  ui.theme = key;
  localStorage.setItem(THEME_STORAGE_KEY, key);
  applyTheme();
  render();
  if (showToast) toast("已切換為「" + THEME_MAP[key].label + "」主題");
}

const collections = [
  "trips", "flights", "stays", "itineraryItems", "transportSegments", "dailyRoutines", "packingItems",
  "documents", "expenses", "todos", "places", "emergencyInfos"
];

let state = loadState();
let ui = {
  view: "dashboard",
  filterDate: "all",
  session: null,
  syncStatus: "local",
  cloudUpdatedAt: null,
  expandedItineraryIds: new Set(),
  theme: loadThemePreference()
};

const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");

init();

async function init() {
  if (!state.trips.length) {
    state = createSeedState();
    saveState(false);
  }
  applyTheme();
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

function formatFocusedDate(value) {
  if (!value) return "日期未設定";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = new Intl.DateTimeFormat("zh-TW", { weekday: "short" }).format(date);
  return `${year}年${month}月${day}日（${weekday}）`;
}

function formatDateYmd(value) {
  if (!value) return "日期未設定";
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  return `${parts[0]}/${parts[1]}/${parts[2]}`;
}

function localDateOnly(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function tripCountdownText(trip) {
  const start = localDateOnly(trip?.startDate);
  const end = localDateOnly(trip?.endDate);
  if (!start) return "尚未設定出發日期";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const daysToStart = Math.round((start - today) / dayMs);
  if (daysToStart > 0) return `距離出發還有 ${daysToStart} 天`;
  if (daysToStart === 0) return "今天出發";
  if (end && today <= end) {
    const tripDay = Math.floor((today - start) / dayMs) + 1;
    return `旅程進行中・Day ${tripDay}`;
  }
  return "旅程已結束";
}

function getDailyRoutine(date, tripId = activeTrip()?.id) {
  return state.dailyRoutines.find((item) => item.tripId === tripId && item.date === date) || null;
}

function addMinutesToTime(time, minutes) {
  if (!time || !Number.isFinite(minutes)) return "";
  const parts = String(time).split(":").map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) return "";
  const total = (parts[0] * 60 + parts[1] + minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function parseDurationText(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return 0;

  const clockMatch = text.match(/^(\d+)\s*:\s*(\d{1,2})$/);
  if (clockMatch) return Math.max(0, Number(clockMatch[1]) * 60 + Number(clockMatch[2]));

  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:小時|小时|時|时|hours?|hrs?|h)(?![a-z])/i);
  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:分鐘|分钟|分|minutes?|mins?|min|m)(?![a-z])/i);

  let total = 0;
  if (hourMatch) total += Math.round(Number(hourMatch[1]) * 60);
  if (minuteMatch) total += Math.round(Number(minuteMatch[1]));
  if (total > 0) return total;

  const plainNumber = text.match(/\d+(?:\.\d+)?/);
  return plainNumber ? Math.max(0, Math.round(Number(plainNumber[0]))) : 0;
}

function getTransportDurationMinutes(item = {}) {
  const storedTotal = Number(item.durationTotalMinutes);
  if (Number.isFinite(storedTotal) && storedTotal > 0) return Math.round(storedTotal);

  const hours = Number(item.durationHours);
  const minutes = Number(item.durationMinutes);
  if ((Number.isFinite(hours) || Number.isFinite(minutes)) && ((hours || 0) * 60 + (minutes || 0)) > 0) {
    return Math.max(0, Math.round((hours || 0) * 60 + (minutes || 0)));
  }

  return parseDurationText(item.duration);
}

function durationPartsFromItem(item = {}) {
  const total = getTransportDurationMinutes(item);
  if (total > 0) return { hours: Math.floor(total / 60), minutes: total % 60 };
  return { hours: 0, minutes: 1 };
}

function formatTransportDuration(totalMinutes) {
  const total = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (!total) return "";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours && minutes) return `${hours} 小時 ${minutes} 分鐘`;
  if (hours) return `${hours} 小時`;
  return `${minutes} 分鐘`;
}

function transportDurationLabel(item) {
  return formatTransportDuration(getTransportDurationMinutes(item)) || String(item?.duration || "").trim();
}

function inferTransportEndTime(item) {
  if (item?.endTime) return String(item.endTime).slice(0, 5);
  const totalMinutes = getTransportDurationMinutes(item);
  if (!totalMinutes) return "";
  return addMinutesToTime(item.startTime, totalMinutes);
}

function resolveFocusedDate(days, items) {
  if (!days.length) return "";
  if (ui.filterDate && ui.filterDate !== "all" && days.includes(ui.filterDate)) return ui.filterDate;
  const today = todayISO();
  if (days.includes(today)) return today;
  const firstScheduled = items.find((item) => days.includes(item.date))?.date;
  return firstScheduled || days[0];
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
  const startParts = String(start).split("-").map(Number);
  const endParts = String(end).split("-").map(Number);
  if (startParts.length !== 3 || endParts.length !== 3 || startParts.some(Number.isNaN) || endParts.some(Number.isNaN)) return [];

  const cursor = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
  const last = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));
  const days = [];

  while (cursor <= last) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cursor.getUTCDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
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

function splitLocalDateTime(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return match ? { date: match[1], time: match[2] } : { date: "", time: "" };
}

function flightTransportPayload(targetState, flight) {
  const departure = splitLocalDateTime(flight.departure);
  const arrival = splitLocalDateTime(flight.arrival);
  const trip = targetState.trips.find((item) => item.id === flight.tripId);
  const airlineAndNumber = [flight.airline, flight.flightNumber].filter(Boolean).join(" ").trim();
  const bookingText = flight.bookingRef ? `PNR ${flight.bookingRef}` : "";
  const arrivalText = arrival.date && arrival.time ? `抵達 ${formatDateYmd(arrival.date)} ${arrival.time}` : "";

  return {
    tripId: flight.tripId,
    sourceType: "flight",
    sourceFlightId: flight.id,
    date: departure.date,
    startTime: departure.time,
    endTime: arrival.time,
    arrivalDate: arrival.date,
    fromName: flight.fromAirport || "出發機場",
    toName: flight.toAirport || "抵達機場",
    method: "飛機",
    duration: "",
    durationHours: 0,
    durationMinutes: 0,
    durationTotalMinutes: 0,
    cost: 0,
    currency: trip?.currency || "TWD",
    route: airlineAndNumber,
    departStation: flight.fromAirport || "",
    arrivalStation: flight.toAirport || "",
    transferInfo: arrivalText,
    luggageFriendly: "高",
    bookingStatus: flight.bookingRef ? "已訂位" : "需訂位",
    ticketInfo: bookingText,
    mapUrl: "",
    backup: "",
    notes: "由航班資料自動加入每日行程；請在航班頁編輯。"
  };
}

function syncFlightTransportInState(targetState, flight) {
  if (!flight?.id) return;
  const linked = targetState.transportSegments.filter((item) => item.sourceType === "flight" && item.sourceFlightId === flight.id);
  const shouldSync = flight.syncToItinerary !== false;
  const departure = splitLocalDateTime(flight.departure);

  if (!shouldSync || !departure.date) {
    targetState.transportSegments = targetState.transportSegments.filter((item) => !(item.sourceType === "flight" && item.sourceFlightId === flight.id));
    return;
  }

  const payload = flightTransportPayload(targetState, flight);
  if (linked.length) {
    Object.assign(linked[0], payload);
    if (linked.length > 1) {
      const keepId = linked[0].id;
      targetState.transportSegments = targetState.transportSegments.filter((item) => !(item.sourceType === "flight" && item.sourceFlightId === flight.id && item.id !== keepId));
    }
  } else {
    targetState.transportSegments.push({ id: uid("transport"), ...payload });
  }
}

function syncAllFlightTransportsInState(targetState) {
  const validFlightIds = new Set(targetState.flights.map((flight) => flight.id));
  targetState.transportSegments = targetState.transportSegments.filter((item) => item.sourceType !== "flight" || validFlightIds.has(item.sourceFlightId));
  for (const flight of targetState.flights) {
    if (flight.syncToItinerary === undefined) flight.syncToItinerary = true;
    syncFlightTransportInState(targetState, flight);
  }
}

function normalizeState(input) {
  const base = createEmptyState();
  const next = { ...base, ...input };
  for (const key of collections) {
    if (!Array.isArray(next[key])) next[key] = [];
  }
  if (!next.activeTripId && next.trips.length) next.activeTripId = next.trips[0].id;
  syncAllFlightTransportsInState(next);
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
    dailyRoutines: [],
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
      budgetUnlimited: false,
      currency: "TWD",
      travelers: "2 人",
      progressFlights: 80,
      progressStays: 45,
      progressItinerary: 35,
      progressTransport: 25,
      progressDocuments: 20,
      progressPacking: 10,
      note: "這是一筆範例資料。你可以直接編輯、刪除，或建立自己的旅程。"
    }],
    flights: [{
      id: uid("flight"), tripId, type: "去程", airline: "Emirates", flightNumber: "EK367 / EK073", syncToItinerary: true,
      bookingRef: "待填", fromAirport: "TPE 台北桃園", toAirport: "CDG 巴黎戴高樂",
      departure: "2026-12-23T00:30", arrival: "2026-12-23T12:25", terminal: "待確認", gate: "待確認",
      seat: "", cabin: "Economy", checkedBaggage: "30kg", carryOn: "7kg", price: 0, notes: "確認轉機時間、線上報到與行李規定。"
    }],
    stays: [{
      id: uid("stay"), tripId, name: "Hotel Eiffel Seine", type: "飯店", checkInDate: "2026-12-23", checkOutDate: "2026-12-24",
      address: "3 Boulevard de Grenelle, Paris", mapUrl: "", checkInTime: "15:00", checkOutTime: "11:00",
      platform: "Booking.com", bookingNumber: "待填", roomType: "Balcony Room", price: 15000,
      paidStatus: "待付款", cancellationDeadline: "2026-12-10", luggageStorage: "可詢問", contact: "待填", notes: "希望有陽台或鐵塔景。"
    }],
    itineraryItems: [
      { id: uid("item"), tripId, date: "2026-12-23", startTime: "12:25", endTime: "13:30", type: "機場", title: "抵達巴黎 CDG", address: "CDG Airport", mapUrl: "", website: "", openingHours: "", lastEntry: "", ticketRequired: "否", ticketStatus: "不需", ticketPrice: 0, ticketLink: "", budget: 0, status: "已排入", priority: "必去", weatherType: "室內", notes: "入境、領行李、確認進市區交通。" },
      { id: uid("item"), tripId, date: "2026-12-24", startTime: "10:00", endTime: "13:00", type: "景點", title: "羅浮宮", address: "Rue de Rivoli, Paris", mapUrl: "", website: "", openingHours: "09:00-18:00", lastEntry: "17:00", ticketRequired: "是", ticketStatus: "待購買", ticketPrice: 22, ticketLink: "", budget: 22, status: "想去", priority: "必去", weatherType: "室內", notes: "建議提早 15 分鐘到，先確認閉館日與預約時段。" }
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
    expenses: [],
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
  applyTheme();
  const trip = activeTrip();
  app.innerHTML = `
    <div class="app-shell view-${ui.view}">
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
      <div class="brand brand-wordmark">
        <span class="brand-mark" aria-hidden="true">${iconSvg("route", "brand-mark-svg")}</span>
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
        ${navItems.filter((item) => item.key !== "more").map((item) => `
          <button type="button" data-view="${item.key}" class="${ui.view === item.key ? "active" : ""}">
            <span class="nav-emoji">${iconSvg(item.icon, "nav-icon-svg")}</span><span class="nav-label">${item.label}</span>
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
  const primaryViews = new Set(["dashboard", "itinerary", "flights", "stays"]);
  return `
    <nav class="mobile-tabs" aria-label="主要導覽">
      ${navItems.filter((item) => mobileNavItems.includes(item.key)).map((item) => {
        const active = item.key === "more" ? !primaryViews.has(ui.view) : ui.view === item.key;
        return `
          <button type="button" data-view="${item.key}" class="${active ? "active" : ""}">
            <span class="mobile-tab-icon">${iconSvg(item.icon, "mobile-nav-icon-svg")}</span><span>${item.mobileLabel || item.label}</span>
          </button>
        `;
      }).join("")}
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
    settings: renderSettings,
    more: renderMore
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


function clampPercentage(value, fallback = 0) {
  const raw = value === undefined || value === null || value === "" ? fallback : value;
  const n = Number(raw);
  if (!Number.isFinite(n)) return Math.max(0, Math.min(100, Number(fallback) || 0));
  return Math.max(0, Math.min(100, Math.round(n)));
}

function completionValue(trip, fieldName, fallback = 0) {
  return clampPercentage(trip?.[fieldName], fallback);
}

function renderProgressLine(label, value) {
  const pct = clampPercentage(value);
  return `
    <div class="progress-line">
      <div class="progress-line-head"><span>${escapeHtml(label)}</span><strong>${pct}%</strong></div>
      <div class="progress"><span style="width:${pct}%"></span></div>
    </div>
  `;
}

function progressFallbacks(trip) {
  const flights = byTrip("flights");
  const stays = byTrip("stays");
  const itinerary = byTrip("itineraryItems");
  const transports = byTrip("transportSegments");
  const documents = byTrip("documents");
  const packing = byTrip("packingItems");
  const packed = packing.filter((p) => ["已準備", "已放入行李"].includes(p.status)).length;
  return {
    progressFlights: flights.length ? 50 : 0,
    progressStays: stays.length ? 50 : 0,
    progressItinerary: itinerary.length ? 35 : 0,
    progressTransport: transports.length ? 35 : 0,
    progressDocuments: documents.length ? 30 : 0,
    progressPacking: packing.length ? Math.round(packed / packing.length * 100) : 0
  };
}

function tripProgressValues(trip) {
  const fallback = progressFallbacks(trip);
  return {
    flights: completionValue(trip, "progressFlights", fallback.progressFlights),
    stays: completionValue(trip, "progressStays", fallback.progressStays),
    itinerary: completionValue(trip, "progressItinerary", fallback.progressItinerary),
    transport: completionValue(trip, "progressTransport", fallback.progressTransport),
    documents: completionValue(trip, "progressDocuments", fallback.progressDocuments),
    packing: completionValue(trip, "progressPacking", fallback.progressPacking)
  };
}

function overallProgress(trip) {
  const values = Object.values(tripProgressValues(trip));
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, item) => sum + item, 0) / values.length);
}

function renderTripProgressPanel(trip) {
  const values = tripProgressValues(trip);
  return `
    <section class="section card progress-panel">
      <div class="section-head">
        <div><h2>規劃完成度</h2><p class="subtitle compact-subtitle">這裡是手動設定的進度；點「編輯旅程」就能調整各項百分比。</p></div>
        <button class="btn small" data-action="edit-trip" data-id="${trip.id}">修改完成度</button>
      </div>
      <div class="progress-grid">
        ${renderProgressLine("航班", values.flights)}
        ${renderProgressLine("住宿", values.stays)}
        ${renderProgressLine("行程", values.itinerary)}
        ${renderProgressLine("交通", values.transport)}
        ${renderProgressLine("文件", values.documents)}
        ${renderProgressLine("行李", values.packing)}
      </div>
    </section>
  `;
}

function amountText(item, fallbackCurrency) {
  return currency(item.amount, item.currency || fallbackCurrency || activeTrip()?.currency || "TWD");
}

function budgetTitle(...parts) {
  return parts.map((part) => String(part || "").trim()).filter(Boolean).join(" ") || "未命名項目";
}

function getBudgetSummary(trip) {
  const defaultCurrency = trip.currency || "TWD";
  const plannedRows = [];
  const expenseRows = [];
  const push = (rows, category, title, amount, currencyCode = defaultCurrency, source = "") => {
    const n = parseNumber(amount);
    if (n <= 0) return;
    rows.push({ category, title: title || category, amount: n, currency: currencyCode || defaultCurrency, source });
  };

  byTrip("flights").forEach((item) => {
    push(plannedRows, "航班", budgetTitle(item.airline, item.flightNumber, item.fromAirport && item.toAirport ? `${item.fromAirport} → ${item.toAirport}` : ""), item.price, defaultCurrency, "航班票價");
  });
  byTrip("stays").forEach((item) => {
    push(plannedRows, "住宿", budgetTitle(item.name, item.checkInDate && item.checkOutDate ? `${item.checkInDate} - ${item.checkOutDate}` : ""), item.price, defaultCurrency, "住宿價格");
  });
  byTrip("itineraryItems").forEach((item) => {
    const amount = parseNumber(item.budget) || parseNumber(item.ticketPrice);
    const source = parseNumber(item.budget) ? "行程預估花費" : "門票價格";
    push(plannedRows, item.type || "行程", budgetTitle(item.title, item.address), amount, defaultCurrency, source);
  });
  byTrip("transportSegments").forEach((item) => {
    push(plannedRows, "交通", budgetTitle(item.method, item.fromName && item.toName ? `${item.fromName} → ${item.toName}` : item.route), item.cost, item.currency || defaultCurrency, "交通費用");
  });
  byTrip("documents").forEach((item) => {
    push(plannedRows, item.type || "文件", budgetTitle(item.name, item.relatedTo), item.amount, item.currency || defaultCurrency, "文件 / 票券金額");
  });
  byTrip("expenses").forEach((item) => {
    push(expenseRows, item.category || "支出", item.title || item.notes || "支出紀錄", item.amount, item.currency || defaultCurrency, item.status || "支出紀錄");
  });

  const plannedTotal = plannedRows.reduce((sum, item) => sum + parseNumber(item.amount), 0);
  const expenseTotal = expenseRows.reduce((sum, item) => sum + parseNumber(item.amount), 0);
  const paidTotal = expenseRows.filter((item) => item.source === "已付款").reduce((sum, item) => sum + parseNumber(item.amount), 0);
  const total = plannedTotal + expenseTotal;
  const unlimited = Boolean(trip.budgetUnlimited);
  const target = unlimited ? 0 : parseNumber(trip.budget);
  return { plannedRows, expenseRows, plannedTotal, expenseTotal, paidTotal, total, target, unlimited, remaining: unlimited ? null : target - total, currency: defaultCurrency };
}

function renderBudgetSourceRows(rows, fallbackCurrency, emptyText = "尚無自動加總項目") {
  if (!rows.length) return `<div class="empty"><strong>${escapeHtml(emptyText)}</strong>在航班、住宿、行程、交通、文件或支出裡填金額後，這裡會自動更新。</div>`;
  return rows.map((item) => `
    <div class="item-row budget-source-row">
      <div>
        <strong>${escapeHtml(item.category)}</strong>
        <div class="item-meta">${escapeHtml(item.title)}${item.source ? `｜${escapeHtml(item.source)}` : ""}</div>
      </div>
      <span>${amountText(item, fallbackCurrency)}</span>
    </div>
  `).join("");
}

function renderBudgetOverviewPanel(trip) {
  const summary = getBudgetSummary(trip);
  const usagePct = summary.target > 0 ? Math.min(100, Math.round(summary.total / summary.target * 100)) : 0;
  const previewRows = [...summary.plannedRows, ...summary.expenseRows].slice(0, 6);
  return `
    <section class="section card budget-overview-panel">
      <div class="section-head">
        <div>
          <h2>預算概況</h2>
          <p class="subtitle compact-subtitle">會自動加總航班票價、住宿價格、行程預估花費、交通費用、文件金額與支出紀錄。</p>
        </div>
        <button class="btn small" data-view="budget">查看預算</button>
      </div>
      <div class="budget-overview-grid">
        <div>
          <div class="stat-label">自動加總</div>
          <div class="stat-value">${currency(summary.total, summary.currency)}</div>
          <div class="stat-note">已規劃 ${currency(summary.plannedTotal, summary.currency)}｜支出紀錄 ${currency(summary.expenseTotal, summary.currency)}</div>
          ${summary.unlimited ? `<div class="budget-unlimited-line">∞ 無預算限制</div>` : `<div class="progress"><span style="width:${usagePct}%"></span></div>`}
          <div class="stat-note">${summary.unlimited ? "目前僅追蹤與加總花費，不設定上限" : `目標 ${currency(summary.target, summary.currency)}｜剩餘 ${currency(summary.remaining, summary.currency)}`}</div>
        </div>
        <div class="list compact-list">
          ${renderBudgetSourceRows(previewRows, summary.currency, "尚無預算項目")}
        </div>
      </div>
    </section>
  `;
}

function renderSimpleProgressRow(label, value, icon) {
  const pct = clampPercentage(value);
  return `
    <div class="simple-progress-row">
      <span class="simple-progress-icon">${iconSvg(icon, "simple-progress-svg")}</span>
      <span class="simple-progress-label">${escapeHtml(label)}</span>
      <div class="progress"><span style="width:${pct}%"></span></div>
      <strong>${pct}%</strong>
    </div>`;
}

function progressRingSvg(percent) {
  const pct = clampPercentage(percent);
  const radius = 27;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  return `
    <div class="budget-ring" aria-label="預算使用 ${pct}%">
      <svg viewBox="0 0 68 68" role="img">
        <circle class="budget-ring-track" cx="34" cy="34" r="${radius}"></circle>
        <circle class="budget-ring-value" cx="34" cy="34" r="${radius}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"></circle>
      </svg>
      <strong>${pct}%</strong>
    </div>`;
}

function renderDashboard(trip) {
  const tripDays = daysBetween(trip.startDate, trip.endDate);
  const items = sortByDateTime(byTrip("itineraryItems"));
  const flights = byTrip("flights");
  const stays = byTrip("stays");
  const documents = byTrip("documents");
  const budgetSummary = getBudgetSummary(trip);
  const usagePct = budgetSummary.target > 0 ? Math.min(100, Math.round(budgetSummary.total / budgetSummary.target * 100)) : 0;
  const itineraryPct = completionValue(trip, "progressItinerary", items.length ? Math.min(100, items.length * 10) : 0);
  const stayPct = completionValue(trip, "progressStays", stays.length ? 70 : 0);
  const reservationPct = Math.round((completionValue(trip, "progressFlights", flights.length ? 80 : 0) + completionValue(trip, "progressDocuments", documents.length ? 40 : 0)) / 2);

  return `
    <div class="home-dashboard">
      ${topbar({
        eyebrow: "TripBoard",
        title: trip.name,
        subtitle: `${escapeHtml(trip.destination || "未設定目的地")}｜${formatDateLong(trip.startDate)} - ${formatDateLong(trip.endDate)}`,
        actions: `<button class="btn" data-action="edit-trip" data-id="${trip.id}">編輯旅程</button><button class="btn primary" data-action="new-itinerary">＋ 新增行程</button>`
      })}

      <section class="home-trip-card card">
        <div class="home-trip-card-main">
          <div class="home-section-label">目前旅程</div>
          <select class="home-trip-select" data-action="switch-trip" aria-label="切換旅程">
            ${state.trips.map((item) => `<option value="${item.id}" ${item.id === state.activeTripId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
          </select>
          <div class="home-trip-date">${formatDateYmd(trip.startDate)} – ${formatDateYmd(trip.endDate)}</div>
          <div class="home-trip-meta">${tripDays.length} 天・${escapeHtml(trip.destination || "目的地未填")}</div>
          <div class="home-trip-countdown">${escapeHtml(tripCountdownText(trip))}</div>
        </div>
        <div class="home-trip-side">
          <span class="trip-status-pill">${escapeHtml(trip.status || "規劃中")}</span>
          <div class="home-trip-actions">
            <button class="home-mini-action" data-action="edit-trip" data-id="${trip.id}">編輯旅程</button>
            <button class="home-mini-action primary" data-action="new-trip">＋ 新旅程</button>
          </div>
        </div>
      </section>

      <section class="home-section home-quick-add-section">
        <div class="home-section-label">快速新增</div>
        <div class="home-quick-add-row">
          <button class="home-quick-add" data-action="new-itinerary">${iconSvg("calendar", "home-quick-add-icon")}<span>行程</span></button>
          <button class="home-quick-add" data-action="new-transport">${iconSvg("route", "home-quick-add-icon")}<span>交通</span></button>
          <button class="home-quick-add" data-action="new-flight">${iconSvg("plane", "home-quick-add-icon")}<span>航班</span></button>
          <button class="home-quick-add" data-action="new-stay">${iconSvg("bed", "home-quick-add-icon")}<span>住宿</span></button>
        </div>
      </section>

      <section class="home-section">
        <div class="home-section-heading">
          <div class="home-section-label">規劃進度</div>
          <button class="home-section-action" data-action="edit-trip" data-id="${trip.id}">調整進度</button>
        </div>
        <div class="card simple-progress-card">
          ${renderSimpleProgressRow("行程", itineraryPct, "calendar")}
          ${renderSimpleProgressRow("住宿", stayPct, "bed")}
          ${renderSimpleProgressRow("預訂", reservationPct, "ticket")}
        </div>
      </section>

      <section class="home-section">
        <div class="home-section-label">預算概況</div>
        <div class="card simple-budget-card">
          <div class="budget-wallet-icon">${iconSvg("wallet", "budget-overview-svg")}</div>
          <div class="simple-budget-copy">
            <span>已規劃與支出</span>
            <strong>${currency(budgetSummary.total, budgetSummary.currency)}</strong>
            <small>${budgetSummary.unlimited ? "無預算限制・僅追蹤目前花費" : `總預算 ${currency(budgetSummary.target, budgetSummary.currency)}・剩餘 ${currency(budgetSummary.remaining, budgetSummary.currency)}`}</small>
          </div>
          ${budgetSummary.unlimited ? `<div class="budget-ring budget-ring-unlimited" aria-label="無預算限制"><strong>∞</strong></div>` : progressRingSvg(usagePct)}
        </div>
        <button class="text-link-button" data-view="budget">查看預算明細 →</button>
      </section>
    </div>
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
          <div class="item-meta">${formatDateLong(item.date)}｜${escapeHtml(item.address || "地址未填")}</div>
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
  const focusedDate = resolveFocusedDate(days, items);
  ui.filterDate = focusedDate || "all";
  const focusedIndex = Math.max(0, days.indexOf(focusedDate));
  const previousDate = focusedIndex > 0 ? days[focusedIndex - 1] : "";
  const nextDate = focusedIndex >= 0 && focusedIndex < days.length - 1 ? days[focusedIndex + 1] : "";
  const dayItems = items.filter((item) => item.date === focusedDate);
  const dayTransports = transports.filter((item) => item.date === focusedDate);
  const dailyRoutine = getDailyRoutine(focusedDate, trip.id);

  return `
    <div class="itinerary-view mockup-itinerary-view">
      <header class="itinerary-screen-header">
        <button class="icon-button itinerary-back" data-view="dashboard" aria-label="返回首頁">${iconSvg("chevronLeft", "header-icon-svg")}</button>
        <h1>每日行程</h1>
        <label class="itinerary-calendar-icon itinerary-calendar-button" aria-label="選擇行程日期" title="選擇日期">
          ${iconSvg("calendar", "header-icon-svg")}
          <input class="native-date-picker" type="date" data-itinerary-date-picker min="${escapeHtml(trip.startDate || "")}" max="${escapeHtml(trip.endDate || "")}" value="${escapeHtml(focusedDate || "")}" />
        </label>
      </header>

      <div class="focused-date-navigator" aria-label="切換日期">
        <button class="date-arrow" ${previousDate ? `data-filter-date="${previousDate}"` : "disabled"} aria-label="前一天">${iconSvg("chevronLeft", "date-arrow-svg")}</button>
        <div class="focused-date-label">
          ${iconSvg("calendar", "focused-date-icon")}
          <strong>${escapeHtml(formatFocusedDate(focusedDate))}</strong>
          <span>Day ${focusedIndex + 1}</span>
        </div>
        <button class="date-arrow" ${nextDate ? `data-filter-date="${nextDate}"` : "disabled"} aria-label="後一天">${iconSvg("chevronRight", "date-arrow-svg")}</button>
      </div>

      <div class="itinerary-quick-actions">
        <button class="quiet-action" data-action="export-itinerary-pdf">${iconSvg("ticket", "quick-action-icon")}<span>匯出 PDF</span></button>
        <button class="quiet-action" data-action="new-transport" data-date="${focusedDate}">${iconSvg("route", "quick-action-icon")}<span>交通</span></button>
        <button class="quiet-action primary" data-action="new-itinerary" data-date="${focusedDate}"><span class="plus-mark">＋</span><span>行程</span></button>
      </div>

      ${renderDailyRoutineStrip(focusedDate, dailyRoutine)}

      <section class="focused-day-timeline" aria-label="${escapeHtml(formatFocusedDate(focusedDate))}行程">
        ${renderFocusedDayTimeline(focusedDate, dayItems, dayTransports)}
      </section>
    </div>
  `;
}

function renderDailyRoutineStrip(date, routine) {
  const hasTimes = routine?.wakeTime || routine?.leaveTime;
  return `
    <section class="daily-routine-strip ${hasTimes ? "has-routine" : "is-empty"}" aria-label="每日作息">
      <div class="daily-routine-inline" role="group" aria-label="每日作息資訊">
        <span class="daily-routine-chip">${iconSvg("sunrise", "daily-routine-icon")}<span class="daily-routine-chip-label">起床</span><strong>${escapeHtml(routine?.wakeTime || "未設定")}</strong></span>
        <span class="daily-routine-separator" aria-hidden="true">｜</span>
        <span class="daily-routine-chip">${iconSvg("door", "daily-routine-icon")}<span class="daily-routine-chip-label">出門</span><strong>${escapeHtml(routine?.leaveTime || "未設定")}</strong></span>
      </div>
      <button class="daily-routine-edit" data-action="edit-daily-routine" data-date="${escapeHtml(date || "")}">${hasTimes ? "編輯" : "設定"}</button>
    </section>
  `;
}

function buildTimelineBlocks(items, transports) {
  const blocks = [];
  const usedTransportIds = new Set();
  const sortedItems = sortByDateTime(items);
  const sortedTransports = sortByDateTime(transports);

  for (const item of sortedItems) {
    const candidates = sortedTransports.filter((transport) => !usedTransportIds.has(transport.id) && transport.startTime && item.startTime && transport.startTime <= item.startTime);
    const relatedTransport = candidates.at(-1);
    if (relatedTransport) {
      usedTransportIds.add(relatedTransport.id);
      blocks.push({ type: "transport", value: relatedTransport });
    }
    blocks.push({ type: "item", value: item });
  }

  sortedTransports
    .filter((transport) => !usedTransportIds.has(transport.id))
    .forEach((transport) => blocks.push({ type: "transport", value: transport }));

  return blocks.sort((a, b) => `${a.value.startTime || "99:99"}`.localeCompare(`${b.value.startTime || "99:99"}`));
}

function renderFocusedDayTimeline(day, items, transports) {
  const blocks = buildTimelineBlocks(items, transports);
  if (!day) return emptyBlock("日期尚未設定", "請先編輯旅程的開始與結束日期。");
  if (!blocks.length) {
    return `
      <div class="focused-empty-state">
        <div class="focused-empty-icon">${iconSvg("calendar", "empty-calendar-icon")}</div>
        <strong>這一天還沒有安排</strong>
        <span>新增景點、餐廳、活動或交通。</span>
        <div>
          <button class="btn small" data-action="new-transport" data-date="${day}">＋ 交通</button>
          <button class="btn small primary" data-action="new-itinerary" data-date="${day}">＋ 行程</button>
        </div>
      </div>`;
  }
  return `<div class="single-day-timeline">${blocks.map((block) => block.type === "item" ? renderTimelineItem(block.value) : renderTransportInline(block.value)).join("")}</div>`;
}

function renderDayTimeline(day, dayNo, items, transports) {
  return `
    <article class="card day-card">
      <div class="day-head">
        <div><div class="day-title">Day ${dayNo}</div><div class="day-date">${formatDateLong(day)}</div></div>
        <div class="day-actions">
          <button class="btn small" data-action="new-transport" data-date="${day}">＋ 交通</button>
          <button class="btn small primary" data-action="new-itinerary" data-date="${day}">＋ 行程</button>
        </div>
      </div>
      <div class="timeline-body">${buildTimelineBlocks(items, transports).map((block) => block.type === "item" ? renderTimelineItem(block.value) : renderTransportInline(block.value)).join("")}</div>
    </article>
  `;
}

function renderTimelineItem(item) {
  const startLabel = escapeHtml(item.startTime || "未定");
  const endLabel = item.endTime ? escapeHtml(item.endTime) : "";
  const expanded = ui.expandedItineraryIds.has(item.id);
  const timeBlock = endLabel
    ? `<div class="time-range has-end"><div class="time-mark start"><strong>${startLabel}</strong><span class="time-dot start-dot" aria-hidden="true"></span></div><span class="time-range-line" aria-hidden="true"></span><div class="time-mark end"><strong>${endLabel}</strong><span class="time-dot end-dot" aria-hidden="true"></span></div></div>`
    : `<div class="time-range single"><div class="time-mark start"><strong>${startLabel}</strong><span class="time-dot start-dot" aria-hidden="true"></span></div></div>`;

  const summaryTags = [
    item.type ? `<span class="badge">${escapeHtml(item.type)}</span>` : "",
    item.priority ? `<span class="badge">${escapeHtml(item.priority)}</span>` : "",
    item.ticketRequired === "是" ? `<span class="badge">${escapeHtml(item.ticketStatus || "門票")}</span>` : ""
  ].filter(Boolean).slice(0, 3).join("");

  return `
    <div class="timeline-item mockup-timeline-item ${expanded ? "is-expanded" : ""}">
      <div class="timeline-time">${timeBlock}</div>
      <article class="timeline-content simplified-item-card mockup-itinerary-card">
        <div class="mockup-card-layout">
          <div class="itinerary-type-orb">${itineraryTypeIcon(item.type)}</div>
          <div class="mockup-card-main">
            <div class="item-row simplified-item-head">
              <div class="simplified-item-copy">
                <div class="item-title">${escapeHtml(item.title)}</div>
                <div class="item-meta">${escapeHtml(item.address || "地址未填")}</div>
              </div>
              <button class="more-dot-button" data-action="toggle-itinerary-details" data-id="${item.id}" aria-expanded="${expanded}" aria-label="${expanded ? "收合資訊" : "展開更多資訊"}">${iconSvg("more", "more-dots-svg")}</button>
            </div>
            ${summaryTags ? `<div class="badges summary-badges">${summaryTags}</div>` : ""}
            <div class="itinerary-extra ${expanded ? "open" : ""}">
              <div class="badges detail-badges">
                ${item.openingHours ? `<span class="badge blue">營業 ${escapeHtml(item.openingHours)}</span>` : ""}
                ${item.lastEntry ? `<span class="badge">最後入場 ${escapeHtml(item.lastEntry)}</span>` : ""}
                ${item.budget ? `<span class="badge green">預算 ${currency(item.budget, activeTrip().currency || "TWD")}</span>` : ""}
                ${item.weatherType ? `<span class="badge">${escapeHtml(item.weatherType)}</span>` : ""}
              </div>
              ${renderLinks(item)}
              ${item.notes ? `<div class="item-meta item-notes">${escapeHtml(item.notes)}</div>` : ""}
              <div class="expanded-actions">
                <button class="btn small" data-action="edit-itinerary" data-id="${item.id}">編輯</button>
                <button class="btn small danger" data-action="delete" data-collection="itineraryItems" data-id="${item.id}">刪除</button>
              </div>
            </div>
            <button class="expand-details-button" data-action="toggle-itinerary-details" data-id="${item.id}">${expanded ? "收合資訊" : "展開更多"}<span>${expanded ? "⌃" : "⌄"}</span></button>
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderTransportInline(item) {
  const startLabel = escapeHtml(item.startTime || "");
  const endLabel = escapeHtml(inferTransportEndTime(item));
  const flightLinked = item.sourceType === "flight" && item.sourceFlightId;
  const methodLabel = transportMethodLabel(item.method);
  const methodIcon = transportMethodIconName(item.method);
  const arrivalSuffix = flightLinked && item.arrivalDate && item.arrivalDate !== item.date
    ? `・抵達 ${escapeHtml(formatDateYmd(item.arrivalDate))} ${escapeHtml(item.endTime || "")}`
    : "";
  const inlineActions = flightLinked
    ? `<button class="mini-link" data-action="edit-flight" data-id="${item.sourceFlightId}">編輯航班</button>`
    : `<button class="mini-link" data-action="edit-transport" data-id="${item.id}">編輯</button><button class="mini-link danger" data-action="delete" data-collection="transportSegments" data-id="${item.id}">刪除</button>`;
  return `
    <div class="timeline-transport-item">
      <div class="transport-time-column">
        ${startLabel ? `<strong>${startLabel}</strong>` : ""}
        ${endLabel ? `<span>${endLabel}</span>` : ""}
      </div>
      <div class="transport-node-column">
        <span class="transport-node"></span>
        <span class="transport-node-line"></span>
        <span class="transport-node end"></span>
      </div>
      <div class="transport-inline slim-transport-row">
        <div class="transport-inline-main">
          <span class="transport-icon">${iconSvg(methodIcon, "transport-method-svg")}</span>
          <span><strong>${escapeHtml(methodLabel)}${item.route ? `・${escapeHtml(item.route)}` : ""}</strong><small>${escapeHtml(item.fromName || "起點")} → ${escapeHtml(item.toName || "終點")}${transportDurationLabel(item) ? `・${escapeHtml(transportDurationLabel(item))}` : ""}${arrivalSuffix}${parseNumber(item.cost) ? `・${currency(item.cost, item.currency || "TWD")}` : ""}</small></span>
        </div>
        <div class="transport-inline-actions">${inlineActions}</div>
      </div>
    </div>
  `;
}

function renderLinks(item) {
  const links = [
    item.mapUrl ? `<a class="badge blue" href="${escapeHtml(item.mapUrl)}" target="_blank" rel="noreferrer">地圖</a>` : "",
    item.ticketLink ? `<a class="badge amber" href="${escapeHtml(item.ticketLink)}" target="_blank" rel="noreferrer">票券</a>` : "",
    item.website ? `<a class="badge" href="${escapeHtml(item.website)}" target="_blank" rel="noreferrer">官網</a>` : ""
  ].filter(Boolean).join("");
  return links ? `<div class="badges">${links}</div>` : "";
}

function printDetail(label, value) {
  if (value === undefined || value === null || String(value).trim() === "") return "";
  return `<div class="print-detail"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
}

function renderPrintItineraryItem(item, currencyCode) {
  const time = [item.startTime, item.endTime].filter(Boolean).join(" – ") || "時間未定";
  const details = [
    item.openingHours ? `營業 ${item.openingHours}` : "",
    item.lastEntry ? `最後入場 ${item.lastEntry}` : "",
    item.ticketRequired === "是" ? `門票 ${item.ticketStatus || "待確認"}` : "",
    parseNumber(item.budget) ? `預算 ${currency(item.budget, currencyCode)}` : "",
    item.weatherType || ""
  ].filter(Boolean);
  return `
    <article class="print-entry print-itinerary-entry">
      <div class="print-entry-time">${escapeHtml(time)}</div>
      <div class="print-entry-body">
        <h3>${escapeHtml(item.title || "未命名行程")}</h3>
        <div class="print-place">${escapeHtml(item.address || "地址未填")}</div>
        ${details.length ? `<div class="print-tags">${details.map((text) => `<span>${escapeHtml(text)}</span>`).join("")}</div>` : ""}
        ${printDetail("地址", item.address)}
        ${item.notes ? `<p class="print-notes">${escapeHtml(item.notes)}</p>` : ""}
      </div>
    </article>`;
}

function renderPrintTransport(item) {
  const endTime = inferTransportEndTime(item);
  const time = [item.startTime, endTime].filter(Boolean).join(" – ") || "時間未定";
  const timing = transportDurationLabel(item) || (item.arrivalDate && item.arrivalDate !== item.date ? `抵達 ${formatDateYmd(item.arrivalDate)} ${endTime}` : endTime ? `抵達 ${endTime}` : "時間未填");
  return `
    <article class="print-entry print-transport-entry">
      <div class="print-entry-time">${escapeHtml(time)}</div>
      <div class="print-entry-body">
        <div class="print-transport-title">${escapeHtml(methodLabel)}｜${escapeHtml(item.fromName || "起點")} → ${escapeHtml(item.toName || "終點")}</div>
        <div class="print-place">${escapeHtml(timing)}${parseNumber(item.cost) ? `｜${currency(item.cost, item.currency || activeTrip()?.currency || "TWD")}` : ""}</div>
        ${printDetail("路線", item.route)}
        ${printDetail("轉乘", item.transferInfo)}
        ${printDetail("備案", item.backup)}
        ${item.notes ? `<p class="print-notes">${escapeHtml(item.notes)}</p>` : ""}
      </div>
    </article>`;
}

function renderPrintDay(day, dayNo, items, transports, currencyCode) {
  const entries = [
    ...items.map((item) => ({ kind: "item", time: item.startTime || "99:99", item })),
    ...transports.map((item) => ({ kind: "transport", time: item.startTime || "99:99", item }))
  ].sort((a, b) => a.time.localeCompare(b.time));
  return `
    <section class="print-day">
      <header class="print-day-head"><strong>Day ${dayNo}</strong><span>${formatDateLong(day)}</span></header>
      <div class="print-day-body">
        ${entries.length ? entries.map((entry) => entry.kind === "item" ? renderPrintItineraryItem(entry.item, currencyCode) : renderPrintTransport(entry.item)).join("") : `<div class="print-empty">尚無安排</div>`}
      </div>
    </section>`;
}

async function exportItineraryPdf() {
  const trip = activeTrip();
  if (!trip) return;
  document.querySelector("#itinerary-print-root")?.remove();
  const days = daysBetween(trip.startDate, trip.endDate);
  const items = sortByDateTime(byTrip("itineraryItems"));
  const transports = sortByDateTime(byTrip("transportSegments"));
  const root = document.createElement("section");
  root.id = "itinerary-print-root";
  root.innerHTML = `
    <header class="print-cover">
      <div class="print-kicker">TRIPBOARD ITINERARY</div>
      <h1>${escapeHtml(trip.name || "旅行行程")}</h1>
      <p>${escapeHtml(trip.destination || "")}</p>
      <p>${formatDateLong(trip.startDate)} – ${formatDateLong(trip.endDate)}｜${escapeHtml(trip.travelers || "")}</p>
    </header>
    ${days.map((day, index) => renderPrintDay(day, index + 1, items.filter((item) => item.date === day), transports.filter((item) => item.date === day), trip.currency || "TWD")).join("")}
    <footer class="print-footer">由 TripBoard 匯出</footer>`;
  document.body.appendChild(root);
  document.body.classList.add("print-itinerary-mode");

  const images = [...root.querySelectorAll("img")];
  await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", resolve, { once: true });
    setTimeout(resolve, 3000);
  })));

  const cleanup = () => {
    document.body.classList.remove("print-itinerary-mode");
    root.remove();
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  toast("請在列印畫面選擇「另存為 PDF」；iPhone 可在預覽頁分享或儲存到檔案。", 4200);
  setTimeout(() => window.print(), 120);
  setTimeout(() => {
    if (document.body.contains(root)) cleanup();
  }, 60000);
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
  const flightLinked = item.sourceType === "flight" && item.sourceFlightId;
  const methodLabel = transportMethodLabel(item.method);
  const timingLabel = transportDurationLabel(item) || (item.endTime ? `${item.startTime || ""}–${item.endTime}` : "時間未填");
  const actions = flightLinked
    ? `<div class="item-actions"><button class="btn small" data-action="edit-flight" data-id="${item.sourceFlightId}">編輯航班</button></div>`
    : `<div class="item-actions"><button class="btn small" data-action="edit-transport" data-id="${item.id}">編輯</button><button class="btn small danger" data-action="delete" data-collection="transportSegments" data-id="${item.id}">刪除</button></div>`;
  return `
    <article class="item">
      <div class="item-row">
        <div>
          <div class="item-title">${formatDate(item.date)} ${escapeHtml(item.startTime || "時間未定")}｜${escapeHtml(item.fromName || "起點")} → ${escapeHtml(item.toName || "終點")}</div>
          <div class="item-meta">${escapeHtml(item.route || methodLabel || "交通方式未填")}</div>
        </div>
        ${actions}
      </div>
      <div class="badges">
        <span class="badge dark">${escapeHtml(methodLabel)}</span>
        <span class="badge blue">${escapeHtml(timingLabel)}</span>
        ${flightLinked ? `<span class="badge">航班自動同步</span>` : ""}
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
    subtitle: "記錄航班編號、訂位代號、機場、艙等、行李額度、票價與備註。",
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
        ${item.syncToItinerary !== false && splitLocalDateTime(item.departure).date ? `<span class="badge">已加入每日行程</span>` : ""}
        <span class="badge amber">${escapeHtml(item.checkedBaggage || "行李未填")}</span>
      </div>
      <dl class="kv">
        <dt>PNR</dt><dd>${escapeHtml(item.bookingRef || "未填")}</dd>
        <dt>艙等</dt><dd>${escapeHtml(item.cabin || "未填")}</dd>
        <dt>價格</dt><dd>${parseNumber(item.price) ? currency(item.price, activeTrip().currency || "TWD") : "未填"}</dd>
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
  const summary = getBudgetSummary(trip);
  const grouped = groupBy([...summary.plannedRows, ...summary.expenseRows], "category");
  return `
    ${topbar({ eyebrow: "Budget", title: "預算與支出", subtitle: summary.unlimited ? `自動加總 ${currency(summary.total, trip.currency || "TWD")}，目前設定為無預算限制。` : `自動加總 ${currency(summary.total, trip.currency || "TWD")}，目標預算 ${currency(trip.budget, trip.currency || "TWD")}。`, actions: `<button class="btn primary" data-action="new-expense">＋ 新增支出</button>` })}
    <section class="grid four">
      ${statCard("自動加總", currency(summary.total, trip.currency || "TWD"), "所有模組金額合計")}
      ${statCard("已規劃", currency(summary.plannedTotal, trip.currency || "TWD"), "航班、住宿、行程、交通、文件")}
      ${statCard("支出紀錄", currency(summary.expenseTotal, trip.currency || "TWD"), "預算頁手動新增")}
      ${summary.unlimited ? statCard("預算限制", "無上限", "僅追蹤與加總花費") : statCard("剩餘預算", currency(summary.remaining, trip.currency || "TWD"), "目標扣除自動加總")}
    </section>
    <section class="section grid two">
      <div class="card">
        <div class="section-head"><h2>分類合計</h2></div>
        <div class="list">
          ${Object.keys(grouped).map((key) => {
            const sum = grouped[key].reduce((acc, item) => acc + parseNumber(item.amount), 0);
            return `<div class="item-row"><strong>${escapeHtml(key || "未分類")}</strong><span>${currency(sum, trip.currency || "TWD")}</span></div>`;
          }).join("") || `<div class="empty"><strong>尚無金額</strong>在航班、住宿、行程、交通、文件或支出裡填金額。</div>`}
        </div>
      </div>
      <div class="card">
        <div class="section-head"><h2>自動加總明細</h2></div>
        <div class="list">${renderBudgetSourceRows([...summary.plannedRows, ...summary.expenseRows], trip.currency || "TWD")}</div>
      </div>
    </section>
    <section class="section card">
      <div class="section-head"><h2>支出明細</h2><button class="btn small" data-action="new-expense">＋ 新增支出</button></div>
      <div class="list">${items.map(renderExpenseCard).join("") || emptyBlock("尚無支出", "新增一筆預算或實際花費。")}</div>
      <p class="subtitle compact-subtitle">提醒：如果同一筆費用同時填在行程/住宿/航班與支出明細，會被視為兩筆金額。</p>
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

function renderThemeSelector() {
  const selected = currentTheme();
  return `
    <section class="more-group theme-section">
      <div class="theme-section-head">
        <div class="home-section-label">佈景主題</div>
        <span class="theme-current-name">目前：${selected.label}</span>
      </div>
      <div class="card theme-compact-panel">
        <div class="theme-chip-strip" role="list" aria-label="選擇佈景主題">
          ${THEMES.map((theme) => `
            <button
              type="button"
              class="theme-chip ${ui.theme === theme.key ? "active" : ""}"
              data-action="set-theme"
              data-theme="${theme.key}"
              aria-pressed="${ui.theme === theme.key ? "true" : "false"}"
              title="${theme.description}"
            >
              <span class="theme-mini-swatches" aria-hidden="true">
                ${theme.preview.map((color) => `<i style="background:${color}"></i>`).join("")}
              </span>
              <span>${theme.label}</span>
              ${ui.theme === theme.key ? `<b>✓</b>` : ""}
            </button>
          `).join("")}
        </div>
      </div>
    </section>`;
}

function renderMore(trip) {
  const groups = [
    {
      title: "旅程管理",
      items: [
        ["transport", "交通總覽", "查看所有點到點交通與備案", "route"],
        ["documents", "文件與票券", "整理門票、訂單與保險資訊", "ticket"],
        ["budget", "預算", "查看自動加總與支出紀錄", "wallet"],
        ["packing", "行李", "出發前與回程檢查清單", "luggage"]
      ]
    },
    {
      title: "其他工具",
      items: [
        ["todos", "待辦事項", "記錄訂票、訂房與出發前任務", "check"],
        ["places", "地點庫", "收藏還沒排進日期的地點", "pin"],
        ["emergency", "緊急資訊", "保險、聯絡方式與緊急電話", "alert"],
        ["settings", "同步與備份", "Google Sheets、JSON 匯出與本機資料", "sync"]
      ]
    }
  ];
  return `
    <div class="more-view">
      ${topbar({ eyebrow: "More", title: "更多", subtitle: "不常用的工具集中在這裡，首頁與行程維持簡潔。" })}
      ${renderThemeSelector()}
      ${groups.map((group) => `
        <section class="more-group">
          <div class="home-section-label">${escapeHtml(group.title)}</div>
          <div class="card more-menu-card">
            ${group.items.map(([view, label, description, icon]) => `
              <button class="more-menu-row" data-view="${view}">
                <span class="more-menu-icon">${iconSvg(icon, "more-menu-svg")}</span>
                <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></span>
                <b>›</b>
              </button>`).join("")}
          </div>
        </section>`).join("")}
    </div>`;
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
      <div class="field"><label>共享碼</label><input id="google-share-code" placeholder="例如 TOKYO2026" value="${escapeHtml(saved.shareCode || "")}" /></div>
      <div class="field"><label>PIN</label><input id="google-pin" type="password" inputmode="numeric" placeholder="例如 1234" value="${escapeHtml(saved.pin || "")}" /></div>
      <div class="field full"><label>暱稱</label><input id="google-user-name" placeholder="例如 Kitty / 帕寶" value="${escapeHtml(saved.userName || "")}" /></div>
    </div>
    <div class="grid google-sync-actions">
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

  document.querySelectorAll("[data-action='switch-trip']").forEach((select) => select.addEventListener("change", (event) => {
    state.activeTripId = event.target.value;
    ui.filterDate = "";
    saveState(false);
    render();
  }));

  document.querySelectorAll("[data-filter-date]").forEach((button) => button.addEventListener("click", () => {
    ui.filterDate = button.dataset.filterDate;
    render();
  }));

  document.querySelectorAll("[data-itinerary-date-picker]").forEach((input) => input.addEventListener("change", (event) => {
    const selectedDate = event.target.value;
    if (!selectedDate) return;
    ui.filterDate = selectedDate;
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
  const themeKey = event.currentTarget.dataset.theme;

  const actionMap = {
    "new-trip": () => openTripForm(),
    "edit-trip": () => openTripForm(id),
    "new-itinerary": () => openItineraryForm(null, date),
    "edit-itinerary": () => openItineraryForm(id),
    "new-transport": () => openTransportForm(null, date),
    "edit-transport": () => openTransportForm(id),
    "edit-daily-routine": () => openDailyRoutineForm(date),
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
    "export-itinerary-pdf": () => exportItineraryPdf(),
    "toggle-itinerary-details": () => {
      if (ui.expandedItineraryIds.has(id)) ui.expandedItineraryIds.delete(id);
      else ui.expandedItineraryIds.add(id);
      render();
    },
    "export-json": () => exportJson(),
    "import-json": () => importJson(),
    "reset-sample": () => resetSample(),
    "clear-local": () => clearLocal(),
    "set-theme": () => setThemePreference(themeKey)
  };

  if (actionMap[action]) await actionMap[action]();
}

const fieldOptions = {
  statusTrip: ["規劃中", "已確認", "旅行中", "已結束"],
  currency: ["TWD", "EUR", "JPY", "USD", "GBP", "KRW"],
  yesNo: ["是", "否"],
  ticketStatus: ["不需", "待購買", "已購買", "需現場買", "已預約"],
  itineraryType: ["景點", "餐廳", "咖啡廳", "點心", "購物", "交通", "住宿", "活動", "展覽", "夜景", "機場", "車站", "休息", "備案"],
  itemStatus: ["想去", "已排入", "已預約", "已完成", "取消"],
  priority: ["必去", "可去", "備案"],
  weather: ["室內", "室外", "雨天備案", "天氣好再去"],
  transport: ["步行", "地鐵", "公車", "火車", "高鐵", "Uber", "計程車", "自駕", "飛機", "船", "其他"],
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



const AIRPORT_SUGGESTIONS = [
  // 台灣與離島
  "TPE 台北桃園 Taoyuan", "TSA 台北松山 Songshan", "KHH 高雄 Kaohsiung", "RMQ 台中 Taichung", "TNN 台南 Tainan", "HUN 花蓮 Hualien", "TTT 台東 Taitung", "MZG 澎湖馬公 Penghu", "KNH 金門 Kinmen", "MFK 馬祖北竿 Beigan", "LZN 馬祖南竿 Nangan",
  // 日本
  "NRT 東京成田 Narita", "HND 東京羽田 Haneda", "KIX 大阪關西 Kansai", "ITM 大阪伊丹 Itami", "UKB 神戶 Kobe", "NGO 名古屋中部 Chubu Centrair", "FUK 福岡 Fukuoka", "CTS 札幌新千歲 New Chitose", "OKA 沖繩那霸 Naha", "SDJ 仙台 Sendai", "HIJ 廣島 Hiroshima", "KOJ 鹿兒島 Kagoshima", "KMJ 熊本 Kumamoto", "MYJ 松山 Matsuyama", "KMQ 小松 Kanazawa Komatsu", "TAK 高松 Takamatsu", "KMI 宮崎 Miyazaki", "OIT 大分 Oita", "NGS 長崎 Nagasaki", "KIJ 新潟 Niigata", "HKD 函館 Hakodate", "ASJ 奄美大島 Amami", "ISG 石垣 Ishigaki", "MMY 宮古島 Miyakojima",
  // 韓國
  "ICN 首爾仁川 Incheon", "GMP 首爾金浦 Gimpo", "PUS 釜山金海 Gimhae", "CJU 濟州 Jeju", "TAE 大邱 Daegu", "CJJ 清州 Cheongju", "MWX 務安 Muan", "YNY 襄陽 Yangyang",
  // 香港、澳門與中國主要城市
  "HKG 香港 Hong Kong", "MFM 澳門 Macau", "PEK 北京首都 Beijing Capital", "PKX 北京大興 Beijing Daxing", "PVG 上海浦東 Shanghai Pudong", "SHA 上海虹橋 Shanghai Hongqiao", "CAN 廣州白雲 Guangzhou", "SZX 深圳寶安 Shenzhen", "CTU 成都雙流 Chengdu Shuangliu", "TFU 成都天府 Chengdu Tianfu", "CKG 重慶江北 Chongqing", "XIY 西安咸陽 Xi'an", "HGH 杭州蕭山 Hangzhou", "NKG 南京祿口 Nanjing", "XMN 廈門高崎 Xiamen", "TAO 青島膠東 Qingdao", "WUH 武漢天河 Wuhan", "CSX 長沙黃花 Changsha", "KMG 昆明長水 Kunming", "TSN 天津濱海 Tianjin", "DLC 大連周水子 Dalian", "HRB 哈爾濱太平 Harbin", "SHE 瀋陽桃仙 Shenyang", "SYX 三亞鳳凰 Sanya", "FOC 福州長樂 Fuzhou", "WNZ 溫州龍灣 Wenzhou", "NGB 寧波櫟社 Ningbo", "URC 烏魯木齊地窩堡 Urumqi",
  // 東南亞
  "SIN 新加坡樟宜 Changi", "BKK 曼谷素萬那普 Suvarnabhumi", "DMK 曼谷廊曼 Don Mueang", "CNX 清邁 Chiang Mai", "HKT 普吉 Phuket", "KBV 喀比 Krabi", "USM 蘇梅島 Koh Samui", "KUL 吉隆坡 Kuala Lumpur", "SZB 吉隆坡梳邦 Subang", "PEN 檳城 Penang", "BKI 沙巴亞庇 Kota Kinabalu", "JHB 新山 Johor Bahru", "LGK 蘭卡威 Langkawi", "DPS 峇里島 Denpasar", "CGK 雅加達 Soekarno-Hatta", "SUB 泗水 Surabaya", "YIA 日惹 Yogyakarta", "LOP 龍目島 Lombok", "SGN 胡志明市 Tan Son Nhat", "HAN 河內 Noi Bai", "DAD 峴港 Da Nang", "CXR 芽莊 Cam Ranh", "PQC 富國島 Phu Quoc", "MNL 馬尼拉 Manila", "CEB 宿霧 Cebu", "CRK 克拉克 Clark", "KLO 長灘島卡利波 Kalibo", "MPH 長灘島卡提克蘭 Caticlan", "PPS 公主港 Puerto Princesa", "BWN 汶萊 Bandar Seri Begawan", "PNH 金邊 Phnom Penh", "SAI 暹粒吳哥 Siem Reap", "VTE 永珍 Vientiane", "LPQ 龍坡邦 Luang Prabang", "RGN 仰光 Yangon", "MDL 曼德勒 Mandalay",
  // 南亞與印度洋
  "DEL 德里 Indira Gandhi", "BOM 孟買 Mumbai", "BLR 班加羅爾 Bengaluru", "MAA 清奈 Chennai", "CCU 加爾各答 Kolkata", "HYD 海德拉巴 Hyderabad", "CMB 可倫坡 Colombo", "KTM 加德滿都 Kathmandu", "MLE 馬爾地夫 Male",
  // 中東
  "DXB 杜拜 Dubai", "AUH 阿布達比 Abu Dhabi", "DOH 杜哈 Doha", "IST 伊斯坦堡 Istanbul", "SAW 伊斯坦堡薩比哈 Sabiha Gokcen", "TLV 特拉維夫 Ben Gurion", "AMM 安曼 Queen Alia", "RUH 利雅德 Riyadh", "JED 吉達 Jeddah",
  // 歐洲
  "CDG 巴黎戴高樂 Charles de Gaulle", "ORY 巴黎奧利 Orly", "LHR 倫敦希斯洛 Heathrow", "LGW 倫敦蓋威克 Gatwick", "STN 倫敦史坦斯特 Stansted", "MAN 曼徹斯特 Manchester", "EDI 愛丁堡 Edinburgh", "AMS 阿姆斯特丹 Schiphol", "BRU 布魯塞爾 Brussels", "FRA 法蘭克福 Frankfurt", "MUC 慕尼黑 Munich", "BER 柏林 Brandenburg", "ZRH 蘇黎世 Zurich", "GVA 日內瓦 Geneva", "VIE 維也納 Vienna", "PRG 布拉格 Prague", "BUD 布達佩斯 Budapest", "WAW 華沙 Warsaw", "CPH 哥本哈根 Copenhagen", "ARN 斯德哥爾摩 Arlanda", "OSL 奧斯陸 Oslo", "HEL 赫爾辛基 Helsinki", "FCO 羅馬 Fiumicino", "CIA 羅馬 Ciampino", "MXP 米蘭 Malpensa", "LIN 米蘭 Linate", "VCE 威尼斯 Venice", "MAD 馬德里 Madrid", "BCN 巴塞隆納 Barcelona", "LIS 里斯本 Lisbon", "OPO 波多 Porto", "ATH 雅典 Athens", "DUB 都柏林 Dublin",
  // 北美、中南美與太平洋
  "JFK 紐約甘迺迪 JFK", "EWR 紐約紐華克 Newark", "LGA 紐約拉瓜地亞 LaGuardia", "BOS 波士頓 Boston", "IAD 華盛頓杜勒斯 Dulles", "MIA 邁阿密 Miami", "MCO 奧蘭多 Orlando", "ATL 亞特蘭大 Atlanta", "ORD 芝加哥 O'Hare", "DFW 達拉斯 Dallas", "IAH 休士頓 Houston", "LAX 洛杉磯 Los Angeles", "SFO 舊金山 San Francisco", "SJC 聖荷西 San Jose", "SEA 西雅圖 Seattle", "LAS 拉斯維加斯 Las Vegas", "HNL 夏威夷檀香山 Honolulu", "GUM 關島 Guam", "ANC 阿拉斯加安克拉治 Anchorage", "YVR 溫哥華 Vancouver", "YYZ 多倫多 Toronto", "YUL 蒙特婁 Montreal", "MEX 墨西哥城 Mexico City", "CUN 坎昆 Cancun", "GRU 聖保羅 Guarulhos", "EZE 布宜諾斯艾利斯 Ezeiza", "SCL 聖地牙哥 Santiago",
  // 澳洲、紐西蘭與大洋洲
  "SYD 雪梨 Sydney", "MEL 墨爾本 Melbourne", "BNE 布里斯本 Brisbane", "PER 伯斯 Perth", "ADL 阿德雷德 Adelaide", "AKL 奧克蘭 Auckland", "CHC 基督城 Christchurch", "NAN 斐濟楠迪 Nadi", "PPT 大溪地 Papeete",
  // 非洲常見轉機與旅遊城市
  "CAI 開羅 Cairo", "JNB 約翰尼斯堡 Johannesburg", "CPT 開普敦 Cape Town", "NBO 奈洛比 Nairobi", "ADD 阿迪斯阿貝巴 Addis Ababa", "CMN 卡薩布蘭卡 Casablanca"
];

const AIRLINE_SUGGESTIONS = [
  // 台灣
  "China Airlines 中華航空 CI", "Mandarin Airlines 華信航空 AE", "EVA Air 長榮航空 BR", "UNI Air 立榮航空 B7", "STARLUX Airlines 星宇航空 JX", "Tigerair Taiwan 台灣虎航 IT", "Daily Air 德安航空 DA",
  // 日本傳統航空、區域航空與廉價航空
  "Japan Airlines 日本航空 JAL JL", "ANA 全日空 All Nippon Airways NH", "Japan Transocean Air 日本越洋航空 NU", "Air Japan NQ", "ZIPAIR Tokyo ZG", "Peach Aviation 樂桃航空 MM", "Jetstar Japan 日本捷星 GK", "Spring Japan 春秋航空日本 IJ", "Skymark Airlines 天馬航空 BC", "Air Do 北海道航空 HD", "Solaseed Air 空之子航空 6J", "StarFlyer 星悅航空 7G", "Fuji Dream Airlines 富士夢幻航空 JH", "IBEX Airlines FW", "Oriental Air Bridge 東方空橋 OC", "Amakusa Airlines 天草航空 MZ",
  // 韓國傳統航空與廉價航空
  "Korean Air 大韓航空 KE", "Asiana Airlines 韓亞航空 OZ", "Jeju Air 濟州航空 7C", "Jin Air 真航空 LJ", "T'way Air 德威航空 TW", "Air Busan 釜山航空 BX", "Air Seoul 首爾航空 RS", "Eastar Jet 易斯達航空 ZE", "Aero K 航空 RF", "Air Premia 普萊米婭航空 YP",
  // 香港、澳門與中國
  "Cathay Pacific 國泰航空 CX", "Hong Kong Airlines 香港航空 HX", "HK Express 香港快運 UO", "Greater Bay Airlines 大灣區航空 HB", "Air Macau 澳門航空 NX", "Air China 中國國際航空 CA", "China Eastern 中國東方航空 MU", "China Southern 中國南方航空 CZ", "Hainan Airlines 海南航空 HU", "XiamenAir 廈門航空 MF", "Sichuan Airlines 四川航空 3U", "Shenzhen Airlines 深圳航空 ZH", "Shandong Airlines 山東航空 SC", "Juneyao Air 吉祥航空 HO", "Spring Airlines 春秋航空 9C", "Beijing Capital Airlines 首都航空 JD", "Tianjin Airlines 天津航空 GS", "West Air 西部航空 PN", "Lucky Air 祥鵬航空 8L", "Chengdu Airlines 成都航空 EU", "Hebei Airlines 河北航空 NS", "Qingdao Airlines 青島航空 QW",
  // 東南亞
  "Singapore Airlines 新加坡航空 SQ", "Scoot 酷航 TR", "Malaysia Airlines 馬來西亞航空 MH", "AirAsia 亞洲航空 AK", "AirAsia X 全亞洲航空 D7", "Batik Air Malaysia 馬印航空 OD", "Firefly FY", "Thai Airways 泰國航空 TG", "Thai AirAsia 泰國亞洲航空 FD", "Thai AirAsia X XJ", "Bangkok Airways 曼谷航空 PG", "Thai Lion Air 泰國獅航 SL", "Nok Air 鳥航 DD", "Vietnam Airlines 越南航空 VN", "VietJet Air 越捷航空 VJ", "Bamboo Airways 越竹航空 QH", "Vietravel Airlines 越旅航空 VU", "Philippine Airlines 菲律賓航空 PR", "Cebu Pacific 宿霧太平洋航空 5J", "AirAsia Philippines Z2", "Garuda Indonesia 印尼鷹航 GA", "Citilink 印尼連城航空 QG", "Lion Air 獅子航空 JT", "Batik Air 峇迪航空 ID", "Super Air Jet IU", "Pelita Air IP", "TransNusa 8B", "Royal Brunei Airlines 汶萊皇家航空 BI", "Cambodia Angkor Air 柬埔寨吳哥航空 K6", "Lao Airlines 寮國航空 QV", "Myanmar Airways International 8M",
  // 南亞
  "Air India 印度航空 AI", "IndiGo 6E", "Air India Express IX", "Akasa Air QP", "SpiceJet SG", "SriLankan Airlines 斯里蘭卡航空 UL", "Nepal Airlines 尼泊爾航空 RA", "Himalaya Airlines 喜馬拉雅航空 H9", "Drukair 不丹皇家航空 KB", "Maldivian Q2",
  // 中東
  "Emirates 阿聯酋航空 EK", "Qatar Airways 卡達航空 QR", "Etihad Airways 阿提哈德航空 EY", "Turkish Airlines 土耳其航空 TK", "flydubai 杜拜航空 FZ", "Air Arabia 阿拉伯航空 G9", "Oman Air 阿曼航空 WY", "Gulf Air 海灣航空 GF", "Kuwait Airways 科威特航空 KU", "Saudia 沙烏地阿拉伯航空 SV", "flynas 納斯航空 XY", "Royal Jordanian 皇家約旦航空 RJ", "EL AL 以色列航空 LY",
  // 歐洲
  "Air France 法國航空 AF", "KLM 荷蘭皇家航空 KL", "Lufthansa 漢莎航空 LH", "SWISS 瑞士國際航空 LX", "Austrian Airlines 奧地利航空 OS", "Brussels Airlines 布魯塞爾航空 SN", "British Airways 英國航空 BA", "Iberia 西班牙國家航空 IB", "Vueling 伏林航空 VY", "Ryanair 瑞安航空 FR", "easyJet 易捷航空 U2", "Wizz Air 威茲航空 W6", "Norwegian 挪威航空 DY", "SAS 北歐航空 SK", "Finnair 芬蘭航空 AY", "Icelandair 冰島航空 FI", "TAP Air Portugal 葡萄牙航空 TP", "ITA Airways 義大利航空 AZ", "Aegean Airlines 愛琴海航空 A3", "LOT Polish Airlines 波蘭航空 LO", "Eurowings 歐洲之翼 EW", "Condor 神鷹航空 DE",
  // 北美與拉丁美洲
  "United Airlines 聯合航空 UA", "Delta Air Lines 達美航空 DL", "American Airlines 美國航空 AA", "Air Canada 加拿大航空 AC", "WestJet 西捷航空 WS", "Alaska Airlines 阿拉斯加航空 AS", "JetBlue 捷藍航空 B6", "Southwest Airlines 西南航空 WN", "Spirit Airlines 精神航空 NK", "Frontier Airlines 邊疆航空 F9", "Hawaiian Airlines 夏威夷航空 HA", "Aeromexico 墨西哥航空 AM", "Avianca 哥倫比亞航空 AV", "Copa Airlines 巴拿馬航空 CM", "LATAM Airlines 南美航空 LA", "GOL Airlines 高爾航空 G3", "Azul Brazilian Airlines 藍色巴西航空 AD",
  // 澳洲、紐西蘭與非洲
  "Qantas 澳洲航空 QF", "Jetstar Airways 捷星航空 JQ", "Virgin Australia 維珍澳洲航空 VA", "Air New Zealand 紐西蘭航空 NZ", "Fiji Airways 斐濟航空 FJ", "Ethiopian Airlines 衣索比亞航空 ET", "Kenya Airways 肯亞航空 KQ", "EgyptAir 埃及航空 MS", "South African Airways 南非航空 SA", "Royal Air Maroc 摩洛哥皇家航空 AT"
];

function openTripForm(id) {
  const item = id ? state.trips.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯旅程" : "新增旅程",
    fields: [
      text("name", "旅程名稱", true), text("destination", "目的地"), dateField("startDate", "開始日期", true), dateField("endDate", "結束日期", true),
      selectField("status", "狀態", fieldOptions.statusTrip), checkboxField("budgetUnlimited", "無預算限制", true), numberField("budget", "預算上限"), selectField("currency", "主幣別", fieldOptions.currency),
      rangeField("progressFlights", "航班完成度"), rangeField("progressStays", "住宿完成度"), rangeField("progressItinerary", "行程完成度"), rangeField("progressTransport", "交通完成度"), rangeField("progressDocuments", "文件完成度"), rangeField("progressPacking", "行李完成度"),
      textarea("note", "旅程備註", true)
    ],
    item: item || { currency: "TWD", status: "規劃中", budgetUnlimited: false, progressFlights: 0, progressStays: 0, progressItinerary: 0, progressTransport: 0, progressDocuments: 0, progressPacking: 0 },
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
      text("title", "行程名稱", true), text("address", "地址"), urlField("mapUrl", "Google Maps 連結"), urlField("website", "官網 / 參考連結"),
      text("openingHours", "營業時間"), text("lastEntry", "最後入場"), selectField("ticketRequired", "是否需門票", fieldOptions.yesNo), selectField("ticketStatus", "門票狀態", fieldOptions.ticketStatus),
      numberField("ticketPrice", "門票價格"), urlField("ticketLink", "購票 / 票券連結"), numberField("budget", "預估花費"),
      selectField("status", "狀態", fieldOptions.itemStatus), selectField("priority", "重要性", fieldOptions.priority), selectField("weatherType", "天氣條件", fieldOptions.weather), textarea("notes", "備註", true)
    ],
    item: item || { date: defaultDate || activeTrip().startDate || todayISO(), type: "景點", ticketRequired: "否", ticketStatus: "不需", status: "想去", priority: "可去", weatherType: "室內" },
    onSubmit: (data) => upsert("itineraryItems", item, data, "item")
  });
}

function openTransportForm(id, defaultDate) {
  const existing = id ? state.transportSegments.find((x) => x.id === id) : null;
  const item = existing ? { ...existing, method: transportMethodLabel(existing.method) } : null;
  openForm({
    title: item ? "編輯交通" : "新增交通",
    fields: [
      dateField("date", "日期", true), timeField("startTime", "出發時間"), text("fromName", "起點", true), text("toName", "終點", true), selectField("method", "交通方式", fieldOptions.transport),
      durationField("duration", "所需時間", true), numberField("cost", "費用"), selectField("currency", "幣別", fieldOptions.currency), text("route", "路線"), text("departStation", "上車 / 出發站"),
      text("arrivalStation", "下車 / 抵達站"), text("transferInfo", "轉乘資訊"), selectField("luggageFriendly", "行李友善度", fieldOptions.luggageFriendly),
      selectField("bookingStatus", "票券 / 預約狀態", fieldOptions.bookingStatus), text("ticketInfo", "交通票資訊"), urlField("mapUrl", "地圖 / 導航連結"), text("backup", "備案交通"), textarea("notes", "注意事項", true)
    ],
    item: item || { date: defaultDate || activeTrip().startDate || todayISO(), method: "地鐵", durationHours: 0, durationMinutes: 1, durationTotalMinutes: 1, duration: "1 分鐘", currency: activeTrip().currency || "TWD", luggageFriendly: "中", bookingStatus: "不需預約" },
    onSubmit: (data) => {
      data.method = transportMethodLabel(data.method);
      data.endTime = addMinutesToTime(data.startTime, data.durationTotalMinutes);
      upsert("transportSegments", existing, data, "transport");
    }
  });
}

function openDailyRoutineForm(date) {
  const targetDate = date || ui.filterDate || activeTrip().startDate || todayISO();
  const existing = getDailyRoutine(targetDate);
  openForm({
    title: "設定每日作息",
    fields: [
      dateField("date", "日期", true),
      timeField("wakeTime", "起床時間"),
      timeField("leaveTime", "出門時間")
    ],
    item: existing || { date: targetDate, wakeTime: "", leaveTime: "" },
    onSubmit: (data) => {
      if (!data.wakeTime && !data.leaveTime) {
        if (existing) state.dailyRoutines = state.dailyRoutines.filter((item) => item.id !== existing.id);
        saveAndRender("已清除當日作息");
        return;
      }
      upsert("dailyRoutines", existing, data, "routine");
    }
  });
}

function openFlightForm(id) {
  const item = id ? state.flights.find((x) => x.id === id) : null;
  openForm({
    title: item ? "編輯航班" : "新增航班",
    fields: [
      selectField("type", "類型", ["去程", "回程", "轉機", "國內段", "其他"]), datalistField("airline", "航空公司", AIRLINE_SUGGESTIONS, false, true), text("flightNumber", "航班編號", false, true), text("bookingRef", "訂位代號 / PNR"),
      datalistField("fromAirport", "出發機場", AIRPORT_SUGGESTIONS, false, true), datalistField("toAirport", "抵達機場", AIRPORT_SUGGESTIONS, false, true), datetimeField("departure", "出發時間"), datetimeField("arrival", "抵達時間"),
      text("cabin", "艙等"), text("checkedBaggage", "託運行李"), text("carryOn", "手提行李"), numberField("price", "票價"),
      checkboxField("syncToItinerary", "自動加入每日行程", true), textarea("notes", "備註", true)
    ],
    item: item || { type: "去程", cabin: "Economy", syncToItinerary: true },
    onSubmit: (data) => saveFlightWithTransport(item, data)
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

function saveFlightWithTransport(existing, data) {
  let flight = existing;
  if (flight) Object.assign(flight, data);
  else {
    flight = { id: uid("flight"), tripId: activeTrip().id, ...data };
    state.flights.push(flight);
  }
  syncFlightTransportInState(state, flight);
  const message = data.syncToItinerary === false ? "航班已儲存" : "航班已儲存並加入每日行程";
  saveAndRender(message);
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
          <div class="modal-head-actions">
            <button type="submit" form="${formId}" class="btn primary small">儲存</button>
            <button type="button" class="btn small" data-action="close-modal">關閉</button>
          </div>
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
  const updateBudgetLimitState = () => {
    const unlimitedInput = form.elements.budgetUnlimited;
    const budgetInput = form.elements.budget;
    if (!unlimitedInput || !budgetInput) return;
    budgetInput.disabled = unlimitedInput.checked;
    budgetInput.closest(".field")?.classList.toggle("is-disabled", unlimitedInput.checked);
    budgetInput.placeholder = unlimitedInput.checked ? "已設定為無預算限制" : "";
  };
  form.elements.budgetUnlimited?.addEventListener("change", updateBudgetLimitState);
  updateBudgetLimitState();
  modalRoot.querySelectorAll("input[type='range']").forEach((input) => {
    input.addEventListener("input", () => {
      const output = modalRoot.querySelector(`[data-range-value="${input.name}"]`);
      if (output) output.textContent = `${input.value}%`;
    });
  });
  const updateDurationPreviews = () => {
    fields.filter((field) => field.type === "duration").forEach((field) => {
      const hoursInput = form.elements[`${field.name}Hours`];
      const minutesInput = form.elements[`${field.name}Minutes`];
      const preview = form.querySelector(`[data-duration-preview="${field.name}"]`);
      if (!hoursInput || !minutesInput || !preview) return;
      const totalMinutes = parseNumber(hoursInput.value) * 60 + parseNumber(minutesInput.value);
      const startTime = form.elements.startTime?.value || "";
      if (totalMinutes < 1) {
        preview.textContent = "最少需選擇 0 小時 1 分鐘";
        return;
      }
      if (!startTime) {
        preview.textContent = `共 ${formatTransportDuration(totalMinutes)}；選擇出發時間後會自動計算抵達時間`;
        return;
      }
      preview.textContent = `共 ${formatTransportDuration(totalMinutes)}・預計抵達 ${addMinutesToTime(startTime, totalMinutes)}`;
    });
  };
  form.addEventListener("input", updateDurationPreviews);
  form.addEventListener("change", updateDurationPreviews);
  updateDurationPreviews();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = {};
    for (const field of fields) {
      if (field.type === "duration") {
        const hoursInput = form.elements[`${field.name}Hours`];
        const minutesInput = form.elements[`${field.name}Minutes`];
        const hours = parseNumber(hoursInput?.value);
        const minutes = parseNumber(minutesInput?.value);
        const totalMinutes = hours * 60 + minutes;
        if (field.required && totalMinutes < 1) {
          toast("所需時間最少為 0 小時 1 分鐘");
          minutesInput?.focus();
          return;
        }
        data[`${field.name}Hours`] = hours;
        data[`${field.name}Minutes`] = minutes;
        data[`${field.name}TotalMinutes`] = totalMinutes;
        data[field.name] = formatTransportDuration(totalMinutes);
        continue;
      }
      const input = form.elements[field.name];
      if (!input) continue;
      if (field.type === "checkbox") data[field.name] = input.checked;
      else if (["number", "range"].includes(field.type)) data[field.name] = parseNumber(input.value);
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
  if (field.type === "duration") {
    const parts = durationPartsFromItem(item);
    const hourOptions = Array.from({ length: 73 }, (_, hour) => `<option value="${hour}" ${hour === parts.hours ? "selected" : ""}>${hour}</option>`).join("");
    const minuteOptions = Array.from({ length: 60 }, (_, minute) => `<option value="${minute}" ${minute === parts.minutes ? "selected" : ""}>${minute}</option>`).join("");
    return `
      <div class="field full duration-field">
        <label>${escapeHtml(field.label)}</label>
        <div class="duration-picker">
          <label class="duration-select-wrap"><select name="${field.name}Hours" aria-label="所需小時">${hourOptions}</select><span>小時</span></label>
          <label class="duration-select-wrap"><select name="${field.name}Minutes" aria-label="所需分鐘">${minuteOptions}</select><span>分鐘</span></label>
        </div>
        <small class="duration-preview" data-duration-preview="${field.name}"></small>
      </div>`;
  }
  if (field.type === "select") {
    return `<div class="field ${full}"><label>${escapeHtml(field.label)}</label><select name="${field.name}" ${required}>${field.options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
  }
  if (field.type === "checkbox") {
    return `<div class="field ${full}"><label>${escapeHtml(field.label)}</label><label class="checkbox-row"><input type="checkbox" name="${field.name}" ${value ? "checked" : ""} /> 是</label></div>`;
  }
  if (field.type === "datalist") {
    const listId = `list-${field.name}`;
    return `<div class="field ${full}"><label>${escapeHtml(field.label)}</label><input type="text" name="${field.name}" list="${listId}" value="${escapeHtml(value)}" ${required} placeholder="輸入幾個字即可選擇" /><datalist id="${listId}">${(field.options || []).map((option) => `<option value="${escapeHtml(option)}"></option>`).join("")}</datalist></div>`;
  }
  if (field.type === "range") {
    const rangeValue = clampPercentage(value, 0);
    return `<div class="field range-field ${full}"><label>${escapeHtml(field.label)} <strong data-range-value="${field.name}">${rangeValue}%</strong></label><input type="range" name="${field.name}" min="${field.min ?? 0}" max="${field.max ?? 100}" step="${field.step ?? 5}" value="${rangeValue}" ${required} /></div>`;
  }
  return `<div class="field ${full}"><label>${escapeHtml(field.label)}</label><input type="${field.type}" name="${field.name}" value="${escapeHtml(value)}" ${required} /></div>`;
}

function text(name, label, full = false, required = false) { return { name, label, type: "text", full, required }; }
function textarea(name, label, full = false) { return { name, label, type: "textarea", full }; }
function dateField(name, label, required = false) { return { name, label, type: "date", required }; }
function timeField(name, label, required = false) { return { name, label, type: "time", required }; }
function durationField(name, label, required = false) { return { name, label, type: "duration", required, full: true }; }
function datetimeField(name, label, required = false) { return { name, label, type: "datetime-local", required }; }
function numberField(name, label, required = false) { return { name, label, type: "number", required }; }
function urlField(name, label, required = false) { return { name, label, type: "url", required, full: true }; }
function selectField(name, label, options, required = false) { return { name, label, type: "select", options, required }; }
function datalistField(name, label, options, full = false, required = false) { return { name, label, type: "datalist", options, full, required }; }
function rangeField(name, label, required = false) { return { name, label, type: "range", min: 0, max: 100, step: 5, required }; }
function checkboxField(name, label, full = false) { return { name, label, type: "checkbox", full }; }

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
  if (collection === "flights") {
    state.transportSegments = state.transportSegments.filter((item) => !(item.sourceType === "flight" && item.sourceFlightId === id));
  }
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
