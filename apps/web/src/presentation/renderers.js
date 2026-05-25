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
    elements.nameInput,
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
  if (!elements.loginButton || !elements.logoutButton) return;
  elements.loginButton.disabled = !oauthEnabled || authenticated;
  elements.logoutButton.disabled = !authenticated;
}

export function setAuthBoxVisibility(elements, visible) {
  if (!elements.authBox) return;
  elements.authBox.classList.toggle("hidden", !visible);
}

export function setBrawlerFilterVisibility(elements, visible) {
  if (!elements.brawlerSelect) return;
  elements.brawlerSelect.classList.toggle("hidden", !visible);
}

export function renderPlayer(elements, overview) {
  const player = overview.player || {};
  const battlelog = overview.battlelog || { items: [] };
  const insights = overview.insights || {};
  const topBrawlers = Array.isArray(overview.topBrawlers) ? overview.topBrawlers : [];

  const battleItems = (battlelog.items || [])
    .slice(0, 10)
    .map(toBattleViewModel)
    .map(
      (battle) => `
      <li>
        <div>
          <p class="match-main">${safeText(battle.mode)} · ${safeText(battle.result)}</p>
          <p class="match-sub">${safeText(battle.map)}</p>
        </div>
        <span class="match-sub">${safeText(battle.time)}</span>
      </li>
    `
    )
    .join("");

  const brawlerItems = topBrawlers
    .slice(0, 8)
    .map(
      (brawler, index) => `
      <li>
        <span>${index + 1}. <strong>${safeText(brawler.name || "-")}</strong></span>
        <span class="match-sub">${safeText(String(brawler.trophies ?? "-"))}T · P${safeText(
          String(brawler.power ?? "-")
        )}</span>
      </li>
    `
    )
    .join("");

  elements.playerPanel.innerHTML = `
    <article class="profile-snapshot">
      <div class="profile-head">
        <div>
          <h3>${safeText(player.name || "Unknown Player")}</h3>
          <span class="tag">${safeText(player.tag || "-")}</span>
        </div>
        <span class="tier-chip">TROPHIES ${safeText(String(player.trophies ?? "-"))}</span>
      </div>

      <div class="stats-grid">
        ${renderStat("최고 트로피", player.highestTrophies)}
        ${renderStat("레벨", player.expLevel)}
        ${renderStat("3v3 승리", player["3vs3Victories"])}
        ${renderStat("솔로 승리", player.soloVictories)}
        ${renderStat("듀오 승리", player.duoVictories)}
        ${renderStat("클럽", player.club?.name || "-")}
      </div>

      <div class="insight-grid">
        ${renderStat("최근 승률", `${insights.winRate ?? 0}%`)}
        ${renderStat("최근 전적", `${insights.wins ?? 0}승 ${insights.losses ?? 0}패`)}
        ${renderStat("트로피 증감", insights.trophyDelta ?? 0)}
        ${renderStat("최다 모드", insights.mostPlayedMode || "-")}
        ${renderStat("연속 승리", insights.currentWinStreak ?? "-")}
        ${renderStat("평균 결과", insights.averageResult || "-")}
      </div>

      <section class="module-box">
        <h4>Most Played Brawlers</h4>
        <ul class="champion-list">
          ${brawlerItems || "<li>브롤러 데이터가 없습니다.</li>"}
        </ul>
      </section>

      <section class="module-box">
        <h4>Recent Matches</h4>
        <ul class="match-list">
          ${battleItems || "<li>최근 전투기록이 없습니다.</li>"}
        </ul>
      </section>
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
    elements.rankingList.innerHTML = `<li class="ranking-row"><div class="ranking-main">데이터가 없습니다.</div></li>`;
    return;
  }

  elements.rankingList.innerHTML = items
    .map((item, index) => {
      const rank = item.rank ?? index + 1;

      if (rankingType === "clubs") {
        return `
          <li class="ranking-row">
            <span class="ranking-rank">#${safeText(String(rank))}</span>
            <div class="ranking-main">
              <span class="name">${safeText(item.name || "-")}</span>
              <span class="meta">${safeText(String(item.trophies ?? "-"))} trophies · 멤버 ${safeText(
                String(item.memberCount ?? "-")
              )}</span>
            </div>
          </li>
        `;
      }

      if (rankingType === "brawlers") {
        return `
          <li class="ranking-row">
            <span class="ranking-rank">#${safeText(String(rank))}</span>
            <div class="ranking-main">
              <span class="name">${safeText(item.name || "-")}</span>
              <span class="meta">${safeText(String(item.trophies ?? "-"))} trophies · ${safeText(item.tag || "-")}</span>
            </div>
          </li>
        `;
      }

      return `
        <li class="ranking-row">
          <span class="ranking-rank">#${safeText(String(rank))}</span>
          <div class="ranking-main">
            <span class="name">${safeText(item.name || "-")}</span>
            <span class="meta">${safeText(String(item.trophies ?? "-"))} trophies</span>
          </div>
        </li>
      `;
    })
    .join("");
}

export function renderRankingMessage(elements, message) {
  elements.rankingList.innerHTML = `
    <li class="ranking-row">
      <div class="ranking-main">${safeText(message)}</div>
    </li>
  `;
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
    .slice(0, 15)
    .map(
      (member, index) => `
        <li>
          <span>${index + 1}. <strong>${safeText(member.name || "-")}</strong></span>
          <span class="match-sub">${safeText(String(member.trophies ?? "-"))} trophies</span>
        </li>
      `
    )
    .join("");

  elements.clubPanel.innerHTML = `
    <article class="profile-snapshot">
      <div class="profile-head">
        <div>
          <h3>${safeText(club?.name || "Unknown Club")}</h3>
          <span class="tag">${safeText(club?.tag || members?.tag || "-")}</span>
        </div>
        <span class="tier-chip">CLUB ${safeText(String(club?.trophies ?? "-"))}</span>
      </div>

      <div class="stats-grid">
        ${renderStat("클럽 점수", club?.trophies)}
        ${renderStat("요구 트로피", club?.requiredTrophies)}
        ${renderStat("멤버 수", club?.members?.length ?? memberItems.length)}
        ${renderStat("온라인", club?.onlineMembers)}
        ${renderStat("클럽 타입", club?.type || "-")}
        ${renderStat("설명", club?.description || "-")}
      </div>

      <section class="module-box">
        <h4>Members</h4>
        <ul class="champion-list">
          ${memberRows || "<li>멤버 데이터가 없습니다.</li>"}
        </ul>
      </section>
    </article>
  `;
}

export function renderEvents(elements, payload) {
  const active = Array.isArray(payload?.active) ? payload.active : [];
  const upcoming = Array.isArray(payload?.upcoming) ? payload.upcoming : [];

  const rows = [...active.map((item) => ({ label: "LIVE", item })), ...upcoming.map((item) => ({ label: "NEXT", item }))]
    .slice(0, 20)
    .map(({ label, item }, index) => {
      const event = item.event || item;
      const map = event.map || item.map || "Unknown Map";
      const mode = event.mode || item.mode || "unknown";
      const modifier = event.modifier?.name || item.modifier?.name || "-";

      return `
        <li class="ranking-row">
          <span class="ranking-rank">${safeText(label)}</span>
          <div class="ranking-main">
            <span class="name">${safeText(mode)}</span>
            <span class="meta">${safeText(map)} · ${safeText(modifier)} · #${index + 1}</span>
          </div>
        </li>
      `;
    })
    .join("");

  elements.eventsList.innerHTML =
    rows ||
    `<li class="ranking-row"><div class="ranking-main">이벤트 데이터가 없습니다.</div></li>`;
}

export function renderMultiResults(elements, payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    elements.multiList.innerHTML = "<li class=\"multi-item\">결과가 없습니다.</li>";
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
