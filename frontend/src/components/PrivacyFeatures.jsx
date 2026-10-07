function PrivacyFeatures() {
  return (
    <section className="privacy-feature-section" aria-label="Privacy and live editing">
      <article className="privacy-feature-card">
        <div>
          <span className="privacy-feature-kicker">Private by design</span>
          <h4>Your token stays in this browser.</h4>
          <p>Decoding, editing, signing, and asymmetric verification run locally. Your token and keys are not stored.</p>
        </div>
        <span className="privacy-feature-link">Browser-only processing <span aria-hidden="true">›</span></span>
      </article>
      <article className="privacy-feature-card privacy-feature-visual">
        <div>
          <span className="privacy-feature-kicker">Live workflow</span>
          <h4>Edit once. Re-sign instantly.</h4>
          <p>Header and payload changes update the encoded token as you work.</p>
        </div>
        <div className="local-flow" aria-label="Local token signing flow">
          <span>Claims</span><i aria-hidden="true">→</i><span className="local-flow-accent">Sign</span><i aria-hidden="true">→</i><span>JWT</span>
        </div>
      </article>
    </section>
  )
}

export default PrivacyFeatures
