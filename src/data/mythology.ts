// Mythology layer (spirit-animal-profiles-and-mythology-v1.1, §4/§7 + the mythology
// reconciliation patch). Static lookup by the PRIMARY matched animal id. Display-only.
// Level 1 (one evocative line, no native names) shows at the Speed Run; Level 2 (a
// cross-cultural paragraph with native names) at Soul Search, followed by the optional
// "The older myth" beat where present. Level 3 and the rare animals are the Deep
// Dive's, written later.
//
// Keyed to the 16 common animal ids in data/archetypes.ts.

export interface MythEntry {
  l1: string;
  l2: string;
  /**
   * "The older myth" beat (Tier 2+): the symbol the user knows on top, the older or
   * darker story underneath, framed as a gift not a correction. Present on 13 animals;
   * omitted by design where the older story would deflate the personality read
   * (Dolphin, Elephant, Horse).
   */
  olderMyth?: string;
}

// §7 disclaimer: shown wherever native names appear (L2, the older-myth beat, and up).
// L1 carries no native names, so the Speed Run takes no disclaimer.
export const MYTHOLOGY_NATIVE_NAME_DISCLAIMER =
  "Spelling and transliteration of these names vary across sources and dialects.";

export const MYTHOLOGY: Record<string, MythEntry> = {
  wolf: {
    l1: "The wolf is myth's loyal shadow and feared hunter at once, guardian and outlaw, the beast at the edge of the firelight that is both kin to the dog and the wild the village fears.",
    l2: `To Rome, a she-wolf (Lupa) suckled the abandoned twins Romulus and Remus and so nursed a city into being, the wolf as fierce mother and founder. To the Norse the wolf wore a darker face: Fenrir, the great bound wolf fated to break loose at the end of days and swallow Odin (Óðinn) whole, teeth set against the gods themselves. Across the northern forests the wolf was read as both pack-loyal and lawless, devoted to its own and dangerous to everyone else. The thread is a fierce belonging: a strength that protects what it loves and turns dangerous to what it does not.`,
    olderMyth: `Under the loyal guardian runs a darker thread. To the Norse the greatest wolf was Fenrir, bound by the gods in fear and fated to break loose at the end of days and swallow Odin whole. The same devotion that protects can also turn, and the myths never forgot it.`,
  },
  raven: {
    l1: "The raven is myth's bright mind in dark feathers: a creator and a trickster, a carrier of thought and prophecy, at home on the border between the living and the dead.",
    l2: `To the Norse, two ravens named Thought and Memory (Huginn and Muninn) flew out over the whole world each day and returned to whisper what they had seen into Odin's ear (Óðinn), so that the god of wisdom was also the raven-god. On the Pacific Northwest coast, Raven (Yéil to the Tlingit) made the world half by design and half by theft, stealing the sun, moon, and stars out of a box and setting them in the sky, shaping creation as much through blundering and appetite as through intent. To the Celts the raven wore the face of the Morrígan (An Mórrígan), a sign of prophecy and death on the battlefield. The thread across all of them is a mind that works by cunning rather than force, comfortable with secrets and with death, carrying knowledge between worlds.`,
    olderMyth: `The clever bird has a colder face. In Irish war-myth the raven was the Morrígan, the phantom queen who settled over the battlefield to mark who would fall. The mind that carries knowledge also carries the news no one wants to hear.`,
  },
  coyote: {
    l1: "The coyote is the great trickster of the Americas, sacred and ridiculous at once, the rule-breaker who creates and destroys by the same restless appetite and teaches the world by getting everything wrong first.",
    l2: `Across the peoples of North America, Coyote is creator, thief, and fool in one body. He steals fire for humankind, scatters the stars by his own impatience, brings death into the world by accident and cannot take it back, and dies and returns again and again, undignified and undeterred. To the Aztecs the trickster wore a related face in Huehuecóyotl (Old Coyote), a god of music, mischief, and dance. Where the wolf carries gravity and the fox careful cunning, Coyote is reckless and improvising, intelligence without dignity, which is exactly why the stories love him.`,
    olderMyth: `The trickster's mischief has a heavy thing buried inside it. In many tellings it is Coyote who, by meddling or by arguing, lets death into the world and then cannot take it back. The one who plays with every rule is also the one who broke the largest.`,
  },
  owl: {
    l1: "The owl is myth's night-seer, wisdom and omen in the same silent wings, a creature that sees in the dark and so is trusted with what the daylight hides, and feared for it too.",
    l2: `To the Greeks the little owl (glaúx) belonged to Athena, goddess of wisdom, and to see one was a sign of her favour, so the owl became the emblem of knowledge itself. Elsewhere the same night-sight read as dread: to the Romans an owl's cry foretold a death, and across many cultures the owl became a messenger from the world of the dead, keeper of secrets no one asked to hear. In Welsh legend Blodeuwedd, a woman made of flowers, was turned into an owl as punishment and condemned to the night. The thread is silent sight: a creature that knows more than it says and belongs to the dark hours when truths come uncovered.`,
    olderMyth: `Wisdom is only half the owl's story. To the Romans its cry from the rooftop foretold a death, and in Welsh myth Blodeuwedd was turned into an owl as a punishment, shunned by every other bird and barred from the day. The knowing eye is also the eye that sees the end coming.`,
  },
  dolphin: {
    l1: "The dolphin is myth's friend from the deep, rescuer and guide, the sea-creature that chooses to help humankind and carries the drowning and the lost safely back to shore.",
    l2: `To the Greeks the dolphin (delphís) was sacred and benevolent. The god Apollo took dolphin form to guide sailors to his temple at Delphi, which took its name from the creature, and when the poet Arion was thrown overboard a dolphin, charmed by his song, carried him to safety on its back. Dionysus turned a crew of hostile pirates into dolphins, so that they might spend their lives helping sailors rather than robbing them. Across the Mediterranean the dolphin was read as a soul-guide and a sign of rescue and good fortune. The thread is chosen kindness: a creature powerful in its own element that turns that power toward saving others.`,
  },
  bear: {
    l1: "The bear is myth's oldest power, mother and monster, a creature so strong and so human in its stance that many peoples treated it as an ancestor and spoke its true name only in whispers.",
    l2: `To the Greeks the bear belonged to Artemis, goddess of the wild, and the nymph Callisto was transformed into a bear and set among the stars as the Great Bear (Arktos), which still turns around the pole. To the Norse the bear's strength was something a warrior could put on: the berserker (berserkr, "bear-shirt") fought in a bear's fury, beyond fear and beyond pain. Across the northern world the bear was honoured and feared as a near-person, hunted with apology and ceremony. The thread is raw, respected power: a strength that sleeps through the long dark and wakes as something you do not want to face unprepared.`,
    olderMyth: `Beneath the calm sleeps a fury. The Norse berserker put on the bear's strength to fight past fear and past pain, past reason itself. The gentlest-seeming power is the one you least want to wake.`,
  },
  fox: {
    l1: "The fox is myth's sly one, clever and quick and never quite to be trusted, a shape-shifter and charmer who wins by wit where stronger creatures win by force.",
    l2: `In Japan the fox (kitsune) is a magical, shape-shifting spirit that grows more tails and more power with age, able to take human form, and serving as both a messenger of the rice god Inari and a seductive trickster who deceives the unwary. In medieval Europe the fox appeared as Reynard, the charming rogue of the fables whose cunning humbled the lion, the wolf, and the bear in turn. Across many traditions the fox is the same figure, small and outmatched and winning anyway through intelligence and misdirection. The thread is cunning as survival: a creature that cannot rely on strength and so relies on being cleverer than everything that would eat it.`,
    olderMyth: `The clever fox was once holy. In Japan it is the messenger of Inari, sacred and protective, and in the same breath a shape-shifter that can deceive, seduce, and possess. The cleverness cuts both ways, toward the divine and away from it.`,
  },
  lion: {
    l1: "The lion is myth's king, the solar beast, courage and sovereignty made flesh, set at the gates of temples and thrones as the guardian nothing dares approach.",
    l2: `In Egypt the lioness Sekhmet (Sekhmet) was the burning eye of the sun god, a warrior goddess of such fury she nearly destroyed humankind and had to be calmed, the lion as raw solar power. In Greece the Nemean lion's hide was impervious to any weapon, and strangling it was the first labour of Heracles, so that the hero wore the beast he could not cut. Across the ancient world the lion stood for kingship, courage, and the sun, carved as a guardian at every threshold that mattered. The thread is sovereign power: a strength so total it is set to guard the sacred and worn by heroes as proof of their own.`,
    olderMyth: `The lion's courage wears an older, stranger face, and it is female. In Egypt the lion was Sekhmet, the burning eye of the sun, a warrior goddess whose rage nearly ended humankind and had to be tricked into stopping. Sovereignty here is not a proud king but a force that has to be calmed.`,
  },
  elephant: {
    l1: "The elephant is myth's wise giant, memory and gentleness in enormous form, a creature so vast and so mindful that whole cosmologies rest the world upon its back.",
    l2: `In Hindu tradition the elephant is holy: Ganesha (Gaṇeśa), the elephant-headed god, is the remover of obstacles and the patron of beginnings, wise, generous, and beloved. The white elephant Airavata (Airāvata) rose from the churning of the cosmic ocean to become the mount of the god Indra and the bearer of storm and rain. Across South and Southeast Asia the elephant carried kings, guarded temples, and stood for wisdom, memory, and dignified strength. The thread is mindful vastness: an enormous power held gently, remembered long, and turned toward guarding and blessing rather than conquest.`,
  },
  cat: {
    l1: "The cat is myth's sacred and self-possessed one, guardian and goddess, a creature worshipped for its grace and its independence and never quite owned by anyone.",
    l2: `In Egypt the cat was holy: the goddess Bastet (Bastet) took the form of a cat, protector of the home, of women, and of the dead, and to harm a cat was a grave crime. The Egyptians read in the cat a guardian's watchfulness and a divine self-possession, and mourned their cats with full ceremony. In Norse myth the goddess Freyja rode in a chariot drawn by great cats, tying the creature to love, magic, and a will of its own. The thread is dignified sovereignty: a creature close to the divine that gives its loyalty on its own terms and bows to no one.`,
    olderMyth: `Long before the cat was the witch's familiar, it was a god. In Egypt it was Bastet, guardian of the home and of the dead, mourned with full ceremony and protected by law. The sinister reading is late and European; the older one is sacred.`,
  },
  honeybee: {
    l1: "The bee is myth's sacred worker and soul-bearer, industry and order made holy, a creature whose hive was read as a model of the ideal society and whose flight carried the souls of the dead.",
    l2: `In Egypt the bee was born from the tears of the sun god Ra as they fell to earth, and the bee became a royal emblem of Lower Egypt. To the Greeks the priestesses of Demeter and of the goddess at Delphi were called Melissae (melissai, "bees"), and the bee stood for order, purity, and the well-run community, its hive a picture of the ideal state. Across many cultures the bee was thought to carry souls between the world of the living and the dead. The thread is sacred belonging: a small creature whose whole meaning is the order it keeps and the greater body it serves.`,
    olderMyth: `The busy worker holds a sacred office. To the Greeks the priestesses of prophecy were called bees, and the oracle at Delphi the Delphic Bee, while across the old world the bee was thought to carry souls between the living and the dead. The hive is not only industry, it is the passage of the spirit.`,
  },
  octopus: {
    l1: "The octopus is myth's shape-shifter of the deep, uncanny and many-armed, a creature of hidden intelligence that hides in plain sight and stands at the edge of the monstrous and the divine.",
    l2: `To the Ainu of Japan the great octopus Akkorokamui (Akkorokamui) was an enormous sea deity, feared for its size and revered for a power to heal. In Hawaiian tradition the god Kanaloa, lord of the deep ocean, was linked with the octopus (heʻe), a creature of the underworld and the far waters. Sailors' tales across the northern seas turned the many-armed deep-dweller into the monstrous kraken that could pull a ship under. The thread is hidden, shifting power: an intelligence from the deep that changes shape, works unseen, and unsettles anyone who tries to fix it in place.`,
    olderMyth: `The clever creature of the deep is older and stranger than it looks. In Hawaiian tradition the octopus is bound up with Kanaloa, god of the far ocean, and in one telling it is the lone survivor of an earlier world that slipped through the crack into this one. Its strangeness is the strangeness of something that does not quite belong here.`,
  },
  horse: {
    l1: "The horse is myth's sacred carrier, the mount of heroes and gods, a creature of such speed and nobility that the sun itself is drawn across the sky by horses.",
    l2: `In Greek myth the winged horse Pegasus (Pḗgasos) sprang from spilled blood and carried the hero Bellerophon where no other creature could go. To the Norse, Odin rode Sleipnir (Sleipnir), the eight-legged horse that could gallop across sky, land, and the road to the dead. To the Celts the horse-goddess Epona (Epona) watched over horses and their riders, honoured widely enough that the Roman cavalry carried her cult across the empire. The thread is the sacred carrier: the mount that lets gods and heroes cross into places, and over borders, they could never reach on foot.`,
  },
  tortoise: {
    l1: "The tortoise is myth's world-bearer and elder, patience and permanence made flesh, the ancient creature so steady that entire worlds are said to rest upon its shell.",
    l2: `In Hindu tradition the god Vishnu took the form of the great tortoise Kurma (Kūrma) to bear a mountain on his back while gods and demons churned the cosmic ocean, the tortoise as the still centre holding creation steady. Across many cosmologies, from South Asia to Native North America, the world itself sits on the back of a world-turtle, sometimes upon turtles all the way down. In China the tortoise was one of the sacred creatures, a symbol of longevity, endurance, and cosmic order. The thread is enduring foundation: a slow, ancient strength patient enough to carry the weight of the world and outlast everything hurrying across it.`,
    olderMyth: `The slow creature carries more than its shell. In Hindu myth the tortoise Kūrma bears a whole mountain on its back so the gods can churn the ocean for its treasures, and in other cosmologies the world itself rests upon a turtle. What looks like mere slowness is the patience that holds everything else up.`,
  },
  hawk: {
    l1: "The hawk is myth's eye of the sky, solar and far-seeing, the keen hunter whose high, clear sight was read as the vision of the gods themselves.",
    l2: `In Egypt the falcon-god Horus (Ḥr), sky and kingship in one, had the sun and moon for his eyes, and every pharaoh ruled as Horus on earth; the sun god Ra was often shown falcon-headed, crowned with the solar disc. Across many cultures the hawk and falcon were read as messengers between earth and sky, and their high hunting sight as a form of divine clarity. To hunt with a hawk was to borrow, for a moment, that far and ruthless vision. The thread is clear, high sight: a creature that sees the whole field from above and strikes the one thing that matters without hesitation. (Myth often blurs hawk and falcon; the app treats them as one solar bird of prey.)`,
    olderMyth: `The far-seeing hunter was once a king and a god. In Egypt the falcon was Horus, sky and kingship in one body, and every pharaoh ruled as Horus on earth. The clear sight is not only focus, it is the gaze of the one who rules the sky.`,
  },
  hummingbird: {
    l1: "The hummingbird is myth's bright paradox, a creature of pure joy and lightness that is also bound up with war and the souls of the fallen, the sun carried in the smallest possible body.",
    l2: `To the Aztecs the hummingbird was sacred to Huitzilopochtli (Huitzilopochtli), the sun-and-war god whose name means "hummingbird of the south," and fallen warriors were said to return to the world as hummingbirds, joy and bloodshed held in one tiny body. Across the Andes and the Caribbean it was a messenger and a sign of renewal, and the Nazca carved a giant hummingbird into the desert floor. Many traditions read its impossible hovering as a spark of life, healing, and good fortune. The thread is intensity in miniature: something small and bright carrying the sun, war, and the returning dead.`,
    olderMyth: `The brightest, lightest bird keeps the fiercest secret. To the Aztecs the hummingbird was Huitzilopochtli, god of the sun and of war, and warriors who fell in battle were said to return to the world in its shimmering body. Joy and bloodshed live in the same small, blazing frame.`,
  },
};
