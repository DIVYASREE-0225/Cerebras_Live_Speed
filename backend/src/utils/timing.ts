export function nowNs(): bigint {
  return process.hrtime.bigint();
}

export function elapsedMs(startNs: bigint, endNs: bigint = process.hrtime.bigint()): number {
  const diffNs = endNs - startNs;
  const ms = Number(diffNs) / 1_000_000;
  return Math.round(ms * 100) / 100;
}
