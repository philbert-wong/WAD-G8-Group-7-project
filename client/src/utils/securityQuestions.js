// The 3 security questions for "Forgot password?" (same order as on the server)
export const SECURITY_QUESTIONS = [
  'What was the name of your best childhood friend?',
  'Who was your favorite childhood teacher?',
  'What was the name of the hospital where you were born?',
]

// true when every answer has something typed in it (spaces only do not count)
export function allAnswered(answers) {
  for (const answer of answers) {
    if (answer.trim() === '') {
      return false
    }
  }
  return true
}
