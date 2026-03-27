// Built-in symptom bank
export const symptoms = [
  // Physical / behavioral rules
  {
    id: 'p1',
    text: "You haven't slept in 48 hours",
    crazyVariations: ["You also haven't showered in 48 hours"],
  },
  {
    id: 'p8',
    text: 'You have an extreme sugar rush',
    crazyVariations: ["You must make a cartoonish sound effect every time you say a verb"],
  },
  {
    id: 'p10',
    text: "You're incredibly hungry",
    crazyVariations: ["You must mention a recipe in your answer"],
  },
  {
    id: 'p11',
    text: 'You are pregnant',
    crazyVariations: ['Your baby is also about to come out right now'],
  },
  {
    id: 'p12',
    text: 'You cannot answer if Psychiatrist is looking at you, only when they look away, you can talk',
    crazyVariations: [],
  },
  {
    id: 'p13',
    text: 'You are germophobic. You love clean things only',
    crazyVariations: ['You must constantly clean your hands and surfaces in front of you'],
  },
  {
    id: 'p14',
    text: 'You can only talk in past tense',
    crazyVariations: ['You are also very old'],
  },

  // Emotional
  {
    id: 'e3',
    text: 'You are happy all the time',
    crazyVariations: ["You must show teeth all throughout the round"],
  },
  {
    id: 'e5',
    text: 'You find everything hilariously funny',
    crazyVariations: ["You must laugh like the person to your left"],
  },
  {
    id: 'e6',
    text: "You're convinced today is your birthday",
    crazyVariations: ["You also think everyone forgot and is secretly planning a surprise"],
  },

  // Behavioral


  {
    id: 'b9',
    text: "You think you're being filmed for a reality show",
    crazyVariations: [],
  },
  {
    id: 'b11',
    text: 'You must touch your hair at least once when you speak',
    crazyVariations: ["You must mention the word shampoo in your answer"],
  },
  {
    id: 'b12',
    text: 'You must not use any word from the question when you answer',
    crazyVariations: ['You also must not use any word longer than 5 letters'],
  },
  {
    id: 'b13',
    text: 'You must not use any words over 5 letters when you answer',
    crazyVariations: ['You must answer the opposite of the truth in your answer'],
  },
  {
    id: 'b14',
    text: 'You must touch your hands together when you speak',
    crazyVariations: ["You also can't look at the person you're speaking to"],
  },
  {
    id: 'b15',
    text: 'You must use the word "yes" somewhere in every answer',
    crazyVariations: ['You also must say "absolutely" at least once'],
  },
  {
    id: 'b16',
    text: 'You must include a number in every answer',
    crazyVariations: ['The number must also be greater than one million'],
  },
  {
    id: 'b17',
    text: "Unless the psychiatrist is looking at you, you refuse to show your teeth",
    crazyVariations: ["You also cover your mouth with your hand when they look at you"],
  },
  {
    id: 'b18',
    text: 'You repeat the last word of every question asked to you before answering',
    crazyVariations: ['You also repeat it three times'],
  },
  {
    id: 'b19',
    text: 'You have really bad memory',
    crazyVariations: ["You must ask \'what was the question again?\' in your answer"],
  },
  {
    id: 'b20',
    text: 'You are super indecisive',
    crazyVariations: [],
  },

  // Group / role-play
  {
    id: 'g1',
    text: 'You are an Instagram/TikTok influencer',
    crazyVariations: ["You must also promote/sponsor a product in your answer"],
  },
  {
    id: 'g3',
    text: 'You are a CEO',
    crazyVariations: [],
  },
  {
    id: 'g5',
    text: "You are in your first year of college",
    crazyVariations: ["You also haven't slept in 3 days because of midterms"],
  },
  {
    id: 'g6',
    text: 'The patients blink rapidly whenever the psychiatrist says the words "you, your"',
    crazyVariations: ['You must also act shocked when they say the words'],
  },
  {
    id: 'g7',
    text: 'You must act like the person directly to your left, mimicking them',
    crazyVariations: ["You must also mimic their body posture"],
  },
  {
    id: 'g8',
    text: 'You must answer like a mother would',
    crazyVariations: ["You are a single mother raising kids alone in the jungle"],
  },
  {
    id: 'g10',
    text: 'Each answer begins with the next letter of the alphabet (A, B, C...)',
    crazyVariations: ['You also have to use at least 3 words starting with that letter'],
  },
  {
    id: 'g11',
    text: 'You act like the person to your right',
    crazyVariations: ["You must also mimic their body posture"],
  },
  {
    id: 'g12',
    text: 'Whoever the psychiatrist is questioning, the patients on both sides get very itchy',
    crazyVariations: ['Your back gets itchy'],
  },
  {
    id: 'g13',
    text: 'You think you are the baby version of the person to your right',
    crazyVariations: ['You also keep asking them to carry you'],
  },
  {
    id: 'g14',
    text: 'You must say the Psychiatrist\'s name as you answer',
    crazyVariations: ['You must mention at least 3 times'],
  },
  {
    id: 'g15',
    text: 'You must mispronounce a word in your answer',
    crazyVariations: ["You must mispronounce the Psychiatrist's name"],
  },

  // Absurd / identity
  {
    id: 'a4',
    text: 'You just came back from the future and are very confused',
    crazyVariations: ["You must also make alien sounds in your answer"],
  },
  {
    id: 'a8',
    text: "You're training for the Olympics",
    crazyVariations: [],
  },
  {
    id: 'a11',
    text: "You just won the lottery",
    crazyVariations: [],
  },
  {
    id: 'a12',
    text: "You think you're invisible",
    crazyVariations: [],
  },
  {
    id: 'a17',
    text: 'You are a ghost',
    crazyVariations: ["You must make a ghost sound in your answer"],
  },
  {
    id: 'a19',
    text: 'You are a princess/prince',
    crazyVariations: ['You must mention the word "peasant" in your answer'],
  },
  {
    id: 'a20',
    text: 'You are a superhero',
    crazyVariations: [],
  },
];

// General crazy extras — can be added on top of any shared condition
export const generalCrazySymptoms = [
  { id: 'c1', text: 'You also just experienced a devastating heartbreak' },
  { id: 'c2', text: "You must also get up at least 5 different times during the game" },
  { id: 'c3', text: 'You also desperately need to use the bathroom' },
  { id: 'c4', text: "You're also extremely competitive about everything" },
  { id: 'c5', text: "You also think you're in a job interview right now" },
  { id: 'c6', text: 'You also just drank 10 cups of coffee' },
  { id: 'c7', text: 'You must also pause for longer than 5 seconds in between your sentences' },
  { id: 'c8', text: "You're also convinced you're in a dream" },
  { id: 'c9', text: "You also think you're the smartest person in the room" },
  { id: 'c10', text: "If room is silent for more than 5 seconds, you must let out a loud noise" },
];

export function getSharedSymptoms() {
  return symptoms;
}

