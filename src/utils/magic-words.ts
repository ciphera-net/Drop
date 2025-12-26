const ADJECTIVES = [
  "happy", "bright", "cool", "calm", "clever", "brave", "bold", "kind", "lucky", "proud",
  "swift", "wise", "wild", "fair", "fresh", "gentle", "glad", "grand", "great", "green",
  "jolly", "just", "keen", "loud", "neat", "nice", "plain", "pure", "quick", "quiet",
  "rare", "rich", "safe", "sharp", "soft", "still", "strong", "sweet", "tall", "warm",
  "active", "alert", "awake", "busy", "clean", "clear", "dear", "deep", "easy", "fast",
  "fine", "firm", "fit", "fond", "free", "full", "good", "hard", "high", "hot",
  "huge", "just", "late", "light", "long", "lost", "main", "many", "mild", "near",
  "next", "open", "past", "poor", "real", "rich", "ripe", "safe", "same", "sure",
  "tame", "vast", "warm", "weak", "wide", "wild", "wise", "young", "best", "better",
  "big", "blue", "brief", "broad", "busy", "calm", "cheap", "chief", "clean", "close",
  "cold", "cool", "crazy", "dark", "dead", "deep", "dry", "early", "empty", "equal"
];

const NOUNS = [
  "bear", "bird", "cat", "dog", "duck", "fish", "fox", "frog", "goat", "hawk",
  "horse", "kite", "lamb", "lion", "mole", "moon", "mouse", "owl", "park", "pig",
  "pond", "rain", "road", "rock", "rose", "seal", "ship", "sky", "snow", "song",
  "star", "sun", "swan", "tiger", "toad", "tree", "wind", "wolf", "worm", "zebra",
  "apple", "ball", "bank", "bell", "boat", "book", "boot", "box", "boy", "bus",
  "cake", "car", "card", "case", "chair", "class", "club", "coat", "corn", "cow",
  "crow", "cup", "day", "desk", "door", "drum", "egg", "eye", "face", "farm",
  "field", "fire", "flag", "fly", "food", "foot", "fork", "game", "gate", "girl",
  "glass", "glove", "gold", "grape", "grass", "hair", "hall", "hand", "hat", "head",
  "heart", "hill", "home", "hook", "hope", "horn", "hose", "house", "ice", "ink"
];

const VERBS = [
  "act", "add", "ask", "bat", "beg", "bet", "bid", "bow", "box", "buy",
  "call", "can", "cap", "cut", "did", "dig", "do", "dry", "eat", "end",
  "fed", "fee", "fix", "fly", "fry", "get", "go", "got", "had", "has",
  "hit", "hug", "hum", "hut", "ice", "ink", "jam", "jet", "job", "jog",
  "joy", "key", "kit", "lap", "lay", "led", "let", "lid", "lie", "lip",
  "lit", "log", "lot", "low", "mad", "man", "map", "mat", "met", "mix",
  "mob", "mom", "mop", "mud", "mug", "nap", "net", "new", "nod", "not",
  "now", "nut", "oak", "oar", "odd", "off", "oil", "old", "one", "our",
  "out", "owl", "own", "pad", "pan", "pat", "pay", "pea", "pen", "pet"
];

export function generateMagicWords(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const verb = VERBS[Math.floor(Math.random() * VERBS.length)];
  
  // Format: adjective-noun-verb (e.g., happy-cat-run)
  // Or maybe just 3 random words from a combined pool for more entropy?
  // User asked for "correct-horse-battery" style (XKCD style), which is usually 4 words but user said 3.
  // "correct-horse-battery" is Adj-Noun-Noun.
  // Let's stick to a simple 3 word random selection from a combined pool to maximize entropy.
  
  const allWords = [...ADJECTIVES, ...NOUNS, ...VERBS];
  
  // Use crypto for secure random number generation
  const getRandomIndex = (max: number) => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  };

  const word1 = allWords[getRandomIndex(allWords.length)];
  const word2 = allWords[getRandomIndex(allWords.length)];
  const word3 = allWords[getRandomIndex(allWords.length)];
  
  return `${word1}-${word2}-${word3}`;
}

