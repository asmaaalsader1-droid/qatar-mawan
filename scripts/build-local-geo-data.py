import json
import tarfile
from pathlib import Path
from urllib.request import Request, urlopen

codes = [
    "qa", "sa", "ae", "eg", "in", "ph", "et", "ug", "kw", "bh", "jo",
    "om", "gb", "us", "ca", "au", "de", "fr", "it", "es", "tr", "pk",
    "bd", "lk", "np", "id", "my", "sg", "za", "ng", "ke", "sd", "ma",
    "tn", "dz", "ly", "ye", "lb", "sy", "ps", "jp", "cn", "kr", "ru",
]
base = "https://www.ipdeny.com/ipblocks/data/countries/{}.zone"
data = {}
for code in codes:
    req = Request(base.format(code), headers={"User-Agent": "qatar-mawan-local-data-builder/1.0"})
    with urlopen(req, timeout=20) as response:
        cidrs = [line.decode().strip() for line in response if line.strip()]
    data[code.upper()] = cidrs
out = Path("src/lib/geo/country-ranges.json")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

v6_archive = Path("/tmp/ipv6-all-zones.tar.gz")
req = Request("https://www.ipdeny.com/ipv6/ipaddresses/blocks/ipv6-all-zones.tar.gz", headers={"User-Agent": "qatar-mawan-local-data-builder/1.0"})
with urlopen(req, timeout=30) as response:
    v6_archive.write_bytes(response.read())
v6_data = {}
with tarfile.open(v6_archive, "r:gz") as archive:
    for code in codes:
        member = next((item for item in archive.getmembers() if item.name == f"./{code}.zone" or item.name == f"{code}.zone"), None)
        if member:
            content = archive.extractfile(member)
            v6_data[code.upper()] = [line.decode().strip() for line in content if line.strip()] if content else []
(Path("src/lib/geo/country-ranges-v6.json")).write_text(json.dumps(v6_data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"wrote {out} with {len(data)} countries and {sum(map(len, data.values()))} IPv4 ranges")
print(f"wrote src/lib/geo/country-ranges-v6.json with {len(v6_data)} countries and {sum(map(len, v6_data.values()))} IPv6 ranges")
