import {
  applyAuthButtons,
  applyInteractionLock,
  clearBrawlerDetail,
  clearClubPanel,
  clearLocationInfo,
  clearPlayerPanel,
  renderBrawlerDetail,
  renderBrawlerOptions,
  renderClub,
  renderCountryOptions,
  renderEvents,
  renderLocationInfo,
  renderMultiResults,
  renderPlayer,
  renderRankingMessage,
  renderRankings,
  setAuthStatus,
  setBrawlerFilterVisibility,
  setClubStatus,
  setEventsStatus,
  setMultiStatus,
  setStatus
} from "./presentation/renderers.js";
import { getElements } from "./presentation/elements.js";
import {
  loadAuthState,
  loadHealthState,
  logout,
  startOAuthLogin
} from "./application/authApplication.js";
import {
  loadBrawlerById,
  loadBrawlers,
  loadClub,
  loadClubMembers,
  loadEventRotation,
  loadEvents,
  loadLocation,
  loadLocations,
  loadMultiPlayerOverview,
  loadPlayerOverview,
  loadRankings
} from "./application/gameApplication.js";

const elements = getElements();
let activeSection = "summary";

const state = {
  requireLoginForApi: false,
  brawlApiTokenConfigured: false,
  oauthEnabled: false,
  authenticated: false,
  user: null,
  brawlers: [],
  brawlersLoaded: false,
  locations: [],
  locationsLoaded: false
};

function syncAuthButtons() {
  applyAuthButtons(elements, {
    oauthEnabled: state.oauthEnabled,
    authenticated: state.authenticated
  });
}

function switchSection(sectionName) {
  const targetName = sectionName || "summary";
  activeSection = targetName;

  for (const section of elements.sections) {
    const isActive = section.id === `section-${targetName}`;
    section.classList.toggle("active", isActive);
  }

  for (const tab of elements.sectionTabs) {
    const isActive = tab.dataset.sectionTarget === targetName;
    tab.classList.toggle("active", isActive);
  }
}

function isApiAccessLocked() {
  const lockedByAuth = state.requireLoginForApi && !state.authenticated;
  const lockedByToken = !state.brawlApiTokenConfigured;
  return {
    lockedByAuth,
    lockedByToken,
    locked: lockedByAuth || lockedByToken
  };
}

function syncInteractionLock() {
  const { lockedByAuth, lockedByToken, locked } = isApiAccessLocked();
  applyInteractionLock(elements, locked);
  syncBrawlerFilterVisibility();

  if (lockedByToken) {
    setStatus(elements, "서버에 BRAWL_API_TOKEN을 설정하면 조회를 시작할 수 있습니다.", true);
    setMultiStatus(elements, "서버에 BRAWL_API_TOKEN이 필요합니다.", true);
    setClubStatus(elements, "서버에 BRAWL_API_TOKEN이 필요합니다.", true);
    setEventsStatus(elements, "서버에 BRAWL_API_TOKEN이 필요합니다.", true);
  } else if (lockedByAuth) {
    setStatus(elements, "로그인 후 전적/랭킹 조회가 가능합니다.");
    setMultiStatus(elements, "로그인 후 멀티검색을 사용할 수 있습니다.");
    setClubStatus(elements, "로그인 후 클럽 조회가 가능합니다.");
    setEventsStatus(elements, "로그인 후 이벤트 조회가 가능합니다.");
  }
}

function syncBrawlerFilterVisibility() {
  const isBrawlerRanking = elements.rankingTypeSelect.value === "brawlers";
  setBrawlerFilterVisibility(elements, isBrawlerRanking);
}

async function refreshHealthAndAuth() {
  const healthState = await loadHealthState();
  state.requireLoginForApi = healthState.requireLoginForApi;
  state.oauthEnabled = healthState.oauthEnabled;
  state.brawlApiTokenConfigured = healthState.brawlApiTokenConfigured;

  try {
    const authState = await loadAuthState();
    state.authenticated = authState.authenticated;
    state.user = authState.user;

    if (state.authenticated && state.user) {
      setAuthStatus(elements, `로그인됨: ${state.user.name || state.user.sub}`);
    } else if (!state.oauthEnabled) {
      setAuthStatus(elements, "OAuth 설정이 아직 서버에 적용되지 않았습니다.", true);
    } else {
      setAuthStatus(elements, "로그인되지 않음");
    }
  } catch {
    state.authenticated = false;
    state.user = null;
    setAuthStatus(elements, "인증 상태 확인 실패", true);
  }

  syncAuthButtons();
  syncInteractionLock();
}

async function loadBrawlerCatalogIfAvailable(force = false) {
  if (!force && state.brawlersLoaded) return;

  const { locked } = isApiAccessLocked();
  if (locked) return;

  try {
    const response = await loadBrawlers();
    state.brawlers = Array.isArray(response.items) ? response.items : [];
    state.brawlersLoaded = true;

    if (state.brawlers.length) {
      renderBrawlerOptions(elements, state.brawlers);
    }
  } catch {
    state.brawlers = [];
    state.brawlersLoaded = false;
  }
}

async function loadLocationCatalogIfAvailable(force = false) {
  if (!force && state.locationsLoaded) return;
  if (isApiAccessLocked().locked) return;

  try {
    const currentCountry = elements.countrySelect.value;
    const response = await loadLocations(50);
    state.locations = Array.isArray(response.items) ? response.items : [];
    state.locationsLoaded = true;
    renderCountryOptions(elements, state.locations, currentCountry || "global");
  } catch {
    state.locations = [];
    state.locationsLoaded = false;
  }
}

async function onSubmitPlayerSearch(event) {
  event.preventDefault();
  switchSection("summary");

  const { lockedByAuth, lockedByToken } = isApiAccessLocked();
  if (lockedByToken) {
    setStatus(elements, "서버에 BRAWL_API_TOKEN이 없어 조회할 수 없습니다.", true);
    return;
  }

  if (lockedByAuth) {
    setStatus(elements, "로그인 후 조회할 수 있습니다.", true);
    return;
  }

  setStatus(elements, "플레이어 데이터 로딩 중...");
  clearPlayerPanel(elements);

  try {
    const overview = await loadPlayerOverview(elements.input.value);
    renderPlayer(elements, overview);
    setStatus(elements, "조회 완료");
  } catch (error) {
    setStatus(elements, error.message || "플레이어 조회 실패", true);
  }
}

async function onSubmitClubSearch(event) {
  event.preventDefault();
  switchSection("club");

  const { lockedByAuth, lockedByToken } = isApiAccessLocked();
  if (lockedByToken) {
    setClubStatus(elements, "서버에 BRAWL_API_TOKEN이 없어 조회할 수 없습니다.", true);
    return;
  }
  if (lockedByAuth) {
    setClubStatus(elements, "로그인 후 클럽 조회가 가능합니다.", true);
    return;
  }

  setClubStatus(elements, "클럽 데이터 로딩 중...");
  clearClubPanel(elements);

  try {
    const [club, members] = await Promise.all([
      loadClub(elements.clubInput.value),
      loadClubMembers(elements.clubInput.value)
    ]);
    renderClub(elements, club, members);
    setClubStatus(elements, "클럽 조회 완료");
  } catch (error) {
    setClubStatus(elements, error.message || "클럽 조회 실패", true);
  }
}

async function onLoadRankings() {
  switchSection("rankings");
  const { lockedByAuth, lockedByToken } = isApiAccessLocked();
  if (lockedByToken) {
    renderRankingMessage(elements, "서버에 BRAWL_API_TOKEN이 설정되지 않았습니다.");
    return;
  }

  if (lockedByAuth) {
    renderRankingMessage(elements, "로그인 후 랭킹 조회가 가능합니다.");
    return;
  }

  const rankingType = elements.rankingTypeSelect.value || "players";
  const brawlerId = rankingType === "brawlers" ? elements.brawlerSelect.value : "";

  elements.rankingButton.disabled = true;
  elements.rankingButton.textContent = "불러오는 중...";
  elements.rankingList.innerHTML = "";

  try {
    if (rankingType === "brawlers") {
      await loadBrawlerCatalogIfAvailable();
    }

    const response = await loadRankings({
      type: rankingType,
      country: elements.countrySelect.value,
      brawlerId
    });
    renderRankings(elements, response.items || [], rankingType);
  } catch (error) {
    renderRankingMessage(elements, error.message || "랭킹 조회 실패");
  } finally {
    elements.rankingButton.disabled = isApiAccessLocked().locked;
    elements.rankingButton.textContent = "랭킹 불러오기";
  }
}

async function onLoadLocationInfo() {
  if (isApiAccessLocked().locked) return;
  clearLocationInfo(elements);

  try {
    const selectedCountry = String(elements.countrySelect.value || "global").toLowerCase();
    const locationId =
      selectedCountry === "global"
        ? "global"
        : resolveLocationIdByCountryCode(selectedCountry) || selectedCountry;
    const location = await loadLocation(locationId);
    renderLocationInfo(elements, location);
  } catch (error) {
    elements.locationInfoPanel.innerHTML = `<p>${safeText(error.message || "지역 조회 실패")}</p>`;
  }
}

async function onLoadBrawlerDetail() {
  if (isApiAccessLocked().locked) return;
  clearBrawlerDetail(elements);

  const brawlerId = elements.brawlerSelect.value;
  if (!brawlerId) return;

  try {
    const brawler = await loadBrawlerById(brawlerId);
    renderBrawlerDetail(elements, brawler);
  } catch (error) {
    elements.brawlerDetailPanel.innerHTML = `<p>${safeText(error.message || "브롤러 조회 실패")}</p>`;
  }
}

async function onLoadEvents() {
  switchSection("events");
  const { lockedByAuth, lockedByToken } = isApiAccessLocked();
  if (lockedByToken) {
    setEventsStatus(elements, "서버에 BRAWL_API_TOKEN이 없어 조회할 수 없습니다.", true);
    return;
  }
  if (lockedByAuth) {
    setEventsStatus(elements, "로그인 후 이벤트 조회가 가능합니다.", true);
    return;
  }

  elements.eventsButton.disabled = true;
  elements.eventsButton.textContent = "불러오는 중...";
  elements.eventsList.innerHTML = "";
  setEventsStatus(elements, "이벤트 로테이션 로딩 중...");

  try {
    const [rotation, events] = await Promise.all([loadEventRotation(), loadEvents()]);
    const mergedPayload = {
      active: Array.isArray(rotation.active) ? rotation.active : [],
      upcoming: Array.isArray(rotation.upcoming) ? rotation.upcoming : [],
      items: Array.isArray(events.items) ? events.items : []
    };
    renderEvents(elements, mergedPayload);
    setEventsStatus(
      elements,
      `이벤트 조회 완료 (active ${mergedPayload.active.length}, upcoming ${mergedPayload.upcoming.length})`
    );
  } catch (error) {
    setEventsStatus(elements, error.message || "이벤트 조회 실패", true);
  } finally {
    elements.eventsButton.disabled = isApiAccessLocked().locked;
    elements.eventsButton.textContent = "이벤트 로딩";
  }
}

async function onSubmitMultiSearch(event) {
  event.preventDefault();
  switchSection("multi");

  const { lockedByAuth, lockedByToken } = isApiAccessLocked();
  if (lockedByToken) {
    setMultiStatus(elements, "서버에 BRAWL_API_TOKEN이 없어 조회할 수 없습니다.", true);
    return;
  }
  if (lockedByAuth) {
    setMultiStatus(elements, "로그인 후 멀티검색을 사용할 수 있습니다.", true);
    return;
  }

  elements.multiButton.disabled = true;
  elements.multiButton.textContent = "조회 중...";
  elements.multiList.innerHTML = "";
  setMultiStatus(elements, "멀티검색 로딩 중...");

  try {
    const response = await loadMultiPlayerOverview(elements.multiInput.value);
    renderMultiResults(elements, response);
    setMultiStatus(
      elements,
      `완료: 성공 ${response.successCount ?? 0} / 실패 ${response.failedCount ?? 0}`
    );
  } catch (error) {
    setMultiStatus(elements, error.message || "멀티검색 실패", true);
  } finally {
    elements.multiButton.disabled = isApiAccessLocked().locked;
    elements.multiButton.textContent = "멀티 검색";
  }
}

function onRankingTypeChange() {
  syncBrawlerFilterVisibility();
}

async function onReloadLocations() {
  if (isApiAccessLocked().locked) return;

  elements.reloadLocationsButton.disabled = true;
  elements.reloadLocationsButton.textContent = "동기화 중...";

  try {
    await loadLocationCatalogIfAvailable(true);
  } finally {
    elements.reloadLocationsButton.disabled = isApiAccessLocked().locked;
    elements.reloadLocationsButton.textContent = "국가 동기화";
  }
}

async function onLogout() {
  try {
    await logout();
    state.authenticated = false;
    state.user = null;
    clearPlayerPanel(elements);
    clearClubPanel(elements);
    clearBrawlerDetail(elements);
    clearLocationInfo(elements);
    elements.eventsList.innerHTML = "";
    elements.rankingList.innerHTML = "";
    elements.multiList.innerHTML = "";
    setStatus(elements, "로그아웃되었습니다.");
    setClubStatus(elements, "로그아웃되었습니다.");
    setEventsStatus(elements, "로그아웃되었습니다.");
    setMultiStatus(elements, "로그아웃되었습니다.");
  } catch {
    setStatus(elements, "로그아웃 실패", true);
  }

  await refreshHealthAndAuth();
  await onLoadRankings();
}

function resolveLocationIdByCountryCode(countryCode) {
  const normalized = String(countryCode || "").toLowerCase();
  const found = state.locations.find(
    (location) => String(location.countryCode || "").toLowerCase() === normalized
  );
  return found?.id;
}

function bindEvents() {
  for (const tab of elements.sectionTabs) {
    tab.addEventListener("click", () => {
      switchSection(tab.dataset.sectionTarget || "summary");
    });
  }

  elements.form.addEventListener("submit", onSubmitPlayerSearch);
  elements.clubForm.addEventListener("submit", onSubmitClubSearch);
  elements.multiForm.addEventListener("submit", onSubmitMultiSearch);
  elements.rankingButton.addEventListener("click", onLoadRankings);
  elements.locationInfoButton.addEventListener("click", onLoadLocationInfo);
  elements.reloadLocationsButton.addEventListener("click", onReloadLocations);
  elements.brawlerDetailButton.addEventListener("click", onLoadBrawlerDetail);
  elements.eventsButton.addEventListener("click", onLoadEvents);
  elements.rankingTypeSelect.addEventListener("change", onRankingTypeChange);
  elements.loginButton.addEventListener("click", startOAuthLogin);
  elements.logoutButton.addEventListener("click", onLogout);
}

async function bootstrap() {
  switchSection(activeSection);
  bindEvents();
  syncBrawlerFilterVisibility();
  await refreshHealthAndAuth();
  await Promise.all([loadBrawlerCatalogIfAvailable(), loadLocationCatalogIfAvailable()]);

  if (!isApiAccessLocked().locked) {
    await Promise.all([onLoadRankings(), onLoadEvents()]);
  }
}

function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

bootstrap();
