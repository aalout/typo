export const uid = () => Math.random().toString(36).slice(2, 9);

export const toRem = (px: number, base: number) => +(px / base).toFixed(3);

export const ratioFrom = (lh: number, fontPx: number) =>
  lh <= 3 ? +lh.toFixed(3) : +(lh / fontPx).toFixed(3);

export const slopeRemPerVw = (
  remA: number,
  remB: number,
  pxA: number,
  pxB: number,
  base: number
) => {
  if (pxB === pxA) return 0;
  return +(((remB - remA) * base * 100) / (pxB - pxA)).toFixed(6);
};

export const interceptRem = (
  remAtA: number,
  slopeVW: number,
  pxA: number,
  base: number
) => {
  if (slopeVW === 0) return +remAtA.toFixed(6);
  return +(remAtA - (slopeVW * (pxA / 100)) / base).toFixed(6);
};
