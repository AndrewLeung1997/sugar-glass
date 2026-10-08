import { LANDING } from '../landingContent.js'

export default function Landing({ onEnter }) {
  const { brand, hero, about, stats, features, testimonials, finalCta, footer } = LANDING

  return (
    <>
      {/* Hero — 全屏闊，獨立於 .landing 容器 */}
      <section className="lp-hero">
        <div className="lp-hero-bg" style={{ backgroundImage: `url(${hero.bgImage})` }} />
        <div className="lp-hero-grad" />
        <div className="lp-hero-inner">
          <div className="lp-hero-badge">{hero.badge}</div>
          <h1 className="lp-hero-title">{hero.title}</h1>
          <p className="lp-hero-subtitle">{hero.subtitle}</p>
          <p className="lp-hero-desc">{hero.description}</p>
          <div className="lp-hero-cta">
            <button className="lp-btn primary" onClick={onEnter}>
              <span className="lp-btn-sub">{hero.ctaPrimarySub}</span>
              <span className="lp-btn-main">{hero.ctaPrimary}</span>
            </button>
            <button className="lp-btn secondary" onClick={onEnter}>
              {hero.ctaSecondary}
              <span className="lp-btn-arrow">→</span>
            </button>
          </div>
        </div>
      </section>

      <div className="landing">

      {/* About */}
      <section className="lp-section lp-about">
        <div className="lp-label">{about.label}</div>
        <h2 className="lp-section-title">{about.title}</h2>
        <p className="lp-section-subtitle">{about.subtitle}</p>
        <p className="lp-section-desc">{about.description}</p>
      </section>

      {/* Stats */}
      <section className="lp-section lp-stats">
        <div className="lp-label">{stats.label}</div>
        <h2 className="lp-section-title">{stats.title}</h2>
        <div className="lp-stats-grid">
          {stats.groups.map((g, i) => (
            <div key={i} className="lp-stat-col">
              <h3 className="lp-stat-label">{g.label}</h3>
              {g.items.map((item, j) => (
                <div key={j} className="lp-stat-row">
                  <span className="lp-stat-val">{item.value}</span>
                  <span className="lp-stat-pct">{item.percent}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="lp-section lp-features">
        <div className="lp-label">{features.label}</div>
        <h2 className="lp-section-title">{features.title}</h2>
        <p className="lp-section-subtitle">{features.subtitle}</p>
        <div className="lp-features-grid">
          {features.items.map((f, i) => (
            <div key={i} className="lp-feature">
              <div className="lp-feature-num">{f.num}</div>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="lp-section lp-testimonials">
        <div className="lp-label">{testimonials.label}</div>
        <h2 className="lp-section-title">{testimonials.title}</h2>
        <div className="lp-testi-grid">
          {testimonials.items.map((t, i) => (
            <div key={i} className="lp-testi">
              <div className="lp-testi-meta">{t.age} · {t.duration}</div>
              <h3 className="lp-testi-title">{t.title}</h3>
              <p className="lp-testi-text">{t.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-final-cta">
        <h2 className="lp-final-title">{finalCta.title}</h2>
        <button className="lp-btn primary large" onClick={onEnter}>{finalCta.button}</button>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">{brand.logo}</div>
        <div className="lp-footer-links">
          {footer.links.map((l, i) => (
            <span key={i} className="lp-footer-link">{l}</span>
          ))}
        </div>
        <div className="lp-footer-copy">{footer.copyright}</div>
      </footer>
    </div>
    </>
  )
}
