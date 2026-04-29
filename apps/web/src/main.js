import {
  applyAuthButtons,
  applyInteractionLock,
  clearPlayerPanel,
  renderBrawlerOptions,
  renderMultiResults,
  renderPlayer,
  renderRankingMessage,
  renderRankings,
  setAuthStatus,
  setBrawlerFilterVisibility,
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
  loadBrawlers,
  loadMultiPlayerOverview,
  loadPlayerOverview,
  loadRankings
} from "./application/gameApplication.js";

const elements = getElements();

const state = {
  requireLoginForApi: false,
  brawlApiTokenConfigured: false,
  oauthEnabled: false,
  authenticated: false,
  user: null,
  brawlers: [],
  brawlersLoaded: false
};

function syncAuthButtons() {
  applyAuthButtons(elements, {
    oauthEnabled: state.oauthEnabled,
    authenticated: state.authenticated
  });
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
  } else if (lockedByAuth) {
    setStatus(elements, "로그인 후 전적/랭킹 조회가 가능합니다.");
    setMultiStatus(elements, "로그인 후 멀티검색을 사용할 수 있습니다.");
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

async function loadBrawlerCatalogIfAvailable() {
  if (state.brawlersLoaded) return;

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

async function onSubmitPlayerSearch(event) {
  event.preventDefault();

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

async function onLoadRankings() {
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

async function onSubmitMultiSearch(event) {
  event.preventDefault();

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

async function onLogout() {
  try {
    await logout();
    state.authenticated = false;
    state.user = null;
    clearPlayerPanel(elements);
    elements.rankingList.innerHTML = "";
    elements.multiList.innerHTML = "";
    setStatus(elements, "로그아웃되었습니다.");
    setMultiStatus(elements, "로그아웃되었습니다.");
  } catch {
    setStatus(elements, "로그아웃 실패", true);
  }

  await refreshHealthAndAuth();
  await onLoadRankings();
}

function bindEvents() {
  elements.form.addEventListener("submit", onSubmitPlayerSearch);
  elements.multiForm.addEventListener("submit", onSubmitMultiSearch);
  elements.rankingButton.addEventListener("click", onLoadRankings);
  elements.rankingTypeSelect.addEventListener("change", onRankingTypeChange);
  elements.loginButton.addEventListener("click", startOAuthLogin);
  elements.logoutButton.addEventListener("click", onLogout);
}

async function bootstrap() {
  bindEvents();
  syncBrawlerFilterVisibility();
  await refreshHealthAndAuth();
  await loadBrawlerCatalogIfAvailable();

  if (!isApiAccessLocked().locked) {
    await onLoadRankings();
  }
}

bootstrap();
