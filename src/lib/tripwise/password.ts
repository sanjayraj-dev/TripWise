/** BR-002: 8+ chars, upper, lower, digit, special. */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) issues.push("one uppercase letter");
  if (!/[a-z]/.test(password)) issues.push("one lowercase letter");
  if (!/[0-9]/.test(password)) issues.push("one digit");
  if (!/[^A-Za-z0-9]/.test(password)) issues.push("one special character");
  return issues;
}
