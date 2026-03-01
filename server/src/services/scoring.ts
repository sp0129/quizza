// Linear scale: 0s → 100pts, 29s → 50pts, wrong/timeout → 0pts
export function calculatePoints(isCorrect: boolean, timeTakenSeconds: number): number {
  if (!isCorrect) return 0;
  const clamped = Math.min(Math.max(timeTakenSeconds, 0), 29);
  return Math.round(100 - (clamped / 29) * 50);
}
