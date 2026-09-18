import { afterEach, describe, expect, it } from "vitest";
import { useTripStore } from "./tripStore";

afterEach(() => {
  useTripStore.getState().resetTrip();
  // resetTrip은 의도적으로 ownerUserId를 보존한다(14절) — 테스트 간 격리를 위해 여기서만 지운다.
  useTripStore.setState({ ownerUserId: null });
});

describe("completeQuest — idempotent completion (T-money quest UI calls only this, never toggleQuest)", () => {
  it("adds the questId to completedQuestIds", () => {
    useTripStore.getState().completeQuest("subquest-a__b");
    expect(useTripStore.getState().completedQuestIds).toContain("subquest-a__b");
  });

  it("is idempotent — calling it again for an already-completed quest does not duplicate or toggle it off", () => {
    useTripStore.getState().completeQuest("subquest-a__b");
    useTripStore.getState().completeQuest("subquest-a__b");
    const ids = useTripStore.getState().completedQuestIds;
    expect(ids.filter((id) => id === "subquest-a__b")).toHaveLength(1);
  });

  it("never removes an already-completed quest (unlike toggleQuest)", () => {
    useTripStore.getState().completeQuest("subquest-a__b");
    useTripStore.getState().completeQuest("subquest-a__b");
    expect(useTripStore.getState().completedQuestIds).toContain("subquest-a__b");
  });
});

describe("toggleQuest — unaffected by completeQuest, existing manual quests keep working", () => {
  it("still flips a quest on and off", () => {
    useTripStore.getState().toggleQuest("q-place-1");
    expect(useTripStore.getState().completedQuestIds).toContain("q-place-1");
    useTripStore.getState().toggleQuest("q-place-1");
    expect(useTripStore.getState().completedQuestIds).not.toContain("q-place-1");
  });
});

describe("bindUser — per-account ownership guard for the browser-local persisted trip", () => {
  it("first bind (ownerUserId was null) preserves whatever local state already existed", () => {
    useTripStore.getState().completeQuest("q-place-1");
    useTripStore.getState().bindUser("user_a");
    expect(useTripStore.getState().ownerUserId).toBe("user_a");
    expect(useTripStore.getState().completedQuestIds).toContain("q-place-1");
  });

  it("binding the same user again is a no-op — the local trip survives sign-out/sign-in of the same account", () => {
    useTripStore.getState().bindUser("user_a");
    useTripStore.getState().completeQuest("q-place-1");
    useTripStore.getState().bindUser("user_a");
    expect(useTripStore.getState().completedQuestIds).toContain("q-place-1");
  });

  it("binding a DIFFERENT user resets all trip state and rebinds", () => {
    useTripStore.getState().bindUser("user_a");
    useTripStore.getState().completeQuest("q-place-1");
    useTripStore.getState().toggleQuest("q-place-2");

    useTripStore.getState().bindUser("user_b");

    expect(useTripStore.getState().ownerUserId).toBe("user_b");
    expect(useTripStore.getState().completedQuestIds).toEqual([]);
  });

  it("a tester's completedQuestIds never leak into a normal account signing in after them", () => {
    useTripStore.getState().bindUser("tester_1");
    useTripStore.getState().completeQuest("subquest-tmoney-bypass");

    useTripStore.getState().bindUser("normal_user_1");

    expect(useTripStore.getState().completedQuestIds).not.toContain("subquest-tmoney-bypass");
    expect(useTripStore.getState().completedQuestIds).toEqual([]);
  });

  it("selectedPlaceIds (and other trip-scoped state) do not leak between users when the account changes", () => {
    useTripStore.getState().bindUser("user_a");
    useTripStore.setState({ selectedPlaceIds: ["bts-culture-gyeongbokgung"] });

    useTripStore.getState().bindUser("user_b");

    expect(useTripStore.getState().selectedPlaceIds).toEqual([]);
  });

  it("resetTrip() preserves the current ownerUserId — resetting a trip is not an account switch", () => {
    useTripStore.getState().bindUser("user_a");
    useTripStore.getState().resetTrip();
    expect(useTripStore.getState().ownerUserId).toBe("user_a");
  });

  it("setMainRoute() preserves the current ownerUserId — starting a new route is not an account switch", () => {
    useTripStore.getState().bindUser("user_a");
    useTripStore.getState().setMainRoute([], "seoul", [], "test route");
    expect(useTripStore.getState().ownerUserId).toBe("user_a");
  });
});
