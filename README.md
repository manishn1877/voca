# Ava — your personal English speaking coach

Speak with Ava every day, see live subtitles for both of you in the middle of the screen,
and get a full list of your mistakes (grammar, pronunciation, vocabulary, fluency, natural phrasing).
Daily streak + goal ring + streak freezes keep you coming back.

## Run it (2 steps)
1. Install Node.js 18+ from https://nodejs.org  (one time)
2. Double-click `start.bat` (Windows) or run `./start.sh` (Mac/Linux) — or `node server.js`
   then open **http://localhost:3000** in **Chrome or Edge** (needed for the microphone).

No `npm install` needed — there are zero dependencies.

## How to use
- Tap the mic and say a topic ("my favourite food") — or say "surprise me" / tap 🎲.
- Ava speaks first (subtitles word-by-word in the middle), then you answer.
  Tap the mic again when finished, or just pause for 2 seconds.
- Right panel = Coach notes after each answer: corrected sentence, mistakes, 🔊 Hear / 🎤 Try it for pronunciation.
- **End & get report** = scores, words/min, top things to fix, homework.
- **Pronunciation drills** tab: sound pairs, tricky words, sentences, tongue twisters, and "My mistakes".
- **Progress** tab: streak, 28-day calendar, mistake notebook, settings (daily goal, reminder, accent, voice).

## Full AI coaching (recommended)
Without a key the app runs in **offline mode**: a built-in rule engine catches ~35 common grammar patterns
(including many typical of Indian English), fillers, repeats, pace (wpm), weak vocabulary and ~50 hard words.
For smart, open-ended conversation and much deeper feedback, add an Anthropic API key:
- Progress tab → Settings → paste key → Save   (or set env var `ANTHROPIC_API_KEY`)
The key is saved only in `data/config.json` on your computer.

## Streak rules
A day counts when your practice time reaches the daily goal (default 10 min; change in Settings).
Every 7-day streak earns a freeze (max 2) that automatically saves a missed day.
Reminders are browser notifications and work while the tab is open.

## Honest limits
- Pronunciation is judged through the browser's speech recogniser: if it mishears a word, that word is flagged as unclear.
  It can't hear exact vowel quality like a human teacher — treat it as a very good mirror, not a judge.
- Chrome sends mic audio to Google for recognition, so it needs internet.
- Data lives in `data/progress.json` — back it up if you care about your streak.
- Deploying online (not localhost) needs HTTPS for the microphone to work.

## On your phone
The mic only works on `localhost` or **HTTPS**, so opening `http://192.168.x.x:3000` on a phone will NOT give you the mic.
Easiest ways to get it on your phone:
1. **Free HTTPS tunnel (no deployment):** on the PC run `node server.js`, then in another window
   `npx cloudflared tunnel --url http://localhost:3000` (or `npx localtunnel --port 3000`). Open the https link it prints on your phone.
2. **Host it** on Render / Railway / Fly.io (free tiers) — it's one Node file, start command `node server.js`,
   set env `HOST=0.0.0.0`. Add `ANTHROPIC_API_KEY` there. Note: progress is stored in `data/` — use a persistent disk.
Then **Android Chrome**: menu → "Install app". **iPhone Safari**: Share → "Add to Home Screen".
Best on Android Chrome. iPhone Safari's speech recognition is less reliable; typing always works.

## Characters (like character.ai)
Tap **🎭** next to the topic, or just say/type: "talk like a pirate", "pretend you are my boss", "be a doctor".
- 9 ready-made characters work offline: Ava, Maya (best friend), Ms. Carter (job interview), Leo (café), Dr. Patel,
  Officer Reyes (airport), Sherlock Holmes, Captain Redbeard, Shakespeare.
- With an Anthropic key you can ask for ANYONE ("a grumpy chef", "a football commentator"): the AI writes the
  personality, picks a voice (gender / pitch / speed / accent) and designs the look.
- Voices come from your device's installed voices (Chrome on Windows/Android/Mac has several). Pitch and speed are tuned per character.
- Corrections always stay in the neutral coach style — the character only changes how it talks to you.

## v5 extras
- **Welcome screen** (first run): pick level + daily goal.
- **Hands-free 📞**: Ava listens automatically after she speaks — like a phone call. **Space** = mic.
- **XP, levels, 12 achievements**, confetti + sound effects (toggle in Settings).
- **Word of the day** + **daily challenge**; ＋ saves words to **📚 My words** (Drills tab).
- **🎤 Repeat it** under every correction: say the fixed sentence and get a word-by-word score.
- **Progress charts**: score trend, speaking speed, minutes per day. **Copy report** after a session.
- Animated aurora background, live sound-wave, thinking dots, lip-synced portraits.

## Anime-style characters
Six original characters (Sora, Kaito, Hana, Rin, Mika, Ryo) with their own look, voice and personality — in the 🎭 picker.
Requests for an *existing* anime/game/film character are not recreated: with the AI key, you get a new original character
with a similar vibe and a different name.
The streak and word-of-the-day/challenge cards now live on the Progress tab, not the main screen (tracking still runs).

## v7 — 18 anime-style characters + stage animation
Sora, Kaito, Hana, Rin, Mika, Ryo, Yuna (mysterious café girl), Haruto, Elara (elf mage), Hikari, Tsubasa, Daichi, Noa,
Akira, Master Mori, Luna, Vex, Mei — all original. Each has its own voice, personality, themed falling particles
(petals / stars / notes / embers / snow / bubbles / leaves / hearts), glow colour, hair-sway & breathing idle animation,
an anime "NOW TALKING WITH" title card, reactions (sparkles for a clean answer, sweat-drop when you make several mistakes,
hearts for a long perfect answer) and a portrait that tilts toward your mouse.

## Realistic character voices (optional)
Browser voices are free but robotic. For natural, in-character voices add a voice-service key:
Progress → Settings → "Realistic character voices": choose **ElevenLabs** (most realistic) or **OpenAI**, paste the key, Save,
then press "Test this character's voice". Each character gets its own voice (male/female/deep) automatically; OpenAI's
gpt-4o-mini-tts is also told to act in the character's style. If the service fails or runs out of credit, the app falls back to browser voices.
Keys are stored only in data/config.json on your computer (or env vars ELEVENLABS_API_KEY / OPENAI_API_KEY).


## Run on GitHub Pages (free hosting, HTTPS → mic works on phones)
GitHub Pages can't run Node, so the app has a **static mode**: everything (grammar checker, streaks, characters, Claude + voice calls)
runs in the browser, and the data is saved in that browser's localStorage. It switches on automatically when there is no server.
1. Create a new GitHub repo (e.g. `ava-english`). Make it **Public** (free Pages needs public unless you pay).
2. Upload the CONTENTS of the `public/` folder (index.html, app.js, lib/, …, plus the hidden `.nojekyll` file) to the repo root.
   (Or use the ready-made `ava-github-pages.zip`: unzip and upload everything inside.)
3. Repo → Settings → Pages → Source: "Deploy from a branch" → Branch `main`, folder `/ (root)` → Save.
4. After ~1 minute open `https://YOUR-USERNAME.github.io/ava-english/`.
Notes: keys you paste in Settings are stored only in that browser — everyone who opens your site must paste their own,
so never put your key in the repo. Progress/streaks are per browser/device (not synced). If you change server.js, re-run `python3 build-pages.py`.

## Voca single-file: run `python3 bundle.py`, upload dist/index.html alone.

## GitHub Pages — hardened (v8)
Upload the CONTENTS of `public/` to a **public** repo → Settings → Pages → Deploy from branch → main / root.
- **Keys**: GitHub Pages shares one origin across all your `username.github.io` sites, so keys default to *this tab only*. Choose "encrypted with passphrase" or "plain on device" in Progress → Settings → Hosting & data.
- **CSP** limits the page to talk only to Anthropic, OpenAI and ElevenLabs.
- **Data** lives in your browser: use *Download backup / Restore backup*. A nudge appears after 7 days without a backup.
- **Reminders** can't push from a static site: *Add daily reminder* exports a recurring calendar event.
- **Test AI connection** gives plain-English errors (bad key, no credit, blocked network).
- Opening inside Instagram/Facebook browsers shows a warning (mic is blocked there). PNG icons, install button, iOS audio unlock included.
When you get your own server, run `node server.js`; the same files work unchanged.


## Free local voices with VoiceStudio (optional)
1. Install and start VoiceStudio (https://github.com/debpalash/VoiceStudio) on your computer; it serves on http://localhost:3900.
2. If the voices don't play from the website, run `python3 tools/voicestudio-bridge.py` (adds the CORS headers browsers need) and use http://localhost:3901.
3. In Voca: Progress → Settings → Voice → "VoiceStudio — free, runs on your computer", then "Test this character's voice".
Works only on the computer running VoiceStudio (not on a phone).

## Online helpers (no backend, no keys — work on GitHub Pages)
Settings → Online helpers: LanguageTool grammar (api.languagetool.org), Free Dictionary meanings + native audio
(api.dictionaryapi.dev), and an optional in-browser neural grammar model (Transformers.js + Xenova/t5-base-grammar-correction,
downloaded once from huggingface.co and cached). All fail silently and fall back to the built-in rules. See `public/lib/online.js`.
