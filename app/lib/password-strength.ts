export type PasswordStrength = {
  label: 'Low' | 'Medium' | 'Hard';
  score: number;
  checks: {
    minLength: boolean;
    letters: boolean;
    numbers: boolean;
    symbols: boolean;
    mixedCase: boolean;
  };
};

const symbolPattern = /[^A-Za-z0-9]/;
const lowercasePattern = /[a-z]/;
const uppercasePattern = /[A-Z]/;
const letterPattern = /[A-Za-z]/;
const numberPattern = /\d/;

export const getPasswordStrength = (password: string): PasswordStrength => {
  const checks = {
    minLength: password.length >= 8,
    letters: letterPattern.test(password),
    numbers: numberPattern.test(password),
    symbols: symbolPattern.test(password),
    mixedCase: lowercasePattern.test(password) && uppercasePattern.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  if (score >= 4) {
    return { label: 'Hard', score, checks };
  }

  if (score >= 3) {
    return { label: 'Medium', score, checks };
  }

  return { label: 'Low', score, checks };
};