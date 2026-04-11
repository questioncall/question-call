type QuizSeedQuestion = {
  questionText: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  explanation: string;
};

type QuizSeedTopic = {
  subject: string;
  topic: string;
  level: string;
  questions: QuizSeedQuestion[];
};

export const QUIZ_STARTER_SEED: QuizSeedTopic[] = [
  {
    subject: "Mathematics",
    topic: "Algebra",
    level: "Grade 10",
    questions: [
      {
        questionText: "Solve 2x + 5 = 17. What is the value of x?",
        options: ["5", "6", "7", "8"],
        correctOptionIndex: 1,
        explanation: "Subtract 5 from both sides to get 2x = 12, then divide by 2.",
      },
      {
        questionText: "Which expression is the factorization of x^2 - 9?",
        options: ["(x - 9)(x + 1)", "(x - 3)(x + 3)", "(x - 1)(x + 9)", "(x - 3)^2"],
        correctOptionIndex: 1,
        explanation: "x^2 - 9 is a difference of squares: a^2 - b^2 = (a - b)(a + b).",
      },
      {
        questionText: "Simplify 3a + 2a - 4.",
        options: ["5a - 4", "6a - 4", "5a + 4", "a - 4"],
        correctOptionIndex: 0,
        explanation: "Combine like terms: 3a + 2a = 5a.",
      },
      {
        questionText: "What are the roots of x^2 - 5x + 6 = 0?",
        options: ["1 and 6", "2 and 3", "3 and 5", "2 and 6"],
        correctOptionIndex: 1,
        explanation: "The quadratic factors as (x - 2)(x - 3) = 0.",
      },
      {
        questionText: "If y = 3x + 2, what is y when x = 4?",
        options: ["10", "12", "14", "16"],
        correctOptionIndex: 2,
        explanation: "Substitute x = 4: y = 3(4) + 2 = 14.",
      },
    ],
  },
  {
    subject: "Physics",
    topic: "Mechanics",
    level: "Grade 11",
    questions: [
      {
        questionText: "What is the SI unit of force?",
        options: ["Joule", "Pascal", "Newton", "Watt"],
        correctOptionIndex: 2,
        explanation: "Force is measured in newtons (N).",
      },
      {
        questionText: "Acceleration is defined as change in what quantity per unit time?",
        options: ["Displacement", "Velocity", "Mass", "Force"],
        correctOptionIndex: 1,
        explanation: "Acceleration is the rate of change of velocity.",
      },
      {
        questionText: "A body of mass 2 kg accelerates at 3 m/s^2. What force acts on it?",
        options: ["5 N", "6 N", "9 N", "12 N"],
        correctOptionIndex: 1,
        explanation: "By Newton's second law, F = ma = 2 x 3 = 6 N.",
      },
      {
        questionText: "What does the area under a velocity-time graph represent?",
        options: ["Acceleration", "Displacement", "Speed", "Momentum"],
        correctOptionIndex: 1,
        explanation: "The area under a velocity-time graph gives displacement.",
      },
      {
        questionText: "Which property explains why a stationary object resists motion?",
        options: ["Density", "Power", "Inertia", "Pressure"],
        correctOptionIndex: 2,
        explanation: "Inertia is the tendency of a body to resist changes in its state of motion.",
      },
    ],
  },
  {
    subject: "Chemistry",
    topic: "Periodic Table",
    level: "Grade 10",
    questions: [
      {
        questionText: "What does the atomic number of an element represent?",
        options: [
          "Number of neutrons",
          "Number of protons",
          "Number of shells",
          "Number of compounds formed",
        ],
        correctOptionIndex: 1,
        explanation: "The atomic number is the number of protons in the nucleus.",
      },
      {
        questionText: "Which group contains the noble gases?",
        options: ["Group 1", "Group 7", "Group 17", "Group 18"],
        correctOptionIndex: 3,
        explanation: "Noble gases are found in Group 18 of the periodic table.",
      },
      {
        questionText: "What is the chemical symbol for sodium?",
        options: ["S", "So", "Na", "Sd"],
        correctOptionIndex: 2,
        explanation: "The symbol for sodium is Na.",
      },
      {
        questionText: "Elements in the same group of the periodic table usually have the same number of what?",
        options: ["Neutrons", "Valence electrons", "Shells", "Isotopes"],
        correctOptionIndex: 1,
        explanation: "Group members share the same number of valence electrons, so they behave similarly.",
      },
      {
        questionText: "Chlorine belongs to which family of elements?",
        options: ["Alkali metals", "Halogens", "Noble gases", "Transition metals"],
        correctOptionIndex: 1,
        explanation: "Chlorine is a halogen in Group 17.",
      },
    ],
  },
  {
    subject: "English",
    topic: "Grammar",
    level: "Intermediate",
    questions: [
      {
        questionText: "What is the past tense of the verb 'go'?",
        options: ["Goed", "Gone", "Went", "Going"],
        correctOptionIndex: 2,
        explanation: "The simple past tense of 'go' is 'went'.",
      },
      {
        questionText: "Choose the sentence with correct subject-verb agreement.",
        options: [
          "She write every day.",
          "She writes every day.",
          "She writing every day.",
          "She written every day.",
        ],
        correctOptionIndex: 1,
        explanation: "A singular subject in simple present takes a singular verb: 'writes'.",
      },
      {
        questionText: "Which word is the adjective in the sentence 'The red ball rolled away'?",
        options: ["The", "red", "ball", "rolled"],
        correctOptionIndex: 1,
        explanation: "'Red' describes the noun 'ball', so it is the adjective.",
      },
      {
        questionText: "Which word is closest in meaning to 'rapid'?",
        options: ["slow", "quick", "late", "calm"],
        correctOptionIndex: 1,
        explanation: "'Rapid' means fast or quick.",
      },
      {
        questionText: "Choose the passive voice sentence.",
        options: [
          "The teacher explained the lesson.",
          "The lesson was explained by the teacher.",
          "The teacher is explaining the lesson.",
          "The teacher explains lessons clearly.",
        ],
        correctOptionIndex: 1,
        explanation: "Passive voice focuses on the receiver of the action: 'The lesson was explained...'.",
      },
    ],
  },
];
