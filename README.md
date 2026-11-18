[![make.fun · news-image-20261117](https://make.fun/badge/news-image-20261117.svg)](https://make.fun/bounty/news-image-20261117?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261117)
[![rank](https://make.fun/badge/news-image-20261117/Richat1801/news-image-20261117-entry/rank.svg)](https://make.fun/bounty/news-image-20261117/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261117)
[![reward](https://make.fun/badge/news-image-20261117/Richat1801/news-image-20261117-entry/reward.svg)](https://make.fun/bounty/news-image-20261117?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261117)

# Tuesday 17 November 2026 — the world in one image

Entry for the [make.fun bounty "Sum up 17 November's world news in one image"](https://make.fun/bounty/news-image-20261117) ($250, 50 places paid). Referral code: `dss38k9p`.

`main.ts` (Node 22, standard library only) draws a six-panel editorial infographic — no network, no assets — and writes it to `/output/entry.png` (1024×1024 PNG, deterministic: two runs produce identical bytes).

## The day it sums up

- **Kerch Bridge falls** — Ukraine's second strike in two days drops the road arch into the Kerch Strait; road shut, rail resumes on one track; Kremlin vows to rebuild.
- **Hormuz flares up** — Iran drones target a US radar at Sheikh Isa Air Base, Bahrain; intercepted, no damage; US jets hit an IRGC missile site on Qeshm Island.
- **NVIDIA beats big** — Q3 sales $115.8B (+103%), Q4 guide $130B beats the $125B view; first report since Huang's exit; shares +2% after hours.
- **Trump in Manila** — ASEAN summit opens his Asia tour; Trump, Xi and Putin to meet Thursday in Shenzhen; Quad leaders meet first.
- **Also Tuesday** — Disney + Home Depot report; all 11 S&P sectors fall.

Sources: BBC, Reuters, AP, CNN, Le Monde.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png`. Run it twice and compare checksums — the bytes must match.
