/* Chief of Stuff — demo shim
   Loaded before the app bundle. Intercepts fetch() calls to /api/* and /auth/*
   and answers them from an in-memory sample dataset. Nothing leaves the browser;
   reloading the page resets everything. */
(function () {
  "use strict";
  const realFetch = window.fetch.bind(window);

  /* ---------- dates (all local, YYYY-MM-DD, matching the app) ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  const TODAY = key(today);
  const mondayOf = (d) => { const m = new Date(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
  const MON = mondayOf(today);
  const day = (offsetFromMonday) => { const d = new Date(MON); d.setDate(d.getDate() + offsetFromMonday); return key(d); };
  const WEEK = key(MON);            // this week's Monday
  const NEXT_WEEK = day(7);
  const PREV_WEEK = day(-7);
  const shift = (ymd, n) => { const [y, m, d] = ymd.split("-").map(Number); const t = new Date(y, m - 1, d + n); return key(t); };
  const iso = (daysAgo, h = 9) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, 0, 0, 0); return d.toISOString(); };
  const NOW = new Date().toISOString();
  let seq = 1;
  const uid = (p = "demo") => `${p}-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  /* ---------- sample persona ---------- */
  const USER = { id: "demo-user", firstName: "Sam", lastName: "Reyes", email: "sam@example.com", profileImageUrl: null };

  /* ---------- tasks ---------- */
  const T = (o) => Object.assign({
    id: uid("t"), title: "", category: "home", status: "backlog", priority: "p2", type: "task", tripStore: null, tripSnapshot: null,
    scheduledFor: null, dueDate: null, blocked: false, blockedReason: null, subtasks: [], notes: "", person: null, tags: [],
    recurrence: "none", createdAt: iso(12), completedAt: null, order: 0, projectId: null,
  }, o);

  const projects = [
    { id: "proj-site", name: "Workshop site", archived: false, order: 0, createdAt: iso(30) },
    { id: "proj-importer", name: "Recipe importer", archived: false, order: 1, createdAt: iso(21) },
    { id: "proj-sensor", name: "Garage door sensor", archived: false, order: 2, createdAt: iso(9) },
  ];

  const tasks = [
    // Cleaning
    T({ title: "Vacuum downstairs", category: "cleaning", status: "next", priority: "p2", scheduledFor: shift(TODAY, 2), recurrence: "weekly", order: 1 }),
    T({ title: "Change pillowcases", category: "cleaning", status: "next", priority: "p3", scheduledFor: shift(TODAY, 3), recurrence: "weekly", order: 2 }),
    T({ title: "Wipe down fridge shelves", category: "cleaning", status: "backlog", priority: "p3", order: 3, notes: "Do it before the Sunday shop." }),
    T({ title: "Clean out car", category: "cleaning", status: "backlog", priority: "p3", order: 4 }),
    T({ title: "Mop kitchen", category: "cleaning", status: "done", priority: "p2", completedAt: iso(2, 18), scheduledFor: day(-2), order: 5 }),
    // Home
    T({ title: "Sunday batch prep", category: "home", status: "next", priority: "p1", scheduledFor: day(6), subtasks: [
      { id: "s1", title: "Chili", done: false }, { id: "s2", title: "Roast broccoli", done: false }, { id: "s3", title: "Overnight oats x4", done: false },
    ], tags: ["meals"], order: 1 }),
    T({ title: "Water plants", category: "home", status: "next", priority: "p3", scheduledFor: TODAY, recurrence: "weekly", order: 2 }),
    T({ title: "Return library books", category: "home", status: "backlog", priority: "p2", dueDate: day(5), order: 3 }),
    T({ title: "Freeze half the chili", category: "home", status: "backlog", priority: "p3", tags: ["meals"], order: 4 }),
    T({ title: "Pick up dry cleaning", category: "home", status: "done", priority: "p3", completedAt: iso(4, 17), order: 5 }),
    // Household Projects (no projectId → board)
    T({ title: "Fix the hallway closet door", category: "projects", status: "progress", priority: "p2", subtasks: [
      { id: "s4", title: "Measure hinge gap", done: true }, { id: "s5", title: "Buy shims", done: true }, { id: "s6", title: "Rehang", done: false },
    ], scheduledFor: shift(TODAY, 5), order: 1 }),
    T({ title: "Mount the shelf above the desk", category: "projects", status: "backlog", priority: "p3", blocked: true, blockedReason: "Waiting on wall anchors", order: 2 }),
    T({ title: "Patch the bathroom caulk", category: "projects", status: "backlog", priority: "p3", order: 3 }),
    // Admin
    T({ title: "Renew car registration", category: "admin", status: "next", priority: "p1", dueDate: shift(TODAY, 4), scheduledFor: shift(TODAY, 4), order: 1, notes: "Online form, needs the insurance card." }),
    T({ title: "Cancel the streaming trial", category: "admin", status: "next", priority: "p2", dueDate: shift(TODAY, 1), scheduledFor: TODAY, order: 2 }),
    T({ title: "File the dental claim", category: "admin", status: "backlog", priority: "p2", tags: ["paperwork"], order: 3 }),
    T({ title: "Update emergency contacts", category: "admin", status: "done", priority: "p3", completedAt: iso(6, 12), order: 4 }),
    // Follow-ups
    T({ title: "Send Priya the hiking photos", category: "followups", status: "next", priority: "p2", person: "Priya", scheduledFor: TODAY, order: 1 }),
    T({ title: "Book dinner with Marcus", category: "followups", status: "backlog", priority: "p2", person: "Marcus", dueDate: day(9), order: 2 }),
    T({ title: "Reply to Dana about the cabin weekend", category: "followups", status: "next", priority: "p1", person: "Dana", scheduledFor: shift(TODAY, 1), order: 3 }),
    T({ title: "Return Theo's drill", category: "followups", status: "backlog", priority: "p3", person: "Theo", order: 4 }),
    // Shopping trip
    T({ title: "Trader Joe's run", category: "home", status: "next", priority: "p2", type: "shopping-trip", tripStore: "traderjoes", scheduledFor: day(5), order: 6 }),
    // AI project tasks (projectId set)
    T({ title: "Write the About page", category: "projects", status: "done", projectId: "proj-site", priority: "p2", completedAt: iso(1, 21), order: 1 }),
    T({ title: "Render screenshots from the demo build", category: "projects", status: "progress", projectId: "proj-site", priority: "p1", scheduledFor: TODAY, order: 2 }),
    T({ title: "Decide on a name for the friendship app", category: "projects", status: "next", projectId: "proj-site", priority: "p2", order: 3 }),
    T({ title: "Wire the domain", category: "projects", status: "backlog", projectId: "proj-site", priority: "p3", order: 4 }),
    T({ title: "Parse ingredient quantities from pasted text", category: "projects", status: "progress", projectId: "proj-importer", priority: "p2", order: 1 }),
    T({ title: "Handle recipes with sub-sections", category: "projects", status: "backlog", projectId: "proj-importer", priority: "p3", order: 2 }),
    T({ title: "Test with five cookbook photos", category: "projects", status: "backlog", projectId: "proj-importer", priority: "p3", order: 3 }),
    T({ title: "Order a magnetic reed switch", category: "projects", status: "done", projectId: "proj-sensor", priority: "p3", completedAt: iso(3, 10), order: 1 }),
    T({ title: "Flash the board", category: "projects", status: "next", projectId: "proj-sensor", priority: "p2", order: 2 }),
    T({ title: "Send a push notification when open > 10 min", category: "projects", status: "backlog", projectId: "proj-sensor", priority: "p2", order: 3 }),
  ];

  /* ---------- shopping ---------- */
  const S = (o) => Object.assign({
    id: uid("sh"), name: "", list: "provisions", store: "traderjoes", storeOther: null, section: "other", active: true, qty: null, notes: "",
    url: null, price: null, decision: null, revisitOn: null, lastPurchasedAt: null, createdAt: iso(20), order: 0, source: null, weekOf: null,
  }, o);
  const shopping = [
    // Provisions — Trader Joe's
    S({ name: "Bananas", section: "produce", order: 1 }),
    S({ name: "Baby spinach", section: "produce", order: 2 }),
    S({ name: "Greek yogurt", section: "dairy", order: 3, qty: "2" }),
    S({ name: "Eggs", section: "dairy", order: 4, qty: "1 dozen" }),
    S({ name: "Sparkling water", section: "other", order: 5, qty: "2 cases", active: false, lastPurchasedAt: iso(3) }),
    S({ name: "Frozen mango", section: "frozen", order: 6, active: false, lastPurchasedAt: iso(10) }),
    S({ name: "Corn tortillas", section: "pantry", order: 7 }),
    // Provisions — Costco
    S({ name: "Chicken thighs", store: "costco", section: "meat", order: 1, qty: "family pack" }),
    S({ name: "Olive oil", store: "costco", section: "pantry", order: 2, active: false, lastPurchasedAt: iso(30) }),
    S({ name: "Paper towels", store: "costco", section: "household", order: 3 }),
    S({ name: "Coffee beans", store: "costco", section: "pantry", order: 4, qty: "2 lb" }),
    S({ name: "Dish soap", store: "costco", section: "household", order: 5, active: false, lastPurchasedAt: iso(45) }),
    // Provisions — Whole Foods
    S({ name: "Sourdough loaf", store: "wholefoods", section: "other", order: 1 }),
    S({ name: "Salmon fillets", store: "wholefoods", section: "meat", order: 2, qty: "2" }),
    // Buy list (one-offs + items pushed from Meals)
    S({ name: "Wall anchors", list: "buy", store: "other", storeOther: "Hardware store", section: "household", order: 1, notes: "For the desk shelf" }),
    S({ name: "Lightbulbs, 60W equivalent", list: "buy", store: "costco", section: "household", order: 2, qty: "4" }),
    S({ name: "Birthday card for Dana", list: "buy", store: "other", storeOther: "Pharmacy", section: "other", order: 3 }),
    S({ name: "Black beans", list: "buy", store: "traderjoes", section: "pantry", order: 4, qty: "2 cans", source: "meals", weekOf: WEEK, notes: `Meals · week of ${WEEK}` }),
    S({ name: "Lime", list: "buy", store: "traderjoes", section: "produce", order: 5, qty: "3", source: "meals", weekOf: WEEK, notes: `Meals · week of ${WEEK}` }),
    S({ name: "Cilantro", list: "buy", store: "traderjoes", section: "produce", order: 6, qty: "1 bunch", source: "meals", weekOf: WEEK, notes: `Meals · week of ${WEEK}` }),
    // Considering
    S({ name: "Cast-iron Dutch oven", list: "considering", store: "online", section: "household", order: 1, price: 89.99, url: "https://example.com/dutch-oven", decision: "researching", notes: "5.5 qt is probably enough." }),
    S({ name: "Standing desk mat", list: "considering", store: "online", section: "household", order: 2, price: 49, url: "https://example.com/desk-mat", decision: "waiting", revisitOn: day(14) }),
    S({ name: "Air purifier", list: "considering", store: "online", section: "household", order: 3, price: 179, url: "https://example.com/purifier", decision: "no", notes: "Opened the windows instead." }),
  ];

  /* ---------- settings ---------- */
  let settings = {
    density: "compact", activeSurface: "dashboard", taskView: "board",
    filters: { priorities: [], people: [], tags: [], dueOptions: [], blockedOnly: false, hideDone: false, projectIds: [] },
    aiProjectsMigrationCompleted: true, dueDateRepairCompleted: true, workoutsRowExpanded: true,
  };

  /* ---------- workouts ---------- */
  const templates = [
    { id: "wt-push", name: "Push", type: "lifting", duration: 55, notes: "Bench, overhead press, dips", archived: false, order: 0 },
    { id: "wt-pull", name: "Pull", type: "lifting", duration: 55, notes: "Rows, pull-ups, curls", archived: false, order: 1 },
    { id: "wt-legs", name: "Legs", type: "lifting", duration: 60, notes: "Squat, RDL, lunges", archived: false, order: 2 },
    { id: "wt-yoga", name: "Yoga", type: "yoga", duration: 30, notes: "Follow-along video", archived: false, order: 3 },
    { id: "wt-run", name: "Easy run", type: "running", duration: 35, notes: "Conversational pace", archived: false, order: 4 },
  ];
  const scheduled = [
    { id: uid("sw"), templateId: "wt-legs", date: shift(TODAY, -2), time: "18:30", completed: true, syncedToCalendar: true, createdAt: iso(9) },
    { id: uid("sw"), templateId: "wt-push", date: TODAY, time: "18:30", completed: false, syncedToCalendar: true, createdAt: iso(7) },
    { id: uid("sw"), templateId: "wt-run", date: shift(TODAY, 1), time: "07:00", completed: false, syncedToCalendar: true, createdAt: iso(7) },
    { id: uid("sw"), templateId: "wt-pull", date: shift(TODAY, 2), time: "18:30", completed: false, syncedToCalendar: true, createdAt: iso(7) },
    { id: uid("sw"), templateId: "wt-legs", date: shift(TODAY, 4), time: "18:30", completed: false, syncedToCalendar: true, createdAt: iso(7) },
    { id: uid("sw"), templateId: "wt-yoga", date: shift(TODAY, 5), time: "09:00", completed: false, syncedToCalendar: true, createdAt: iso(7) },
  ];

  /* ---------- dashboard feeds ---------- */
  const calendar = [
    { id: "cal-1", title: "Dentist", date: TODAY, time: "10:30", endTime: "11:15", source: "apple", location: "Midtown Dental" },
    { id: "cal-2", title: "Call with Dana", date: TODAY, time: "16:00", endTime: "16:30", source: "google", location: null },
    { id: "cal-3", title: "Push day", date: TODAY, time: "18:30", endTime: "19:30", source: "apple", location: "Gym" },
    { id: "cal-4", title: "Farmers market", date: shift(TODAY, 1), time: "09:00", endTime: "10:00", source: "apple", location: "Piedmont Park" },
    { id: "cal-5", title: "Book club", date: shift(TODAY, 2), time: "19:00", endTime: "21:00", source: "google", location: "Marcus's place" },
  ];
  const news = [
    { id: "n-1", topic: "Home energy", headline: "Heat pump water heaters now cheaper to run than gas in most of the Southeast", summary: "A new utility analysis finds the crossover point arrived last winter for homes with time-of-use rates. Rebates expire at year end.", url: "https://example.com/news/heat-pumps", publishedAt: iso(0, 6) },
    { id: "n-2", topic: "Personal software", headline: "Local-first apps are having a moment", summary: "A roundup of tools that keep data on the device and sync later. The argument: your task list shouldn't need a login.", url: "https://example.com/news/local-first", publishedAt: iso(0, 7) },
    { id: "n-3", topic: "Cooking", headline: "The case for one big Sunday cook", summary: "Batch cooking three components, not three meals, is the version people actually keep doing.", url: "https://example.com/news/batch-cooking", publishedAt: iso(1, 8) },
  ];
  const learning = [
    { id: "l-1", topic: "Decision making", title: "Calibration: why your 80% is really 65%", status: "ready", podcastUrl: "https://example.com/pod/calibration", createdAt: iso(1) },
    { id: "l-2", topic: "Home automation", title: "Reed switches, debouncing, and why the door 'opens' twice", status: "ready", podcastUrl: "https://example.com/pod/reed", createdAt: iso(2) },
    { id: "l-3", topic: "Nutrition", title: "Protein timing: what the evidence actually says", status: "in-progress", podcastUrl: null, createdAt: iso(0) },
  ];
  const synced = { calendar: NOW, news: NOW, learning: NOW };

  /* ---------- meals ---------- */
  const ING = (name, quantity, unit, section) => ({ name, quantity, unit, section });
  const STEP = (text, timerSeconds = null, prepAhead = false) => ({ text, timerSeconds, prepAhead });
  const R = (o) => Object.assign({ id: uid("r"), tags: [], makesLeftovers: false, notes: "", sourceUrl: null, favorite: false, lastCooked: null, createdAt: iso(40), macrosEstimatedAt: iso(5) }, o);
  const recipes = [
    R({ id: "r-chili", title: "Turkey chili", servings: 6, totalMinutes: 50, tags: ["batch", "freezer"], makesLeftovers: true, favorite: true, lastCooked: iso(9),
      calories: 2280, proteinG: 180, carbsG: 210, fatG: 72,
      ingredients: [ING("Ground turkey", 1.5, "lb", "Meat & Seafood"), ING("Black beans", 2, "can", "Pantry"), ING("Crushed tomatoes", 28, "oz", "Pantry"), ING("Onion", 1, "", "Produce"), ING("Bell pepper", 2, "", "Produce"), ING("Chili powder", 2, "tbsp", "Pantry"), ING("Garlic", 3, "clove", "Produce")],
      steps: [STEP("Dice the onion and peppers.", null, true), STEP("Brown the turkey in a big pot.", 480), STEP("Add vegetables, spices, tomatoes and beans. Simmer.", 1800), STEP("Taste, salt, serve with lime.")] }),
    R({ id: "r-sheetpan", title: "Sheet-pan chicken thighs and potatoes", servings: 4, totalMinutes: 45, tags: ["weeknight"], makesLeftovers: true,
      calories: 2100, proteinG: 150, carbsG: 140, fatG: 100,
      ingredients: [ING("Chicken thighs", 2, "lb", "Meat & Seafood"), ING("Baby potatoes", 1.5, "lb", "Produce"), ING("Olive oil", 3, "tbsp", "Pantry"), ING("Lemon", 1, "", "Produce"), ING("Rosemary", 2, "sprig", "Produce")],
      steps: [STEP("Halve the potatoes and toss with oil and salt.", null, true), STEP("Roast potatoes 15 minutes at 425°F.", 900), STEP("Add chicken skin-side up, roast until 165°F.", 1500), STEP("Squeeze lemon over everything.")] }),
    R({ id: "r-tacos", title: "Black bean tacos", servings: 2, totalMinutes: 20, tags: ["quick", "vegetarian"],
      calories: 980, proteinG: 38, carbsG: 150, fatG: 26,
      ingredients: [ING("Black beans", 1, "can", "Pantry"), ING("Corn tortillas", 6, "", "Pantry"), ING("Lime", 1, "", "Produce"), ING("Cilantro", 0.5, "bunch", "Produce"), ING("Avocado", 1, "", "Produce"), ING("Feta", 2, "oz", "Dairy")],
      steps: [STEP("Warm the beans with cumin and a splash of water.", 300), STEP("Char tortillas over the flame.", 120), STEP("Assemble with avocado, feta, cilantro, lime.")] }),
    R({ id: "r-salmon", title: "Salmon rice bowls", servings: 2, totalMinutes: 30, tags: ["weeknight"],
      calories: 1240, proteinG: 76, carbsG: 120, fatG: 48,
      ingredients: [ING("Salmon fillets", 2, "", "Meat & Seafood"), ING("Jasmine rice", 1, "cup", "Pantry"), ING("Cucumber", 1, "", "Produce"), ING("Soy sauce", 2, "tbsp", "Pantry"), ING("Sesame seeds", 1, "tsp", "Pantry"), ING("Scallions", 2, "", "Produce")],
      steps: [STEP("Start the rice.", 1080), STEP("Sear salmon 4 minutes a side.", 480), STEP("Bowl it up with cucumber, scallions, soy, sesame.")] }),
    R({ id: "r-oats", title: "Overnight oats", servings: 4, totalMinutes: 10, tags: ["breakfast", "batch"], makesLeftovers: true, favorite: true,
      calories: 1400, proteinG: 60, carbsG: 200, fatG: 40,
      ingredients: [ING("Rolled oats", 2, "cup", "Pantry"), ING("Greek yogurt", 1, "cup", "Dairy"), ING("Milk", 2, "cup", "Dairy"), ING("Chia seeds", 2, "tbsp", "Pantry"), ING("Frozen mango", 1, "cup", "Frozen"), ING("Honey", 2, "tbsp", "Pantry")],
      steps: [STEP("Mix everything in four jars.", null, true), STEP("Refrigerate overnight.")] }),
    R({ id: "r-broccoli", title: "Garlic roasted broccoli", servings: 4, totalMinutes: 25, tags: ["side", "vegetarian"],
      calories: 480, proteinG: 16, carbsG: 40, fatG: 32,
      ingredients: [ING("Broccoli", 2, "head", "Produce"), ING("Garlic", 4, "clove", "Produce"), ING("Olive oil", 2, "tbsp", "Pantry"), ING("Red pepper flakes", 0.5, "tsp", "Pantry")],
      steps: [STEP("Cut into florets, toss with oil, garlic, flakes.", null, true), STEP("Roast at 425°F until the edges brown.", 1200)] }),
    R({ id: "r-friedrice", title: "Veggie fried rice", servings: 3, totalMinutes: 20, tags: ["quick", "leftovers", "vegetarian"],
      calories: 1350, proteinG: 45, carbsG: 190, fatG: 42,
      ingredients: [ING("Cooked rice", 3, "cup", "Pantry"), ING("Eggs", 3, "", "Dairy"), ING("Frozen peas and carrots", 1.5, "cup", "Frozen"), ING("Scallions", 3, "", "Produce"), ING("Soy sauce", 3, "tbsp", "Pantry"), ING("Sesame oil", 1, "tsp", "Pantry")],
      steps: [STEP("Scramble the eggs, set aside.", 180), STEP("Fry the rice hot with vegetables.", 420), STEP("Add eggs, soy, sesame oil, scallions.")] }),
    R({ id: "r-greek", title: "Greek salad with chickpeas", servings: 2, totalMinutes: 15, tags: ["quick", "vegetarian", "lunch"],
      calories: 820, proteinG: 30, carbsG: 70, fatG: 48,
      ingredients: [ING("Cucumber", 1, "", "Produce"), ING("Cherry tomatoes", 1, "pint", "Produce"), ING("Chickpeas", 1, "can", "Pantry"), ING("Feta", 3, "oz", "Dairy"), ING("Red onion", 0.5, "", "Produce"), ING("Olive oil", 2, "tbsp", "Pantry"), ING("Lemon", 1, "", "Produce")],
      steps: [STEP("Chop everything.", null, true), STEP("Dress with oil, lemon, oregano, salt.")] }),
    R({ id: "r-pancakes", title: "Banana pancakes", servings: 2, totalMinutes: 20, tags: ["breakfast", "weekend"],
      calories: 760, proteinG: 24, carbsG: 110, fatG: 24,
      ingredients: [ING("Bananas", 2, "", "Produce"), ING("Eggs", 2, "", "Dairy"), ING("Rolled oats", 0.75, "cup", "Pantry"), ING("Baking powder", 1, "tsp", "Pantry"), ING("Butter", 1, "tbsp", "Dairy")],
      steps: [STEP("Blend everything.", 60), STEP("Cook small pancakes on medium heat.", 600)] }),
  ];
  const savedMeals = [
    { id: "m-chili-night", name: "Chili night", items: [{ recipeId: "r-chili", servings: 2, role: "main", position: 0 }, { recipeId: "r-broccoli", servings: 2, role: "side", position: 1 }] },
    { id: "m-fish-bowls", name: "Fish bowls", items: [{ recipeId: "r-salmon", servings: 2, role: "main", position: 0 }] },
  ];
  let fridgeSettings = {
    preferences: { defaultServings: 2, dietaryTags: [], dislikedIngredients: ["mushrooms"], distinctDinners: 4, breakfastStyle: "Simple and repeatable", lunchStyle: "Leftovers or a quick lunch", weeknightMaxMinutes: 40 },
    pantryStaples: ["olive oil", "salt", "pepper", "soy sauce", "chili powder", "honey", "baking powder", "sesame oil", "red pepper flakes", "cumin", "oregano"],
    stores: ["Trader Joe's", "Costco", "Whole Foods"], defaultStore: "Trader Joe's", aiConfigured: true,
  };

  // Week entries: {id, weekOf, dayIndex, slot, recipeId, freeText, servings, extraMeals, isLeftoverOf, position, role}
  const E = (o) => Object.assign({ id: uid("e"), weekOf: WEEK, recipeId: null, freeText: null, servings: 2, extraMeals: 0, isLeftoverOf: null, position: 0, role: "main" }, o);
  const entries = [];
  function seedWeek(weekOf, plan) {
    for (const p of plan) {
      const root = E({ weekOf, ...p });
      entries.push(root);
      genLeftovers(root);
    }
  }
  function genLeftovers(root) {
    const titles = new Map(recipes.map((r) => [r.id, r.title]));
    for (let n = 1; n <= root.extraMeals; n++) {
      const d = root.dayIndex + n;
      const cell = { weekOf: shift(root.weekOf, Math.floor(d / 7) * 7), dayIndex: d % 7, slot: root.slot };
      const occupants = entries.filter((e) => e.weekOf === cell.weekOf && e.dayIndex === cell.dayIndex && e.slot === cell.slot);
      if (occupants.some((e) => !e.isLeftoverOf || !entries.some((p) => p.id === e.isLeftoverOf && p.weekOf === root.weekOf && p.dayIndex === root.dayIndex && p.slot === root.slot)))
        throw err(409, "A planned meal occupies a leftover slot. Clear that cell or reduce extra meals; nothing was changed.");
      entries.push(E({ ...cell, recipeId: root.recipeId, freeText: `Leftovers: ${titles.get(root.recipeId) || ""}`, servings: root.servings, extraMeals: 0, isLeftoverOf: root.id, position: root.position, role: root.role }));
    }
  }
  // this week
  seedWeek(WEEK, [
    { dayIndex: 0, slot: "breakfast", recipeId: "r-oats", servings: 1, extraMeals: 3 },
    { dayIndex: 0, slot: "lunch", freeText: "Leftover fried rice", servings: 1 },
    { dayIndex: 0, slot: "dinner", recipeId: "r-chili", servings: 2, extraMeals: 1 },
    { dayIndex: 0, slot: "dinner", recipeId: "r-broccoli", servings: 2, position: 1, role: "side" },
    { dayIndex: 1, slot: "lunch", recipeId: "r-greek", servings: 1 },
    { dayIndex: 2, slot: "dinner", recipeId: "r-salmon", servings: 2 },
    { dayIndex: 3, slot: "dinner", recipeId: "r-tacos", servings: 2 },
    { dayIndex: 4, slot: "breakfast", freeText: "Toast and eggs", servings: 1 },
    { dayIndex: 4, slot: "dinner", recipeId: "r-sheetpan", servings: 2, extraMeals: 1 },
    { dayIndex: 5, slot: "breakfast", recipeId: "r-pancakes", servings: 2 },
    { dayIndex: 5, slot: "lunch", freeText: "Out with Dana", servings: 1 },
    { dayIndex: 6, slot: "dinner", recipeId: "r-friedrice", servings: 2 },
  ]);
  // next week — the Meals module opens on the upcoming Monday, so this is the main plan
  seedWeek(NEXT_WEEK, [
    { dayIndex: 0, slot: "breakfast", recipeId: "r-oats", servings: 1, extraMeals: 3 },
    { dayIndex: 0, slot: "lunch", recipeId: "r-greek", servings: 1 },
    { dayIndex: 0, slot: "dinner", recipeId: "r-sheetpan", servings: 2, extraMeals: 1 },
    { dayIndex: 0, slot: "dinner", recipeId: "r-broccoli", servings: 2, position: 1, role: "side" },
    { dayIndex: 1, slot: "lunch", freeText: "Leftover chicken wrap", servings: 1 },
    { dayIndex: 2, slot: "lunch", recipeId: "r-greek", servings: 1 },
    { dayIndex: 2, slot: "dinner", recipeId: "r-tacos", servings: 2 },
    { dayIndex: 3, slot: "dinner", recipeId: "r-chili", servings: 2, extraMeals: 1 },
    { dayIndex: 4, slot: "breakfast", freeText: "Toast and eggs", servings: 1 },
    { dayIndex: 4, slot: "lunch", freeText: "Lunch out", servings: 1 },
    { dayIndex: 4, slot: "dinner", recipeId: "r-salmon", servings: 2 },
    { dayIndex: 5, slot: "breakfast", recipeId: "r-pancakes", servings: 2 },
    { dayIndex: 5, slot: "dinner", freeText: "Dinner at Marcus's", servings: 2 },
    { dayIndex: 6, slot: "breakfast", freeText: "Yogurt and fruit", servings: 1 },
    { dayIndex: 6, slot: "dinner", recipeId: "r-friedrice", servings: 2 },
  ]);
  // last week, sparse
  seedWeek(PREV_WEEK, [
    { dayIndex: 1, slot: "dinner", recipeId: "r-tacos", servings: 2 },
    { dayIndex: 3, slot: "dinner", recipeId: "r-sheetpan", servings: 2 },
    { dayIndex: 6, slot: "dinner", recipeId: "r-friedrice", servings: 2 },
  ]);
  const daySettings = {}; // key `${weekOf}:${dayIndex}` → {timeBudget, note}
  daySettings[`${WEEK}:2`] = { timeBudget: "quick", note: "Gym after work" };
  daySettings[`${WEEK}:5`] = { timeBudget: "cook-y", note: "" };
  daySettings[`${NEXT_WEEK}:1`] = { timeBudget: "quick", note: "Late meeting" };
  daySettings[`${NEXT_WEEK}:5`] = { timeBudget: "cook-y", note: "Pancake morning" };
  const prepPlans = {}; // weekOf → {prepDay, json, checkedTaskIds, fingerprint, entryIds}

  function cannedPrep(weekOf, recipeIds, chosen) {
    const has = (id) => recipeIds.includes(id);
    const tasks1 = [], tasks2 = [], tasks3 = [], storage = [], dayOf = [];
    let t = 0; const tid = () => `task-${++t}`;
    if (has("r-chili")) { const a = tid(); tasks1.push({ id: a, text: "Dice onions and peppers for the chili.", recipeIds: ["r-chili"], activeMinutes: 8, passiveMinutes: 0, startAfterTaskIds: [] });
      const b = tid(); tasks2.push({ id: b, text: "Brown the turkey, add everything, simmer.", recipeIds: ["r-chili"], activeMinutes: 12, passiveMinutes: 30, startAfterTaskIds: [a] });
      storage.push({ recipeId: "r-chili", container: "Two quart containers", fridgeDays: 4, freezable: true, reheatNote: "Reheat on the stove with a splash of water." });
      const first = chosen.find((e) => e.recipeId === "r-chili" && !e.isLeftoverOf); if (first) dayOf.push({ dayIndex: first.dayIndex, slot: first.slot, recipeId: "r-chili", text: "Lime, cilantro, and cheese go on at the table." }); }
    if (has("r-broccoli")) { const a = tid(); tasks1.push({ id: a, text: "Cut broccoli into florets; toss with oil and garlic.", recipeIds: ["r-broccoli"], activeMinutes: 6, passiveMinutes: 0, startAfterTaskIds: [] });
      const b = tid(); tasks2.push({ id: b, text: "Roast broccoli while the chili simmers.", recipeIds: ["r-broccoli"], activeMinutes: 3, passiveMinutes: 20, startAfterTaskIds: [a] });
      storage.push({ recipeId: "r-broccoli", container: "Shallow container, lid cracked until cool", fridgeDays: 3, freezable: false, reheatNote: "Re-crisp in a hot oven for 5 minutes." }); }
    if (has("r-oats")) { const a = tid(); tasks3.push({ id: a, text: "Assemble four jars of overnight oats.", recipeIds: ["r-oats"], activeMinutes: 8, passiveMinutes: 0, startAfterTaskIds: [] });
      storage.push({ recipeId: "r-oats", container: "Four jars", fridgeDays: 4, freezable: false, reheatNote: "Eat cold; add fruit the morning of." }); }
    if (has("r-sheetpan")) { const a = tid(); tasks1.push({ id: a, text: "Halve potatoes and marinate the chicken in lemon and rosemary.", recipeIds: ["r-sheetpan"], activeMinutes: 10, passiveMinutes: 0, startAfterTaskIds: [] });
      storage.push({ recipeId: "r-sheetpan", container: "Zip bag for chicken, container for potatoes", fridgeDays: 2, freezable: true, reheatNote: "Roast fresh on the day; this is prep only." }); }
    if (has("r-greek")) { const a = tid(); tasks3.push({ id: a, text: "Chop cucumber, tomatoes, and onion for the Greek salad; keep the dressing separate.", recipeIds: ["r-greek"], activeMinutes: 7, passiveMinutes: 0, startAfterTaskIds: [] });
      storage.push({ recipeId: "r-greek", container: "Two containers, dressing on the side", fridgeDays: 3, freezable: false, reheatNote: "Dress just before eating." }); }
    for (const id of recipeIds) if (!storage.some((s) => s.recipeId === id)) {
      const r = recipes.find((x) => x.id === id); const a = tid();
      tasks3.push({ id: a, text: `Prep the components for ${r ? r.title : "this recipe"}.`, recipeIds: [id], activeMinutes: 10, passiveMinutes: 0, startAfterTaskIds: [] });
      storage.push({ recipeId: id, container: "Lidded container", fridgeDays: 3, freezable: false, reheatNote: "Finish on the day." });
    }
    const phases = [{ name: "Knife work", tasks: tasks1 }, { name: "Oven and stove", tasks: tasks2 }, { name: "Assembly", tasks: tasks3 }].filter((p) => p.tasks.length);
    const active = phases.flatMap((p) => p.tasks).reduce((s, x) => s + x.activeMinutes, 0);
    return { totalMinutes: active + 30, equipment: ["Large pot", "Sheet pan", "Cutting board", "Jars and containers"], phases, storage, dayOfTasks: dayOf };
  }

  /* ---------- helpers ---------- */
  const err = (status, message) => Object.assign(new Error(message), { status });
  const normalize = (v) => v.normalize("NFKC").toLowerCase().split(",")[0].replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, " ").trim()
    .replace(/\b(tomatoes|potatoes)\b/g, (w) => w.slice(0, -2)).replace(/\b(\w+)ies\b/g, "$1y").replace(/\b(\w{3,})s\b/g, (w) => (w.endsWith("ss") ? w : w.slice(0, -1)));
  const UNITS = { cups: "cup", tablespoons: "tbsp", tablespoon: "tbsp", teaspoons: "tsp", teaspoon: "tsp", grams: "g", gram: "g", ounces: "oz", ounce: "oz", pounds: "lb", pound: "lb", lbs: "lb", cloves: "clove" };
  const isMonday = (v) => { const [y, m, d] = (v || "").split("-").map(Number); const dt = new Date(y, m - 1, d); return /^\d{4}-\d{2}-\d{2}$/.test(v) && dt.getDay() === 1; };
  const monday = (v) => { if (!isMonday(v)) throw err(400, "weekOf must be a real Monday in YYYY-MM-DD format."); return v; };
  const strip = (e) => ({ id: e.id, weekOf: e.weekOf, dayIndex: e.dayIndex, slot: e.slot, recipeId: e.recipeId, freeText: e.freeText, servings: e.servings, extraMeals: e.extraMeals, isLeftoverOf: e.isLeftoverOf, position: e.position, role: e.role, estimatedMacros: null });
  const cellOf = (weekOf, dayIndex, slot) => entries.filter((e) => e.weekOf === weekOf && e.dayIndex === dayIndex && e.slot === slot);
  function deleteRows(rows) {
    const ids = new Set(rows.map((e) => e.id));
    for (let i = entries.length - 1; i >= 0; i--) if (ids.has(entries[i].id) || ids.has(entries[i].isLeftoverOf)) entries.splice(i, 1);
  }
  function batchServings(root, all) { const kids = all.filter((e) => e.isLeftoverOf === root.id); return root.servings + kids.reduce((s, e) => s + e.servings, 0) + root.servings * Math.max(0, root.extraMeals - kids.length); }
  function fingerprint(weekOf) { return JSON.stringify(entries.filter((e) => e.weekOf === weekOf).map((e) => [e.dayIndex, e.slot, e.recipeId, e.freeText, e.servings, e.extraMeals, e.position]).sort()); }
  function prepState(weekOf) {
    monday(weekOf);
    const p = prepPlans[weekOf];
    return { weekOf, defaultPrepDay: shift(weekOf, -1), plan: p ? { weekOf, prepDay: p.prepDay, json: p.json, checkedTaskIds: p.checkedTaskIds, selectedEntryIds: p.entryIds, planChanged: p.fingerprint !== fingerprint(weekOf) } : null };
  }
  function dailyMacros(current) {
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const total = { dayIndex, calories: 0, proteinG: 0, carbsG: 0, fatG: 0, partial: false };
      for (const slot of ["breakfast", "lunch", "dinner"]) {
        const items = current.filter((e) => e.dayIndex === dayIndex && e.slot === slot);
        if (!items.length) total.partial = true;
        for (const e of items) {
          const r = e.recipeId ? recipes.find((x) => x.id === e.recipeId) : null;
          if (!r || r.calories == null) { total.partial = true; continue; }
          for (const k of ["calories", "proteinG", "carbsG", "fatG"]) total[k] += (r[k] || 0) * e.servings / r.servings;
        }
      }
      for (const k of ["calories", "proteinG", "carbsG", "fatG"]) total[k] = Math.round(total[k]);
      return total;
    });
  }
  function week(weekOf) {
    monday(weekOf);
    const current = entries.filter((e) => e.weekOf === weekOf).sort((a, b) => a.dayIndex - b.dayIndex || a.slot.localeCompare(b.slot) || a.position - b.position);
    const prepNotes = [];
    for (let d = 0; d < 7; d++) {
      const nd = d + 1, tw = shift(weekOf, Math.floor(nd / 7) * 7), ti = nd % 7;
      for (const e of entries.filter((x) => x.weekOf === tw && x.dayIndex === ti && !x.isLeftoverOf)) {
        const r = recipes.find((x) => x.id === e.recipeId);
        for (const s of (r ? r.steps : []).filter((s) => s.prepAhead)) prepNotes.push({ dayIndex: d, text: `${r.title}: ${s.text}` });
      }
    }
    const ps = prepState(weekOf);
    return {
      weekOf, entries: current.map(strip),
      daySettings: Array.from({ length: 7 }, (_, dayIndex) => ({ weekOf, dayIndex, timeBudget: (daySettings[`${weekOf}:${dayIndex}`] || {}).timeBudget || "normal", note: (daySettings[`${weekOf}:${dayIndex}`] || {}).note || "" })),
      prepNotes,
      plannedMeals: new Set(current.filter((e) => e.recipeId || e.freeText).map((e) => `${e.dayIndex}:${e.slot}`)).size,
      distinctDinners: new Set(current.filter((e) => e.slot === "dinner" && e.recipeId && e.role === "main").map((e) => e.recipeId)).size,
      dailyMacros: dailyMacros(current),
      dayOfTasks: ps.plan && !ps.plan.planChanged ? ps.plan.json.dayOfTasks : [],
    };
  }
  function shopItems(weekOf) {
    const plan = entries.filter((e) => e.weekOf === weekOf);
    const rootIds = new Set(plan.filter((e) => !e.isLeftoverOf).map((e) => e.id));
    const all = [...plan, ...entries.filter((e) => e.isLeftoverOf && rootIds.has(e.isLeftoverOf) && !plan.includes(e))];
    const staples = new Set(fridgeSettings.pantryStaples.map(normalize));
    const merged = new Map();
    for (const e of all) {
      if (!e.recipeId || e.isLeftoverOf) continue;
      const r = recipes.find((x) => x.id === e.recipeId); if (!r) continue;
      const factor = batchServings(e, all) / r.servings;
      for (const ing of r.ingredients) {
        const n = normalize(ing.name); if (staples.has(n)) continue;
        const raw = ing.unit.trim().toLowerCase(), unit = UNITS[raw] || raw;
        const k = `${n}|${unit}|${ing.quantity === null ? "u" : "n"}`;
        const ex = merged.get(k), amount = ing.quantity === null ? null : ing.quantity * factor;
        if (ex && amount !== null && ex.amount !== null) ex.amount += amount;
        else if (!ex) merged.set(k, { name: ing.name, amount, unit, section: ing.section });
      }
    }
    let i = 0;
    return [...merged].map(([k, it]) => ({ id: `shop-${(i++).toString(36)}-${k.replace(/[^a-z0-9]/g, "").slice(0, 12)}`, name: it.name, quantity: it.amount === null ? `as needed${it.unit ? ` ${it.unit}` : ""}` : `${Number(it.amount.toFixed(3))}${it.unit ? ` ${it.unit}` : ""}`, section: it.section, store: fridgeSettings.defaultStore, checked: true }));
  }
  function receiveChief(input) {
    const norm = input.store.toLowerCase().replace(/[^a-z]/g, "");
    const store = ["wholefoods", "costco", "traderjoes", "online"].includes(norm) ? norm : "other";
    const section = { Produce: "produce", "Meat & Seafood": "meat", Dairy: "dairy", Pantry: "pantry", Frozen: "frozen" }[input.section] || "other";
    const id = `fridge-${normalize(input.name)}-${input.weekOf}`.replace(/\s+/g, "-");
    if (shopping.some((s) => s.id === id)) return { id };
    shopping.push(S({ id, name: input.name, list: "buy", store, storeOther: store === "other" ? input.store : null, section, qty: input.quantity, source: "meals", weekOf: input.weekOf, notes: `Meals · week of ${input.weekOf}${input.section === "Bakery" ? " · Bakery" : ""}`, createdAt: NOW, order: Date.now() }));
    return { id };
  }
  function putEntry(input) {
    monday(input.weekOf);
    const library = recipes;
    if (input.recipeId && !library.some((r) => r.id === input.recipeId)) throw err(404, "Recipe not found.");
    let rows = cellOf(input.weekOf, input.dayIndex, input.slot);
    const old = input.id ? rows.find((e) => e.id === input.id) : undefined;
    if (input.id && !old) throw err(404, "Meal item not found in this cell.");
    if (input.replaceCell || (!input.id && !input.recipeId && !(input.freeText || "").trim())) { deleteRows(rows); rows = []; }
    else if (old) deleteRows([old]);
    if (!input.recipeId && !(input.freeText || "").trim()) return week(input.weekOf);
    const preserves = old && old.isLeftoverOf && input.recipeId === old.recipeId;
    const entry = E({ id: old ? old.id : uid("e"), weekOf: input.weekOf, dayIndex: input.dayIndex, slot: input.slot, recipeId: input.recipeId || null, freeText: (input.freeText || "").trim() || null, servings: input.servings, extraMeals: input.extraMeals || 0,
      isLeftoverOf: preserves ? old.isLeftoverOf : null, position: old ? old.position : (rows.length ? Math.max(...rows.map((e) => e.position)) + 1 : 0), role: input.role || (old ? old.role : (rows.length ? "side" : "main")) });
    entries.push(entry); genLeftovers(entry);
    return week(input.weekOf);
  }

  /* ---------- router ---------- */
  const routes = [];
  const on = (method, pattern, handler) => routes.push({ method, re: new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$"), handler });
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  const noContent = () => new Response(null, { status: 204 });

  // auth
  on("GET", "/auth/user", () => ({ user: { id: USER.id, firstName: USER.firstName, email: USER.email }, authorized: true, reason: null }));
  on("POST", "/auth/logout", () => ({ ok: true }));
  on("GET", "/api/auth/user", () => ({ user: USER, authorized: true, reason: null }));
  on("GET", "/api/healthz", () => ({ status: "ok" }));

  // tasks
  on("GET", "/api/tasks", () => tasks);
  on("POST", "/api/tasks", (_, body) => { const t = T({ ...body, id: body.id || uid("t") }); tasks.push(t); return [t, 201]; });
  on("POST", "/api/tasks/batch", (_, body) => { for (const t of body) { const i = tasks.findIndex((x) => x.id === t.id); if (i < 0) throw err(404, "One or more tasks not found"); tasks[i] = t; } return body; });
  on("PUT", "/api/tasks/:id", (p, body) => { const i = tasks.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Task not found"); tasks[i] = body; return body; });
  on("DELETE", "/api/tasks/:id", (p) => { const i = tasks.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Task not found"); tasks.splice(i, 1); return null; });

  // shopping
  on("GET", "/api/shopping", () => shopping);
  on("POST", "/api/shopping", (_, body) => { const s = S({ ...body, id: body.id || uid("sh") }); shopping.push(s); return [s, 201]; });
  on("POST", "/api/shopping/batch", (_, body) => { for (const s of body) { const i = shopping.findIndex((x) => x.id === s.id); if (i < 0) throw err(404, "One or more shopping items not found"); shopping[i] = s; } return body; });
  on("PUT", "/api/shopping/:id", (p, body) => { const i = shopping.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Shopping item not found"); shopping[i] = body; return body; });
  on("DELETE", "/api/shopping/:id", (p) => { const i = shopping.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Shopping item not found"); shopping.splice(i, 1); return null; });

  // projects
  on("GET", "/api/projects", () => projects);
  on("POST", "/api/projects", (_, body) => { if (projects.some((x) => x.name === body.name && !x.archived)) throw err(409, "Project names must be unique"); const pr = { ...body, id: body.id || uid("p") }; projects.push(pr); return [pr, 201]; });
  on("POST", "/api/projects/batch", (_, body) => { for (const pr of body) { const i = projects.findIndex((x) => x.id === pr.id); if (i < 0) throw err(404, "One or more projects not found"); projects[i] = pr; } return body; });
  on("PUT", "/api/projects/:id", (p, body) => { const i = projects.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Project not found"); projects[i] = body; return body; });
  on("DELETE", "/api/projects/:id", (p) => { const i = projects.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Project not found"); if (tasks.some((t) => t.projectId === p.id)) throw err(409, "Project still has tasks"); projects.splice(i, 1); return null; });

  // settings, export, backups
  on("GET", "/api/settings", () => settings);
  on("PUT", "/api/settings", (_, body) => { settings = body; return settings; });
  on("GET", "/api/export", () => exportPayload());
  on("POST", "/api/import", () => ({ tasks: 0, shopping: 0, projects: 0, settings: 0, total: 0 }));
  on("GET", "/api/backups", () => ({ dates: [shift(TODAY, -1), shift(TODAY, -2), shift(TODAY, -3)] }));
  on("POST", "/api/backups/:date/restore", () => ({ tasks: 0, shopping: 0, projects: 0, settings: 0, total: 0 }));
  function exportPayload() {
    const map = (arr, prefix) => Object.fromEntries(arr.map((x) => [`${prefix}:${x.id}`, x]));
    return { tasks: map(tasks, "task"), shopping: map(shopping, "shopping"), projects: map(projects, "project"), settings: { "settings:app": settings } };
  }

  // workouts
  on("GET", "/api/workout-templates", () => templates);
  on("POST", "/api/workout-templates", (_, b) => { const t = { id: b.id || uid("wt"), name: b.name, type: b.type, duration: b.duration ?? null, notes: b.notes || "", archived: !!b.archived, order: b.order ?? templates.length }; templates.push(t); return [t, 201]; });
  on("PUT", "/api/workout-templates/:id", (p, b) => { const i = templates.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Workout template not found"); templates[i] = b; return b; });
  on("DELETE", "/api/workout-templates/:id", (p) => { const i = templates.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Workout template not found"); if (scheduled.some((s) => s.templateId === p.id)) throw err(409, "Workout template still has scheduled workouts"); templates.splice(i, 1); return null; });
  on("GET", "/api/scheduled-workouts", () => scheduled);
  on("POST", "/api/scheduled-workouts", (_, b) => { if (!templates.some((t) => t.id === b.templateId)) throw err(404, "Workout template not found"); const s = { id: b.id || uid("sw"), templateId: b.templateId, date: b.date, time: b.time ?? null, completed: !!b.completed, syncedToCalendar: true, createdAt: NOW }; scheduled.push(s); return [s, 201]; });
  on("PUT", "/api/scheduled-workouts/:id", (p, b) => { const i = scheduled.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Scheduled workout not found"); scheduled[i] = { ...scheduled[i], ...b, time: b.time ?? null, completed: !!b.completed, syncedToCalendar: true }; return scheduled[i]; });
  on("DELETE", "/api/scheduled-workouts/:id", (p) => { const i = scheduled.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Scheduled workout not found"); scheduled.splice(i, 1); return null; });

  // dashboard feeds
  on("GET", "/api/dashboard/calendar-events", () => ({ items: calendar, lastSyncedAt: synced.calendar }));
  on("GET", "/api/dashboard/news-briefs", () => ({ items: news, lastSyncedAt: synced.news }));
  on("GET", "/api/dashboard/learning-items", () => ({ items: learning, lastSyncedAt: synced.learning }));
  on("POST", "/api/dashboard/calendar-events", (_, b) => { calendar.splice(0, calendar.length, ...b); synced.calendar = new Date().toISOString(); return { count: b.length }; });
  on("POST", "/api/dashboard/news-briefs", (_, b) => { news.splice(0, news.length, ...b); synced.news = new Date().toISOString(); return { count: b.length }; });
  on("POST", "/api/dashboard/learning-items", (_, b) => { learning.splice(0, learning.length, ...b); synced.learning = new Date().toISOString(); return { count: b.length }; });

  // meals: recipes
  const recipeOut = (r) => ({ ...r });
  on("GET", "/api/fridge/recipes", () => recipes.map(recipeOut));
  on("POST", "/api/fridge/recipes", (_, b) => { const r = R({ ...b, id: uid("r"), createdAt: NOW, lastCooked: null, calories: 900, proteinG: 45, carbsG: 90, fatG: 35, macrosEstimatedAt: NOW }); recipes.push(r); return [recipeOut(r), 201]; });
  on("POST", "/api/fridge/recipes/import", (_, b) => ({
    title: b.kind === "url" ? "Lemon herb orzo with chickpeas" : "Pasted recipe: lemon herb orzo", servings: 4, totalMinutes: 25,
    ingredients: [ING("Orzo", 1.5, "cup", "Pantry"), ING("Chickpeas", 1, "can", "Pantry"), ING("Lemon", 1, "", "Produce"), ING("Parsley", 0.5, "bunch", "Produce"), ING("Feta", 3, "oz", "Dairy"), ING("Olive oil", 2, "tbsp", "Pantry")],
    steps: [STEP("Boil the orzo until just tender.", 540), STEP("Toss warm orzo with chickpeas, lemon, oil, and herbs.", null, false), STEP("Crumble feta over the top.")],
    tags: ["quick", "vegetarian"], makesLeftovers: true, notes: "Imported in the demo from sample text; the live app reads the real page or photo.", sourceUrl: b.kind === "url" ? b.content : null, favorite: false,
  }));
  on("GET", "/api/fridge/recipes/:id", (p) => { const r = recipes.find((x) => x.id === p.id); if (!r) throw err(404, "Recipe not found."); return recipeOut(r); });
  on("PUT", "/api/fridge/recipes/:id", (p, b) => { const i = recipes.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Recipe not found."); recipes[i] = { ...recipes[i], ...b }; return recipeOut(recipes[i]); });
  on("DELETE", "/api/fridge/recipes/:id", (p) => {
    const i = recipes.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Recipe not found.");
    if (entries.some((e) => e.recipeId === p.id)) throw err(409, "This recipe is on a meal plan. Remove it from those cells before deleting it.");
    if (savedMeals.some((m) => m.items.some((it) => it.recipeId === p.id))) throw err(409, "This recipe is in a saved meal. Edit or delete that meal first.");
    recipes.splice(i, 1); return null;
  });
  on("POST", "/api/fridge/recipes/:id/cook", (p) => { const r = recipes.find((x) => x.id === p.id); if (!r) throw err(404, "Recipe not found."); r.lastCooked = new Date().toISOString(); return recipeOut(r); });
  on("POST", "/api/fridge/recipes/:id/macros", (p) => { const r = recipes.find((x) => x.id === p.id); if (!r) throw err(404, "Recipe not found."); if (r.calories == null) Object.assign(r, { calories: 900, proteinG: 45, carbsG: 90, fatG: 35 }); r.macrosEstimatedAt = new Date().toISOString(); return recipeOut(r); });
  on("POST", "/api/fridge/macros/backfill", () => ({ estimated: 0, remaining: 0, failedRecipeIds: [] }));

  // meals: saved meals
  on("GET", "/api/fridge/meals", () => savedMeals);
  on("POST", "/api/fridge/meals", (_, b) => { const m = { id: uid("m"), name: b.name, items: b.items.map((it, i) => ({ ...it, position: it.position ?? i })) }; savedMeals.push(m); return m; });
  on("PUT", "/api/fridge/meals/:id", (p, b) => { const i = savedMeals.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Saved meal not found."); savedMeals[i] = { id: p.id, name: b.name, items: b.items.map((it, j) => ({ ...it, position: it.position ?? j })) }; return savedMeals[i]; });
  on("DELETE", "/api/fridge/meals/:id", (p) => { const i = savedMeals.findIndex((x) => x.id === p.id); if (i < 0) throw err(404, "Saved meal not found."); savedMeals.splice(i, 1); return null; });

  // meals: week
  on("GET", "/api/fridge/week", (_, __, q) => week(q.get("weekOf")));
  on("PUT", "/api/fridge/week/entry", (_, b) => putEntry(b));
  on("DELETE", "/api/fridge/week/entry", (_, __, q) => { const weekOf = monday(q.get("weekOf")); const rows = cellOf(weekOf, Number(q.get("dayIndex")), q.get("slot")); deleteRows(q.get("id") ? rows.filter((e) => e.id === q.get("id")) : rows); return null; });
  on("POST", "/api/fridge/week/items", (_, b) => {
    monday(b.weekOf);
    let rows = cellOf(b.weekOf, b.dayIndex, b.slot);
    if (b.replace) { deleteRows(rows); rows = []; }
    let position = rows.length ? Math.max(...rows.map((e) => e.position)) + 1 : 0;
    for (const it of b.items) {
      if (it.recipeId && !recipes.some((r) => r.id === it.recipeId)) throw err(404, "Recipe not found.");
      if (!it.recipeId && !(it.freeText || "").trim()) throw err(400, "Each meal item must be a recipe or food note.");
      const root = E({ weekOf: b.weekOf, dayIndex: b.dayIndex, slot: b.slot, recipeId: it.recipeId || null, freeText: (it.freeText || "").trim() || null, servings: it.servings, extraMeals: it.extraMeals || 0, position, role: it.role || (position === 0 ? "main" : "side") });
      position++; entries.push(root); genLeftovers(root);
    }
    return week(b.weekOf);
  });
  on("PUT", "/api/fridge/week/order", (_, b) => {
    monday(b.weekOf); const rows = cellOf(b.weekOf, b.dayIndex, b.slot);
    if (b.ids.length !== rows.length || b.ids.some((id) => !rows.some((e) => e.id === id))) throw err(409, "The meal changed. Refresh before reordering.");
    b.ids.forEach((id, position) => { for (const e of entries) if (e.id === id || e.isLeftoverOf === id) e.position = position; });
    return week(b.weekOf);
  });
  on("PUT", "/api/fridge/week/day", (_, b) => { monday(b.weekOf); daySettings[`${b.weekOf}:${b.dayIndex}`] = { timeBudget: b.timeBudget, note: b.note }; return week(b.weekOf); });
  on("POST", "/api/fridge/week/draft", (_, b) => {
    monday(b.weekOf);
    const plan = [
      [0, "breakfast", "r-oats", 1, 3], [0, "lunch", "r-greek", 1, 0], [0, "dinner", "r-sheetpan", 2, 1],
      [1, "lunch", null, 1, 0, "Leftover chicken wrap"], [1, "dinner", "r-tacos", 2, 0],
      [2, "dinner", "r-salmon", 2, 0], [3, "dinner", "r-chili", 2, 1], [3, "dinner", "r-broccoli", 2, 0, null, 1, "side"],
      [4, "breakfast", null, 1, 0, "Toast and eggs"], [4, "lunch", "r-greek", 1, 0], [4, "dinner", "r-friedrice", 2, 0],
      [5, "breakfast", "r-pancakes", 2, 0], [5, "dinner", null, 2, 0, "Out"], [6, "dinner", "r-friedrice", 2, 0],
    ];
    const titles = new Map(recipes.map((r) => [r.id, r.title]));
    const out = [];
    for (const [dayIndex, slot, recipeId, servings, extraMeals, freeText = null, position = 0, role = "main"] of plan) {
      const root = { weekOf: b.weekOf, dayIndex, slot, recipeId, freeText, servings, extraMeals, id: uid("d"), isLeftoverOf: null, position, role };
      out.push(root);
      for (let n = 1; n <= extraMeals && dayIndex + n <= 6; n++) out.push({ ...root, id: uid("d"), dayIndex: dayIndex + n, freeText: `Leftovers: ${titles.get(recipeId)}`, extraMeals: 0, isLeftoverOf: root.id });
    }
    for (let i = 0; i < 21; i++) { const dayIndex = Math.floor(i / 3), slot = ["breakfast", "lunch", "dinner"][i % 3]; if (!out.some((e) => e.dayIndex === dayIndex && e.slot === slot)) out.push({ weekOf: b.weekOf, dayIndex, slot, recipeId: null, freeText: null, servings: 2, extraMeals: 0, id: uid("d"), isLeftoverOf: null, position: 0, role: "main" }); }
    return { weekOf: b.weekOf, entries: out.sort((a, c) => a.dayIndex - c.dayIndex || a.slot.localeCompare(c.slot) || a.position - c.position) };
  });
  on("POST", "/api/fridge/week/suggest", (_, b) => {
    monday(b.weekOf);
    const pool = recipes.filter((r) => r.id !== b.currentRecipeId && (b.slot === "breakfast" ? r.tags.includes("breakfast") : !r.tags.includes("breakfast") && !r.tags.includes("side")));
    const pick = pool[Math.floor(Math.random() * pool.length)] || recipes[0];
    return { weekOf: b.weekOf, dayIndex: b.dayIndex, slot: b.slot, recipeId: pick.id, freeText: null, servings: fridgeSettings.preferences.defaultServings, extraMeals: pick.makesLeftovers ? 1 : 0, role: "main" };
  });
  on("POST", "/api/fridge/week/accept", (_, b) => {
    monday(b.weekOf);
    deleteRows(entries.filter((e) => e.weekOf === b.weekOf));
    const remap = new Map(b.entries.map((e) => [e.id, uid("e")]));
    const positions = new Map();
    const roots = [];
    for (const e of [...b.entries].sort((a, c) => (a.position ?? 0) - (c.position ?? 0))) {
      if (!e.recipeId && !(e.freeText || "").trim()) continue;
      const k = `${e.dayIndex}:${e.slot}`, position = positions.get(k) ?? 0; positions.set(k, position + 1);
      const row = E({ ...e, id: remap.get(e.id), position, isLeftoverOf: e.isLeftoverOf ? remap.get(e.isLeftoverOf) : null, freeText: (e.freeText || "").trim() || null, extraMeals: e.extraMeals || 0, role: e.role || "main" });
      entries.push(row); if (!row.isLeftoverOf && row.recipeId) roots.push(row);
    }
    for (const root of roots) { // only leftovers that spill into next week still need generating
      const have = entries.filter((e) => e.isLeftoverOf === root.id).length;
      for (let n = have + 1; n <= root.extraMeals; n++) { const d = root.dayIndex + n; if (d <= 6) continue; const r = recipes.find((x) => x.id === root.recipeId); entries.push(E({ weekOf: shift(root.weekOf, 7), dayIndex: d % 7, slot: root.slot, recipeId: root.recipeId, freeText: `Leftovers: ${r ? r.title : ""}`, servings: root.servings, isLeftoverOf: root.id, position: root.position, role: root.role })); }
    }
    return week(b.weekOf);
  });

  // meals: settings, shop, prep, dashboard
  on("GET", "/api/fridge/settings", () => fridgeSettings);
  on("PUT", "/api/fridge/settings", (_, b) => { const stores = [...new Set(b.stores.map((s) => s.trim()).filter(Boolean))]; if (!stores.length || !stores.includes(b.defaultStore)) throw err(400, "Choose a default store from your stores."); fridgeSettings = { preferences: b.preferences, pantryStaples: [...new Set(b.pantryStaples.map((s) => s.trim()).filter(Boolean))], stores, defaultStore: b.defaultStore, aiConfigured: true }; return fridgeSettings; });
  on("POST", "/api/fridge/shop/build", (_, b) => ({ weekOf: monday(b.weekOf), items: shopItems(b.weekOf) }));
  on("POST", "/api/fridge/shop/send", (_, b) => { monday(b.weekOf); const results = b.items.filter((i) => i.checked).map((it) => { receiveChief({ name: it.name, quantity: it.quantity, store: it.store, section: it.section, weekOf: b.weekOf }); return { id: it.id, success: true, error: null }; }); return { count: results.length, results }; });
  on("GET", "/api/fridge/prep", (_, __, q) => prepState(q.get("weekOf")));
  on("POST", "/api/fridge/prep/build", (_, b) => {
    monday(b.weekOf);
    const existing = prepPlans[b.weekOf];
    if (existing && existing.checkedTaskIds.length && !b.confirmRegenerate) throw err(409, "Some prep tasks are checked. Confirm regeneration to replace this prep plan and reset checks.");
    const weekEntries = entries.filter((e) => e.weekOf === b.weekOf);
    const chosen = b.entryIds ? weekEntries.filter((e) => b.entryIds.includes(e.id)) : weekEntries.filter((e) => e.recipeId && b.recipeIds.includes(e.recipeId));
    if (!b.recipeIds.length || b.recipeIds.some((id) => !chosen.some((e) => e.recipeId === id))) throw err(400, "Select recipes that are on this week's plan.");
    prepPlans[b.weekOf] = { prepDay: b.prepDay, json: cannedPrep(b.weekOf, b.recipeIds, chosen), checkedTaskIds: [], fingerprint: fingerprint(b.weekOf), entryIds: chosen.map((e) => e.id) };
    return prepState(b.weekOf).plan;
  });
  on("PUT", "/api/fridge/prep/check", (_, b) => { monday(b.weekOf); const p = prepPlans[b.weekOf]; if (!p) throw err(404, "Build a prep plan first."); p.checkedTaskIds = b.checkedTaskIds; return prepState(b.weekOf).plan; });
  on("GET", "/api/fridge/dashboard-meals", (_, __, q) => {
    const date = q.get("date"); const [y, m, d] = date.split("-").map(Number); const dt = new Date(y, m - 1, d);
    const dayIndex = (dt.getDay() + 6) % 7; const weekOf = key(mondayOf(dt));
    const titles = new Map(recipes.map((r) => [r.id, r.title]));
    const cellsFor = (slot) => entries.filter((e) => e.weekOf === weekOf && e.dayIndex === dayIndex && e.slot === slot).sort((a, b) => Number(b.role === "main") - Number(a.role === "main") || a.position - b.position);
    const meals = ["breakfast", "lunch", "dinner"].map((slot) => {
      const parts = cellsFor(slot).map((e) => { let t = (e.recipeId && titles.get(e.recipeId)) || (e.freeText || "").trim() || null; if (t && e.isLeftoverOf && !/^leftovers:/i.test(t)) t = `Leftovers: ${t}`; return t; }).filter(Boolean);
      return { slot, title: parts.length ? `${parts[0]}${parts.length > 1 ? ` +${parts.length - 1} sides` : ""}` : null };
    });
    return { date, weekOf, dayIndex, meals };
  });
  // seed prep plans so the Prep page isn't empty for this week or the upcoming one
  for (const [wk, checked] of [[WEEK, ["task-1", "task-2"]], [NEXT_WEEK, []]]) {
    const ids = ["r-chili", "r-broccoli", "r-oats", "r-sheetpan"];
    const chosen = entries.filter((e) => e.weekOf === wk && ids.includes(e.recipeId));
    prepPlans[wk] = { prepDay: shift(wk, -1), json: cannedPrep(wk, ids, chosen), checkedTaskIds: checked, fingerprint: fingerprint(wk), entryIds: chosen.map((e) => e.id) };
  }

  /* ---------- fetch override ---------- */
  async function handle(method, url, init) {
    const path = url.pathname;
    let body = null;
    const raw = init && init.body;
    if (typeof raw === "string" && raw.trim()) { try { body = JSON.parse(raw); } catch { body = null; } }
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(path);
      if (!m) continue;
      const params = m.groups ? Object.fromEntries(Object.entries(m.groups).map(([k, v]) => [k, decodeURIComponent(v)])) : {};
      try {
        const out = r.handler(params, body, url.searchParams);
        if (out === null) return noContent();
        if (Array.isArray(out) && out.length === 2 && typeof out[1] === "number" && !Array.isArray(out[0]) && out[0] && typeof out[0] === "object") return json(out[0], out[1]);
        return json(out);
      } catch (e) {
        return json({ error: e.message || "Request failed" }, e.status || 500);
      }
    }
    return json({ error: `Not available in the demo: ${method} ${path}` }, 404);
  }
  window.fetch = function (input, init) {
    let urlString;
    if (typeof input === "string") urlString = input;
    else if (input instanceof URL) urlString = input.href;
    else if (input && typeof input.url === "string") urlString = input.url;
    else return realFetch(input, init);
    let url;
    try { url = new URL(urlString, location.href); } catch { return realFetch(input, init); }
    if (url.origin !== location.origin || !/^\/(api|auth)\//.test(url.pathname)) return realFetch(input, init);
    const method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
    return new Promise((resolve) => setTimeout(() => resolve(handle(method, url, init || {})), 35));
  };

  /* ---------- keep the demo stateless ---------- */
  if ("serviceWorker" in navigator) {
    try {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
      Object.defineProperty(navigator.serviceWorker, "register", { value: () => Promise.reject(new Error("Service workers are disabled in the demo")), configurable: true });
    } catch { /* ignore */ }
  }
  try { indexedDB.deleteDatabase("tasks-offline"); } catch { /* ignore */ }
  try { if ("caches" in window) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {}); } catch { /* ignore */ }

  // Export links point at the real API; in the demo, download the in-memory data instead.
  document.addEventListener("click", (ev) => {
    const a = ev.target && ev.target.closest && ev.target.closest('a[href^="/api/"]');
    if (!a) return;
    ev.preventDefault();
    const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = href; link.download = "chief-of-stuff-demo-export.json"; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }, true);

  window.__CHIEF_DEMO__ = { reset: () => location.reload() };
})();
