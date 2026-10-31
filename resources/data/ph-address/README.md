# Philippine address list

Backs the checkout and "change address" dropdowns (`App\Support\PhAddress`,
`AddressController`). `provinces.json` lists every province plus a
"Metro Manila" entry for NCR, which has no province. Each `{code}.json` holds
that province's cities/municipalities, each with its barangay names.

**Source:** the PSA's Philippine Standard Geographic Code, downloaded
2026-10-31 from `https://psgc.gitlab.io/api/` (`provinces/`,
`cities-municipalities/`, `barangays/`). The only things changed from the
source: NCR cities are grouped under "Metro Manila", and the two cities PSGC
lists with no province (City of Isabela, City of Cotabato) are placed in the
province they sit in (Basilan, Maguindanao). Duplicate barangay names within
one city are merged.

## ZIP codes

PSGC has no ZIP codes, so each city's `zips` come from **GeoNames**' Philippine
postal code export (`https://download.geonames.org/export/zip/PH.zip`,
downloaded 2026-10-31, licensed **CC BY 4.0** — credit GeoNames). Matched to
PSGC by province plus a normalised place name ("Legazpi City" = "City of
Legazpi", "Sto." = "Santo", parentheticals dropped); Metro Manila rows match on
the city GeoNames records for them.

- `zips: ["4501"]` — one ZIP (1,557 places): filled in automatically.
- `zips: [{code, area}, ...]` — several postal areas (17 big cities, e.g.
  Manila, Quezon City): the customer picks one.
- `zips: []` — 60 places whose spelling differs between the two lists
  ("San Remegio" vs "San Remigio"): the ZIP is typed. Deliberately not
  hand-matched.

GeoNames rows with no province are P.O.-box/institution codes (ADB, colleges)
and are skipped.

To refresh: download those three PSGC endpoints to a folder and regroup them
into the same shape — `{code, name}` for provinces,
`[{name, barangays: [...], zips: [...]}]` per province, both sorted by name —
then re-add ZIPs from GeoNames with the matching rules above.
