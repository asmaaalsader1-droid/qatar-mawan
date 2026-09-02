import countryRanges from "./country-ranges.json";
import countryRangesV6 from "./country-ranges-v6.json";

type V4Range = { start: number; end: number };
type V6Range = { start: bigint; end: bigint };

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return null;
  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]) >>> 0;
}

function ipv6ToBigInt(ip: string): bigint | null {
  let value = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (value.includes("%")) value = value.split("%")[0];
  if (value.includes(".")) {
    const lastColon = value.lastIndexOf(":");
    const v4 = ipv4ToNumber(value.slice(lastColon + 1));
    if (v4 === null) return null;
    value = `${value.slice(0, lastColon)}:${((v4 >>> 16) & 0xffff).toString(16)}:${(v4 & 0xffff).toString(16)}`;
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  const missing = 8 - left.length - right.length;
  if (halves.length === 1 && missing !== 0) return null;
  if (missing < 0) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8) return null;
  return groups.reduce((result, group) => (result << 16n) | BigInt(parseInt(group, 16)), 0n);
}

function cidrToV4Range(cidr: string): V4Range | null {
  const [address, prefixText] = cidr.split("/");
  const ip = ipv4ToNumber(address);
  const prefix = Number(prefixText ?? "32");
  if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const start = (ip & mask) >>> 0;
  return { start, end: start + 2 ** (32 - prefix) - 1 };
}

function cidrToV6Range(cidr: string): V6Range | null {
  const [address, prefixText] = cidr.split("/");
  const ip = ipv6ToBigInt(address);
  const prefix = Number(prefixText ?? "128");
  if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 128) return null;
  const hostBits = 128 - prefix;
  const size = 1n << BigInt(hostBits);
  const start = prefix === 0 ? 0n : (ip >> BigInt(hostBits)) << BigInt(hostBits);
  return { start, end: start + size - 1n };
}

const v4Ranges = Object.fromEntries(
  Object.entries(countryRanges as Record<string, string[]>).map(([country, cidrs]) => [
    country,
    cidrs.map(cidrToV4Range).filter((range): range is V4Range => range !== null).sort((a, b) => a.start - b.start),
  ]),
) as Record<string, V4Range[]>;
const v6Ranges = Object.fromEntries(
  Object.entries(countryRangesV6 as Record<string, string[]>).map(([country, cidrs]) => [
    country,
    cidrs.map(cidrToV6Range).filter((range): range is V6Range => range !== null).sort((a, b) => (a.start < b.start ? -1 : 1)),
  ]),
) as Record<string, V6Range[]>;

function containsV4(items: V4Range[], ip: number): boolean {
  let low = 0;
  let high = items.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = items[middle];
    if (ip < range.start) high = middle - 1;
    else if (ip > range.end) low = middle + 1;
    else return true;
  }
  return false;
}

function containsV6(items: V6Range[], ip: bigint): boolean {
  let low = 0;
  let high = items.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = items[middle];
    if (ip < range.start) high = middle - 1;
    else if (ip > range.end) low = middle + 1;
    else return true;
  }
  return false;
}

/** Returns an ISO country code from the bundled local IPv4/IPv6 data. */
export function getCountryFromLocalIp(ip: string | null): string | null {
  if (!ip) return null;
  const normalizedIp = ip.replace(/^::ffff:/i, "");
  const numericV4 = ipv4ToNumber(normalizedIp);
  if (numericV4 !== null) {
    for (const [country, items] of Object.entries(v4Ranges)) if (containsV4(items, numericV4)) return country;
    return null;
  }
  const numericV6 = ipv6ToBigInt(normalizedIp);
  if (numericV6 !== null) {
    for (const [country, items] of Object.entries(v6Ranges)) if (containsV6(items, numericV6)) return country;
  }
  return null;
}
