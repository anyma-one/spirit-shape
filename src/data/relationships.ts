// Relationship layer (spirit-animal-profiles-and-mythology-v1, §3/§5/§6). The
// symmetric relationship graph, the one-line secondary flavour per animal (used when
// an animal colours someone else's result), and the relational beat per pair (used
// both directions). Content only; no engine effect. Keyed to the 16 common animal ids.

export type RelType = "ally" | "rival" | "opposite";

export interface Relations {
  allies: string[];
  rivals: string[];
  opposites: string[];
}

// §3 relationship graph. Symmetric and verified: every A->B connection has the
// matching B->A of the same type. Every animal has exactly four connections.
export const GRAPH: Record<string, Relations> = {
  wolf: { allies: ["raven", "bear"], rivals: [], opposites: ["coyote", "horse"] },
  raven: { allies: ["wolf"], rivals: ["coyote", "hawk"], opposites: ["owl"] },
  coyote: { allies: ["hummingbird"], rivals: ["raven", "fox"], opposites: ["wolf"] },
  owl: { allies: ["cat", "tortoise"], rivals: [], opposites: ["raven", "hawk"] },
  dolphin: { allies: ["elephant", "honeybee", "horse"], rivals: [], opposites: ["cat"] },
  bear: { allies: ["wolf", "tortoise"], rivals: ["lion"], opposites: ["octopus"] },
  fox: { allies: ["cat", "octopus"], rivals: ["coyote"], opposites: ["hawk"] },
  lion: { allies: ["hawk"], rivals: ["bear", "elephant", "cat"], opposites: [] },
  elephant: { allies: ["dolphin", "tortoise", "honeybee"], rivals: ["lion"], opposites: [] },
  cat: { allies: ["owl", "fox"], rivals: ["lion"], opposites: ["dolphin"] },
  honeybee: { allies: ["dolphin", "elephant"], rivals: [], opposites: ["horse", "octopus"] },
  octopus: { allies: ["fox"], rivals: ["hummingbird"], opposites: ["bear", "honeybee"] },
  horse: { allies: ["dolphin", "hummingbird"], rivals: [], opposites: ["wolf", "honeybee"] },
  tortoise: { allies: ["owl", "bear", "elephant"], rivals: [], opposites: ["hummingbird"] },
  hawk: { allies: ["lion"], rivals: ["raven"], opposites: ["owl", "fox"] },
  // §3 lists Hummingbird with only three connections, but Octopus lists Hummingbird
  // as a rival, the §6 beats include the Octopus+Hummingbird rival, and Hummingbird's
  // own kin-and-rivals prose names Octopus — so the graph carries it for symmetry.
  hummingbird: { allies: ["coyote", "horse"], rivals: ["octopus"], opposites: ["tortoise"] },
};

// §5 secondary flavour: one descriptor per animal, used when it is someone else's
// secondary or tertiary. The assembly wraps it in the connection frame.
export const SECONDARY_FLAVOUR: Record<string, string> = {
  wolf: "a loyal, guarded self-reliance that stands for its own",
  raven: "a solitary, analytical maker's depth, craft over being seen",
  coyote: "a reckless, improvising spark, quick to leap and bend the rule",
  owl: "a still, watchful remove, the need to understand in silence first",
  dolphin: "a warm, connective pull toward people and play",
  bear: "a grounded, self-reliant force, slow to rouse and immovable once roused",
  fox: "a careful, sly cleverness that solves by wit and misdirection",
  lion: "a commanding, visible authority, the will to lead and be seen leading",
  elephant: "a steady, devoted warmth, long memory and care for the group",
  cat: "a sovereign aloofness, self-possession that answers to no one",
  honeybee: "a selfless devotion to the group, duty carried without needing credit",
  octopus: "a fluid, inventive cleverness that reshapes itself to fit any problem",
  horse: "a restless need for freedom, motion and open ground over any fence",
  tortoise: "a patient, enduring calm, the long game played unhurried",
  hawk: "a decisive, striking focus, clarity that acts without hesitation",
  hummingbird: "a bright, restless intensity, joy and fire in small fast bursts",
};

export interface Beat {
  type: RelType;
  text: string;
}

/** Order-independent key for a pair of animal ids. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

// §6 relational beats: one line per connected pair, used both directions. There is
// exactly one beat per graph edge (32 in total).
export const BEATS: Record<string, Beat> = {
  // Allies
  [pairKey("wolf", "raven")]: { type: "ally", text: "the old hunting pair, the bird leading to the kill and the wolf making it, each feeding the other." },
  [pairKey("wolf", "bear")]: { type: "ally", text: "two guardians of the deep forest, one that moves as a pack and one that stands alone, both fierce for their own." },
  [pairKey("coyote", "hummingbird")]: { type: "ally", text: "two bright, restless creatures the stories can never sit still, each carrying more fire than its size should hold." },
  [pairKey("owl", "cat")]: { type: "ally", text: "the two night-watchers, silent and self-possessed, awake while the world sleeps and answering to no one." },
  [pairKey("owl", "tortoise")]: { type: "ally", text: "the patient elders of the bestiary, one watching and one enduring, both keeping counsel the loud creatures never hear." },
  [pairKey("dolphin", "elephant")]: { type: "ally", text: "the great-hearted ones of sea and land, remembered for grief, rescue, and bonds they refuse to break." },
  [pairKey("dolphin", "honeybee")]: { type: "ally", text: "both live for the many rather than the one, the pod and the hive, joy and duty in the same warm current." },
  [pairKey("dolphin", "horse")]: { type: "ally", text: "kin of movement, the horse on the open plain and the dolphin in the open sea, spirits that will not be penned." },
  [pairKey("bear", "tortoise")]: { type: "ally", text: "the two enduring ones, slow to rouse and impossible to move, outlasting whatever came for them." },
  [pairKey("fox", "cat")]: { type: "ally", text: "two careful survivors who trust their own counsel first, slipping trouble by wit rather than force." },
  [pairKey("fox", "octopus")]: { type: "ally", text: "the great escape-artists, one on land and one in the deep, each getting free by becoming something else." },
  [pairKey("lion", "hawk")]: { type: "ally", text: "the two daylight sovereigns, sun and sky, both striking without hesitation, both worn as a king's emblem." },
  [pairKey("elephant", "tortoise")]: { type: "ally", text: "the ancient world-bearers, patient and vast, the kind of creatures myth sets the whole world upon." },
  [pairKey("elephant", "honeybee")]: { type: "ally", text: "both belong to something larger than themselves, the herd and the hive, devotion lived as a way of being." },
  [pairKey("horse", "hummingbird")]: { type: "ally", text: "the two quicksilver spirits, all speed and lightness, gone before the slower creatures can name them." },
  // Rivals
  [pairKey("raven", "coyote")]: { type: "rival", text: "the two trickster-creators, kin enough to compete, each sure the other is the lesser thief." },
  [pairKey("raven", "hawk")]: { type: "rival", text: "guile against force, the schemer and the striker, one taking the crooked path and one the straight dive." },
  [pairKey("coyote", "fox")]: { type: "rival", text: "the clever canids, close cousins and quiet rivals, one bold and reckless, one careful and sly, each certain its way is smarter." },
  [pairKey("bear", "lion")]: { type: "rival", text: "two crowned powers who expect the ground to yield, the forest's solitary strength against the pride's ruling roar." },
  [pairKey("lion", "elephant")]: { type: "rival", text: "the rulers of the plain, the king who takes by force and the matriarch who leads by memory, an old and uneasy standoff." },
  [pairKey("lion", "cat")]: { type: "rival", text: "the same blood at different scales, one ruling a pride in the open, one ruling alone and answering to nobody, each calling the other a lesser version of itself." },
  [pairKey("octopus", "hummingbird")]: { type: "rival", text: "two restless makers who never hold still, one inventing in the deep and one in the air, circling the same bright new edge." },
  // Opposites
  [pairKey("wolf", "coyote")]: { type: "opposite", text: "the two faces of the wild dog, one carrying loyalty and gravity, the other mischief and misrule, blood kin pulling opposite ways." },
  [pairKey("wolf", "horse")]: { type: "opposite", text: "the bound and the unbound, the wolf that belongs to its pack against the horse that belongs to no one." },
  [pairKey("raven", "owl")]: { type: "opposite", text: "the loud schemer and the silent watcher, two dark birds of wisdom who go about it in opposite ways." },
  [pairKey("owl", "hawk")]: { type: "opposite", text: "the night eye and the day eye, one hunting in stillness and patience, one in speed and the open dive." },
  [pairKey("dolphin", "cat")]: { type: "opposite", text: "the open heart and the closed door, one giving its warmth to the whole pod, one granting it to almost no one." },
  [pairKey("bear", "octopus")]: { type: "opposite", text: "solid ground against shifting water, the immovable force and the creature with no fixed shape at all." },
  [pairKey("fox", "hawk")]: { type: "opposite", text: "the sly and the direct, one winning by misdirection, one by the clean strike." },
  [pairKey("honeybee", "horse")]: { type: "opposite", text: "the hive against the open plain, a life given wholly to the many against a life that answers only to itself." },
  [pairKey("honeybee", "octopus")]: { type: "opposite", text: "the ordered swarm and the lone shape-shifter, one that is nothing without its colony, one that needs no one at all." },
  [pairKey("tortoise", "hummingbird")]: { type: "opposite", text: "the slowest and the fastest, one measuring life in centuries, one in the beat of a wing, the two ends of time itself." },
};

/** The relational beat for a pair, or null if the two are not connected in the graph. */
export function beatFor(a: string, b: string): Beat | null {
  return BEATS[pairKey(a, b)] ?? null;
}
