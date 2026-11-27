import { getPasswordRules } from '../lib/validation/password'

type PasswordRulesProps = {
  password: string
}

function PasswordRules({ password }: PasswordRulesProps) {
  // Only show the rules once the user starts typing.
  if (!password) return null

  const rules = getPasswordRules(password)

  return (
    <ul
      aria-label="Password requirements"
      style={{ listStyle: 'none', paddingLeft: 0 }}
    >
      {rules.map((rule) => (
        <li key={rule.id} style={{ color: rule.passed ? 'green' : 'inherit' }}>
          {rule.passed ? '✓' : '○'} {rule.label}
        </li>
      ))}
    </ul>
  )
}

export default PasswordRules