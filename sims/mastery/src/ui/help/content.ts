/** Help page sections and the first-visit tour steps. Plain words, short sentences, no dashes. */

export interface HelpSection {
  id: string;
  title: string;
  paragraphs: readonly string[];
}

export const HELP_SECTIONS: readonly HelpSection[] = [
  {
    id: 'what',
    title: 'What this is',
    paragraphs: [
      'A course that teaches Cambridge IA Probability and CST IA Discrete Mathematics from scratch. The material is cut into small topics. Each topic has prerequisites, the topics it builds on, and you learn it only once those are learned.',
      'Every day the app plans a session that fits your daily time. It mixes new lessons, short reviews, and quizzes, and splits new lessons between your courses.',
    ],
  },
  {
    id: 'home',
    title: 'Getting around',
    paragraphs: [
      'Home, first in the navigation, and the course title at the top both take you home from any screen: the start page until you choose your course, then Today.',
      'Leaving a lesson this way keeps your place, as the Back links do. The browser\'s Back button works too, and Escape closes a dialog or the topic panel on the map.',
    ],
  },
  {
    id: 'today',
    title: 'Today',
    paragraphs: [
      'Today lists the tasks in order, with the reason for each one. Press Start on the first task, and Continue moves you on to the next one.',
      'Minutes left counts the planned time of the tasks still open. Lesson minutes per course shows how today\'s new lessons split between the courses.',
      'You can skip a task. It is not marked as failed; it simply waits for another day.',
    ],
  },
  {
    id: 'lessons',
    title: 'Lessons and practice',
    paragraphs: [
      'A lesson has three parts: Learn, Worked examples, and Practice. Practice gives you fresh problems until you get several right in a row, which is the topic\'s mastery rule. Then the topic counts as learned.',
      'Type numbers as a whole number, a fraction such as 3/8 or 3÷8, or an exact decimal. Type expressions with ^ for powers, such as x^2 + 3x; a multiplication sign is optional, and √ and π work too.',
      'The line under the answer box shows how your answer was read, written as mathematics. The keys below it add symbols at the cursor, such as the fraction bar, powers, and roots. Enter checks the answer. If the answer cannot be read yet, nothing is graded: finish it and press Enter again. If it is read in a form the question does not ask for, such as a calculation where a single number is asked, you can edit it or check it anyway.',
      'A wrong answer is part of learning. The result shows your answer beside the correct one, names the likely slip when it can, gives the full worked solution, and says what the miss does to your progress. "Show me how" shows the solution too, and counts as a miss. If a lesson does not stick today, it comes back in another session.',
      'You can leave a lesson and come back: your place is kept while this tab is open. If the tab is closed, practice starts again and the right-in-a-row count resets.',
    ],
  },
  {
    id: 'reviews',
    title: 'Reviews and quizzes',
    paragraphs: [
      'A review is two short problems on a topic you learned before. Passing pushes the next review further away; missing brings it back sooner. Practising a harder topic also counts as partial review of the topics beneath it, so reviews stay few.',
      'A quiz comes every few new topics: one problem on each recent topic, each counting as its review.',
    ],
  },
  {
    id: 'supervision',
    title: 'Supervision',
    paragraphs: [
      'Some Cambridge problems ask for a proof or an explanation, so the app cannot mark them. Write your answer in the box, then press Copy for supervision. It copies the problem, its source, your write-up, and your recent attempts.',
      'Paste the block into a Claude Code session; type /supervise first if the session is in the learnhub folder. Claude questions you one step at a time and gives small hints, never the full solution. At the end it prints a result block.',
      'Copy the whole result block and press Paste result, on the problem or on Today. A mark of 14 out of 20 or more counts as a passed review of the topic; below 14 counts as a missed one.',
      'Problems the supervisor sets to redo appear on Today from the next day, with the weak points. You never mark your own work: only a pasted result, tied to the block you copied, can.',
      'On a phone, open the same Claude Code session from the Claude app with Remote Control, or start one at claude.ai/code. If the app cannot copy, a box with Select all appears instead.',
      'A wrong answer to a checked Cambridge problem also offers Copy for supervision, with your answer and any working you add.',
    ],
  },
  {
    id: 'map',
    title: 'The map',
    paragraphs: [
      'The map shows every topic of your courses, from the foundations at the top to the Tripos at the bottom. Green is learned, amber is due for review, blue is ready to learn, a dashed outline means the lesson is not written yet, and grey is locked. A dot marks a topic whose lesson is written.',
      'Choose a topic to see its summary, where Cambridge teaches it, and what it builds on; lines then connect it to what it builds on and what builds on it. "Show all connections" draws every line. Use Zoom and the course filter, or switch to List to read it as text.',
    ],
  },
  {
    id: 'progress',
    title: 'Progress, settings, and backups',
    paragraphs: [
      'Progress shows each course and how much is learned. Settings change your daily minutes and how new lessons are split between courses.',
      'Your progress lives in this browser only. Export a progress file to keep a copy or to move to another device, then Import it there. Start over is at the bottom of Progress and needs a typed confirmation.',
    ],
  },
];

export interface TourStep {
  title: string;
  text: string;
  /** CSS selector of the region to outline. */
  target: string;
}

export const TOUR_STEPS: readonly TourStep[] = [
  { title: 'Home', text: 'Home is your plan for today: new lessons, reviews, and quizzes, each with the reason it is there. Home and the title at the top bring you back here from anywhere.', target: '[data-nav="home"]' },
  { title: 'Map', text: 'Every topic of your courses and where you are with each one. Choose a topic to see what it covers and where Cambridge teaches it.', target: '[data-nav="map"]' },
  { title: 'Progress', text: 'How far you are in each course, your daily time and course split, and backups of your progress file.', target: '[data-nav="progress"]' },
  { title: 'Glossary', text: 'Every term the lessons use. Words with a dotted underline open their definition right where you are.', target: '[data-nav="glossary"]' },
  { title: 'Help', text: 'How each part works, how to type answers, and this tour again.', target: '.help-button' },
];
