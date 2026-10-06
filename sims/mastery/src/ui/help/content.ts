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
      'There are five tabs: Today, Course, Admission, Story, and You. On a phone they sit at the bottom of the screen; on a computer they run down the left, and the keys 1 to 5 switch between them.',
      'Press Command K (Ctrl K on Windows), or the search button, to search lessons, glossary terms, and past papers, or to jump to an action. G starts the gym and T a timed paper.',
      'A lesson, the gym, and a timed paper open in focus mode: the tabs hide, and Escape or the back button at the top returns to where you came from. Your place in a lesson is kept, and the browser\'s Back button works too.',
      'The glossary, the map, Help, and the theme are on the You tab.',
    ],
  },
  {
    id: 'today',
    title: 'Today',
    paragraphs: [
      'Today opens with the time, what to do now, and what comes later. Open The whole day for the timeline from your wake time: set the time you woke, or press now, and tick blocks off as you go. Study items link straight into the lesson.',
      'Below the timeline, Today\'s session lists the tasks in order, with the reason for each one. Press Start on the first task, and Continue moves you on to the next one.',
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
      'On a phone, start Remote Control on the Mac with /remote-control, open that session from the Claude app or at claude.ai/code, and paste the block as a normal message; it carries its own instructions, so /supervise is not needed. If the app cannot copy, a box with Select all appears instead.',
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
      'Progress, on the You tab, shows each course and how much is learned. Settings change your daily minutes and how new lessons are split between courses.',
      'Your progress lives in this browser only. Export a progress file to keep a copy or to move to another device, then Import it there. Start over is at the bottom of the You tab and needs a typed confirmation.',
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
  { title: 'Today', text: 'Your day: the time, what to do now with one Start, and what comes later. Today brings you back here from anywhere; press 1.', target: '[data-nav="home"]' },
  { title: 'Course', text: 'The four stages of the course in the order Cambridge students take them, with how far you are in each chapter.', target: '[data-nav="course"]' },
  { title: 'Admission', text: 'The real steps to a Cambridge place, as five acts, with the papers to sit, your results, and your letters.', target: '[data-nav="admission"]' },
  { title: 'Story', text: 'A story you play by studying. Your real progress triggers every scene.', target: '[data-nav="story"]' },
  { title: 'You', text: 'Predicted outcomes, the glossary, help, the theme, your daily time, and backups of your progress file.', target: '[data-nav="you"]' },
];
