import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getQuestionSet, sanitizeQuestions } from '../services/questions';

const router = Router();

// List categories from Open Trivia DB
router.get('/categories', async (_req: Request, res: Response): Promise<void> => {
  try {
    const r = await fetch('https://opentdb.com/api_category.php');
    const data = await r.json() as { trivia_categories: { id: number; name: string }[] };
    res.json(data.trivia_categories);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Failed to fetch categories' });
  }
});

// Get questions for a game (correct answers stripped)
router.get('/questions/set/:questionSetId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const qs = await getQuestionSet(req.params.questionSetId);
    if (!qs) {
      res.status(404).json({ error: 'Question set not found' });
      return;
    }
    res.json({ id: qs.id, category: qs.category, questions: sanitizeQuestions(qs.questions) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
