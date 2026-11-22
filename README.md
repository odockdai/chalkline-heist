# chalkline-heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/odockdai/chalkline-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/odockdai/chalkline-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Chalkline** is a top-down heist game drawn as a crew's blueprint. Plan the job in chalk, buy a kit that comes out of your take, then walk it in the dark: guards sweep torch cones, cameras pan, the alarm meter climbs from Calm to Alert to Hunt, and once you lift the mark the pedestal starts chirping and the van is the only way out.

- Three jobs (a gallery, a bank vault, an observatory), each with several ways in: vents, locked doors, shadow lanes and cases that block sight.
- A planning table that shows every patrol route and stop timer, and lets you chalk the route you mean to walk (keep to it for a bonus).
- A kit with real costs: rattles to pull guards off their posts, smoke no cone can see through, a jammer for cameras, lockpicks for doors, and a loud fuse box that blinds every camera for 12 seconds.
- Guards that turn toward footsteps, grow suspicious while they half-see you (a ring fills), investigate, search, chase and give up; cameras that lock on and call the nearest guard.
- A fair caught moment that names who saw you, and a job report that replays your route with the take and a Ghost / Clean / Loud rating.
- All sound made with WebAudio; no library, no network, no build step.

## Run it

```sh
node serve.ts            # then open http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Controls: WASD or arrows move, Shift sneaks (silent), E holds to pick a lock, cut the power or lift the mark, 1 2 3 pick a tool, click throws or uses it, Tab shows patrol routes, H toggles field notes, R restarts, M mutes.

The screenshots come from the game's photo mode: `index.html?shot=cover|plan|caught|report` plays a job forward with the real rules and draws the frame.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
