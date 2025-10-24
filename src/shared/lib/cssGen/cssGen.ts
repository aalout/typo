import { Token } from "../../types";
import {
  toRem,
  ratioFrom,
  slopeRemPerVw,
  interceptRem,
} from "../typoMath/typoMath";

export const generateCss = (
  tokens: Token[],
  baseRemPx: number,
  sortedBpIds: string[],
  sortedBpPx: number[]
): { varsCss: string; mixinsCss: string } => {
  const minPx = sortedBpPx[0];
  const midPx =
    sortedBpPx[Math.max(1, Math.floor((sortedBpPx.length - 1) / 2))];
  const maxPx = sortedBpPx[sortedBpPx.length - 1];

  const header = ["/*", " * typo", " * by Ilya Volkov", " */", ""].join("\n");

  const baseLines: string[] = [header, ":root {"];
  const midLines: string[] = [];
  const smallLines: string[] = [];
  const largeLines: string[] = [];
  const mixinLines: string[] = [];

  for (const t of tokens) {
    const sMin = toRem(t.sizes[sortedBpIds[0]], baseRemPx);
    const sMid = toRem(
      t.sizes[
        sortedBpIds[Math.max(1, Math.floor((sortedBpIds.length - 1) / 2))]
      ],
      baseRemPx
    );
    const sMax = toRem(t.sizes[sortedBpIds[sortedBpIds.length - 1]], baseRemPx);

    const lhMin = ratioFrom(t.lh[sortedBpIds[0]], t.sizes[sortedBpIds[0]]);
    const lhMid = ratioFrom(
      t.lh[sortedBpIds[Math.max(1, Math.floor((sortedBpIds.length - 1) / 2))]],
      t.sizes[
        sortedBpIds[Math.max(1, Math.floor((sortedBpIds.length - 1) / 2))]
      ]
    );
    const lhMax = ratioFrom(
      t.lh[sortedBpIds[sortedBpIds.length - 1]],
      t.sizes[sortedBpIds[sortedBpIds.length - 1]]
    );

    baseLines.push(`\t--${t.name}: ${sMax}rem;`);
    baseLines.push(`\t--${t.name}-lh: ${lhMax};`);

    const slopeMinMid = slopeRemPerVw(sMin, sMid, minPx, midPx, baseRemPx);
    const icptMinMid = interceptRem(sMin, slopeMinMid, minPx, baseRemPx);
    const slopeMidMax = slopeRemPerVw(sMid, sMax, midPx, maxPx, baseRemPx);
    const icptMidMax = interceptRem(sMid, slopeMidMax, midPx, baseRemPx);

    midLines.push(
      `\t\t--${t.name}: clamp(${Math.min(
        sMid,
        sMax
      )}rem, ${icptMidMax}rem + ${slopeMidMax}vw, ${Math.max(sMid, sMax)}rem);`
    );
    midLines.push(`\t\t--${t.name}-lh: ${lhMid};`);

    smallLines.push(
      `\t\t--${t.name}: clamp(${Math.min(
        sMin,
        sMid
      )}rem, ${icptMinMid}rem + ${slopeMinMid}vw, ${Math.max(sMin, sMid)}rem);`
    );
    smallLines.push(`\t\t--${t.name}-lh: ${lhMin};`);

    const denom = (maxPx - midPx) / baseRemPx;
    const slopeBeyond = +(denom === 0 ? 0 : (sMax - sMid) / denom).toFixed(6);
    const factor = t.growFactorLg ?? 1;
    const maxRemWidth = +(maxPx / baseRemPx).toFixed(3);
    largeLines.push(
      `\t\t--${t.name}: calc(${sMax}rem + (${slopeBeyond} * (100vw - ${maxRemWidth}rem) * ${factor}));`
    );

    mixinLines.push(`@define-mixin font-${t.name} {`);
    mixinLines.push(`\tfont-size: var(--${t.name});`);
    mixinLines.push(`\tline-height: var(--${t.name}-lh);`);
    mixinLines.push("}\n");
  }

  baseLines.push("}");

  const midBlock: string[] = [];
  midBlock.push(`@media (min-width: ${midPx}px) and (max-width: ${maxPx}px) {`);
  midBlock.push(`\t:root {`);
  midBlock.push(...midLines);
  midBlock.push(`\t}`);
  midBlock.push(`}`);

  const smallBlock: string[] = [];
  smallBlock.push(`@media (max-width: ${midPx - 1}px) {`);
  smallBlock.push(`\t:root {`);
  smallBlock.push(...smallLines);
  smallBlock.push(`\t}`);
  smallBlock.push(`}`);

  const largeBlock: string[] = [];
  largeBlock.push(`@media (min-width: ${maxPx + 1}px) {`);
  largeBlock.push(`\t:root {`);
  largeBlock.push(...largeLines);
  largeBlock.push(`\t}`);
  largeBlock.push(`}`);

  const varsCss = [
    baseLines.join("\n"),
    midBlock.join("\n"),
    smallBlock.join("\n"),
    largeBlock.join("\n"),
  ].join("\n\n");
  const mixinsCss = mixinLines.join("\n");
  return { varsCss, mixinsCss };
};
