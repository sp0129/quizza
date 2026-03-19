import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';

export interface Question {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  all_answers: string[]; // shuffled for display
  display_hint?: string; // e.g., 'flag' for large emoji rendering
}

interface OpenTDBQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
}

interface LocalQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
}

interface LocalQuestionBank {
  category: string;
  category_id: number;
  questions: LocalQuestion[];
}

interface CategoryIndex {
  categories: { id: number; name: string; file: string }[];
}

export interface LocalData {
  categories: { id: number; name: string }[];
  question_banks: LocalQuestionBank[];
}

const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };

function deduplicateByQuestion<T extends { question: string }>(questions: T[]): T[] {
  const seen = new Set<string>();
  return questions.filter(q => {
    const key = q.question.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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

export function loadLocalData(): LocalData {
  const dataDir = path.join(__dirname, '../../data');
  const index = JSON.parse(
    fs.readFileSync(path.join(dataDir, 'questions.json'), 'utf-8')
  ) as CategoryIndex;

  const question_banks: LocalQuestionBank[] = [];
  for (const cat of index.categories) {
    const filePath = path.join(dataDir, cat.file);
    if (fs.existsSync(filePath)) {
      const bank = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LocalQuestionBank;
      question_banks.push(bank);
    }
  }

  return {
    categories: index.categories.map(c => ({ id: c.id, name: c.name })),
    question_banks,
  };
}

async function storeLocalQuestionSet(category: string, categoryId: number, questionCount: number = 10, difficulty?: string): Promise<string> {
  const data = loadLocalData();
  const bank = data.question_banks.find(b => b.category_id === categoryId);

  if (!bank || !bank.questions.length) {
    throw new Error(`No local questions found for category "${category}" (id ${categoryId})`);
  }

  let questionPool = deduplicateByQuestion(bank.questions);
  if (difficulty && difficulty !== 'all') {
    questionPool = questionPool.filter(q => q.difficulty === difficulty);
  }
  if (!questionPool.length) {
    throw new Error(`No ${difficulty} questions found for this category`);
  }

  const seed = Date.now();
  const shuffled = shuffleArray(questionPool, seed).slice(0, questionCount);

  const questions: Question[] = shuffled
    .sort((a, b) => {
      const da = DIFFICULTY_ORDER[a.difficulty as keyof typeof DIFFICULTY_ORDER] ?? 1;
      const db = DIFFICULTY_ORDER[b.difficulty as keyof typeof DIFFICULTY_ORDER] ?? 1;
      return da - db;
    })
    .map(q => ({
      question: q.question,
      correct_answer: q.correct_answer,
      incorrect_answers: q.incorrect_answers,
      difficulty: q.difficulty as Question['difficulty'],
      all_answers: shuffleArray([q.correct_answer, ...q.incorrect_answers]),
      ...((q as any).display_hint ? { display_hint: (q as any).display_hint } : {}),
    }));

  const id = uuidv4();
  await pool.query(
    `INSERT INTO question_sets (id, category, questions, source) VALUES ($1, $2, $3, $4)`,
    [id, category, JSON.stringify(questions), 'local']
  );

  return id;
}

export async function fetchAndStoreQuestionSet(category: string, categoryId?: number, questionCount: number = 10, difficulty?: string): Promise<string> {
  // Local categories use IDs >= 2000
  if (categoryId !== undefined && categoryId >= 2000) {
    return storeLocalQuestionSet(category, categoryId, questionCount, difficulty);
  }

  // Fetch from Open Trivia DB
  let url = categoryId
    ? `https://opentdb.com/api.php?amount=15&category=${categoryId}&type=multiple&encode=url3986`
    : `https://opentdb.com/api.php?amount=15&type=multiple&encode=url3986`;
  if (difficulty && difficulty !== 'all') {
    url += `&difficulty=${difficulty}`;
  }

  const res = await fetch(url);
  const data = await res.json() as { response_code: number; results: OpenTDBQuestion[] };

  if (data.response_code !== 0 || !data.results?.length) {
    throw new Error('Failed to fetch questions from Open Trivia DB');
  }

  // Decode URL-encoded strings from API response (encode=url3986)
  const decode = (str: string) => decodeURIComponent(str);

  const seed = Date.now();
  const shuffled = shuffleArray(deduplicateByQuestion(data.results), seed).slice(0, questionCount);

  const questions: Question[] = shuffled
    .sort((a, b) => {
      const da = DIFFICULTY_ORDER[a.difficulty as keyof typeof DIFFICULTY_ORDER] ?? 1;
      const db = DIFFICULTY_ORDER[b.difficulty as keyof typeof DIFFICULTY_ORDER] ?? 1;
      return da - db;
    })
    .map((q) => {
      const allAnswers = shuffleArray(
        [q.correct_answer, ...q.incorrect_answers].map(decode)
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
