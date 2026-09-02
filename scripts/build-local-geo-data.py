import json
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
print(f"wrote {out} with {len(data)} countries and {sum(map(len, data.values()))} ranges")
