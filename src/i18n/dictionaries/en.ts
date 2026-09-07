/** English dictionary. THIS FILE IS THE TYPE SOURCE — `ko.ts` must match its shape. */
export const en = {
  common: {
    loading: "Loading…",
    retry: "Try again",
    back: "Back",
    cancel: "Cancel",
    noInfo: "No info",
    minutes: "{n} min",
  },
} as const;

export type Dict = typeof en;
