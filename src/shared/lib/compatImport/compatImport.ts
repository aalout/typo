import { Breakpoints, Token } from "../../types";
import { uid } from "../typoMath/typoMath";

export const parseCompatCss = (
  css: string,
  baseRemPx: number
): { tokens: Token[]; breakpoints?: Breakpoints } => {
  const rootBlockMatch = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootBlockMatch) throw new Error("Не найден блок :root");
  const rootBlock = rootBlockMatch[1];
  const firstMediaIdx = rootBlock.search(/@media/i);
  const rootBaseOnly =
    firstMediaIdx >= 0 ? rootBlock.slice(0, firstMediaIdx) : rootBlock;
  const rootBaseNoComments = rootBaseOnly.replace(/\/\*[\s\S]*?\*\//g, "");

  const parseDecls = (block: string) => {
    const map: Record<string, string> = {};
    const re = /--([a-z0-9_-]+)\s*:\s*([^;]+);/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block))) {
      map[m[1]] = m[2].trim();
    }
    return map;
  };

  const declRoot = parseDecls(rootBaseNoComments);

  const twoSidedMatches = Array.from(
    css.matchAll(
      /@media\s*(?:screen\s+and\s+)?\(min-width:\s*(\d+)px\)\s*and\s*\(max-width:\s*(\d+)px\)\s*\{([\s\S]*?)\}/gi
    )
  );
  const smallBlockMatchOneSided = css.match(
    /@media\s*(?:screen\s+and\s+)?\(max-width:\s*(\d+)px\)\s*\{([\s\S]*?)\}/i
  );
  const largeBlockMatch = css.match(
    /@media\s*(?:screen\s+and\s+)?\(min-width:\s*(\d+)px\)\s*\{([\s\S]*?)\}/i
  );

  let midBlockMatch: RegExpMatchArray | undefined;
  let smallBlockMatchTwoSided: RegExpMatchArray | undefined;
  if (twoSidedMatches.length > 0) {
    twoSidedMatches.sort((a, b) => Number(a[2]) - Number(b[2]));
    smallBlockMatchTwoSided = twoSidedMatches[0] as unknown as RegExpMatchArray;
    midBlockMatch = twoSidedMatches[
      twoSidedMatches.length - 1
    ] as unknown as RegExpMatchArray;
  }

  const midMin = midBlockMatch ? Number(midBlockMatch[1]) : undefined;
  const midMax = midBlockMatch ? Number(midBlockMatch[2]) : undefined;
  const smallMax = smallBlockMatchOneSided
    ? Number(smallBlockMatchOneSided[1])
    : smallBlockMatchTwoSided
    ? Number(smallBlockMatchTwoSided[2])
    : undefined;

  const declMid = midBlockMatch ? parseDecls(midBlockMatch[3]) : {};
  const declSmall = smallBlockMatchOneSided
    ? parseDecls(smallBlockMatchOneSided[2])
    : smallBlockMatchTwoSided
    ? parseDecls(smallBlockMatchTwoSided[3])
    : {};
  const declLarge = largeBlockMatch ? parseDecls(largeBlockMatch[2]) : {};

  let breakpoints: Breakpoints | undefined;
  if (smallMax && midMin && midMax) {
    const DEFAULT_MIN = 375;
    let minCandidate = Math.min(DEFAULT_MIN, smallMax);
    if (minCandidate >= midMin) {
      minCandidate = Math.max(320, Math.min(DEFAULT_MIN, midMin - 1));
    }
    breakpoints = [
      { id: "min", label: String(minCandidate), value: minCandidate },
      { id: "mid", label: String(midMin), value: midMin },
      { id: "max", label: String(midMax), value: midMax },
    ];
  }

  const remToPx = (remStr: string) => {
    const n = parseFloat(remStr);
    if (Number.isNaN(n)) return undefined;
    return Math.round(n * baseRemPx);
  };

  const extractRemNumber = (val: string | undefined) => {
    if (!val) return undefined;
    const clean = val.trim();
    const m = clean.match(/([\d.]+)\s*rem\b/i);
    return m ? parseFloat(m[1]) : undefined;
  };

  const clampFirstArgRem = (val: string) => {
    const m = val.match(/clamp\(\s*([\d.]+)rem/i);
    return m ? parseFloat(m[1]) : undefined;
  };

  const clampLastArgRem = (val: string) => {
    const m = val.match(/clamp\([^,]+,[^,]+,\s*([\d.]+)rem\s*\)/i);
    return m ? parseFloat(m[1]) : undefined;
  };

  const calcFactor = (val: string) => {
    const m = val.match(/\(100vw\s*-\s*\d+rem\)\s*\*\s*([\d.]+)/i);
    if (m) return parseFloat(m[1]);
    return 1;
  };

  const tokensMap: Record<string, Token> = {};
  Object.keys(declRoot)
    .filter((k) => !k.endsWith("-lh"))
    .forEach((nameVar) => {
      const baseRemStr = declRoot[nameVar];
      const lhVar = `${nameVar}-lh`;
      const baseLhStr = declRoot[lhVar];

      let sizeMaxRem = extractRemNumber(baseRemStr);
      const sizeMaxPx = sizeMaxRem ? Math.round(sizeMaxRem * baseRemPx) : 16;
      const lhMax = baseLhStr ? parseFloat(baseLhStr) : 1.25;

      const midVal = declMid[nameVar];
      const minVal = declSmall[nameVar];
      const midRem = midVal ? clampFirstArgRem(midVal) : undefined;
      const minRem = minVal ? clampFirstArgRem(minVal) : undefined;
      if (!sizeMaxRem && midVal) sizeMaxRem = clampLastArgRem(midVal);
      const sizeMidPx = midRem
        ? remToPx(String(midRem))
        : sizeMaxRem
        ? remToPx(String(sizeMaxRem))
        : sizeMaxPx;
      const sizeMinPx = minRem ? remToPx(String(minRem)) : sizeMidPx;

      const lhMid = declMid[lhVar] ? parseFloat(declMid[lhVar]) : lhMax;
      const lhMin = declSmall[lhVar] ? parseFloat(declSmall[lhVar]) : lhMid;

      const largeVal = declLarge[nameVar];
      const grow = largeVal ? calcFactor(largeVal) : 1;

      tokensMap[nameVar] = {
        id: uid(),
        name: nameVar,
        sizes: { min: sizeMinPx || 16, mid: sizeMidPx || 16, max: sizeMaxPx },
        lh: { min: lhMin, mid: lhMid, max: lhMax },
        growFactorLg: grow,
      } as Token;
    });

  const tokens = Object.values(tokensMap);
  if (tokens.length === 0) throw new Error("Не найдены токены в :root");

  return { tokens, breakpoints };
};
