export type Breakpoint = { id: string; label: string; value: number };
export type Breakpoints = Breakpoint[];

export type Token = {
  id: string;
  name: string;
  sizes: Record<string, number>;
  lh: Record<string, number>;
  growFactorLg?: number;
};

export type Store = {
  baseRemPx: number;
  breakpoints: Breakpoints;
  tokens: Token[];
  setBaseRemPx: (n: number) => void;
  setBreakpoints: (b: Breakpoints) => void;
  setTokens: (t: Token[]) => void;
};
