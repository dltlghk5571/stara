/** English dictionary. THIS FILE IS THE TYPE SOURCE — `ko.ts` must match its shape. */
export const en = {
  common: {
    loading: "Loading…",
    retry: "Try again",
    back: "Back",
    cancel: "Cancel",
    noInfo: "No info",
    minutes: "{n} min",
    soon: "SOON",
    done: "Complete",
  },
  onboarding: {
    artists: {
      kicker: "PICK YOUR BIAS",
      title: "Select your travel mate!",
      subtitle:
        "Choose the artists you love — pick as many as you like and we'll build a route around your taste.",
      continueCta: "CONTINUE TO REGION MAP →",
    },
    region: {
      kicker: "CHOOSE REGION",
      title: "Where are we headed? 🗺️",
      subtitle: "Pick a region to see its featured artists and content.",
      comingSoon: "{region} · coming soon",
    },
    regionDetail: {
      nowCurating: "Now Curating",
      previewLoading: "Loading…",
      previewCta: "Preview via popular TourAPI spots",
      generateHint: "We'll build a route based on the region you picked.",
      selectRegion: "Select {region}?",
      repArtistLabel: "REPRESENTATIVE ARTIST",
      curatingLabel: "NOW CURATING",
      selectCta: "Select this region ✦",
      filmingLocations: "{count} filming locations",
      spots: "{count} spots",
    },
    generate: {
      needRegionTitle: "Please choose a region first",
      needRegionCta: "Go to region select",
      building: "Building your {region} route…",
      noneTitle: "We couldn't find a {region} route right now",
      noneBody: "Please try again in a moment.",
      ready: "We've prepared {count} {region} routes. Pick one.",
      confirmRoute: "Confirm this route",
      loadingBadge: "NATURAL COURSE · OPTIMAL PATH",
      loadingTitle: "Generating Route",
      pickTitle: "Pick a route",
      routeStat: "{stops} stops · {hours}h",
    },
  },
};

export type Dict = typeof en;
