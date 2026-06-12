/**
 * SM-2 spaced repetition algorithm
 * quality: 0~5  (0~2 = wrong, 3~5 = correct)
 */
export function sm2(easeFactor, intervalDays, quality) {
  if (quality < 3) {
    // Wrong answer — reset
    return { intervalDays: 1, easeFactor: Math.max(1.3, easeFactor - 0.2) }
  }

  let newInterval
  if (intervalDays <= 1) newInterval = 1
  else if (intervalDays === 1) newInterval = 6
  else newInterval = Math.round(intervalDays * easeFactor)

  const newEase = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  )

  return { intervalDays: newInterval, easeFactor: newEase }
}

export function nextReviewDate(intervalDays) {
  const d = new Date()
  d.setDate(d.getDate() + intervalDays)
  return d.toISOString()
}
