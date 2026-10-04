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
      'Type numbers as a whole number, a fraction such as 3/8, or an exact decimal. Type expressions with ^ for powers, such as x^2 + 3x; a multiplication sign is optional. For "choose every one that applies", tick all the right options.',
      'A wrong answer is part of learning. The feedback names the likely slip when it can, and the worked solution shows one way through. If a lesson does not stick today, it comes back in another session.',
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
    id: 'placement',
    title: 'The placement test',
    paragraphs: [
      'At the start, a short test finds what you already know. A right answer also counts the topics beneath it; a wrong one rules out the topics above it. Topics whose problems are not written yet ask you to report honestly whether you know them, and are labelled self-report.',
    ],
  },
  {
    id: 'map',
    title: 'The map',
    paragraphs: [
      'The map shows every topic of your courses, from the foundations at the top to the Tripos at the bottom. Green is learned, amber is due for review, blue is ready to learn, and grey is locked. A dot marks a topic whose lesson is written.',
      'Choose a topic to see its summary, where Cambridge teaches it, and what it builds on. Use Zoom and the course filter, or switch to List to read it as text.',
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
  { title: 'Today', text: 'Your plan for today: new lessons, reviews, and quizzes, each with the reason it is there. Start with the first task.', target: '[data-nav="today"]' },
  { title: 'Map', text: 'Every topic of your courses and where you are with each one. Choose a topic to see what it covers and where Cambridge teaches it.', target: '[data-nav="map"]' },
  { title: 'Progress', text: 'How far you are in each course, your daily time and course split, and backups of your progress file.', target: '[data-nav="progress"]' },
  { title: 'Glossary', text: 'Every term the lessons use. Words with a dotted underline open their definition right where you are.', target: '[data-nav="glossary"]' },
  { title: 'Help', text: 'How each part works, how to type answers, and this tour again.', target: '.help-button' },
];
