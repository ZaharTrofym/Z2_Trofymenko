const PROXY_URL = "";
const STORAGE_KEY = "lunch-menu-cache";
const MODE_KEY = "use-local";
const WEEK_DAYS = DAY_NAMES.slice(0, 5);

const SOURCES = [
  {
    id: "idyla",
    name: "Idyla cafe&restaurant",
    address: "Mlynská dolina, Bratislava",
    website: "https://restauracie.sme.sk/restauracia/idyla-2-cafe-restaurant_1295-karlova-ves_2738/denne-menu",
    localUrl: "source/idyla.html",
    parse: parseIdyla,
  },
  {
    id: "klubovna",
    name: "Karloveská Klubovňa",
    address: "Jurigovo nám. 1, Bratislava",
    website: "https://www.menucka.sk/karloveska-klubovna",
    localUrl: "source/klubovna.html",
    parse: parseKlubovna,
  },
  {
    id: "hospoda",
    name: "Naše Hospoda Karloveská",
    address: "Segnerova 3, Bratislava",
    website: "https://nasehospoda-karloveska.sk",
    localUrl: "source/hospoda.html",
    parse: parseHospoda,
  },
];

const results = {};
const hiddenSources = new Set();
let selectedView = 0;

const $status = $("#status");
const $refresh = $("#refresh");
const $clear = $("#clear");
const $useLocal = $("#use-local");
const $cards = $("#cards");
const $tabs = $("#day-tabs");
const $filters = $("#filters");

function getTodayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function buildUrl(source) {
  if ($useLocal.prop("checked")) {
    return source.localUrl;
  }
  if (!PROXY_URL) {
    return source.website;
  }
  return PROXY_URL + encodeURIComponent(source.website);
}

async function loadSource(source) {
  let response;
  try {
    response = await fetch(buildUrl(source));
  } catch (error) {
    throw new Error("Stránku sa nepodarilo načítať, pravdepodobne ju blokuje CORS");
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const days = source.parse(parseHtml(await response.text()));
  if (days.length === 0) {
    throw new Error("Na stránke sa nenašlo menu, možno sa zmenila jej štruktúra");
  }
  return days;
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch (error) {
    return {};
  }
}

function saveToCache(sourceId, days) {
  const cache = readCache();
  cache[sourceId] = { savedAt: new Date().toISOString(), days };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn("Cache could not be saved:", error);
  }
}

function getTodayCache(sourceId) {
  const saved = readCache()[sourceId];
  if (!saved) {
    return null;
  }
  const savedAt = new Date(saved.savedAt);
  if (savedAt.toDateString() !== new Date().toDateString()) {
    return null;
  }
  return { savedAt, days: saved.days };
}

async function loadOne(source, force) {
  const cached = force ? null : getTodayCache(source.id);
  if (cached) {
    results[source.id] = { state: "ok", days: cached.days, updatedAt: cached.savedAt, fromCache: true };
    renderCards();
    return;
  }
  const previous = results[source.id];
  results[source.id] = { state: "loading", updatedAt: previous?.updatedAt };
  renderCards();
  try {
    const days = await loadSource(source);
    results[source.id] = { state: "ok", days, updatedAt: new Date(), fromCache: false };
    saveToCache(source.id, days);
  } catch (error) {
    results[source.id] = { state: "error", error, updatedAt: previous?.updatedAt };
    throw error;
  } finally {
    renderCards();
  }
}

async function loadAll(force) {
  $refresh.prop("disabled", true);
  $status.text("Načítavam menu…");
  const outcomes = await Promise.allSettled(SOURCES.map((source) => loadOne(source, force)));
  outcomes.forEach((outcome, index) => {
    if (outcome.status === "rejected") {
      console.error(SOURCES[index].name, outcome.reason);
    }
  });
  const failed = outcomes.filter((outcome) => outcome.status === "rejected").length;
  const loaded = SOURCES.length - failed;
  const mode = $useLocal.prop("checked") ? "z lokálnych kópií" : "zo živých stránok";
  $status.text(`Načítané ${loaded} z ${SOURCES.length} reštaurácií (${mode}).`);
  $refresh.prop("disabled", false);
}

function formatPrice(price) {
  return price === null ? "" : `${price.toFixed(2).replace(".", ",")} €`;
}

function createItem(item) {
  const $row = $("<div>").addClass(`menu-item menu-item--${item.kind}`);
  const $text = $("<div>").addClass("menu-item__text");
  if (item.kind === "soup") {
    $text.append($("<span>").addClass("menu-item__label").text("Polievka"));
  }
  $text.append($("<span>").addClass("menu-item__name").text(item.name));
  if (item.allergens) {
    $text.append($("<span>").addClass("menu-item__allergens").text(`alergény: ${item.allergens}`));
  }
  $row.append($text);
  if (item.price !== null) {
    $row.append($("<span>").addClass("menu-item__price").text(formatPrice(item.price)));
  } else {
    $row.append($("<span>").addClass("menu-item__price menu-item__price--none").text("cena neuvedená"));
  }
  return $row;
}

function createDay(day, showTitle, dayName) {
  const $block = $("<div>").addClass("day-block");
  if (showTitle) {
    const title = day ? `${day.day} ${day.date}` : dayName;
    $block.append($("<h4>").addClass("day-block__title").text(title));
  }
  if (!day) {
    $block.append($("<p>").addClass("empty-text").text("Na tento deň nie je v ponuke žiadne menu."));
    return $block;
  }
  if (day.items.length === 0) {
    $block.append($("<p>").addClass("empty-text").text(day.note || "Na tento deň nie je v ponuke žiadne menu."));
    return $block;
  }
  const soups = day.items.filter((item) => item.kind === "soup");
  const mains = day.items.filter((item) => item.kind !== "soup");
  soups.concat(mains).forEach((item) => $block.append(createItem(item)));
  if (day.note) {
    $block.append($("<p>").addClass("day-block__note").text(day.note));
  }
  return $block;
}

function createBody(result) {
  if (result.state === "empty") {
    return $("<p>").addClass("empty-text").text("Menu nie je načítané. Kliknite na Aktualizovať menu.");
  }
  if (selectedView === "week") {
    const $week = $("<div>");
    WEEK_DAYS.forEach((dayName) => {
      const day = result.days.find((item) => item.day === dayName);
      $week.append(createDay(day, true, dayName));
    });
    return $week;
  }
  const dayName = WEEK_DAYS[selectedView];
  const day = result.days.find((item) => item.day === dayName);
  return createDay(day, false, dayName);
}

function createCard(source) {
  const result = results[source.id] ?? { state: "loading" };

  const $header = $("<div>").addClass("card-header d-flex justify-content-between align-items-start gap-2");
  const $titleBox = $("<div>");
  const $link = $("<a>").attr({ href: source.website, target: "_blank", rel: "noopener" }).text(source.name);
  $titleBox.append($("<h2>").addClass("h5 mb-0").append($link));
  $titleBox.append($("<p>").addClass("card-address mb-0").text(source.address));
  $header.append($titleBox);

  const $body = $("<div>").addClass("card-body");
  if (result.state === "loading") {
    $header.append($("<div>").addClass("spinner-border spinner-border-sm text-success").attr("role", "status").append($("<span>").addClass("visually-hidden").text("Načítava sa…")));
    $body.text("Načítavam menu…");
  } else if (result.state === "error") {
    const $alert = $("<div>").addClass("alert alert-danger mb-2").text(`Menu sa nepodarilo načítať (${result.error.message}).`);
    const $retry = $("<button>").attr("type", "button").addClass("btn btn-sm btn-outline-danger").text("Skúsiť znova");
    $retry.on("click", () => loadOne(source, true).catch(() => {}));
    $body.append($alert, $retry);
  } else {
    $body.append(createBody(result));
  }

  let footerText = "Zatiaľ nenačítané";
  if (result.updatedAt) {
    footerText = `Aktualizované ${result.updatedAt.toLocaleString("sk-SK")}`;
    if (result.fromCache) {
      footerText += " (uložené dáta)";
    }
  }
  const $footer = $("<div>").addClass("card-footer small text-body-secondary").text(footerText);

  const $card = $("<article>").addClass("card h-100").append($header, $body, $footer);
  return $("<div>").addClass("col-12 col-md-6 col-xl-4").attr("data-source", source.id).append($card);
}

function renderCards() {
  const visible = SOURCES.filter((source) => !hiddenSources.has(source.id));
  if (visible.length === 0) {
    $cards.empty().append($("<p>").addClass("col-12 empty-text").text("Nie je vybraná žiadna reštaurácia."));
    return;
  }
  $cards.empty().append(visible.map(createCard));
}

function renderTabs() {
  const todayIndex = getTodayIndex();
  const views = WEEK_DAYS.map((name, index) => ({ view: index, label: name }));
  views.push({ view: "week", label: "Celý týždeň" });
  $tabs.empty();
  views.forEach((item) => {
    const $button = $("<button>").attr("type", "button").addClass("day-tab").text(item.label);
    $button.attr("aria-pressed", item.view === selectedView);
    if (item.view === todayIndex) {
      $button.addClass("is-today").attr("title", "Dnes");
    }
    $button.on("click", () => {
      selectedView = item.view;
      renderTabs();
      renderCards();
    });
    $tabs.append($button);
  });
}

function renderFilters() {
  SOURCES.forEach((source) => {
    const inputId = `filter-${source.id}`;
    const $input = $("<input>").attr({ type: "checkbox", id: inputId }).addClass("form-check-input").prop("checked", true);
    $input.on("change", () => {
      if ($input.prop("checked")) {
        hiddenSources.delete(source.id);
      } else {
        hiddenSources.add(source.id);
      }
      renderCards();
    });
    const $label = $("<label>").attr("for", inputId).addClass("form-check-label").text(source.name);
    $filters.append($("<div>").addClass("form-check form-check-inline").append($input, $label));
  });
}

$clear.on("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  SOURCES.forEach((source) => {
    results[source.id] = { state: "empty" };
  });
  renderCards();
  $status.text("Uložené dáta sú vymazané.");
});

$refresh.on("click", () => loadAll(true));

$useLocal.prop("checked", localStorage.getItem(MODE_KEY) !== "false");
$useLocal.on("change", () => {
  localStorage.setItem(MODE_KEY, $useLocal.prop("checked"));
  loadAll(true);
});

if (getTodayIndex() > 4) {
  selectedView = "week";
  $("#weekend-note").prop("hidden", false);
} else {
  selectedView = getTodayIndex();
}

renderFilters();
renderTabs();
renderCards();
loadAll(false);
