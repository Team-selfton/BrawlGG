import { toBattleViewModel } from "../domain/playerFormatting.js";

export function setStatus(elements, message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.classList.toggle("error", isError);
}

export function setAuthStatus(elements, message, isError = false) {
  elements.authStatus.textContent = message;
  elements.authStatus.classList.toggle("error", isError);
}

export function setMultiStatus(elements, message, isError = false) {
  elements.multiStatus.textContent = message;
  elements.multiStatus.classList.toggle("error", isError);
}

export function setClubStatus(elements, message, isError = false) {
  elements.clubStatus.textContent = message;
  elements.clubStatus.classList.toggle("error", isError);
}

export function setEventsStatus(elements, message, isError = false) {
  elements.eventsStatus.textContent = message;
  elements.eventsStatus.classList.toggle("error", isError);
}

export function applyInteractionLock(elements, locked) {
  const controls = [
    elements.input,
    elements.searchButton,
    elements.rankingButton,
    elements.countrySelect,
    elements.rankingTypeSelect,
    elements.brawlerSelect,
    elements.brawlerDetailButton,
    elements.locationInfoButton,
    elements.reloadLocationsButton,
    elements.clubInput,
    elements.clubButton,
    elements.eventsButton,
    elements.multiInput,
    elements.multiButton
  ];

  for (const control of controls) {
    if (!control) continue;
    control.disabled = locked;
  }
}

export function applyAuthButtons(elements, { oauthEnabled, authenticated }) {
  elements.loginButton.disabled = !oauthEnabled || authenticated;
  elements.logoutButton.disabled = !authenticated;
}

export function setBrawlerFilterVisibility(elements, visible) {
  if (!elements.brawlerSelect) return;
  elements.brawlerSelect.classList.toggle("hidden", !visible);
}

export function renderPlayer(elements, overview) {
  const player = overview.player || {};
  const battlelog = overview.battlelog || { items: [] };
  const insights = overview.insights || {};
  const topBrawlers = overview.topBrawlers || [];

  const battleItems = (battlelog.items || [])
    .slice(0, 8)
    .map(toBattleViewModel)
    .map(
      (battle) => `
      <div class="battle-item">
        <strong>${safeText(battle.mode)}</strong> • 결과: ${safeText(battle.result)}
        <p>${safeText(battle.map)}</p>
        <p>${safeText(battle.time)}</p>
      </div>
    `
    )
    .join("");

  const brawlerItems = topBrawlers
    .slice(0, 8)
    .map(
      (brawler) => `
      <li>
        <span class="name">${safeText(brawler.name || "-")}</span>
        <span>${safeText(String(brawler.trophies ?? "-"))} trophies / P${safeText(
          String(brawler.power ?? "-")
        )}</span>
      </li>
    `
    )
    .join("");

  elements.playerPanel.innerHTML = `
    <article class="player-summary">
      <div class="summary-head">
        <h3>${safeText(player.name || "Unknown Player")}</h3>
        <span class="tag">${safeText(player.tag || "-")}</span>
      </div>
      <div class="stats-grid">
        ${renderStat("트로피", player.trophies)}
        ${renderStat("최고 트로피", player.highestTrophies)}
        ${renderStat("레벨", player.expLevel)}
        ${renderStat("승리(3v3)", player["3vs3Victories"])}
        ${renderStat("솔로 승리", player.soloVictories)}
        ${renderStat("듀오 승리", player.duoVictories)}
      </div>
      <div class="insight-grid">
        ${renderStat("최근 승률", `${insights.winRate ?? 0}%`)}
        ${renderStat("최근 전적", `${insights.wins ?? 0}승 ${insights.losses ?? 0}패`)}
        ${renderStat("트로피 변화", insights.trophyDelta ?? 0)}
        ${renderStat("자주 한 모드", insights.mostPlayedMode || "-")}
      </div>
      <div class="sub-panel">
        <h4>주력 브롤러 (Top 8)</h4>
        <ul class="compact-list">
          ${brawlerItems || "<li>브롤러 정보가 없습니다.</li>"}
        </ul>
      </div>
      <div class="battle-list">
        ${battleItems || "<p>최근 전투기록이 없습니다.</p>"}
      </div>
    </article>
  `;
}

export function clearPlayerPanel(elements) {
  elements.playerPanel.innerHTML = "";
}

export function clearClubPanel(elements) {
  elements.clubPanel.innerHTML = "";
}

export function renderRankings(elements, items, rankingType) {
  if (!items.length) {
    elements.rankingList.innerHTML = "<li>랭킹 데이터가 없습니다.</li>";
    return;
  }

  if (rankingType === "clubs") {
    elements.rankingList.innerHTML = items
      .map(
        (item) => `
          <li>
            <span class="name">${safeText(item.name || "-")}</span>
            <span>${safeText(String(item.trophies ?? "-"))} trophies • 멤버 ${safeText(
              String(item.memberCount ?? "-")
            )}</span>
          </li>
        `
      )
      .join("");
    return;
  }

  if (rankingType === "brawlers") {
    elements.rankingList.innerHTML = items
      .map(
        (item) => `
          <li>
            <span class="name">${safeText(item.name || "-")}</span>
            <span>${safeText(String(item.trophies ?? "-"))} trophies • ${safeText(item.tag || "-")}</span>
          </li>
        `
      )
      .join("");
    return;
  }

  elements.rankingList.innerHTML = items
    .map(
      (item) => `
        <li>
          <span class="name">${safeText(item.name || "-")}</span>
          <span>${safeText(String(item.trophies ?? "-"))} trophies</span>
        </li>
      `
    )
    .join("");
}

export function renderRankingMessage(elements, message) {
  elements.rankingList.innerHTML = `<li>${safeText(message)}</li>`;
}

export function renderBrawlerOptions(elements, brawlers, selectedId = "") {
  const safeList = Array.isArray(brawlers) ? brawlers : [];
  const selected = String(selectedId || safeList[0]?.id || "");

  elements.brawlerSelect.innerHTML = safeList
    .map((brawler) => {
      const id = String(brawler.id || "");
      const name = safeText(brawler.name || `Brawler ${id}`);
      const isSelected = id === selected ? " selected" : "";

      return `<option value="${id}"${isSelected}>${name}</option>`;
    })
    .join("");
}

export function renderCountryOptions(elements, locations, selectedValue = "global") {
  const safeLocations = Array.isArray(locations) ? locations : [];
  const countries = safeLocations.filter((location) => location?.isCountry && location?.countryCode);
  const selected = String(selectedValue || "global").toLowerCase();

  const optionList = [
    `<option value="global"${selected === "global" ? " selected" : ""}>Global</option>`,
    ...countries
      .slice()
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")))
      .map((country) => {
        const code = String(country.countryCode || "").toLowerCase();
        const name = safeText(country.name || code.toUpperCase());
        const isSelected = selected === code ? " selected" : "";
        return `<option value="${code}"${isSelected}>${name}</option>`;
      })
  ];

  elements.countrySelect.innerHTML = optionList.join("");
}

export function renderLocationInfo(elements, location) {
  if (!location) {
    elements.locationInfoPanel.innerHTML = "<p>지역 정보를 찾을 수 없습니다.</p>";
    return;
  }

  elements.locationInfoPanel.innerHTML = `
    <div class="meta-card">
      <p><strong>${safeText(location.name || "-")}</strong></p>
      <p>ID: ${safeText(String(location.id ?? "-"))}</p>
      <p>Country: ${safeText(String(Boolean(location.isCountry)))}</p>
      <p>Code: ${safeText(location.countryCode || "-")}</p>
    </div>
  `;
}

export function clearLocationInfo(elements) {
  elements.locationInfoPanel.innerHTML = "";
}

export function renderBrawlerDetail(elements, brawler) {
  if (!brawler) {
    elements.brawlerDetailPanel.innerHTML = "<p>브롤러 상세 데이터가 없습니다.</p>";
    return;
  }

  const starPowers = Array.isArray(brawler.starPowers)
    ? brawler.starPowers.map((item) => safeText(item.name || "-")).join(", ")
    : "";
  const gadgets = Array.isArray(brawler.gadgets)
    ? brawler.gadgets.map((item) => safeText(item.name || "-")).join(", ")
    : "";

  elements.brawlerDetailPanel.innerHTML = `
    <div class="meta-card">
      <p><strong>${safeText(brawler.name || "-")}</strong> (${safeText(String(brawler.id ?? "-"))})</p>
      <p>스타파워: ${starPowers || "정보 없음"}</p>
      <p>가젯: ${gadgets || "정보 없음"}</p>
    </div>
  `;
}

export function clearBrawlerDetail(elements) {
  elements.brawlerDetailPanel.innerHTML = "";
}

export function renderClub(elements, club, members) {
  const memberItems = Array.isArray(members?.items) ? members.items : [];
  const memberRows = memberItems
    .slice(0, 12)
    .map(
      (member) => `
        <li>
          <span class="name">${safeText(member.name || "-")}</span>
          <span>${safeText(String(member.trophies ?? "-"))} trophies</span>
        </li>
      `
    )
    .join("");

  elements.clubPanel.innerHTML = `
    <article class="player-summary">
      <div class="summary-head">
        <h3>${safeText(club?.name || "Unknown Club")}</h3>
        <span class="tag">${safeText(club?.tag || members?.tag || "-")}</span>
      </div>
      <div class="stats-grid">
        ${renderStat("클럽 점수", club?.trophies)}
        ${renderStat("요구 트로피", club?.requiredTrophies)}
        ${renderStat("멤버 수", club?.members?.length ?? memberItems.length)}
        ${renderStat("온라인", club?.onlineMembers)}
      </div>
      <div class="sub-panel">
        <h4>클럽 멤버 (최대 12명 미리보기)</h4>
        <ul class="compact-list">
          ${memberRows || "<li>멤버 데이터가 없습니다.</li>"}
        </ul>
      </div>
    </article>
  `;
}

export function renderEvents(elements, payload) {
  const active = Array.isArray(payload?.active) ? payload.active : [];
  const upcoming = Array.isArray(payload?.upcoming) ? payload.upcoming : [];

  const toRows = (items, label) =>
    items
      .slice(0, 12)
      .map((item) => {
        const event = item.event || item;
        const map = event.map || item.map || "Unknown Map";
        const mode = event.mode || item.mode || "unknown";
        const modifier = event.modifier?.name || item.modifier?.name || "-";
        return `
          <li>
            <span class="name">${safeText(`[${label}] ${mode}`)}</span>
            <span>${safeText(map)} • ${safeText(modifier)}</span>
          </li>
        `;
      })
      .join("");

  const html = `${toRows(active, "LIVE")}${toRows(upcoming, "NEXT")}`.trim();
  elements.eventsList.innerHTML = html || "<li>이벤트 데이터가 없습니다.</li>";
}

export function renderMultiResults(elements, payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    elements.multiList.innerHTML = "<li>결과가 없습니다.</li>";
    return;
  }

  elements.multiList.innerHTML = items
    .map((item) => {
      if (!item.ok) {
        return `
          <li class="multi-item error-item">
            <div>
              <strong>${safeText(item.tag || "-")}</strong>
              <p>${safeText(item.error?.message || "조회 실패")}</p>
            </div>
          </li>
        `;
      }

      return `
        <li class="multi-item">
          <div class="multi-head">
            <strong>${safeText(item.player?.name || "-")}</strong>
            <span class="tag">${safeText(item.player?.tag || item.tag || "-")}</span>
          </div>
          <p>트로피 ${safeText(String(item.player?.trophies ?? "-"))} / 최고 ${safeText(
            String(item.player?.highestTrophies ?? "-")
          )}</p>
          <p>최근 승률 ${safeText(String(item.insights?.winRate ?? 0))}% (${safeText(
            String(item.insights?.wins ?? 0)
          )}승 ${safeText(String(item.insights?.losses ?? 0))}패)</p>
        </li>
      `;
    })
    .join("");
}

function renderStat(label, value) {
  return `
    <div class="stat">
      <p>${safeText(label)}</p>
      <p>${safeText(String(value ?? "-"))}</p>
    </div>
  `;
}

function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
