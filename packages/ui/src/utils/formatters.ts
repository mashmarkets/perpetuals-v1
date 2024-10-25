import { BN } from "@coral-xyz/anchor";

import { PRICE_DECIMALS } from "@/lib/types";

export function formatNumberCommas(num: number | BN | null | undefined) {
  if (typeof num === "bigint") {
    return Number(num).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else if (typeof num === "number") {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } else {
    return null;
  }
}

export function formatNumber(num: number) {
  const formatter = Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  return formatter.format(num);
}

export function formatNumberLessThan(num: number) {
  const formatter = Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  if (num < 0.01) {
    return "<$0.01";
  } else {
    return "$" + formatter.format(num);
  }
}

export function formatUsd(num: number) {
  const formatter = Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    roundingPriority: "lessPrecision",
    trailingZeroDisplay: "auto",
  });
  return "$" + formatter.format(num);
}
export function formatPrice(num: number) {
  const formatter = Intl.NumberFormat("en", {
    maximumFractionDigits: PRICE_DECIMALS,
    minimumFractionDigits: 2,
    roundingPriority: "lessPrecision",
    minimumSignificantDigits: 5,
    maximumSignificantDigits: 5,
    trailingZeroDisplay: "auto",
  });
  return formatter.format(num);
}

export function formatFees(num: number) {
  const formatter = Intl.NumberFormat("en", {
    maximumFractionDigits: 5,
    minimumFractionDigits: 3,
  });
  return formatter.format(num);
}

export function formatValueDelta(num: number) {
  const formatter = new Intl.NumberFormat("en", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 4,
  });
  return formatter.format(num);
}

export function formatValueDeltaPercentage(num: number) {
  const formatter = new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
  return formatter.format(num);
}
