import { ENVIRONMENT, VALUES } from '../data/compare';
import './values.css';

/** 「环境」与「我们的价值观」两个小节。 */
export function EnvironmentAndValues() {
  return (
    <>
      <section className="section section--alt environment" id="environment">
        <div className="viewport-content">
          <header className="section-header">
            <h2 className="section-header__headline type-section-header reveal">
              {ENVIRONMENT.headline}
            </h2>
            <div className="section-header__action reveal">
              <a
                className="link-more"
                href={ENVIRONMENT.link.href}
                target="_blank"
                rel="noreferrer noopener"
              >
                {ENVIRONMENT.link.label}
              </a>
            </div>
          </header>

          <ul className="environment__stats" data-reveal-group>
            {ENVIRONMENT.stats.map((stat) => (
              <li className="environment__stat reveal" key={stat.value}>
                <img src={stat.icon} alt="" loading="lazy" width={56} height={56} />
                <p className="environment__stat-caption">{stat.caption}</p>
                <p className="environment__stat-value">
                  {stat.label && <span className="environment__stat-label">{stat.label}</span>}
                  {stat.value}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section--alt values" id="values">
        <div className="viewport-content">
          <h2 className="type-section-header values__headline reveal">{VALUES.headline}</h2>

          <ul className="values__cards" data-reveal-group>
            {VALUES.cards.map((card) => (
              <li className="values__card reveal" key={card.id}>
                <img src={card.icon} alt="" loading="lazy" width={56} height={56} />
                <p className="values__card-eyebrow">{card.eyebrow}</p>
                <p className="values__card-body">{card.body}</p>
                <a
                  className="link-more"
                  href={card.link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {card.link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
