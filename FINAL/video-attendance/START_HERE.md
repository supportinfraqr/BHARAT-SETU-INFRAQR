# START HERE — complete beginner's guide

This guide assumes you have never used PowerShell, Python, or Postgres. Follow
top to bottom, don't skip steps. Every step shows what to type and what you
should see.

**Words you'll see:** *terminal* = the black/blue PowerShell window where you
type commands. *Run* a command = type it (or paste with right-click) and press
Enter. Wait for it to finish before typing the next one.

---

## Step 0 — open the terminal in the right folder

1. Open the `BTP_camera` folder in Windows Explorer.
2. Click the address bar at the top, type `powershell`, press Enter.
3. A blue window opens. It should show the folder path ending in `BTP_camera`.
   If not, type this and press Enter:
   ```powershell
   cd C:\Users\DANISH\Desktop\BTP_camera
   ```

## Step 1 — install Python 3.10 (once, skip if done)

1. Go to `python.org/downloads` → download **Python 3.10** → install it.
   (Any 3.10.x is fine. NOT 3.12/3.13 — the camera libraries break on those.)
2. Back in PowerShell, check:
   ```powershell
   py -3.10 --version
   ```
   You should see `Python 3.10.x`. If Windows asks "how do you want to open
   this", you clicked a Microsoft Store stub — install the real Python first.

## Step 2 — install Postgres (once, skip if done)

1. Go to `postgresql.org/download/windows`, download version 16 or 17, run it.
   When it asks for a password for the `postgres` user: make one up, **write it
   on paper**, finish the install.
2. Open **SQL Shell (psql)** from the Start menu. Press Enter 4 times (accept
   server, database, port, username), then type your paper password.
3. Copy-paste these two lines one at a time (each ends with `;` then Enter):
   ```sql
   CREATE ROLE btp LOGIN PASSWORD 'choose-a-password' CREATEDB;
   CREATE DATABASE btp OWNER btp;
   ```
   Replace `'choose-a-password'` with your own (keep the quotes). Type `\q` to quit.
4. Back in PowerShell, save that same password for this window:
   ```powershell
   $env:BTP_PG_PASSWORD="choose-a-password"
   ```
   (Same text as in step 3, character for character. You must redo this line
   every time you open a NEW PowerShell window.)

## Step 3 — set up the project (once)

```powershell
py -3.10 -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
```

This takes 5–15 minutes and downloads a lot. Go make tea. Errors in red at the
very end mean something failed — otherwise you're fine even if warnings appear.

## Step 4 — check the camera (2 minutes)

```powershell
.\.venv\Scripts\python main.py --scan
```

* It lists webcams `0` to `9` with `OK` or `not found`.
* For each `OK` one it saves a photo like `data\snapshots\scan_cam1.jpg`.
  **Open those photos** — find the one showing YOUR room. Remember its number
  (example used below: `1`).
* If none show your room: close apps that use the camera (Zoom, browser, Camera
  app), unplug/replug USB cameras, run again.

Then tell the project which camera is yours. Open `config.yaml` in Notepad,
find `webcam_index: 0`, change the number to yours, save.

## Step 5 — add photos of people (so it knows names)

1. Make a folder, e.g. `people\` inside `BTP_camera`. Inside it, one folder per
   person, named exactly as you want them shown:
   ```
   people\
     Danish\photo1.jpg
            photo2.jpg
   ```
   Use 3–5 clear front-facing photos per person, taken from ~2 meters away
   (about how far they'll stand from the camera). One face per photo.
2. Enroll them:
   ```powershell
   .\.venv\Scripts\python enroll.py --bulk people
   ```
   Wait for `bulk enrollment complete`. Then check it worked:
   ```powershell
   .\.venv\Scripts\python enroll.py --list
   .\.venv\Scripts\python enroll.py --audit
   ```
   `--list` should show names with embedding counts. `--audit` should show NO
   lines starting with `DUPE`. If it does, run:
   ```powershell
   .\.venv\Scripts\python enroll.py --prune
   ```

## Step 6 — RUN IT (the actual pipeline)

```powershell
.\.venv\Scripts\python main.py --source 1 --web 8080
```
(Replace `1` with YOUR camera number from Step 4.)

What happens: some text scrolls, a video window opens, and a web page becomes
available at `http://<your-pc-ip>:8080` (open it on your phone to watch remotely).
Stand 1.5–2 meters in front of the camera, face it, wait 3 seconds.

* **Green label with a name** (`Danish · d=0.12`) = working.
* **Amber `#3 · Visitor`** on a stranger = working (it only names enrolled people).
* **Blue `scanning...`** for a second or two = normal, it's thinking.

Keys while running: `Q` = quit · `S` = save snapshot · `F` = fullscreen ·
`A` = anti-spoof on/off.

## Step 7 — see the results

After quitting (`Q`):

```powershell
.\.venv\Scripts\python report.py
```

Shows who was seen, for how long, average vitality, and QR scans.

---

## When something looks wrong (don't panic, check this table)

| What you see | What it means | What to do |
|---|---|---|
| `password authentication failed` | Wrong `$env:BTP_PG_PASSWORD` | Redo Step 2.4 in the SAME window, carefully |
| `no video source available` | Camera busy or wrong index | Close Zoom/browser/Camera app; redo Step 4 |
| `(frame 640x480)` on startup with a 720p cam | Windows opened low-res mode | Restart the program once; if it persists, check Camera app settings |
| Everybody is `Visitor`, never names | Nobody enrolled, or photos don't match this distance | Redo Step 5 with photos taken from 2 m away |
| A stranger gets someone's name | Two enrolled people look alike, or a bad photo got in | Run `--audit`, then `--prune`, re-read Step 5 photo rules |
| A photo of a face on a phone gets named | Anti-spoof is off | Press `A` in the video window (or set `antispoof_enabled: true` in config) |
| Red errors ending in `ModuleNotFoundError` | A package didn't install | Re-run the `pip install -r requirements.txt` line from Step 3 |
| Window frozen / very slow | Old/slow computer | In `config.yaml` set `detector.process_every: 2` and restart |

If none of this fixes it: copy the FULL red error text plus which step you were
on, and ask for help with those two things included. Good luck!
