import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as ExpoLinking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import {
  applyTokensFromDeepLink,
  loadAuthStatus,
  logout,
  startOAuthLogin
} from "../application/authApplication";
import {
  loadClub,
  loadClubMembers,
  loadEventRotation,
  loadHealth,
  loadMultiPlayerOverview,
  loadPlayerOverview,
  loadRankings
} from "../application/gameApplication";
import { toCompactPlayerStats } from "../domain/playerFormatting";
import {
  getApiBaseUrl,
  hydrateRuntimeConfig
} from "../shared/config/runtimeConfig";
import { getAuthTokens } from "../shared/storage/tokenStore";

const NAV_ITEMS = [
  { key: "summary", label: "Summary" },
  { key: "rankings", label: "Rankings" },
  { key: "multi", label: "Multi" },
  { key: "club", label: "Club" },
  { key: "events", label: "Events" }
];

export default function MobileApp() {
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeView, setActiveView] = useState("summary");

  const [health, setHealth] = useState({
    brawlApiTokenConfigured: false,
    oauthEnabled: false,
    requireLoginForApi: false
  });
  const [auth, setAuth] = useState({
    authenticated: false,
    user: null
  });
  const [hasStoredTokens, setHasStoredTokens] = useState(false);
  const [notice, setNotice] = useState("초기화 중...");

  const [playerTagInput, setPlayerTagInput] = useState("");
  const [playerOverview, setPlayerOverview] = useState(null);
  const [playerStatus, setPlayerStatus] = useState("플레이어 태그를 입력하세요.");

  const [rankingType, setRankingType] = useState("players");
  const [countryCode, setCountryCode] = useState("global");
  const [brawlerId, setBrawlerId] = useState("16000000");
  const [rankingItems, setRankingItems] = useState([]);
  const [rankingStatus, setRankingStatus] = useState("랭킹을 조회하세요.");

  const [multiInput, setMultiInput] = useState("");
  const [multiStatus, setMultiStatus] = useState("태그를 콤마로 입력하세요.");
  const [multiItems, setMultiItems] = useState([]);

  const [clubTagInput, setClubTagInput] = useState("");
  const [clubResult, setClubResult] = useState(null);
  const [clubStatus, setClubStatus] = useState("클럽 태그를 입력하세요.");

  const [events, setEvents] = useState({ active: [], upcoming: [] });
  const [eventsStatus, setEventsStatus] = useState("이벤트 데이터를 불러오세요.");

  const lockedReason = useMemo(() => {
    if (!health.brawlApiTokenConfigured) {
      return "서버에 BRAWL_API_TOKEN이 설정되지 않았습니다.";
    }
    if (health.requireLoginForApi && !auth.authenticated) {
      return "로그인이 필요한 API 설정입니다.";
    }
    return "";
  }, [health.brawlApiTokenConfigured, health.requireLoginForApi, auth.authenticated]);

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    const subscription = ExpoLinking.addEventListener("url", (event) => {
      handleIncomingDeepLink(event.url);
    });

    ExpoLinking.getInitialURL().then((url) => {
      if (url) {
        handleIncomingDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function bootstrap() {
    await hydrateRuntimeConfig();
    await refreshSystemStatus();
    setBooting(false);
  }

  async function refreshSystemStatus() {
    try {
      const [healthResponse, authResponse, storedTokens] = await Promise.all([
        loadHealth(),
        loadAuthStatus().catch(() => ({ authenticated: false, user: null, oauthEnabled: false })),
        getAuthTokens()
      ]);

      setHealth({
        brawlApiTokenConfigured: Boolean(healthResponse?.brawlApiTokenConfigured),
        oauthEnabled: Boolean(healthResponse?.oauthEnabled),
        requireLoginForApi: Boolean(healthResponse?.requireLoginForApi)
      });

      setAuth({
        authenticated: Boolean(authResponse?.authenticated),
        user: authResponse?.user || null
      });

      setHasStoredTokens(Boolean(storedTokens?.accessToken));
      setNotice("연결됨 · 바로 검색할 수 있어요.");
    } catch {
      setNotice("서버 연결 실패. 같은 Wi-Fi에서 서버를 실행해 주세요.");
      setAuth({ authenticated: false, user: null });
      setHealth({
        brawlApiTokenConfigured: false,
        oauthEnabled: false,
        requireLoginForApi: false
      });
      setHasStoredTokens(false);
    }
  }

  async function handleIncomingDeepLink(url) {
    const applied = await applyTokensFromDeepLink(url);
    if (!applied) return;

    setNotice("모바일 OAuth 토큰 저장 완료");
    await refreshSystemStatus();
  }

  async function onLogin() {
    if (!health.oauthEnabled) {
      setNotice("서버 OAuth 설정이 아직 비활성화 상태입니다.");
      return;
    }

    try {
      await startOAuthLogin();
      setNotice("브라우저에서 로그인 후 앱으로 돌아오세요.");
    } catch {
      setNotice("OAuth 로그인 시작에 실패했습니다.");
    }
  }

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
      await refreshSystemStatus();
      setNotice("로그아웃되었습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function onLoadPlayer() {
    setActiveView("summary");
    if (lockedReason) {
      setPlayerStatus(lockedReason);
      return;
    }

    if (!playerTagInput.trim()) {
      setPlayerStatus("플레이어 태그를 입력하세요.");
      return;
    }

    setPlayerStatus("플레이어 조회 중...");
    try {
      const response = await loadPlayerOverview(playerTagInput);
      setPlayerOverview(response);
      setPlayerStatus("플레이어 조회 완료");
    } catch (error) {
      setPlayerOverview(null);
      setPlayerStatus(error.message || "플레이어 조회 실패");
    }
  }

  async function onLoadRankings() {
    setActiveView("rankings");
    if (lockedReason) {
      setRankingStatus(lockedReason);
      return;
    }

    setRankingStatus("랭킹 조회 중...");
    try {
      const response = await loadRankings({
        type: rankingType,
        country: countryCode.trim() || "global",
        brawlerId: brawlerId.trim(),
        limit: 20
      });
      setRankingItems(Array.isArray(response?.items) ? response.items : []);
      setRankingStatus("랭킹 조회 완료");
    } catch (error) {
      setRankingItems([]);
      setRankingStatus(error.message || "랭킹 조회 실패");
    }
  }

  async function onLoadMultiSearch() {
    setActiveView("multi");
    if (lockedReason) {
      setMultiStatus(lockedReason);
      return;
    }

    if (!multiInput.trim()) {
      setMultiStatus("태그를 하나 이상 입력하세요.");
      return;
    }

    setMultiStatus("멀티 검색 중...");
    try {
      const response = await loadMultiPlayerOverview(multiInput);
      const items = Array.isArray(response?.items) ? response.items : [];
      setMultiItems(items);
      setMultiStatus(`완료: 성공 ${response.successCount ?? 0} / 실패 ${response.failedCount ?? 0}`);
    } catch (error) {
      setMultiItems([]);
      setMultiStatus(error.message || "멀티 검색 실패");
    }
  }

  async function onLoadClub() {
    setActiveView("club");
    if (lockedReason) {
      setClubStatus(lockedReason);
      return;
    }

    if (!clubTagInput.trim()) {
      setClubStatus("클럽 태그를 입력하세요.");
      return;
    }

    setClubStatus("클럽 조회 중...");
    try {
      const [club, members] = await Promise.all([loadClub(clubTagInput), loadClubMembers(clubTagInput)]);
      setClubResult({ club, members: Array.isArray(members?.items) ? members.items : [] });
      setClubStatus("클럽 조회 완료");
    } catch (error) {
      setClubResult(null);
      setClubStatus(error.message || "클럽 조회 실패");
    }
  }

  async function onLoadEvents() {
    setActiveView("events");
    if (lockedReason) {
      setEventsStatus(lockedReason);
      return;
    }

    setEventsStatus("이벤트 조회 중...");
    try {
      const rotation = await loadEventRotation();
      setEvents({
        active: Array.isArray(rotation?.active) ? rotation.active : [],
        upcoming: Array.isArray(rotation?.upcoming) ? rotation.upcoming : []
      });
      setEventsStatus("이벤트 조회 완료");
    } catch (error) {
      setEvents({ active: [], upcoming: [] });
      setEventsStatus(error.message || "이벤트 조회 실패");
    }
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2e63dc" />
          <Text style={styles.loaderText}>BrawlGG Mobile 준비 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const compact = playerOverview ? toCompactPlayerStats(playerOverview) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>BrawlGG</Text>
          <Text style={styles.subtitle}>OP.GG 스타일 Brawl Stars 전적 앱</Text>
        </View>

        <View style={styles.connectionCard}>
          <Text style={styles.notice}>{notice}</Text>
          <StatRow label="API Base URL" value={getApiBaseUrl()} />
          <StatRow label="서버 API 토큰" value={health.brawlApiTokenConfigured ? "설정됨" : "미설정"} />
          <StatRow label="OAuth" value={health.oauthEnabled ? "활성" : "비활성"} />
          <StatRow
            label="인증"
            value={auth.authenticated ? `로그인됨 (${auth.user?.name || auth.user?.sub || "user"})` : "로그인 안됨"}
          />
          <StatRow label="로컬 토큰" value={hasStoredTokens ? "저장됨" : "없음"} />

          <View style={styles.buttonRow}>
            <ActionButton label="OAuth 로그인" onPress={onLogin} disabled={busy || !health.oauthEnabled} />
            <ActionButton label="로그아웃" onPress={onLogout} ghost disabled={busy} />
          </View>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, styles.searchInput]}
            value={playerTagInput}
            onChangeText={setPlayerTagInput}
            autoCapitalize="characters"
            placeholder="#2PP"
            placeholderTextColor="#7d8aa8"
          />
          <ActionButton label="Search" onPress={onLoadPlayer} />
        </View>

        <View style={styles.navRow}>
          {NAV_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.navButton, activeView === item.key ? styles.navButtonActive : null]}
              onPress={() => setActiveView(item.key)}
            >
              <Text style={[styles.navButtonText, activeView === item.key ? styles.navButtonTextActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeView === "summary" ? (
          <View style={styles.sectionCard}>
            <SectionTitle title="Summary" status={playerStatus} />
            {compact ? (
              <View style={styles.resultCard}>
                <View style={styles.profileHeader}>
                  <View>
                    <Text style={styles.playerName}>{compact.player?.name || "Unknown"}</Text>
                    <Text style={styles.playerTag}>{compact.player?.tag || "-"}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>T {compact.player?.trophies ?? "-"}</Text>
                  </View>
                </View>

                <StatGrid
                  items={[
                    ["최고 트로피", compact.player?.highestTrophies],
                    ["레벨", compact.player?.expLevel],
                    ["3v3", compact.player?.["3vs3Victories"]],
                    ["최근 승률", `${compact.insights?.winRate ?? 0}%`]
                  ]}
                />

                <Text style={styles.blockTitle}>Most Brawlers</Text>
                {(compact.topBrawlers || []).slice(0, 6).map((brawler, index) => (
                  <ListRow
                    key={`${brawler.id || index}-${index}`}
                    left={`${index + 1}. ${brawler.name || "-"}`}
                    right={`${brawler.trophies ?? "-"}T`}
                  />
                ))}

                <Text style={styles.blockTitle}>Recent Matches</Text>
                {(compact.battlelogItems || []).slice(0, 8).map((battle, index) => (
                  <ListRow
                    key={`${battle.time}-${index}`}
                    left={`${battle.mode} · ${battle.result}`}
                    right={battle.map}
                    sub={battle.time}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {activeView === "rankings" ? (
          <View style={styles.sectionCard}>
            <SectionTitle title="Rankings" status={rankingStatus} />

            <View style={styles.buttonRow}>
              <SegmentButton label="Players" active={rankingType === "players"} onPress={() => setRankingType("players")} />
              <SegmentButton label="Clubs" active={rankingType === "clubs"} onPress={() => setRankingType("clubs")} />
              <SegmentButton label="Brawlers" active={rankingType === "brawlers"} onPress={() => setRankingType("brawlers")} />
            </View>

            <TextInput
              style={styles.input}
              value={countryCode}
              onChangeText={setCountryCode}
              autoCapitalize="none"
              placeholder="global / kr / us"
              placeholderTextColor="#7d8aa8"
            />

            {rankingType === "brawlers" ? (
              <TextInput
                style={styles.input}
                value={brawlerId}
                onChangeText={setBrawlerId}
                keyboardType="numeric"
                placeholder="brawlerId (예: 16000000)"
                placeholderTextColor="#7d8aa8"
              />
            ) : null}

            <ActionButton label="랭킹 조회" onPress={onLoadRankings} />

            <View style={styles.resultCard}>
              {rankingItems.slice(0, 20).map((item, index) => (
                <ListRow
                  key={`${item.tag || item.name || index}-${index}`}
                  left={`#${item.rank || index + 1} ${item.name || "-"}`}
                  right={`${item.trophies ?? "-"}T`}
                />
              ))}
            </View>
          </View>
        ) : null}

        {activeView === "multi" ? (
          <View style={styles.sectionCard}>
            <SectionTitle title="Multi-Search" status={multiStatus} />

            <TextInput
              style={[styles.input, styles.multiline]}
              value={multiInput}
              onChangeText={setMultiInput}
              autoCapitalize="characters"
              multiline
              placeholder="#2PP, #8Q8, #YQ9U"
              placeholderTextColor="#7d8aa8"
            />
            <ActionButton label="멀티 검색" onPress={onLoadMultiSearch} />

            <View style={styles.resultCard}>
              {multiItems.map((item, index) => {
                if (!item.ok) {
                  return <ListRow key={`error-${item.tag}-${index}`} left={item.tag || "-"} right="실패" sub={item.error?.message || "조회 실패"} error />;
                }

                return (
                  <ListRow
                    key={`ok-${item.tag}-${index}`}
                    left={`${item.player?.name || "-"} (${item.player?.tag || item.tag || "-"})`}
                    right={`${item.player?.trophies ?? "-"}T`}
                    sub={`승률 ${item.insights?.winRate ?? 0}%`}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        {activeView === "club" ? (
          <View style={styles.sectionCard}>
            <SectionTitle title="Club" status={clubStatus} />

            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, styles.searchInput]}
                value={clubTagInput}
                onChangeText={setClubTagInput}
                autoCapitalize="characters"
                placeholder="#YQ0L8C"
                placeholderTextColor="#7d8aa8"
              />
              <ActionButton label="조회" onPress={onLoadClub} />
            </View>

            {clubResult ? (
              <View style={styles.resultCard}>
                <View style={styles.profileHeader}>
                  <View>
                    <Text style={styles.playerName}>{clubResult.club?.name || "Unknown Club"}</Text>
                    <Text style={styles.playerTag}>{clubResult.club?.tag || "-"}</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{clubResult.club?.trophies ?? "-"}T</Text>
                  </View>
                </View>

                <StatGrid
                  items={[
                    ["요구 트로피", clubResult.club?.requiredTrophies],
                    ["멤버 수", clubResult.members.length],
                    ["온라인", clubResult.club?.onlineMembers],
                    ["타입", clubResult.club?.type]
                  ]}
                />

                <Text style={styles.blockTitle}>Members</Text>
                {clubResult.members.slice(0, 12).map((member, index) => (
                  <ListRow
                    key={`${member.tag || member.name || index}-${index}`}
                    left={`${index + 1}. ${member.name || "-"}`}
                    right={`${member.trophies ?? "-"}T`}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {activeView === "events" ? (
          <View style={styles.sectionCard}>
            <SectionTitle title="Event Rotation" status={eventsStatus} />
            <ActionButton label="이벤트 조회" onPress={onLoadEvents} />

            <View style={styles.resultCard}>
              <Text style={styles.blockTitle}>LIVE</Text>
              {events.active.slice(0, 8).map((item, index) => {
                const event = item.event || item;
                return (
                  <ListRow
                    key={`active-${event.id || index}-${index}`}
                    left={event.mode || "unknown"}
                    right={event.map || "Unknown Map"}
                  />
                );
              })}

              <Text style={styles.blockTitle}>UPCOMING</Text>
              {events.upcoming.slice(0, 8).map((item, index) => {
                const event = item.event || item;
                return (
                  <ListRow
                    key={`upcoming-${event.id || index}-${index}`}
                    left={event.mode || "unknown"}
                    right={event.map || "Unknown Map"}
                  />
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title, status }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionStatus}>{status}</Text>
    </View>
  );
}

function StatRow({ label, value }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{String(value ?? "-")}</Text>
    </View>
  );
}

function StatGrid({ items }) {
  return (
    <View style={styles.statGrid}>
      {(items || []).map(([label, value]) => (
        <View key={label} style={styles.statCell}>
          <Text style={styles.statCellLabel}>{label}</Text>
          <Text style={styles.statCellValue}>{String(value ?? "-")}</Text>
        </View>
      ))}
    </View>
  );
}

function ListRow({ left, right, sub, error = false }) {
  return (
    <View style={[styles.listRow, error ? styles.listRowError : null]}>
      <View style={styles.listLeft}>
        <Text style={styles.listLeftText}>{left}</Text>
        {sub ? <Text style={styles.listSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.listRightText}>{right}</Text>
    </View>
  );
}

function ActionButton({ label, onPress, disabled = false, ghost = false }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        ghost ? styles.buttonGhost : null,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, ghost ? styles.buttonGhostText : null]}>{label}</Text>
    </Pressable>
  );
}

function SegmentButton({ label, active, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.segment, active ? styles.segmentActive : null, pressed ? styles.segmentPressed : null]}
      onPress={onPress}
    >
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef2fa"
  },
  container: {
    padding: 14,
    gap: 10,
    paddingBottom: 32
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  loaderText: {
    color: "#4d5f85",
    fontSize: 14
  },
  header: {
    paddingHorizontal: 2
  },
  title: {
    color: "#1d2e58",
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    marginTop: 2,
    color: "#607396",
    fontSize: 13
  },
  connectionCard: {
    backgroundColor: "#1f57d6",
    borderRadius: 14,
    padding: 12,
    gap: 6
  },
  notice: {
    color: "#dbe8ff",
    fontSize: 12
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  statLabel: {
    color: "#dbe8ff",
    fontSize: 12
  },
  statValue: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccd8f3",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    color: "#1d2e58",
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  searchInput: {
    flex: 1
  },
  navRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap"
  },
  navButton: {
    borderWidth: 1,
    borderColor: "#c9d7f5",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11
  },
  navButtonActive: {
    backgroundColor: "#1f57d6",
    borderColor: "#1f57d6"
  },
  navButtonText: {
    color: "#3f5889",
    fontSize: 12,
    fontWeight: "700"
  },
  navButtonTextActive: {
    color: "#ffffff"
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe4fa",
    padding: 10,
    gap: 8
  },
  sectionHead: {
    gap: 3
  },
  sectionTitle: {
    color: "#223563",
    fontSize: 18,
    fontWeight: "700"
  },
  sectionStatus: {
    color: "#6b7da1",
    fontSize: 12
  },
  resultCard: {
    borderWidth: 1,
    borderColor: "#dbe4fa",
    borderRadius: 10,
    padding: 9,
    gap: 6,
    backgroundColor: "#f9fbff"
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  playerName: {
    color: "#233966",
    fontSize: 16,
    fontWeight: "700"
  },
  playerTag: {
    color: "#2e63dc",
    fontSize: 13,
    fontWeight: "600"
  },
  badge: {
    borderWidth: 1,
    borderColor: "#c7d8fb",
    backgroundColor: "#e9f0ff",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9
  },
  badgeText: {
    color: "#2548a4",
    fontSize: 12,
    fontWeight: "700"
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  statCell: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#dbe4fa",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  statCellLabel: {
    color: "#7588ad",
    fontSize: 11
  },
  statCellValue: {
    color: "#223766",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  blockTitle: {
    color: "#2a4e96",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  listRow: {
    borderWidth: 1,
    borderColor: "#dce6fb",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingVertical: 7,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  listRowError: {
    borderColor: "#ffc8d0",
    backgroundColor: "#fff7f8"
  },
  listLeft: {
    flex: 1
  },
  listLeftText: {
    color: "#223766",
    fontSize: 12,
    fontWeight: "700"
  },
  listSub: {
    color: "#6d80a3",
    fontSize: 11,
    marginTop: 2
  },
  listRightText: {
    color: "#4e638e",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right"
  },
  multiline: {
    minHeight: 86,
    textAlignVertical: "top"
  },
  button: {
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: "#2e63dc"
  },
  buttonGhost: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#c8d7f7"
  },
  buttonDisabled: {
    opacity: 0.55
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }]
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12
  },
  buttonGhostText: {
    color: "#2e63dc"
  },
  segment: {
    borderWidth: 1,
    borderColor: "#c9d7f5",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff"
  },
  segmentActive: {
    borderColor: "#2e63dc",
    backgroundColor: "#2e63dc"
  },
  segmentPressed: {
    opacity: 0.84
  },
  segmentText: {
    color: "#49608d",
    fontSize: 12,
    fontWeight: "700"
  },
  segmentTextActive: {
    color: "#ffffff"
  }
});
