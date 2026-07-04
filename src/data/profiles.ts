// Per-animal psychological profile content (spirit-animal-profiles-and-mythology-v1,
// §4). The PRIMARY blocks: the core reading (short for Speed Run, two paragraphs for
// Soul Search), Drawn-to, Watch-for, the Kin-and-rivals paragraph, and the Tier 3
// tease. Assembled per tier by prose/template.ts and rendered by Results.
//
// This is content, not engine: editing it never changes matching. Keyed to the 16
// common animal ids in data/archetypes.ts. Voice rules (§2): second person, warm but
// honest, no hedging, plain hyphens.

export interface ProfileBlock {
  /** Headline epithet from the §4 block header, e.g. "the loyal guardian". */
  epithet: string;
  /** A short noun for the animal's central trait, used to thread secondary/tertiary
   *  connection sentences (e.g. Wolf -> "loyalty"). */
  coreNoun: string;
  /** Tier 1 (Speed Run) core: one short paragraph. */
  tier1Core: string;
  /** Tier 2 (Soul Search) core: two paragraphs. */
  tier2Core: [string, string];
  /** The "Drawn to" list (text after the label). */
  drawnTo: string;
  /** The "Watch for" list (text after the label). */
  watchFor: string;
  /** The Kin-and-rivals paragraph for this animal as primary. */
  kinAndRivals: string;
  /** The Tier 3 tease line, shown closing the Soul Search read. */
  tease: string;
}

export const PROFILES: Record<string, ProfileBlock> = {
  wolf: {
    epithet: "the loyal guardian",
    coreNoun: "loyalty",
    tier1Core:
      "You belong to your people and you guard them without being asked. You move deliberately, think in terms of the long game, and hold your ground when it counts. Loyalty is not a soft trait for you, it has teeth. You would rather protect what is yours than chase whatever is new.",
    tier2Core: [
      "You are built around loyalty and the long game. You do not rush. You read the ground, hold your position, and act when the moment is right rather than the moment it arrives. You are guarded with the wider world but fiercely bonded to your own, and that bond is the centre of gravity everything else turns around.",
      "You carry a quiet authority that does not need to announce itself. You will confront what threatens your people, but you pick your fights and you fight them cleanly. You trust structure, earned roles, and people who have proven themselves, and you have little patience for chaos or for those who have not yet earned their place.",
    ],
    drawnTo:
      "loyalty and shared history, roles and structure that hold, protecting the people you have chosen, mastery over novelty, the long steady effort that outlasts the sprint.",
    watchFor:
      "guarding so hard the circle stops growing; reading a threat where there is only difference; how slowly trust rebuilds once it breaks; and mistaking your own caution for wisdom when the ground has actually shifted.",
    kinAndRivals:
      "The raven is the wolf's oldest ally, the old hunting pair, the bird's clever eye leading the wolf's lethal will to the kill. The bear is a fellow guardian of the deep forest, one that stands alone where the wolf runs as a pack, two fierce protectors of their own. The coyote is the wolf's own blood pulling the other way, mischief and misrule against loyalty and gravity, the two faces of the wild dog. And the horse is the wolf's opposite, the creature that belongs to no one set against the one whose whole self is its pack.",
    tease: "There is a third layer to the wolf's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  raven: {
    epithet: "the solitary intellectual",
    coreNoun: "depth",
    tier1Core:
      "You think before you move and make before you ask permission. Your mind runs on ideas, patterns, and craft, and you would rather build something real than be seen building it. You keep your circle small and your attention deep. When something matters, you will say the hard thing out loud.",
    tier2Core: [
      "You are wired for depth over speed. You gather, you turn a thing over, and only then do you act, which makes you deliberate rather than slow. Your intelligence is analytical, but it feeds something creative: you are not here only to understand the world, you are here to make things out of it. Recognition is not the point for you. The work is the point, and you would keep making it whether or not anyone was watching.",
      "You are quieter in a group than the noise around you, but you are not closed. With the few people who earn it, you open all the way. And when a principle is at stake, the private thinker steps forward and speaks plainly, sometimes more bluntly than the room expects.",
    ],
    drawnTo:
      "ideas and systems, craft and making, symbolism and hidden meaning, learning for its own sake, anything that rewards patience and reads poorly at a glance.",
    watchFor:
      "solitude sliding into isolation; thinking so long that the moment to act passes; starting more than you finish because the new keeps pulling; and the quiet sting when work you made privately goes unseen, even though you insist you never wanted the audience.",
    kinAndRivals:
      "The wolf is the raven's oldest ally, the old hunting pair of clever eye and lethal will, the bird leading to the kill and the wolf making it. The coyote is kin and rival at once, the other trickster-creator, close enough to compete, each sure the other is the lesser thief. The hawk is the rival of a different kind, guile against force, the schemer against the striker who takes the straight dive. And the owl is the raven's quiet opposite, the silent watcher against the loud schemer, two dark birds of wisdom who go about it in opposite ways.",
    tease: "There is a third layer to the raven's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  coyote: {
    epithet: "the reckless trickster",
    coreNoun: "restlessness",
    tier1Core:
      "You move fast, improvise, and break the rule before you have finished reading it. You are quick, bold, and hungry for the next thing, and you survive on wit and nerve when the plan falls apart. You would rather leap and adapt than wait and be sure. Boredom is your only real enemy.",
    tier2Core: [
      "You live at high tempo and full improvisation. You act on instinct, trust yourself to figure it out on the way down, and treat most rules as suggestions written by people with less nerve than you. Novelty pulls at you constantly, and you would take a bold wrong turn over a safe standstill almost every time.",
      "You confront rather than defer, and you enjoy the friction. There is real intelligence under the recklessness, the kind that reads a room fast and finds the angle nobody else saw, but it runs without much dignity and without much patience. You break things, including your own plans, and you get away with it more often than you should because you are already three steps down the next road.",
    ],
    drawnTo:
      "the next thing over the last thing, bending or breaking rules, improvising under pressure, bold moves and quick reversals, the thrill of getting away with it.",
    watchFor:
      "leaping so fast you skip the one detail that mattered; mistaking motion for progress; burning goodwill you will want back later; and never sitting still long enough to let anything you started actually finish.",
    kinAndRivals:
      "The hummingbird is the coyote's ally in restlessness, two bright creatures the stories can never sit still, each carrying more fire than its size should hold. The raven is kin and rival at once, the other trickster-creator, close enough to compete, each sure the other is the lesser thief. The fox is the clever cousin and quiet rival, the careful, sly canid against the reckless, bold one, each certain its way is smarter. And the wolf is the coyote's opposite, loyalty and gravity against mischief and misrule, blood kin pulling opposite ways.",
    tease: "There is a third layer to the coyote's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  owl: {
    epithet: "the quiet observer",
    coreNoun: "watchfulness",
    tier1Core:
      "You watch before you speak and understand before you move. You need solitude and quiet the way other people need company, and you see more from the edge of a room than most people see from the middle of it. You keep your own counsel. What looks like stillness in you is usually attention.",
    tier2Core: [
      "You are the watcher. You take life slowly and privately, sitting with a thing in silence until you understand it fully, and you have no urge to broadcast what you find. Crowds and noise drain you quickly; solitude is where you refill and where your clearest thinking happens.",
      "You are guarded, but not cold. You simply choose depth and quiet over reach and volume, and you would rather understand one thing all the way than skim a hundred. You avoid needless conflict and dislike being pushed to perform or to hurry, and people who mistake your quiet for absence tend to underestimate how much you have already seen.",
    ],
    drawnTo:
      "solitude and quiet, watching and understanding, depth over breadth, knowledge held privately, the patience to let a thing reveal itself in full.",
    watchFor:
      "watching so long you never step in; letting quiet harden into withdrawal; keeping insight to yourself when it was needed out loud; and reading the room perfectly while staying just outside it.",
    kinAndRivals:
      "The cat is the owl's fellow night-watcher, silent and self-possessed, awake while the world sleeps and answering to no one. The tortoise is the other patient elder of the bestiary, one watching and one enduring, both keeping counsel the loud creatures never hear. The raven is the owl's quiet opposite, the loud schemer against the silent watcher, two dark birds of wisdom who go about it in opposite ways. And the hawk is the day eye to the owl's night eye, one hunting in speed and the open dive, one in stillness and patience.",
    tease: "There is a third layer to the owl's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  dolphin: {
    epithet: "the warm connector",
    coreNoun: "warmth",
    tier1Core:
      "You move toward people and you lift the room when you arrive. You are warm, quick, and playful, and you read other people's feelings almost before they do. Connection is not a nicety for you, it is the point. Life feels most real to you when it is shared.",
    tier2Core: [
      "You are built for connection and play. You draw energy from people rather than losing it to them, and you have an easy, quick warmth that puts others at ease and pulls a group together. You feel the emotional weather of a room and you tend to it, often without being asked.",
      "You are open by nature, quick to trust and quick to include, and you would rather smooth a conflict than win it. There is real intelligence in how you read people, the kind that senses what someone needs before they say it. Your risk is that you give your warmth so freely and so widely that you forget to keep some for yourself.",
    ],
    drawnTo:
      "people and shared experience, play and lightness, reading and lifting the mood, connection over competition, the joy that only happens with others.",
    watchFor:
      "giving so much warmth outward that little is left over; smoothing conflicts that actually needed to be had; mistaking a full social calendar for a full life; and losing your own signal in everyone else's feelings.",
    kinAndRivals:
      "The elephant is the dolphin's great-hearted kin, the two remembered for grief, rescue, and bonds they refuse to break. The honeybee shares the dolphin's devotion to the many, the pod and the hive, joy and duty in the same warm current. The horse is kin in movement, one in the open sea and one on the open plain, spirits that will not be penned. And the cat is the dolphin's opposite, the open heart against the closed door, one giving its warmth to the whole pod, one granting it to almost no one.",
    tease: "There is a third layer to the dolphin's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  bear: {
    epithet: "the self-reliant force",
    coreNoun: "steadiness",
    tier1Core:
      "You stand on your own and you do not rattle easily. You are slow to rouse and impossible to move once you have settled, and you keep your own company as comfortably as anyone's. People feel safer with you near. When something finally provokes you, it learns quickly that it should not have.",
    tier2Core: [
      "You are a quiet, self-contained force. You do not need much from other people, and you carry a steadiness that makes you the one others lean on without quite noticing they do. You take your time, you keep to your own rhythms, and you are content in your own company in a way that unsettles more restless people.",
      "You are guarded and slow to rouse, but there is real power underneath the calm, and anything that threatens what you care about will meet it. You are not driven by novelty or by an audience. You value your ground, your independence, and the few bonds that matter, and you defend all three without fuss and without warning.",
    ],
    drawnTo:
      "independence and self-reliance, your own ground and your own rhythm, deep rest and quiet strength, a few solid bonds over many loose ones, calm that does not need defending.",
    watchFor:
      "withdrawing so far that even your people cannot reach you; mistaking stubbornness for strength; sitting still past the point where something needed to change; and how much force comes out when you are finally pushed too far.",
    kinAndRivals:
      "The wolf is the bear's fellow guardian of the deep forest, one that runs as a pack where the bear stands alone, two fierce protectors of their own. The tortoise is the other enduring one, slow to rouse and impossible to move, outlasting whatever came for it. The lion is the bear's rival, two crowned powers who expect the ground to yield, the forest's solitary strength against the pride's ruling roar. And the octopus is the bear's opposite, solid ground against shifting water, the immovable force against the creature with no fixed shape at all.",
    tease: "There is a third layer to the bear's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  fox: {
    epithet: "the careful schemer",
    coreNoun: "cunning",
    tier1Core:
      "You get where you are going by wit, not force. You read situations quickly, keep your real intentions to yourself, and slip past trouble other people walk straight into. You trust your own cleverness first. You would rather outthink a problem than fight it.",
    tier2Core: [
      "You solve by cunning. You are quick to see the angle, the shortcut, the thing no one else noticed, and you keep your own counsel while you work it out. You are careful and a little private, trusting your own read over the crowd's, and you prefer to move indirectly rather than meet a thing head on.",
      "There is creativity in how you operate, an inventive, improvising streak that enjoys a clever solution for its own sake. You are not built for open confrontation or for standing in the spotlight; you would rather work at the edges, stay light on your feet, and be gone before anyone realises how you managed it.",
    ],
    drawnTo:
      "clever solutions and shortcuts that hold, reading the angle others miss, working indirectly and independently, wit over force, the quiet satisfaction of outmanoeuvring a problem.",
    watchFor:
      "outsmarting yourself with a plan too clever by half; slipping past a confrontation that actually needed to be met; keeping so much to yourself that no one can help you; and trusting your own read past the point where you should have checked it.",
    kinAndRivals:
      "The cat is the fox's fellow careful survivor, each trusting its own counsel first, slipping trouble by wit rather than force. The octopus is the great escape-artist to the fox's own, one on land and one in the deep, each getting free by becoming something else. The coyote is the clever cousin and quiet rival, the reckless, bold canid against the careful, sly one, each certain its way is smarter. And the hawk is the fox's opposite, the sly against the direct, one winning by misdirection, one by the clean strike.",
    tease: "There is a third layer to the fox's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  lion: {
    epithet: "the natural authority",
    coreNoun: "authority",
    tier1Core:
      "You take charge without asking whether you may. You are confident, direct, and comfortable being seen, and people tend to fall in behind you before they have decided to. You defend your own fiercely and you expect to be reckoned with. Leading feels less like a choice for you than a default.",
    tier2Core: [
      "You carry natural authority. You are confident and direct, you take the front without being handed it, and you are comfortable with the visibility that other people shrink from. You want your competence witnessed, and you have the presence to earn the attention rather than merely demand it.",
      "You are guarded about your own and quick to confront anything that challenges them or you. You do not avoid conflict; you meet it, openly, and you expect to come out on top. Underneath the command there is real loyalty, a protectiveness toward the people under your care, but it comes wrapped in pride, and pride is both the source of your strength and the thing most likely to trip you.",
    ],
    drawnTo:
      "leading and being seen to lead, defending your own, meeting challenges head on, earned respect and visible standing, the confidence that fills a room.",
    watchFor:
      "pride reading every disagreement as a challenge; needing the witness so much you perform instead of act; confusing being followed with being right; and how heavily the front you hold can weigh when no one is allowed to see it slip.",
    kinAndRivals:
      "The hawk is the lion's ally, the two daylight sovereigns of sun and sky, both striking without hesitation, both worn as a king's emblem. The bear is a rival power, two crowned strengths who expect the ground to yield, the pride's roar against the forest's solitary force. The elephant is the other ruler of the plain, the king who takes by force against the matriarch who leads by memory, an old and uneasy standoff. And the cat is the same blood at a smaller scale, one ruling a pride in the open, one ruling alone and answering to nobody, each calling the other a lesser version of itself.",
    tease: "There is a third layer to the lion's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  elephant: {
    epithet: "the steady matriarch",
    coreNoun: "devotion",
    tier1Core:
      "You hold your people together and you do not forget. You are warm, steady, and long-memoried, the one who keeps the group's history and steers it with a calm that rarely needs to raise its voice. You lead by care, not force. What you protect, you protect for life.",
    tier2Core: [
      "You are the steady centre. You are warm and deeply social, but your warmth is anchored rather than restless, poured into a lasting group rather than spread thin across a crowd. You carry the memory of your people, the history and the bonds, and you lead through that long patience more than through any show of force.",
      "You are not driven by novelty or by the spotlight. You are driven by care: for the group, for the young, for the continuity of the thing you belong to. You move deliberately and you grieve deeply, and you will stand immovable in front of what threatens your own. Your strength is not in speed or in dominance but in devotion that does not waver and does not forget.",
    ],
    drawnTo:
      "the people you belong to, memory and continuity, caring for the young and the vulnerable, steady bonds over new thrills, the calm authority of patience.",
    watchFor:
      "carrying the whole group's weight until it flattens you; holding grief and grudges too long because you forget nothing; steadiness curdling into resistance to any change; and putting everyone's needs ahead of your own until yours go unmet.",
    kinAndRivals:
      "The dolphin is the elephant's great-hearted kin, the two remembered for grief, rescue, and bonds they refuse to break. The tortoise is the other ancient world-bearer, patient and vast, the kind of creature myth sets the whole world upon. The honeybee shares the elephant's belonging to something larger than itself, the herd and the hive, devotion lived as a way of being. And the lion is the elephant's rival, the king who takes by force against the matriarch who leads by memory, an old and uneasy standoff.",
    tease: "There is a third layer to the elephant's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  cat: {
    epithet: "the sovereign individualist",
    coreNoun: "independence",
    tier1Core:
      "You answer to yourself and no one else. You are self-possessed, private, and entirely comfortable alone, giving your affection on your own terms and only where you choose. You do not perform for approval. People come to you, and you decide whether they may stay.",
    tier2Core: [
      "You are sovereign. You belong to yourself first, keep your own counsel, and grant your closeness sparingly and deliberately, which makes it mean something when you do. You do not need an audience and you do not chase approval, and there is a quiet cleverness in how completely you have arranged life on your own terms.",
      "You are guarded and self-contained, unbothered by conflict but rarely seeking it, content to withdraw rather than fight for something you can simply leave. You value your independence above almost everything, and you resist being managed, herded, or made to perform. What looks like aloofness is usually just a self that was never for sale.",
    ],
    drawnTo:
      "independence and self-determination, privacy and self-possession, affection on your own terms, quiet cleverness, a life arranged entirely to your own measure.",
    watchFor:
      "guarding your independence so hard you refuse help you actually need; withdrawing instead of working a thing through; letting few enough people in that the door starts to stick; and reading any request as an attempt to manage you.",
    kinAndRivals:
      "The owl is the cat's fellow night-watcher, silent and self-possessed, awake while the world sleeps and answering to no one. The fox is the cat's fellow careful survivor, each trusting its own counsel first, slipping trouble by wit rather than force. The lion is the same blood at a larger scale, one ruling alone and one ruling a pride, each calling the other a lesser version of itself. And the dolphin is the cat's opposite, the closed door against the open heart, one granting its warmth to almost no one, one giving it to the whole pod.",
    tease: "There is a third layer to the cat's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  honeybee: {
    epithet: "the devoted collectivist",
    coreNoun: "sense of belonging",
    tier1Core:
      "You give yourself to something larger than yourself. You are industrious, warm, and loyal to the group above your own standing, and you find real meaning in doing your part well and unseen. You do not need the credit. The health of the whole is the reward.",
    tier2Core: [
      "You live for the collective. You are warm, social, and tirelessly industrious, and you find your place and your peace in belonging to something larger and doing your part in it without fuss. You measure success by the health of the whole rather than by your own standing, and you would rather the group thrive than that you personally shine.",
      "You are not built for the spotlight or for solo glory, and you do not seek out conflict; you keep the peace and keep the work going. Structure, order, and shared purpose steady you. Your devotion is your great strength, but it can also become a place to disappear into, and the risk is that you give so completely to the hive that your own needs stop registering at all.",
    ],
    drawnTo:
      "shared purpose and belonging, doing your part well, order and structure, the health of the whole over personal credit, the quiet dignity of useful work.",
    watchFor:
      "disappearing so far into the group that your own needs vanish; equating your worth with your usefulness; avoiding conflict the collective actually needed; and giving until there is nothing left to give and calling it duty.",
    kinAndRivals:
      "The dolphin shares the honeybee's devotion to the many, the hive and the pod, duty and joy in the same warm current. The elephant is kin in belonging to something larger than itself, the hive and the herd, devotion lived as a way of being. The horse is the honeybee's opposite, the open plain against the ordered hive, a life that answers only to itself against one given wholly to the many. And the octopus is the other opposite, the lone shape-shifter against the ordered swarm, one that needs no one against one that is nothing without its colony.",
    tease: "There is a third layer to the honeybee's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  octopus: {
    epithet: "the shape-shifting problem-solver",
    coreNoun: "inventiveness",
    tier1Core:
      "You solve by changing shape. You are inventive, quick-minded, and independent, happiest with a strange problem and free rein to reshape yourself around it. You do not do things the fixed way. Give you a puzzle and no one watching, and you thrive.",
    tier2Core: [
      "You are a fluid, inventive intelligence. You think fast and laterally, you love a problem with no obvious answer, and you reshape your approach as freely as the creature reshapes its body, fitting yourself to whatever the situation actually needs. You are drawn to novelty and to making, and you would rather invent a new way through than follow an old one.",
      "You are private and independent to the core, working best alone and keeping your own boundaries firmly your own. You are not built for the pack or the crowd; your gift is solitary and strange, the kind of cleverness that surprises people who assumed the obvious approach was the only one. The risk is scattering that brilliance across too many new things at once, and slipping away from others so smoothly that no one ever gets close.",
    ],
    drawnTo:
      "strange problems and novel solutions, reshaping your approach on the fly, working alone and unmanaged, invention for its own sake, the freedom to do it your own way.",
    watchFor:
      "scattering across too many new problems to finish any; slipping away from people so smoothly no one gets close; over-engineering what a plain answer would have solved; and keeping so much boundary that help never reaches you.",
    kinAndRivals:
      "The fox is the octopus's fellow escape-artist, one in the deep and one on land, each getting free by becoming something else. The hummingbird is the octopus's rival in restlessness, two makers who never hold still, one inventing in the deep and one in the air, circling the same bright new edge. The bear is the octopus's opposite, shifting water against solid ground, the creature with no fixed shape against the immovable force. And the honeybee is the other opposite, the lone shape-shifter against the ordered swarm, one that needs no one against one that is nothing without its colony.",
    tease: "There is a third layer to the octopus's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  horse: {
    epithet: "the free spirit",
    coreNoun: "need for freedom",
    tier1Core:
      "You need room to run and you will not be fenced. You are fast, spirited, and allergic to being controlled, and you would trade comfort for freedom almost every time. You go your own way. Anything that pens you in, you eventually break out of.",
    tier2Core: [
      "You are made for freedom and motion. You move fast, live openly, and need room the way other people need security, and any fence, rule, or leash that closes in on you sets off an instinct to run. You are spirited and direct, and you would rather chase the open horizon than settle into anything that holds you in place.",
      "You are open rather than guarded, but that openness is on your own terms, and what you will not tolerate is being controlled or made to submit. You do not seek conflict so much as you refuse a harness. Your freedom is your whole nature and your finest quality, and the same instinct, unchecked, can bolt from good things too, mistaking every commitment for a cage.",
    ],
    drawnTo:
      "open ground and open horizons, freedom and motion, going your own way, spirited independence, the refusal of any harness.",
    watchFor:
      "bolting from good things because they started to feel like a cage; mistaking commitment for capture; running so much you never arrive; and reading every rule as a leash when some were just the ground rules.",
    kinAndRivals:
      "The dolphin is the horse's kin in movement, one on the open plain and one in the open sea, spirits that will not be penned. The hummingbird is the other quicksilver spirit, all speed and lightness, gone before the slower creatures can name them. The wolf is the horse's opposite, the pack-bound against the unbound, the creature whose whole self is its pack against the one that belongs to no one. And the honeybee is the other opposite, the open plain against the ordered hive, a life that answers only to itself against one given wholly to the many.",
    tease: "There is a third layer to the horse's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  tortoise: {
    epithet: "the patient endurer",
    coreNoun: "patience",
    tier1Core:
      "You outlast what tries to rush you. You are calm, steady, and unhurried, moving at your own slow pace and arriving long after the fast ones have burned out. You do not panic and you do not quit. Time is on your side, and you know it.",
    tier2Core: [
      "You endure. You move slowly and deliberately, you keep your own steady pace against every pressure to hurry, and you carry a calm that comes from knowing you will still be going long after the sprinters have stopped. You are guarded and self-sufficient, at home in quiet and routine, and you feel no need to prove anything quickly.",
      "You are not built for novelty, spectacle, or conflict. You value the familiar, the durable, and the slow accumulation of small steady gains, and you meet upheaval by drawing in and waiting it out rather than by fighting. Your patience is a genuine strength, the kind that wins long games other people abandon, but held too rigidly it can turn into a shell that keeps out change you actually needed to let in.",
    ],
    drawnTo:
      "the long game, calm and steady routine, durability over speed, the familiar and the reliable, small gains that compound over time.",
    watchFor:
      "drawing into the shell when the moment asked you to move; mistaking a rut for stability; waiting out a change that needed meeting head on; and letting the slow pace become an excuse never to start.",
    kinAndRivals:
      "The owl is the tortoise's fellow patient elder, one enduring and one watching, both keeping counsel the loud creatures never hear. The bear is the other enduring one, slow to rouse and impossible to move, outlasting whatever came for it. The elephant is the other ancient world-bearer, patient and vast, the kind of creature myth sets the whole world upon. And the hummingbird is the tortoise's opposite, the slowest against the fastest, one measuring life in centuries, one in the beat of a wing, the two ends of time itself.",
    tease: "There is a third layer to the tortoise's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  hawk: {
    epithet: "the decisive striker",
    coreNoun: "decisiveness",
    tier1Core:
      "You see it clearly and you act. You are sharp, fast, and decisive, cutting through noise to the one thing that matters and committing to it without hesitation. You do not dither. When the moment comes, you are already moving.",
    tier2Core: [
      "You are built for the decisive strike. You see far and clearly, you cut through clutter to the essential, and once you have the target you commit fully and fast, without the second-guessing that slows other people down. Your tempo is high and your focus is narrow in the best sense, aimed and sure.",
      "You are more of a watcher than a mixer socially, keeping some height and distance, but you are far from passive; you are simply waiting for the right moment to drop. You will confront and act where others hesitate, and you trust your own read of the situation. The risk in all that decisiveness is striking before the full picture is in, or holding yourself so far above the day-to-day that you miss the things only closeness reveals.",
    ],
    drawnTo:
      "clarity and decisive action, seeing the essential from a height, committing fully once you are sure, sharp focus over broad noise, the clean strike at the right moment.",
    watchFor:
      "striking before the whole picture was in; keeping such height that you miss what only closeness shows; reading fast and committing faster than the facts deserved; and mistaking narrow focus for the full field.",
    kinAndRivals:
      "The lion is the hawk's ally, the two daylight sovereigns of sky and sun, both striking without hesitation, both worn as a king's emblem. The raven is the hawk's rival, guile against force, the schemer against the striker who takes the straight dive. The owl is the hawk's opposite, the day eye against the night eye, one hunting in speed and the open dive, one in stillness and patience. And the fox is the other opposite, the direct against the sly, one winning by the clean strike, one by misdirection.",
    tease: "There is a third layer to the hawk's myth, and a role it plays that only opens up in the Deep Dive.",
  },
  hummingbird: {
    epithet: "the bright spark",
    coreNoun: "intensity",
    tier1Core:
      "You pack an enormous amount of life into a small, fast frame. You are vivid, quick, and restless, delighting in the new and finding intensity in things other people rush past. You burn bright. Standing still is the one thing you cannot do for long.",
    tier2Core: [
      "You are intensity in miniature. You move fast, feel brightly, and chase the new with a restless joy, packing more energy and colour into a moment than seems possible for your size. You are drawn to novelty and to beauty, and you would rather taste everything vivid than settle deep into any one thing.",
      "You are quick and expressive, more spark than anchor, and you bring light wherever you land, though rarely for long before the next bright thing pulls you on. There is real creative fire in you and a genuine gift for delight. The risk is the flip side of the speed: burning through your energy in bright bursts, flitting off before things finish, and mistaking constant motion for a life fully lived.",
    ],
    drawnTo:
      "the new and the vivid, beauty and intensity, quick bright bursts of energy, delight in small things, colour and motion over stillness.",
    watchFor:
      "flitting off before anything finishes; burning bright and then burning out; mistaking constant motion for depth; and skimming so many vivid things that none of them lands.",
    kinAndRivals:
      "The coyote is the hummingbird's ally in restlessness, two bright creatures the stories can never sit still, each carrying more fire than its size should hold. The horse is the other quicksilver spirit, all speed and lightness, gone before the slower creatures can name them. The octopus is the hummingbird's rival in restlessness, two makers who never hold still, one in the air and one in the deep, circling the same bright new edge. And the tortoise is the hummingbird's opposite, the fastest against the slowest, one measuring life in the beat of a wing, one in centuries, the two ends of time itself.",
    tease: "There is a third layer to the hummingbird's myth, and a role it plays that only opens up in the Deep Dive.",
  },
};
