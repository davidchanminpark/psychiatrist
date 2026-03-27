// Built-in symptom bank
export const symptoms = [
  // Physical
  { id: 'p1', text: 'You haven\'t slept in 48 hours', category: 'physical' },
  { id: 'p2', text: 'You have an unbearable itch you can\'t scratch', category: 'physical' },
  { id: 'p3', text: 'You\'re extremely cold and can\'t warm up', category: 'physical' },
  { id: 'p4', text: 'You have hiccups that won\'t stop', category: 'physical' },
  { id: 'p5', text: 'You\'re convinced you\'re shrinking', category: 'physical' },
  { id: 'p6', text: 'You can only whisper', category: 'physical' },
  { id: 'p7', text: 'You feel like you\'re floating', category: 'physical' },
  { id: 'p8', text: 'You have an extreme sugar rush', category: 'physical' },
  { id: 'p9', text: 'Your hands won\'t stop shaking', category: 'physical' },
  { id: 'p10', text: 'You\'re incredibly hungry but disgusted by all food', category: 'physical' },

  // Emotional
  { id: 'e1', text: 'You\'re madly in love with the person to your left', category: 'emotional' },
  { id: 'e2', text: 'You\'re terrified of the color blue', category: 'emotional' },
  { id: 'e3', text: 'Everything makes you cry with happiness', category: 'emotional' },
  { id: 'e4', text: 'You\'re extremely jealous of everyone\'s shoes', category: 'emotional' },
  { id: 'e5', text: 'You find everything hilariously funny', category: 'emotional' },
  { id: 'e6', text: 'You\'re convinced today is your birthday', category: 'emotional' },
  { id: 'e7', text: 'You\'re paranoid that someone stole your wallet', category: 'emotional' },
  { id: 'e8', text: 'You miss your pet goldfish who ran away', category: 'emotional' },
  { id: 'e9', text: 'You\'re furious about something but can\'t remember what', category: 'emotional' },
  { id: 'e10', text: 'You have an overwhelming urge to hug everyone', category: 'emotional' },

  // Behavioral
  { id: 'b1', text: 'You must end every sentence with "and that\'s the truth"', category: 'behavioral' },
  { id: 'b2', text: 'You can\'t stop complimenting people', category: 'behavioral' },
  { id: 'b3', text: 'You think you\'re a secret agent on a mission', category: 'behavioral' },
  { id: 'b4', text: 'You respond to everything with a movie quote', category: 'behavioral' },
  { id: 'b5', text: 'You believe you\'re royalty and everyone should bow', category: 'behavioral' },
  { id: 'b6', text: 'You can only communicate through song', category: 'behavioral' },
  { id: 'b7', text: 'You think everyone is your long-lost relative', category: 'behavioral' },
  { id: 'b8', text: 'You must count everything you see out loud', category: 'behavioral' },
  { id: 'b9', text: 'You think you\'re being filmed for a reality show', category: 'behavioral' },
  { id: 'b10', text: 'You agree enthusiastically with absolutely everything', category: 'behavioral' },

  // Absurd
  { id: 'a1', text: 'You\'re convinced you\'re actually a cat', category: 'absurd' },
  { id: 'a2', text: 'You believe gravity might turn off any second', category: 'absurd' },
  { id: 'a3', text: 'You think everyone\'s name is actually Steve', category: 'absurd' },
  { id: 'a4', text: 'You just came back from the future and are very confused', category: 'absurd' },
  { id: 'a5', text: 'You\'re allergic to consonants', category: 'absurd' },
  { id: 'a6', text: 'You believe you can read minds (but you\'re always wrong)', category: 'absurd' },
  { id: 'a7', text: 'You think chairs are alive and have feelings', category: 'absurd' },
  { id: 'a8', text: 'You\'re training for the Olympics in an imaginary sport', category: 'absurd' },
  { id: 'a9', text: 'You\'re convinced the moon is following you', category: 'absurd' },
  { id: 'a10', text: 'You speak fluent dolphin and occasionally translate', category: 'absurd' },

  // More absurd / fun
  { id: 'a11', text: 'You just won the lottery and can\'t contain yourself', category: 'absurd' },
  { id: 'a12', text: 'You think you\'re invisible', category: 'absurd' },
  { id: 'a13', text: 'You\'re a time traveler from the 1800s amazed by technology', category: 'absurd' },
  { id: 'a14', text: 'You\'re on a first date and trying way too hard to impress', category: 'absurd' },
  { id: 'a15', text: 'You think everything is a conspiracy', category: 'absurd' },

  // Extra crazy patient symptoms (used as the "extra" condition)
  { id: 'c1', text: 'You also just experienced a devastating heartbreak', category: 'crazy' },
  { id: 'c2', text: 'You also believe you\'re being haunted by a friendly ghost', category: 'crazy' },
  { id: 'c3', text: 'You also desperately need to use the bathroom', category: 'crazy' },
  { id: 'c4', text: 'You\'re also extremely competitive about everything', category: 'crazy' },
  { id: 'c5', text: 'You also think you\'re in a job interview right now', category: 'crazy' },
  { id: 'c6', text: 'You also just drank 10 cups of coffee', category: 'crazy' },
  { id: 'c7', text: 'You\'re also trying to sell everyone insurance', category: 'crazy' },
  { id: 'c8', text: 'You also have a terrible secret you almost keep blurting out', category: 'crazy' },
  { id: 'c9', text: 'You\'re also convinced you\'re in a dream', category: 'crazy' },
  { id: 'c10', text: 'You also think you\'re the smartest person in the room', category: 'crazy' },
];

export function getSharedSymptoms() {
  return symptoms.filter(s => s.category !== 'crazy');
}

export function getCrazySymptoms() {
  return symptoms.filter(s => s.category === 'crazy');
}
