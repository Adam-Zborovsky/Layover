export const colors = {
  primary: "#C25A3C",
  primaryLight: "#E8A090",
  primaryDim: "rgba(194, 90, 60, 0.12)",
  onPrimary: "#FFFFFF",

  secondary: "#4A6B53",
  secondaryLight: "#8BA88F",
  secondaryDim: "rgba(74, 107, 83, 0.12)",
  onSecondary: "#FFFFFF",

  tertiary: "#2D7D7D",
  tertiaryDim: "rgba(45, 125, 125, 0.12)",

  background: "#FAF5F0",
  surface: "#FDF8F5",
  surfaceBright: "#FFFFFF",

  error: "#C83E3E",
  errorDim: "rgba(200, 62, 62, 0.12)",

  statusConfirmed: "#2D7D7D",
  statusProcessing: "#C28D3C",
  statusReview: "#C83E3E",
  statusFailed: "#8B8B8B",

  categoryFood: "#E07B3C",
  categoryCarService: "#4A90D9",
  categoryLodging: "#7B4AD9",
  categoryAirfare: "#4AB5D9",
  categoryParking: "#8B8B8B",
  categoryTolls: "#D9B84A",
  categorySupplies: "#5CD95C",
  categoryOther: "#A0A0A0",

  textPrimary: "#2D2019",
  textSecondary: "#7A6B62",
  textTertiary: "#A8988E",
  textInverse: "#FFFFFF",

  border: "#E8DDD5",
  borderLight: "#F0E8E0",
  divider: "#EDE3DA",

  shadow: "rgba(44, 24, 12, 0.06)",
  shadowStrong: "rgba(44, 24, 12, 0.10)",
} as const;

export const typography = {
  displayLg: {
    fontFamily: "System",
    fontSize: 36,
    fontWeight: "500" as const,
    lineHeight: 43,
    letterSpacing: -0.5,
  },
  displayMd: {
    fontFamily: "System",
    fontSize: 28,
    fontWeight: "500" as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  displaySm: {
    fontFamily: "System",
    fontSize: 22,
    fontWeight: "600" as const,
    lineHeight: 29,
  },
  headlineLg: {
    fontFamily: "System",
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
  },
  headlineMd: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 22,
  },
  bodyLg: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: "System",
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 21,
  },
  bodySm: {
    fontFamily: "System",
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 17,
  },
  labelMd: {
    fontFamily: "System",
    fontSize: 14,
    fontWeight: "500" as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelSm: {
    fontFamily: "System",
    fontSize: 11,
    fontWeight: "600" as const,
    lineHeight: 13,
    letterSpacing: 0.3,
  },
  amount: {
    fontFamily: "System",
    fontSize: 16,
    fontWeight: "700" as const,
    lineHeight: 22,
  },
  amountLg: {
    fontFamily: "System",
    fontSize: 28,
    fontWeight: "700" as const,
    lineHeight: 36,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const categoryColors: Record<string, string> = {
  Food: colors.categoryFood,
  CarService: colors.categoryCarService,
  Lodging: colors.categoryLodging,
  Airfare: colors.categoryAirfare,
  Parking: colors.categoryParking,
  Tolls: colors.categoryTolls,
  Supplies: colors.categorySupplies,
  Other: colors.categoryOther,
};

export const statusColors: Record<string, string> = {
  PROCESSING: colors.statusProcessing,
  NEEDS_REVIEW: colors.statusReview,
  CONFIRMED: colors.statusConfirmed,
  FAILED: colors.statusFailed,
};
