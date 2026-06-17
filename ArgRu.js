const CARDS_FILE = "argspanish_ba_5000_cards.json";
const STATE_FILE = "argspanish.state.json";
const INTERVAL_MS = 15 * 60 * 1000;
const CARDS_URL = "https://raw.githubusercontent.com/Adamov89/arg-ru-widget/main/argspanish_ba_5000_cards.json";
const stateFm = FileManager.local();
const cacheFm = FileManager.local();
const stateDir = stateFm.documentsDirectory();
const statePath = stateFm.joinPath(stateDir, STATE_FILE);
function readJson(fm, path, fallback) {
    try {
        if (!fm.fileExists(path)) {
            return fallback;
        }
        const text = fm.readString(path);
        const parsed = JSON.parse(text);
        if (parsed === null) {
            return fallback;
        }
        return parsed;
    } catch (e) {
        console.log("READ ERROR: " + e);
        return fallback;
    }
}
function writeJson(fm, path, data) {
    try {
        fm.writeString(path, JSON.stringify(data, null, 2));
    } catch (e) {
        console.log("WRITE ERROR: " + e);
    }
}
async function loadCards() {

  const cachePath = cacheFm.joinPath(
    cacheFm.documentsDirectory(),
    "cards-cache.json"
  );

  try {

    const req = new Request(CARDS_URL);
    req.timeoutInterval = 20;

    const text = await req.loadString();

    if (text && text.length > 100) {

      cacheFm.writeString(cachePath, text);

      return JSON.parse(text);
    }

  } catch (e) {
    console.log("GITHUB ERROR: " + e);
  }

  try {

    if (cacheFm.fileExists(cachePath)) {

      const text = cacheFm.readString(cachePath);

      if (text && text.length > 100) {
        return JSON.parse(text);
      }
    }

  } catch (e) {
    console.log("CACHE ERROR: " + e);
  }

  return [];
}

let data = await loadCards();
let rawCards = [];
if (Array.isArray(data)) {
    rawCards = data;
} else if (data && Array.isArray(data.cards)) {
    rawCards = data.cards;
} else if (data && Array.isArray(data.words)) {
    rawCards = data.words;
} else if (data && Array.isArray(data.items)) {
    rawCards = data.items;
} else if (data && Array.isArray(data.data)) {
    rawCards = data.data;
} else {
    rawCards = [];
}
let cards = [];
for (let i = 0; i < rawCards.length; i++) {
    let c = rawCards[i];
    if (!c) {
        continue;
    }
    let word = "";
    let translation = "";
    if (c.word) {
        word = String(c.word);
    } else if (c.es) {
        word = String(c.es);
    } else if (c.spanish) {
        word = String(c.spanish);
    }
    if (c.translation) {
        translation = String(c.translation);
    } else if (c.ru) {
        translation = String(c.ru);
    } else if (c.meaning) {
        translation = String(c.meaning);
    }
    word = word.trim();
    translation = translation.trim();
    if (word.length > 0 && translation.length > 0) {
        cards.push({
            word: word,
            translation: translation
        });
    }
}
let state = readJson(stateFm, statePath, {});
if (!state.startedAt) {
    state.startedAt = new Date().toISOString();
    writeJson(stateFm, statePath, state);
}
let widget = new ListWidget();
widget.backgroundColor = new Color("#111827");
widget.setPadding(16, 16, 14, 16);
if (cards.length === 0) {
    widget.addSpacer();
    let title = widget.addText("Нет словаря");
    title.font = Font.boldSystemFont(18);
    title.textColor = Color.white();
    title.centerAlignText();
    widget.addSpacer(6);
    let hint = widget.addText("Проверь JSON-файл");
    hint.font = Font.systemFont(11);
    hint.textColor = Color.lightGray();
    hint.centerAlignText();
    widget.addSpacer();
} else {
    let startTime = new Date(state.startedAt).getTime();
    if (isNaN(startTime)) {
        startTime = Date.now();
        state.startedAt = new Date(startTime).toISOString();
        writeJson(stateFm, statePath, state);
    }
    let elapsed = Date.now() - startTime;
    if (elapsed < 0) {
        elapsed = 0;
    }
    let step = Math.floor(elapsed / INTERVAL_MS);
    let index = step % cards.length;
    let card = cards[index];
    widget.addSpacer();
    let word = widget.addText(card.word.toUpperCase());
    word.font = Font.boldSystemFont(30);
    word.textColor = Color.white();
    word.centerAlignText();
    word.lineLimit = 1;
    word.minimumScaleFactor = 0.5;
    widget.addSpacer(10);
    let ru = widget.addText(card.translation);
    ru.font = Font.systemFont(18);
    ru.textColor = Color.lightGray();
    ru.centerAlignText();
    ru.lineLimit = 2;
    ru.minimumScaleFactor = 0.55;
    widget.addSpacer();
    let count = widget.addText(String(index + 1) + " / " + String(cards.length));
    count.font = Font.systemFont(11);
    count.textColor = new Color("#9CA3AF");
    count.rightAlignText();
}
widget.refreshAfterDate = new Date(Date.now() + INTERVAL_MS);
if (config.runsInWidget) {
    Script.setWidget(widget);
} else {
    await widget.presentSmall();
}
Script.complete();
