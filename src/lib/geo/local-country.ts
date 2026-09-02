import countryRanges from "./country-ranges.json";

type Range = { start: number; end: number };
type RangeMap = Record<string, Range[]>;

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return null;
  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]) >>> 0;
}

function cidrToRange(cidr: string): Range | null {
  const [address, prefixText] = cidr.split("/");
  const ip = ipv4ToNumber(address);
  const prefix = Number(prefixText ?? "32");
  if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const start = (ip & mask) >>> 0;
  const size = 2 ** (32 - prefix);
  return { start, end: start + size - 1 };
}

const ranges: RangeMap = Object.fromEntries(
  Object.entries(countryRanges as Record<string, string[]>).map(([country, cidrs]) => [
    country,
    cidrs.map(cidrToRange).filter((range): range is Range => range !== null).sort((a, b) => a.start - b.start),
  ]),
);

function contains(rangesForCountry: Range[], ip: number): boolean {
  let low = 0;
  let high = rangesForCountry.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = rangesForCountry[middle];
    if (ip < range.start) high = middle - 1;
    else if (ip > range.end) low = middle + 1;
    else return true;
  }
  return false;
}

/** Returns an ISO 3166-1 alpha-2 country code from the bundled local IPv4 data. */
export function getCountryFromLocalIp(ip: string | null): string | null {
  if (!ip) return null;
  const normalizedIp = ip.replace(/^::ffff:/i, "");
  const numericIp = ipv4ToNumber(normalizedIp);
  if (numericIp === null) return null;
  for (const [country, countryRanges] of Object.entries(ranges)) {
    if (contains(countryRanges, numericIp)) return country;
  }
  return null;
}
