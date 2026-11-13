/* Drill content for Voca. Lines are "text | tip". Exposes window.DRILLDATA and window.FINDBANK. */
(function () {
  const P = (s) => s.trim().split('\n').map((l) => { const i = l.indexOf(' | '); return [l.slice(0, i).trim(), l.slice(i + 3).trim()]; });
  const D = {};
  D.pairs = { label: 'Sound pairs', items: P(`
ship | Short “i” — lips relaxed, not “sheep”.
sheep | Long “ee” — smile and hold it.
very | Top teeth touch the lower lip: “v”.
west | Round lips for “w”: not “vest”.
think | Tongue tip between teeth for “th”.
this | Voiced “th” — vibrate your tongue.
full | Short “u”.
fool | Long “oo”.
bat | Open “a”.
bet | Mouth half open “e”.
light | Clear “l” at the tongue tip.
right | Curl the tongue for “r”, no contact.
bird | “er” sound with no separate “r”.
world | One syllable: “wurld”.
ship, sheep | Short vs long vowel: ship / sheep.
live, leave | Short “i” vs long “ee”.
sit, seat | Short vs long: sit / seat.
bit, beat | Short vs long: bit / beat.
fill, feel | Short vs long: fill / feel.
full, fool | Short “u” vs long “oo”.
pull, pool | Short “u” vs long “oo”.
book, boot | Short “u” vs long “oo”.
cat, cut | Open “a” vs relaxed “u”.
hat, hut | Open “a” vs relaxed “u”.
bad, bed | “a” vs “e”.
man, men | “a” vs “e”.
pen, pan | “e” vs “a”.
cup, cop | “u” vs open “o”.
luck, lock | “u” vs open “o”.
bus, boss | “u” vs open “o”.
very, berry | “v” teeth on lip vs “b” lips.
vest, best | “v” vs “b”.
vine, wine | “v” vs “w”.
west, vest | “w” rounded lips vs “v”.
worse, verse | “w” vs “v”.
think, sink | “th” tongue out vs “s”.
thank, sank | “th” vs “s”.
three, free | “th” vs “f”.
thing, sing | “th” vs “s”.
bath, bass | Final “th” vs “s”.
then, den | Voiced “th” vs “d”.
they, day | Voiced “th” vs “d”.
light, right | “l” vs “r”.
lake, rake | “l” vs “r”.
glass, grass | “gl” vs “gr”.
long, wrong | “l” vs “r”.
collect, correct | “l” vs “r” inside the word.
chip, ship | “ch” vs “sh”.
cheap, sheep | “ch” vs “sh”.
watch, wash | “ch” vs “sh”.
choose, shoes | “ch” vs “sh”.
jeep, cheap | “j” vs “ch”.
joke, choke | “j” vs “ch”.
back, bag | Final “k” vs “g”.
pick, pig | Final “k” vs “g”.
rice, rise | Final “s” vs “z”.
price, prize | Final “s” vs “z”.
bus, buzz | Final “s” vs “z”.
cap, cab | Final “p” vs “b”.
seat, seed | Final “t” vs “d”.
coat, code | Final “t” vs “d”.
bought, boat | “aw” vs “oh”.
walk, work | “aw” vs “er”.
caught, coat | “aw” vs “oh”.
`) };
  D.tricky = { label: 'Tricky words', items: P(`
comfortable | KUMF-ter-bul — 3 syllables
vegetable | VEJ-tuh-bul
Wednesday | WENZ-day
February | FEB-roo-air-ee
pronunciation | pruh-NUN-see-AY-shun
schedule | SKED-yool
thoroughly | THUR-oh-lee
particularly | per-TIK-yuh-ler-lee
environment | en-VY-run-ment
development | dih-VEL-up-ment
literature | LIT-ruh-chur
mischievous | MIS-chih-vus
beautiful | BYOO-tih-ful
interesting | IN-trest-ing — 3 syllables
different | DIF-rent — 2 syllables
chocolate | CHOK-lit
temperature | TEM-pruh-chur
Wednesday | WENZ-day, the “d” is silent
library | LY-brer-ee — say the first “r”
probably | PROB-ub-lee
business | BIZ-nis
Tuesday | TOOZ-day
clothes | KLOHZ — one syllable
focus | FOH-kus
suggest | suh-JEST
specific | spuh-SIF-ik
vocabulary | voh-KAB-yoo-lair-ee
engineer | en-juh-NEER, stress on the end
photograph | FOH-tuh-graf
photography | fuh-TOG-ruh-fee
comfortable shoes | KUMF-ter-bul SHOOZ
usually | YOO-zhoo-ul-ee
actually | AK-choo-ul-ee
definitely | DEF-uh-nit-lee
especially | ih-SPESH-ul-ee
restaurant | RES-tuh-rant
sandwich | SAN-wich
interview | IN-ter-vyoo
experience | ik-SPEER-ee-ens
opportunity | op-er-TOO-nuh-tee
responsibility | rih-spon-suh-BIL-uh-tee
communication | kuh-myoo-nuh-KAY-shun
information | in-fer-MAY-shun
education | ej-oo-KAY-shun
organization | or-guh-nuh-ZAY-shun
university | yoo-nuh-VER-suh-tee
temperature | TEM-pruh-chur, 3 syllables
exercise | EK-ser-size
decision | dih-SIZH-un
success | suk-SES
accept | ak-SEPT
advice | ad-VYSS (noun)
advise | ad-VYZ (verb)
recipe | RES-uh-pee
salmon | SAM-un — silent “l”
island | EYE-lund — silent “s”
honest | ON-ist — silent “h”
knowledge | NOL-ij — silent “k”
muscle | MUS-ul — silent “c”
receipt | rih-SEET — silent “p”
colonel | KER-nul
queue | KYOO
guarantee | gair-un-TEE
foreign | FOR-in
width | WIDTH, “d” then “th”
months | MUNTHS
sixth | SIKSTH
`) };
  D.sentences = { label: 'Sentences', items: P(`
She sells seashells by the seashore. | Keep “s” and “sh” distinct.
I think the weather is rather nice this Thursday. | Practise “th” (voiced and unvoiced).
Very few people want to work on Wednesday. | v / w contrast.
Could you tell me where the nearest station is? | Rising polite intonation.
I would have gone if I had known about it. | Weak forms: “would’ve”, “had”.
The red lorry rolled round the railway road. | Light vs. dark “r” and “l”.
I’m looking forward to meeting you next week. | Link “forward to” smoothly.
What time does the next train leave? | Stress “time” and “leave”.
Can I have a glass of water, please? | Rising tone at the end.
I usually wake up at seven and have breakfast. | Stress the key words: wake, seven, breakfast.
She’s been learning English for three years. | “been” is weak: /bin/.
Would you like to go for a walk after dinner? | “Would you” links to “wouldja”.
He didn’t tell me that he was leaving early. | Stress “didn’t” and “early”.
I’ve already finished my homework, thank you. | Contract “I’ve”.
It was a long day, but I really enjoyed it. | Pause at the comma.
If I had more time, I would learn another language. | Rising then falling intonation.
Do you know what she said to him yesterday? | Question word order inside the question.
The meeting has been moved to Friday afternoon. | Stress “moved” and “Friday”.
I’m not sure, but I think it’s on the second floor. | Pause after “sure”.
We should leave early to avoid the traffic. | “should” is weak: /shəd/.
Please speak a little more slowly. | Stress “more slowly”.
I’d like a table for two, please. | Contract “I’d”.
Where did you buy that beautiful jacket? | Stress “buy” and “beautiful”.
She works as a nurse in a big hospital. | Weak “as a”.
Thank you for your help, I really appreciate it. | Stress “help” and “appreciate”.
He has lived in London since two thousand twelve. | Say the year in two parts.
I can’t hear you very well, could you repeat that? | “can’t” vs “can” — stress and vowel.
My brother plays football every Saturday morning. | Stress “plays” and “Saturday”.
They’re going to visit their grandparents next month. | “going to” → “gonna” in speech.
I wish I could speak English more fluently. | Link “wish I” smoothly.
The children were playing in the garden all afternoon. | “were” is weak: /wər/.
Excuse me, is there a pharmacy near here? | Rising intonation on the question.
It’s much cheaper to take the bus than a taxi. | Stress “cheaper”, “bus”, “taxi”.
I haven’t seen him since last summer. | Stress “seen” and “summer”.
She asked me to help her with her homework. | Link “asked me” → “askt-me”.
Neither of us knew the answer to the question. | Stress “neither” and “answer”.
He speaks English so well that people think he’s British. | Stress “well” and “British”.
Although it was raining, we decided to go out. | Pause after “raining”.
I’m interested in learning about different cultures. | Stress “interested” and “cultures”.
My phone battery is almost dead, I need to charge it. | Stress “dead” and “charge”.
What would you do if you won a million dollars? | Rising then falling tone.
Please remember to turn off the lights before you leave. | Stress “remember” and “leave”.
She’s the tallest girl in the whole class. | Stress “tallest” and “whole”.
The film starts at half past eight tonight. | “half past” links to “halfpast”.
I used to play the piano when I was a child. | “used to” = /yoost-tə/.
Could you give me a few more minutes, please? | Polite, soft rising tone.
He’s been working very hard on this project lately. | Stress “hard” and “lately”.
We have to finish this before the end of the week. | “have to” = “hafta”.
I’ve never been to Japan, but I’d love to go. | Contrast “never” and “love”.
`) };
  D.twisters = { label: 'Tongue twisters', items: P(`
Red lorry, yellow lorry. | Say it 3× faster each time.
Peter Piper picked a peck of pickled peppers. | Crisp “p” bursts.
How much wood would a woodchuck chuck? | Keep “w” rounded.
Three free throws. | “thr” vs. “fr”.
Unique New York. | “n” and “y” glide.
Toy boat, toy boat, toy boat. | Keep “t” and “b” clean.
Rubber baby buggy bumpers. | Soft “b” lips.
Irish wristwatch, Swiss wristwatch. | “r” and “sw”.
Fresh fried fish. | “fr” and “sh”.
Six slick slimy snakes slid slowly sideways. | Keep “s” clean.
Betty Botter bought some butter. | Short, quick “b” and “t”.
A big black bug bit a big black bear. | “b” bursts.
I scream, you scream, we all scream for ice cream. | Keep “s” and “sk” separate.
Fuzzy Wuzzy was a bear. | “f” vs “w”.
Which witch switched the Swiss wristwatches? | “w”, “sw”, “tch”.
She thrusts three thick thistles through the thin thumb. | Voiceless “th”.
The thirty-three thieves thought that they thrilled the throne. | “th” in many forms.
Eddie edited it. | Short vowels, quick rhythm.
Lesser leather never weathered wetter weather better. | Light “l” and “th”.
Red leather, yellow leather. | “r” vs “l”.
Gray geese in grassy green fields. | Hard “g”.
Can you can a can as a canner can can a can? | Stress changes meaning.
Cheap sheep sleep soundly. | “ch” vs “sh”.
Pad kid poured curd pulled cod. | Clean consonant bursts.
Lucky luck, locket lock. | Short “u” vs “o”.
A proper copper coffee pot. | Rhythm of “p” and “c”.
Near an ear, a nearer ear, a nearly eerie ear. | “n” and “r”.
Seth at Fong’s sells fresh fish. | Voiceless “th” plus “sh”.
Truly rural. | The famous “r-l” blend.
Specific Pacific. | Stress the middle syllable.
`) };
  D.everyday = { label: 'Everyday talk', items: P(`
How’s it going? | Casual greeting: “hows-it-going”.
Nice to meet you. | Link “meet you” → “meechoo”.
Could you say that again? | Polite request to repeat.
Sorry, I didn’t catch that. | Falling tone.
What do you do for a living? | “do you” → “d’you”.
I’m just looking, thanks. | Shop phrase.
Can I get the bill, please? | Restaurant phrase.
Do you have any recommendations? | Stress “recommendations”.
How long does it take to get there? | “long” and “take” stressed.
Is this seat taken? | Rising tone.
I’ll have the same, please. | “I’ll” is soft.
Could I have a receipt, please? | Silent “p” in receipt.
Let me think about it. | Natural filler phrase.
That sounds great to me. | Stress “sounds” and “great”.
I’m running a bit late. | Stress “running” and “late”.
Sorry to keep you waiting. | Link “keep you”.
Do you mind if I sit here? | Rising polite tone.
No worries, take your time. | Relaxed, friendly tone.
I’m afraid I can’t make it. | Soft refusal.
Let’s catch up soon. | Link “catch up”.
What have you been up to? | “have you been” → “v you bin”.
Long time no see! | Excited tone.
Fingers crossed! | Cheerful.
It’s on me this time. | Friendly offer.
Could you give me a hand? | Stress “give” and “hand”.
Just a second, please. | Soft and quick.
I’ll get back to you soon. | “get back” links.
Thanks a lot, you’ve been really helpful. | Stress “lot” and “helpful”.
Sorry, I’m not following. | Polite sign of confusion.
Do you know how to get to the station? | Rising tone.
Is there anything else I can help with? | Customer-service tone.
I’d rather stay home tonight. | Contract “I’d rather”.
That’s not what I meant. | Stress “not” and “meant”.
Make yourself at home. | Warm tone.
It’s a piece of cake. | Idiom: very easy.
I’m so sorry for the confusion. | Stress “sorry” and “confusion”.
Could you turn the volume down? | Polite request.
Congratulations on your new job! | Stress “Congratulations” and “job”.
Good luck with your exam! | Warm and encouraging.
Take care and see you soon. | Friendly goodbye.
`) };
  D.grammar = { label: 'Grammar patterns', items: P(`
I have been studying English for two years. | Present perfect continuous: have been + -ing.
She doesn’t like coffee in the evening. | doesn’t + base verb.
If it rains tomorrow, we will stay at home. | First conditional: if + present, will + base.
If I were you, I would take the job. | Second conditional: if + were, would + base.
He has already finished his homework. | already goes between has and the verb.
They were watching TV when I arrived. | Past continuous + past simple.
I am used to waking up early. | be used to + -ing.
She asked me where I lived. | Reported question — normal word order.
There are many students in the class. | there are + plural noun.
He is taller than his brother. | Comparative: taller than.
This is the most interesting book I have read. | Superlative: the most + adjective.
I’m looking forward to seeing you. | look forward to + -ing.
You should see a doctor. | should + base verb.
We have lived here since 2015. | since + point in time.
She has lived here for ten years. | for + period of time.
I didn’t see him at the party. | didn’t + base verb.
Do you know where the station is? | Question inside a question: normal order.
He can speak three languages. | can + base verb, no -s.
My mother cooks delicious food every day. | He / she / it + verb + s.
The children are playing in the garden. | Plural subject — are.
I have two brothers and three sisters. | Plural nouns after numbers.
She is good at playing the guitar. | good at + -ing.
I’m interested in learning new languages. | interested in + -ing.
We went to the market and bought some vegetables. | Past simple of irregular verbs.
He was born in 1998. | was born — passive.
The window was broken by the storm. | Passive: was + past participle.
I wish I had more time. | wish + past simple.
He told me that he was tired. | Reported speech — tense shifts back.
Neither of them was late. | neither of + singular verb.
Each student has a different book. | each + singular.
I enjoy reading in the evening. | enjoy + -ing.
She decided to move to Canada. | decide + to + base verb.
I’m afraid of flying. | afraid of + -ing.
Please let me know when you arrive. | Present simple after “when”.
He works hard, so he is very successful. | so = result.
Although it was cold, we went swimming. | although + clause.
I have never been to Japan. | have never been to.
How long have you been waiting? | Present perfect continuous question.
Have you finished your work yet? | yet in questions.
I haven’t seen her since Monday. | since + Monday.
She speaks English more fluently than I do. | Adverb comparative: more fluently.
You don’t have to come if you don’t want to. | don’t have to = not necessary.
You mustn’t park here. | mustn’t = forbidden.
He suggested going to the beach. | suggest + -ing.
`) };
  D.confused = { label: 'Confusing words', items: P(`
affect, effect | The rain will affect us; it has an effect on us.
accept, except | I accept the gift, everyone except him.
advice, advise | I need advice; please advise me.
borrow, lend | I borrow from you; you lend to me.
bring, take | Bring it here; take it there.
beside, besides | Beside = next to; besides = also.
between, among | Between two; among many.
break, brake | Break a plate; hit the brake.
check, control | I check the time; I control the car.
cloth, clothes | A cloth to clean; clothes to wear.
fun, funny | A fun day; a funny joke.
hear, listen | I hear a sound; I listen to music.
its, it’s | Its = belongs to it; it’s = it is.
lose, loose | I lose keys; these trousers are loose.
make, do | Make a mistake; do homework.
quiet, quite | Be quiet; it’s quite good.
rob, steal | Rob a bank; steal money.
say, tell | Say hello; tell me the truth.
see, look, watch | See it; look at it; watch a film.
since, for | Since 2019; for five years.
than, then | Taller than; and then we left.
their, there, they’re | Their house; over there; they’re happy.
to, too, two | Go to; too big; two cats.
weather, whether | Nice weather; whether or not.
who’s, whose | Who’s = who is; whose = of whom.
your, you’re | Your bag; you’re right.
wear, where | Wear a hat; where are you?
principal, principle | The school principal; a moral principle.
lie, lay | Lie down; lay it on the table.
rise, raise | The sun rises; raise your hand.
`) };
  D.phrasal = { label: 'Phrasal verbs', items: P(`
turn on the light | start a device or light.
turn off the TV | stop a device.
pick up the phone | lift or answer.
look after the baby | take care of.
look for my keys | search.
give up smoking | stop trying.
find out the truth | discover.
set up a meeting | arrange.
put off the decision | delay.
come across an old photo | find by chance.
get along with my team | have a good relationship.
get up at six | leave your bed.
take off your shoes | remove.
fill in the form | complete.
run out of milk | have none left.
carry on working | continue.
break down on the road | stop working.
call off the trip | cancel.
check in at the hotel | register arrival.
check out at noon | leave and pay.
cut down on sugar | reduce.
figure out the answer | understand.
hang out with friends | spend time.
bring up a child | raise.
make up a story | invent.
point out a mistake | show.
show up on time | arrive.
work out a plan | find a solution.
sort out the problem | fix.
catch up with you later | reach the same point.
`) };
  window.DRILLDATA = D;

  /* "Read 10, then find the mistakes" bank: wrong | right | why */
  const F = `
She don't like coffee. | She doesn't like coffee. | With he / she / it use doesn't.
He go to school every day. | He goes to school every day. | Add -s / -es after he / she / it.
They was very tired after the trip. | They were very tired after the trip. | Plural subject — were.
I am agree with you. | I agree with you. | “Agree” is a verb; no “am”.
She can sings very well. | She can sing very well. | After can use the base verb.
I didn't went to the party. | I didn't go to the party. | After didn't use the base verb.
He is more taller than me. | He is taller than me. | Never “more” with a -er word.
I have two brother. | I have two brothers. | Plural noun after a number.
There is many people here. | There are many people here. | many + plural → are.
She is interesting in music. | She is interested in music. | A person is interested; a thing is interesting.
I am boring in this class. | I am bored in this class. | Feelings take -ed.
We goed to the market. | We went to the market. | go → went (irregular).
He buyed a new phone. | He bought a new phone. | buy → bought.
I seen him yesterday. | I saw him yesterday. | Past simple: saw.
She have a nice car. | She has a nice car. | have → has after she.
Yesterday I go to the park. | Yesterday I went to the park. | Yesterday needs past tense.
I am living here since 2019. | I have lived here since 2019. | since → present perfect.
He explained me the problem. | He explained the problem to me. | explain + to someone.
I look forward to see you. | I look forward to seeing you. | look forward to + -ing.
She suggested to go out. | She suggested going out. | suggest + -ing.
Me and him are friends. | He and I are friends. | Subject pronouns: he and I.
This is me book. | This is my book. | my before a noun.
I like she. | I like her. | Object pronoun: her.
Their going to be late. | They're going to be late. | they're = they are.
Your welcome! | You're welcome! | you're = you are.
Its a nice day. | It's a nice day. | it's = it is.
I want to see a apple. | I want to see an apple. | an before a vowel sound.
He is a engineer. | He is an engineer. | an before a vowel sound.
She is very good in English. | She is very good at English. | good at.
I am afraid from dogs. | I am afraid of dogs. | afraid of.
He is married with a doctor. | He is married to a doctor. | married to.
I arrived to the airport at six. | I arrived at the airport at six. | arrive at / in.
We discussed about the plan. | We discussed the plan. | discuss has no preposition.
She told to me the truth. | She told me the truth. | tell someone, not “tell to”.
I have a meeting in Monday. | I have a meeting on Monday. | on + day.
The class starts in 9 am. | The class starts at 9 am. | at + clock time.
He works hardly every day. | He works hard every day. | hard is both adjective and adverb.
She speaks English very good. | She speaks English very well. | Adverb: well.
He drives very careful. | He drives very carefully. | Adverb: carefully.
I don't have no money. | I don't have any money. | Avoid double negatives.
Do you know where is the station? | Do you know where the station is? | Normal order in indirect questions.
What time does the shop opens? | What time does the shop open? | After does use the base verb.
He doesn't knows the answer. | He doesn't know the answer. | After doesn't use the base verb.
She didn't saw me. | She didn't see me. | After didn't use the base verb.
Did you went there? | Did you go there? | After did use the base verb.
I will to call you. | I will call you. | will + base verb, no “to”.
He must to go now. | He must go now. | must + base verb.
We should to leave early. | We should leave early. | should + base verb.
I enjoy to read books. | I enjoy reading books. | enjoy + -ing.
She is good in cooking. | She is good at cooking. | good at + -ing.
I have been to Paris last year. | I went to Paris last year. | Past time → past simple.
He has gone to school yesterday. | He went to school yesterday. | Past time → past simple.
We are knowing each other for years. | We have known each other for years. | know is not used in continuous.
I am having a car. | I have a car. | have (possession) isn't continuous.
He said me that he was late. | He told me that he was late. | tell + person; say + that.
She asked me what time is it. | She asked me what time it was. | Reported question order.
If I will see him, I will tell him. | If I see him, I will tell him. | After if use present simple.
If I would have money, I would buy it. | If I had money, I would buy it. | Second conditional: if + past.
I wish I have more time. | I wish I had more time. | wish + past simple.
He is the taller in the class. | He is the tallest in the class. | Superlative: tallest.
She is more smart than him. | She is smarter than him. | Short adjective: smarter.
It is the most easy way. | It is the easiest way. | Short adjective: easiest.
The informations are useful. | The information is useful. | information is uncountable.
I need some advices. | I need some advice. | advice is uncountable.
She gave me many homeworks. | She gave me a lot of homework. | homework is uncountable.
He has much friends. | He has many friends. | many + countable noun.
I have few time. | I have little time. | little + uncountable.
Everybody are happy. | Everybody is happy. | everybody + singular verb.
Each of the students have a book. | Each of the students has a book. | each + singular verb.
The news are bad. | The news is bad. | news is singular.
My friends house is big. | My friend's house is big. | Possessive 's.
The childrens are playing. | The children are playing. | Irregular plural: children.
He have two childs. | He has two children. | Irregular plural: children.
I am agree to go. | I agree to go. | “Agree” is a verb; no “am”.
She is student. | She is a student. | Use “a” before a singular noun.
I go to home. | I go home. | home needs no “to”.
He is in home. | He is at home. | at home.
I am live in Delhi. | I live in Delhi. | Don't add “am” before a verb.
She is work as a nurse. | She works as a nurse. | Don't add “is” before a verb.
They is my friends. | They are my friends. | they + are.
We is ready. | We are ready. | we + are.
You was right. | You were right. | you + were.
I were late. | I was late. | I + was.
He don't know. | He doesn't know. | he + doesn't.
It don't work. | It doesn't work. | it + doesn't.
I has a pen. | I have a pen. | I + have.
We has a plan. | We have a plan. | we + have.
He have finished. | He has finished. | he + has.
Who did you met yesterday? | Who did you meet yesterday? | After did use the base verb.
How much people came? | How many people came? | many + countable.
I'm tired, so I am go to bed. | I'm tired, so I am going to bed. | am + -ing for the future plan.
Please give me a informations. | Please give me some information. | Uncountable noun.
He asked me to helped him. | He asked me to help him. | to + base verb.
I want that you come. | I want you to come. | want + object + to.
She made me to laugh. | She made me laugh. | make + object + base verb.
Let me to go. | Let me go. | let + object + base verb.
I'm waiting since one hour. | I've been waiting for one hour. | for + period; perfect tense.
He is knowing the answer. | He knows the answer. | know is not continuous.
We discussed about it. | We discussed it. | discuss has no preposition.
He entered into the room. | He entered the room. | enter has no preposition.
She reached to the office. | She reached the office. | reach has no preposition.
`;
  window.FINDBANK = F.trim().split('\n').map((l) => l.split(' | ')).filter((a) => a.length === 3);
})();
