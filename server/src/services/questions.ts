import { v4 as uuidv4 } from 'uuid';
import pool from '../db';

export interface Question {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  all_answers: string[]; // shuffled for display
}

interface OpenTDBQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
}

const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };

function shuffleArray<T>(arr: T[], seed?: number): T[] {
  const a = [...arr];
  // Simple seeded shuffle (mulberry32)
  let s = seed ?? Math.random() * 2 ** 32;
  const rand = () => {
    s |= 0; s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function fetchAndStoreQuestionSet(category: string, categoryId?: number): Promise<string> {
  // Fetch from Open Trivia DB
  const url = categoryId
    ? `https://opentdb.com/api.php?amount=15&category=${categoryId}&type=multiple`
    : `https://opentdb.com/api.php?amount=15&type=multiple`;

  const res = await fetch(url);
  const data = await res.json() as { response_code: number; results: OpenTDBQuestion[] };

  if (data.response_code !== 0 || !data.results?.length) {
    throw new Error('Failed to fetch questions from Open Trivia DB');
  }

  // Decode HTML entities from API response
  const decode = (str: string) =>
    str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");

  const seed = Date.now();
  const shuffled = shuffleArray(data.results, seed).slice(0, 10);

  const questions: Question[] = shuffled
    .sort((a, b) => {
      const da = DIFFICULTY_ORDER[a.difficulty as keyof typeof DIFFICULTY_ORDER] ?? 1;
      const db = DIFFICULTY_ORDER[b.difficulty as keyof typeof DIFFICULTY_ORDER] ?? 1;
      return da - db;
    })
    .map((q) => {
      const allAnswers = shuffleArray(
        [q.correct_answer, ...q.incorrect_answers].map(decode),
        seed
      );
      return {
        question: decode(q.question),
        correct_answer: decode(q.correct_answer),
        incorrect_answers: q.incorrect_answers.map(decode),
        difficulty: q.difficulty as Question['difficulty'],
        all_answers: allAnswers,
      };
    });

  const id = uuidv4();
  await pool.query(
    `INSERT INTO question_sets (id, category, questions, source) VALUES ($1, $2, $3, $4)`,
    [id, category, JSON.stringify(questions), 'trivia_db']
  );

  return id;
}

export async function getQuestionSet(questionSetId: string): Promise<{ id: string; category: string; questions: Question[] } | null> {
  const result = await pool.query(
    'SELECT id, category, questions FROM question_sets WHERE id = $1',
    [questionSetId]
  );
  return result.rows[0] ?? null;
}

// Strip correct_answer before sending to client
export function sanitizeQuestions(questions: Question[]): Omit<Question, 'correct_answer' | 'incorrect_answers'>[] {
  return questions.map(({ correct_answer, incorrect_answers, ...safe }) => safe);
}
