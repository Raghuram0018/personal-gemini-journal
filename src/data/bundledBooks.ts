import { Book, BookChapter } from '../types';

export interface BundledBookData {
  id: string;
  title: string;
  authors: string[];
  description: string;
  coverUrl: string;
  categories: string[];
  publisher: string;
  publishedDate: string;
  publicDomain: boolean;
  pageCount: number;
  chapters: BookChapter[];
}

export const BUNDLED_BOOKS: BundledBookData[] = [
  {
    id: 'alice-in-wonderland',
    title: "Alice's Adventures in Wonderland",
    authors: ['Lewis Carroll'],
    description: "A whimsical tale of young Alice who falls down a rabbit hole into a subterranean fantasy world populated by peculiar, anthropomorphic creatures.",
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800',
    categories: ['Classic Literature', 'Fantasy', 'Children'],
    publisher: 'Macmillan & Co.',
    publishedDate: '1865',
    publicDomain: true,
    pageCount: 192,
    chapters: [
      {
        id: 'alice-ch-1',
        number: 1,
        title: 'Chapter I: Down the Rabbit-Hole',
        content: `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversations?'

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so VERY remarkable in that; nor did Alice think it so VERY much out of the way to hear the Rabbit say to itself, 'Oh dear! Oh dear! I shall be late!' (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually TOOK A WATCH OUT OF ITS WASTECOAT-POCKET, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.

In another moment down went Alice after it, never once considering how in the world she was to get out again.

The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.

Either the well was very deep, or she fell very slowly, for she had plenty of time as she went down to look about her and to wonder what was going to happen next. First, she tried to look down and make out what she was coming to, but it was too dark to see anything; then she looked at the sides of the well, and noticed that they were filled with cupboards and book-shelves; here and there she saw maps and pictures hung upon pegs. She took down a jar from one of the shelves as she passed; it was labelled 'ORANGE MARMALADE', but to her great disappointment it was empty: she did not like to drop the jar for fear of killing somebody, so managed to put it into one of the cupboards as she fell past it.

'Well!' thought Alice to herself, 'after such a fall as this, I shall think nothing of tumbling down stairs! How brave they'll all think me at home! Why, I wouldn't say anything about it, even if I fell off the top of the house!' (Which was very likely true.)`
      },
      {
        id: 'alice-ch-2',
        number: 2,
        title: 'Chapter II: The Pool of Tears',
        content: `'Curiouser and curiouser!' cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English); 'now I'm opening out like the largest telescope that ever was! Good-bye, feet!' (for when she looked down at her feet, they seemed to be almost out of sight, they were getting so far off). 'Oh, my poor little feet, I wonder who will put on your shoes and stockings for you now, dears? I'm sure I shan't be able! I shall be a great deal too far off to trouble myself about you: you must manage the best way you can;—but I must be kind to them,' thought Alice, 'or perhaps they won't walk the way I want to go! Let me see: I'll give them a new pair of boots every Christmas.'

And she went on planning to herself how she would manage it. 'They must go by the carrier,' she thought; 'and how funny it'll seem, sending presents to one's own feet! And how odd the directions will look!

Alice's Right Foot, Esq.
Hearthrug,
near the Fender,
(with Alice's love).'

Oh dear, what nonsense I'm talking!

Just then her head struck against the roof of the hall: in fact she was now more than nine feet high, and she at once took up the little golden key and hurried off to the garden door.`
      },
      {
        id: 'alice-ch-3',
        number: 3,
        title: 'Chapter III: A Caucus-Race and a Long Tale',
        content: `They were indeed a queer-looking party that assembled on the bank—the birds with draggled feathers, the animals with their fur clinging close to them, and all dripping wet, cross, and uncomfortable.

The first question of course was, how to get dry again: they had a consultation about this, and after a few minutes it seemed quite natural to Alice to find herself talking familiarly with them, as if she had known them all her life. Indeed, she had quite a long argument with the Lory, who at last turned sulky, and would only say, 'I am older than you, and must know better'; and this Alice would not admit without knowing how old it was, and as the Lory positively refused to tell its age, there was no more to be said.

At last the Mouse, who seemed to be a person of some authority among them, called out, 'Sit down, all of you, and listen to me! I'll soon make you dry enough!' They all sat down at once, in a large ring, with the Mouse in the middle. Alice kept her eyes anxiously fixed on it, for she felt sure she would catch a bad cold if she did not get dry very soon.

'Ahem!' said the Mouse with an important air, 'are you all ready? This is the driest thing I know. Silence all round, if you please! "William the Conqueror, whose cause was favoured by the pope, was soon submitted to by the English, who wanted leaders, and had been of late much accustomed to usurpation and conquest. Edwin and Morcar, the earls of Mercia and Northumbria—"'`
      },
      {
        id: 'alice-ch-4',
        number: 4,
        title: 'Chapter IV: The Rabbit Sends in a Little Bill',
        content: `It was the White Rabbit, trotting slowly back again, and looking anxiously about as it went, as if it had lost something; and she heard it muttering to itself 'The Duchess! The Duchess! Oh my dear paws! Oh my fur and whiskers! She'll get me executed, as sure as ferrets are ferrets! Where CAN I have dropped them, I wonder?'

Alice guessed in a moment that it was looking for the fan and the pair of white kid gloves, and she very good-naturedly began hunting about for them, but they were nowhere to be seen—everything seemed to have changed since her swim in the pool, and the great hall, with the glass table and the little door, had vanished completely.

Very soon the Rabbit noticed Alice, as she went hunting about, and called out to her in an angry tone, 'Why, Mary Ann, what ARE you doing out here? Run home this moment, and fetch me a pair of gloves and a fan! Quick, now!' And Alice was so much frightened that she ran off at once in the direction it pointed to, without trying to explain the mistake it had made.

'He took me for his housemaid,' she said to herself as she ran. 'How surprised he'll be when he finds out who I am! But I'd better take him his fan and gloves—that is, if I can find them.' As she said this, she came upon a neat little house, on the door of which was a bright brass plate with the name 'W. RABBIT' engraved upon it.`
      }
    ]
  },
  {
    id: 'sherlock-holmes',
    title: 'The Adventures of Sherlock Holmes',
    authors: ['Arthur Conan Doyle'],
    description: "A legendary collection of twelve detective stories featuring the brilliant consulting detective Sherlock Holmes and his faithful companion Dr. John H. Watson.",
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=800',
    categories: ['Mystery', 'Detective', 'Classic Literature'],
    publisher: 'George Newnes',
    publishedDate: '1892',
    publicDomain: true,
    pageCount: 307,
    chapters: [
      {
        id: 'sherlock-ch-1',
        number: 1,
        title: 'Adventure I: A Scandal in Bohemia',
        content: `To Sherlock Holmes she is always THE woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position. He never spoke of the softer passions, save with a gibe and a sneer. They were admirable things for the observer—excellent for drawing the veil from men's motives and actions. But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results. Grit in a sensitive instrument, or a crack in one of his own high-power lenses, would not be more disturbing than a strong emotion in a nature such as his. And yet there was but one woman to him, and that woman was the late Irene Adler, of dubious and questionable memory.

I had seen little of Holmes lately. My marriage had drifted us away from each other. My own complete happiness, and the home-centred interests which rise up around the man who first finds himself master of his own establishment, were sufficient to absorb all my attention, while Holmes, who loathed every form of society with his whole Bohemian soul, remained in our lodgings in Baker Street, buried among his old books, and alternating from week to week between cocaine and ambition, the drowsiness of the drug, and the fierce energy of his own keen nature. He was still, as ever, deeply attracted by the study of crime, and occupied his immense faculties and extraordinary powers of observation in following out those clues, and clearing up those mysteries which had been abandoned as hopeless by the official police.`
      },
      {
        id: 'sherlock-ch-2',
        number: 2,
        title: 'Adventure II: The Red-Headed League',
        content: `I had called upon my friend, Mr. Sherlock Holmes, one day in the autumn of last year and found him in deep conversation with a very stout, florid-faced, elderly gentleman with fiery red hair. With an apology for my intrusion, I was about to withdraw when Holmes pulled me abruptly into the room and closed the door behind me.

'You could not have come at a better time, my dear Watson,' he said cordially.

'I was afraid that you were engaged.'

'So I am. Very much so.'

'Then I can wait in the next room.'

'Not at all. This gentleman, Mr. Wilson, has been my partner and helper in many of my most successful accomplishments, and I have no doubt that he will be of the utmost use to me in yours also.'

The stout gentleman rose from his chair and gave a bob of greeting, with a quick little questioning glance from his small fat-encircled eyes.`
      },
      {
        id: 'sherlock-ch-3',
        number: 3,
        title: 'Adventure III: A Case of Identity',
        content: `'My dear fellow,' said Sherlock Holmes as we sat on either side of the fire in his lodgings at Baker Street, 'life is infinitely stranger than anything which the mind of man could invent. We would not dare to conceive the things which are really mere commonplaces of existence. If we could fly out of that window hand in hand, hover over this great city, gently remove the roofs, and peep in at the queer things which are going on, the strange coincidences, the plannings, the cross-purposes, the wonderful chains of events, working through generations, and leading to the most out-of-the-way results, it would make all fiction with its conventionalities and foreseen conclusions most stale and unprofitable.'

'And yet I am not convinced of it,' I answered. 'The cases which come to light in the papers are, as a rule, bald enough, and vulgar enough. We have in our police reports realism pushed to its extreme limits, and yet the result is, it must be confessed, neither fascinating nor artistic.'`
      }
    ]
  },
  {
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    authors: ['Jane Austen'],
    description: "A timeless romance that follows the turbulent relationship between Elizabeth Bennet, the daughter of a country gentleman, and Fitzwilliam Darcy, a rich aristocratic landowner.",
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=800',
    categories: ['Romance', 'Classic Literature', 'Drama'],
    publisher: 'T. Egerton',
    publishedDate: '1813',
    publicDomain: true,
    pageCount: 279,
    chapters: [
      {
        id: 'pnp-ch-1',
        number: 1,
        title: 'Chapter I',
        content: `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.

"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"

Mr. Bennet replied that he had not.

"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."

Mr. Bennet made no answer.

"Do you not want to know who has taken it?" cried his wife impatiently.

"You want to tell me, and I have no objection to hearing it."

This was invitation enough.

"Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it, that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week."

"What is his name?"

"Bingley."

"Is he married or single?"

"Oh! Single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!"`
      },
      {
        id: 'pnp-ch-2',
        number: 2,
        title: 'Chapter II',
        content: `Mr. Bennet was among the earliest of those who waited on Mr. Bingley. He had always intended to visit him, though to the last always assuring his wife that he should not go; and till the evening after the visit was paid she had no knowledge of it. It was then disclosed in the following manner. Observing his second daughter employed in trimming a hat, he suddenly addressed her with:

"I hope Mr. Bingley will like it, Lizzy."

"We are not in a way to know what Mr. Bingley likes," said her mother resentfully, "since we are not to visit."

"But you forget, mama," said Elizabeth, "that we shall meet him at the assemblies, and that Mrs. Long has promised to introduce him."

"I do not believe Mrs. Long will do any such thing. She has two nieces of her own. She is a selfish, hypocritical woman, and I have no opinion of her."

"No more have I," said Mr. Bennet; "and I am glad to find that you do not depend on her serving you."`
      },
      {
        id: 'pnp-ch-3',
        number: 3,
        title: 'Chapter III',
        content: `Not all that Mrs. Bennet, however, with the assistance of her five daughters, could ask on the subject, was sufficient to draw from her husband any satisfactory description of Mr. Bingley. They attacked him in various ways—with barefaced questions, ingenious suppositions, and distant surmises; but he eluded the skill of them all, and they were at last obliged to accept the second-hand intelligence of their neighbour, Lady Lucas. Her report was highly favourable. Sir William had been delighted with him. He was quite young, wonderfully handsome, extremely agreeable, and, to crown the whole, he meant to be at the next assembly with a large party.`
      }
    ]
  },
  {
    id: 'wizard-of-oz',
    title: 'The Wonderful Wizard of Oz',
    authors: ['L. Frank Baum'],
    description: "The classic American fairy tale chronicling the adventures of Dorothy Gale and her dog Toto in the magical Land of Oz.",
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800',
    categories: ['Fantasy', 'Adventure', 'Children'],
    publisher: 'George M. Hill Company',
    publishedDate: '1900',
    publicDomain: true,
    pageCount: 208,
    chapters: [
      {
        id: 'oz-ch-1',
        number: 1,
        title: 'Chapter I: The Cyclone',
        content: `Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer's wife. Their house was small, for the lumber to build it had to be carried by wagon many miles. There were four walls, a floor and a roof, which made one room; and this room contained a rusty looking cookstove, a cupboard for the dishes, a table, three or four chairs, and the beds. Uncle Henry and Aunt Em had a big bed in one corner, and Dorothy a little bed in another corner. There was no garret at all, and no cellar—except a small hole dug in the ground, called a cyclone cellar, where the family could go in case one of those great whirlpools of air arose, mighty enough to crush any building in its path. It was reached by a trap door in the middle of the floor, from which a ladder led down into the small, dark hole.

When Dorothy stood in the doorway and looked around, she could see nothing but the great gray prairie on every side. Not a tree nor a house broke the broad sweep of flat country that reached to the edge of the sky in all directions. The sun had baked the plowed land into a gray mass, with little cracks running through it. Even the grass was not green, for the sun had burned the tops of the long blades until they were the same gray color to be seen everywhere.`
      },
      {
        id: 'oz-ch-2',
        number: 2,
        title: 'Chapter II: The Council with the Munchkins',
        content: `She was awakened by a shock, so sudden and severe that if Dorothy had not been lying on the soft bed she might have been hurt. As it was, the jar made her catch her breath and wonder what had happened; and Toto put his cold little nose into her face and whined piteously. Dorothy sat up and noticed that the house was not moving; nor was it dark, for the bright sunshine came in at the window, flooding the little room. She leaped from her bed and with Toto at her heels ran and opened the door.

The little girl gave a cry of amazement and looked about her, her eyes growing bigger and bigger at the wonderful sights she saw.`
      }
    ]
  },
  {
    id: 'a-christmas-carol',
    title: 'A Christmas Carol',
    authors: ['Charles Dickens'],
    description: "A novella telling the story of Ebenezer Scrooge, an elderly miser who is visited by the ghost of his former business partner Jacob Marley and the Spirits of Christmas Past, Present and Yet to Come.",
    coverUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&q=80&w=800',
    categories: ['Classic Literature', 'Holiday', 'Drama'],
    publisher: 'Chapman & Hall',
    publishedDate: '1843',
    publicDomain: true,
    pageCount: 112,
    chapters: [
      {
        id: 'carol-stave-1',
        number: 1,
        title: "Stave I: Marley's Ghost",
        content: `Marley was dead: to begin with. There is no doubt whatever about that. The register of his burial was signed by the clergyman, the clerk, the undertaker, and the chief mourner. Scrooge signed it. And Scrooge's name was good upon 'Change, for anything he chose to put his hand to.

Old Marley was as dead as a door-nail.

Mind! I don't mean to say that I know, of my own knowledge, what there is particularly dead about a door-nail. I might have been inclined, myself, to regard a coffin-nail as the deadest piece of ironmongery in the trade. But the wisdom of our ancestors is in the simile; and my unhallowed hands shall not disturb it, or the Country's done for. You will therefore permit me to repeat, emphatically, that Marley was as dead as a door-nail.

Scrooge knew he was dead? Of course he did. How could it be otherwise? Scrooge and he were partners for I don't know how many years. Scrooge was his sole executor, his sole administrator, his sole assign, his sole residual legatee, his sole friend, and sole mourner.`
      },
      {
        id: 'carol-stave-2',
        number: 2,
        title: 'Stave II: The First of the Three Spirits',
        content: `When Scrooge awoke, it was so dark, that looking out of bed, he could scarcely distinguish the transparent window from the opaque walls of his chamber. He was endeavouring to pierce the darkness with his ferret eyes, when the chimes of a neighbouring church struck the four quarters. So he listened for the hour.

To his great astonishment the heavy bell went on from six to seven, and from seven to eight, and regularly up to twelve; then stopped. Twelve! It was past two when he went to bed. The clock was wrong. An icicle must have got into the works. Twelve!`
      }
    ]
  },
  {
    id: 'frankenstein',
    title: 'Frankenstein; or, The Modern Prometheus',
    authors: ['Mary Wollstonecraft Shelley'],
    description: "The seminal gothic science fiction novel telling the story of Victor Frankenstein, a young scientist who creates a sapient creature in an unorthodox scientific experiment.",
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800',
    categories: ['Gothic', 'Sci-Fi', 'Classic Literature'],
    publisher: 'Lackington, Hughes, Harding, Mavor & Jones',
    publishedDate: '1818',
    publicDomain: true,
    pageCount: 280,
    chapters: [
      {
        id: 'frank-ch-1',
        number: 1,
        title: 'Chapter I',
        content: `I am by birth a Genevese, and my family is one of the most distinguished of that republic. My ancestors had been for many years counsellors and syndics, and my father had filled several public situations with credit and honour. He was respected by all who knew him for his integrity and indefatigable attention to public business. He passed his younger days perpetually occupied by the affairs of his country; several circumstances had prevented his marrying early, nor was it until the decline of life that he became a husband and the father of a family.

As the circumstances of his marriage illustrate his character, I cannot refrain from relating them. One of his most intimate friends was a merchant who, from a flourishing state, fell, through numerous mischances, into poverty. This man, named Beaufort, was of a proud and unbending disposition and could not bear to live in poverty and oblivion in the same country where he had once been distinguished for his rank and magnificence.`
      },
      {
        id: 'frank-ch-2',
        number: 2,
        title: 'Chapter II',
        content: `We were brought up together; there was not quite a year difference in our ages. I need not say that we were strangers to any species of disunion or dispute. Harmony was the soul of our companionship, and the diversity and contrast that subsisted in our characters drew us nearer together. Elizabeth was of a calmer and more concentrated disposition; but, with all my ardour, I was capable of a more intense application and was more deeply smitten with the thirst for knowledge. She busied herself with following the aerial creations of the poets; and in the majestic and wondrous scenes which surrounded our Swiss home—the sublime shapes of the mountains, the changes of the seasons, tempest and calm, the silence of winter, and the life and turbulence of our Alpine summers—she found ample scope for admiration and delight.`
      }
    ]
  },
  {
    id: 'time-machine',
    title: 'The Time Machine',
    authors: ['H.G. Wells'],
    description: "A foundational science fiction novella about an English scientist and gentleman inventor living in Richmond, Surrey, who builds a machine capable of traveling through time.",
    coverUrl: 'https://images.unsplash.com/photo-1501139083538-0139583c060f?auto=format&fit=crop&q=80&w=800',
    categories: ['Sci-Fi', 'Classic Literature', 'Adventure'],
    publisher: 'Heinemann',
    publishedDate: '1895',
    publicDomain: true,
    pageCount: 118,
    chapters: [
      {
        id: 'tm-ch-1',
        number: 1,
        title: 'Chapter I: The Time Traveller',
        content: `The Time Traveller (for so it will be convenient to call him) was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated. The fire burned brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses. Our chairs, being his patents, embraced and petted us rather than submitted to be sat upon; and there was that luxurious after-dinner atmosphere, when thought roams gracefully free of the trammels of precision.

"You must follow me carefully. I shall have to controvert one or two ideas that are almost universally accepted. The geometry, for instance, they taught you at school is founded on a misconception."

"Is not that rather a large thing to begin upon?" said Filby, an argumentative person with red hair.

"I do not mean to ask you to accept anything without reasonable ground for it. You will soon admit as much as I need from you. You know of course that a mathematical line, a line of thickness nil, has no real existence. They taught you that? Neither has a mathematical plane. These things are mere abstractions."

"That is all right," said the Psychologist.

"Nor, again, if has only length, breadth, and thickness, can a cube have a real existence."

"There I object," said Filby. "Of course a solid body may exist. All real things—"

"So most people think. But wait a moment. Can an INSTANTANEOUS cube exist?"

"I don't follow you," said Filby.

"Can a cube that does not last for any time at all, have a real existence?"`
      },
      {
        id: 'tm-ch-2',
        number: 2,
        title: 'Chapter II: The Machine',
        content: `The Time Traveller looked at us, and then at the mechanism. "Well?" said the Psychologist.

"This little affair," said the Time Traveller, resting his elbows upon the table and pressing his hands together above the apparatus, "is only a model. It is my design for a machine to travel through time. You will notice that it looks singularly askew, and that there is an odd twinkling appearance about this bar, as though it was in some way unreal."

He pointed to the part with his finger. "Also, here is one little white lever, and here is another."

The Medical Man got up out of his chair and peered into the thing. "It's beautifully made," he said.

"It took two years to make," retorted the Time Traveller. Then, when we had all imitated the Medical Man, he said: "Now I want you clearly to understand that this lever, being pressed over, sends the machine gliding into the future, and this other reverses the motion. This saddle represents the seat of a time traveller. Presently I am going to press the lever, and off the machine will go. It will vanish, pass into future time, and disappear."`
      }
    ]
  },
  {
    id: 'dracula',
    title: 'Dracula',
    authors: ['Bram Stoker'],
    description: "An epistolary Gothic horror novel telling the story of Count Dracula's attempt to move from Transylvania to England to find new blood and spread the undead curse.",
    coverUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=800',
    categories: ['Horror', 'Mystery', 'Classic Literature'],
    publisher: 'Archibald Constable and Company',
    publishedDate: '1897',
    publicDomain: true,
    pageCount: 418,
    chapters: [
      {
        id: 'drac-ch-1',
        number: 1,
        title: 'Chapter I: Jonathan Harker\'s Journal',
        content: `3 May. Bistritz.—Left Munich at 8:35 P. M., on 1st May, arriving at Vienna early next morning; should have arrived at 6:46, but train was an hour late. Buda-Pesth seems a wonderful place, from the glimpse which I got of it from the train and the little I could walk through the streets. I feared to go very far from the station, as we had arrived late and would start as near the correct time as possible.

The impression I had was that we were leaving the West and entering the East; the most western of splendid bridges over the Danube, which is here of noble width and depth, took us to the traditions of Turkish rule.

We left in good time, and came after nightfall to Klausenburgh. Here I stopped for the night at the Hotel Royale. I had for dinner, or rather supper, a chicken done up some way with red pepper, which was very good but thirsty. (Mem., get recipe for Mina.) I asked the waiter, and he said it was called "paprika hendl," and that, as it was a national dish, I should be able to get it anywhere along the Carpathians.

I found that my smattering of German was very useful here; indeed, I don't know how I could be able to get on without it.

Having had some time at my disposal when in London, I had visited the British Museum, and made search among the books and maps in the library regarding Transylvania; it had struck me that some foreknowledge of the country could not fail to be of importance in dealing with a nobleman of that country.`
      },
      {
        id: 'drac-ch-2',
        number: 2,
        title: 'Chapter II: Transylvania Arrival',
        content: `4 May.—I found that my landlord had got a letter from the Count, directing him to secure the best place on the coach for me; but on making inquiries as to details he seemed somewhat reticent, and pretended that he could not understand my German.

This could not be true, because up to then he had understood it perfectly; at least, he answered my questions exactly as if he did. He and his wife, the old lady who had received me, looked at each other in a frightened sort of way. He mumbled that the money had been sent in a letter, and that was all he knew.

When I asked him if he knew Count Dracula, and could tell me anything of his castle, both he and his wife crossed themselves, and, saying that they knew nothing at all, simply refused to speak any further.`
      }
    ]
  },
  {
    id: 'moby-dick',
    title: 'Moby-Dick; or, The Whale',
    authors: ['Herman Melville'],
    description: "An epic American novel detailing the obsessive quest of Captain Ahab, commander of the whaling ship Pequod, for revenge against Moby Dick, a giant white sperm whale.",
    coverUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&q=80&w=800',
    categories: ['Classic Literature', 'Adventure'],
    publisher: 'Harper & Brothers',
    publishedDate: '1851',
    publicDomain: true,
    pageCount: 635,
    chapters: [
      {
        id: 'mb-ch-1',
        number: 1,
        title: 'Chapter 1: Loomings',
        content: `Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation.

Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people's hats off—then, I account it high time to get to sea as soon as I can.

This is my substitute for pistol and ball. With a philosophical flourish Cato throws himself upon his sword; I quietly take to the ship. There is nothing surprising in this. If they but knew it, almost all men in their degree, some time or other, cherish very nearly the same feelings towards the ocean with me.`
      },
      {
        id: 'mb-ch-2',
        number: 2,
        title: 'Chapter 2: The Carpet-Bag',
        content: `I stuffed a shirt or two into my old carpet-bag, tucked it under my arm, and started for Cape Horn and the Pacific. Quitting the good city of Old Manhatto, I duly arrived in New Bedford. It was a Saturday night in December. Much was I disappointed upon learning that the little packet for Nantucket had already sailed, and that no way of reaching that place would offer, till the following Monday.

As most young candidates for the pains and penalties of whaling stop at New Bedford, they must needs lie at night in some inn; and for my part, I determined to seek out the cheapest and cleanest lodging-house I could find.`
      }
    ]
  },
  {
    id: 'art-of-war',
    title: 'The Art of War',
    authors: ['Sun Tzu'],
    description: "An ancient Chinese military treatise attributed to Sun Tzu, composed of 13 chapters devoted to various strategic aspects and philosophy of conflict resolution.",
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800',
    categories: ['Philosophy', 'Classic Literature', 'Strategy'],
    publisher: 'Public Domain Translation',
    publishedDate: '5th Century BC',
    publicDomain: true,
    pageCount: 96,
    chapters: [
      {
        id: 'aow-ch-1',
        number: 1,
        title: 'Chapter I: Laying Plans',
        content: `Sun Tzu said: The art of war is of vital importance to the State. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected.

The art of war, then, is governed by five constant factors, to be taken into account in one's deliberations, when seeking to determine the conditions obtaining in the field.

These are: (1) The Moral Law; (2) Heaven; (3) Earth; (4) The Commander; (5) Method and discipline.

The Moral Law causes the people to be in complete accord with their ruler, so that they will follow him regardless of their lives, undismayed by any danger.

Heaven signifies night and day, cold and heat, times and seasons.

Earth comprises distances, great and small; danger and security; open ground and narrow passes; the chances of life and death.

The Commander stands for the virtues of wisdom, sincerely, benevolence, courage and strictness.

By method and discipline are to be understood the marshaling of the army in its proper subdivisions, the graduations of rank among the officers, the maintenance of roads by which supplies may reach the army, and the control of military expenditure.`
      },
      {
        id: 'aow-ch-2',
        number: 2,
        title: 'Chapter II: Waging War',
        content: `Sun Tzu said: In the operations of war, where there are in the field a thousand swift chariots, as many heavy chariots, and a hundred thousand mail-clad soldiers, with provisions enough to carry them a thousand li, the expenditure at home and at the front, including the entertainment of guests, small items such as glue and paint, and sums spent on chariots and armor, will reach the total of a thousand ounces of silver per day. Such is the cost of raising an army of 100,000 men.

When you engage in actual fighting, if victory is long in coming, then men's weapons will grow dull and their ardor will be damped. If you lay siege to a town, you will exhaust your strength.

Again, if the campaign is protracted, the resources of the State will not be equal to the strain.`
      }
    ]
  }
];

export function getBundledBooks(): BundledBookData[] {
  return BUNDLED_BOOKS;
}

export function searchBundledBooks(query: string, category: string = 'all'): BundledBookData[] {
  let results = BUNDLED_BOOKS;
  if (category && category !== 'all') {
    results = results.filter(b => b.categories.some(c => c.toLowerCase().includes(category.toLowerCase())));
  }
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    results = results.filter(b => 
      b.title.toLowerCase().includes(q) ||
      b.authors.some(a => a.toLowerCase().includes(q)) ||
      b.description.toLowerCase().includes(q)
    );
  }
  return results;
}
