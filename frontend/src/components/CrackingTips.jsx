const tips = [
  'The default wordlist contains 100,000+ common JWT secrets.',
  'Upload a custom wordlist for a targeted security test.',
  'Weak values such as “secret”, “key”, and “password” are often recovered quickly.',
  'Large wordlists take longer to process.',
  'Dictionary cracking supports HMAC tokens: HS256, HS384, and HS512.'
]

function CrackingTips() {
  return (
    <section className="cracking-tips-section" aria-labelledby="cracking-tips-title">
      <div className="cracking-tips-intro">
        <span className="privacy-feature-kicker">Before you begin</span>
        <h2 id="cracking-tips-title">Tips for effective JWT cracking.</h2>
        <p>Use focused wordlists and test only tokens you are authorized to assess.</p>
      </div>
      <ul className="cracking-tips-list">
        {tips.map((tip, index) => (
          <li key={tip}><span>{String(index + 1).padStart(2, '0')}</span><p>{tip}</p></li>
        ))}
      </ul>
    </section>
  )
}

export default CrackingTips
