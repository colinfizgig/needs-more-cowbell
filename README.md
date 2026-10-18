# Needs More Cowbell

A Meowdoku-style logic puzzle starring **Cowbell**, a Pithuskahula (pitbull, husky and Catahoula leopard dog) with big ears and a bigger appetite for treats.

## Play

Open `index.html` in a browser, or serve the folder (for example `python -m http.server 8123`) and visit http://localhost:8123. Progress is saved in the browser's local storage.

## Rules

- Each colored yard needs exactly one pup.
- One pup per row and per column.
- Pups can't touch, not even diagonally.
- Tap to mark ✕, double-tap to place Cowbell, drag to mark many squares. Nothing is marked for you: managing the board is part of the game. The "Tap" tool button switches single taps to placing pups.
- A wrong pup costs a heart. At 0 hearts, start over or bribe Cowbell with 3 bacon for one more heart.

## Hints, squirrels and More Cowbell

- **Hint** (3 free, then 10 treats): usually ✕'s out squares that can't hold a pup. It never places a pup for you.
- **Squirrel!** From stage 4 on, each hint has a 30% chance (`SQUIRREL_CHANCE` in `js/game.js`) to bring a squirrel instead. Cowbell chases it through the fences and the yards are redrawn. Placed pups stay, your ✕ marks are wiped, and you rework the board.
- **More Cowbell!** reveals one correct pup. It's rare: you start with 1 and earn 1 every 10 stages, plus 1 for a perfect solve (no mistakes, no help, under par) on an 8×8 or bigger board. On boards under 8×8 the game asks before using one.

## Rewards and points

| Treat | How to earn | Used for |
| --- | --- | --- |
| Dog treats (bones) | Every solve (double on the Daily Walk) | Hints (10), outfits |
| Bacon | Solving with no mistakes | Extra hearts, outfits |
| Cheese | Beating par time, plus the Daily Walk bonus | Outfits |

Each solve also scores points for the scoreboard: `size² × 10`, plus 2 per second under par, minus 25 per mistake, 15 per hint and 40 per cowbell (never below `size²`).

## Board sizes

Stages go 5×5 (1–3), 6×6 (4–10), 7×7 (11–20), 8×8 (21–35), 9×9 (36–55) and 10×10 (56+). The Daily Walk is 8×8.

## Scoreboard

Every player gets a random name like "Player #4821" and can change it from the Scoreboard screen. The board shows an **Overall** ranking (total of each player's best score on every board) and a ranking **By board** (each stage and daily walk).

Out of the box, scores are kept on each player's own device. To share one scoreboard with everyone, connect a free Supabase database (this works fine on GitHub Pages, no server needed):

1. Create a free project at https://supabase.com.
2. In the project, open **SQL Editor**, paste in all of [`supabase/setup.sql`](supabase/setup.sql), and click **Run**.
3. Open **Project Settings > API** and copy the **Project URL** and the **anon public** key.
4. Paste both into [`js/config.js`](js/config.js) and commit.

The anon key is designed to be public. The database only accepts writes through two functions that check each player's secret, and it rejects scores outside the possible range. A determined player could still post a fake score, so treat it as a friendly leaderboard. To remove the scoreboard later, blank out `js/config.js` again.

## Hosting on GitHub Pages

Push this folder to a GitHub repository, then in the repo open **Settings > Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save. Everything is static files, so no build step is needed.

## Files

- `js/puzzle.js`: seeded puzzle generator and solver. Every puzzle has exactly one solution.
- `js/art.js`: SVG art for Cowbell, outfits, treats, the cowbell and the squirrel.
- `js/game.js`: screens, input, hints, squirrels, rewards, closet and scoreboard screen. Tune `SHOP`, `HINT_COST`, `SQUIRREL_CHANCE`, `sizeForStage` and the reward amounts in `win()` here.
- `js/scores.js`: player identity, point formula and the Supabase connection.
- `js/config.js`: online scoreboard settings (blank = device-only scores).
- `supabase/setup.sql`: database setup for the online scoreboard.
- `css/style.css`: styles.
