import { ASSETS } from '../data/assets';
import { APPLE_INTELLIGENCE, CONNECTIVITY_CARDS, CONNECTIVITY_HEADLINE, SHARED_INTRO } from '../data/shared';
import './shared-features.css';

/** 「全系全配」：共有功能、Apple 智能预备好、连接功能三张卡片。 */
export function SharedFeatures() {
  return (
    <section className="section section--alt shared" id="shared-features">
      <div className="viewport-content shared__intro">
        <div className="type-lockup type-lockup--center">
          <h2 className="type-lockup__eyebrow type-eyebrow reveal">{SHARED_INTRO.eyebrow}</h2>
          <p className="type-lockup__headline type-headline reveal">
            {SHARED_INTRO.headline[0]}
            <span aria-hidden="true">，</span>
            <br />
            {SHARED_INTRO.headline[1]}
            <span aria-hidden="true">。</span>
          </p>
        </div>
      </div>

      <div className="shared__media reveal">
        <img
          src={SHARED_INTRO.media}
          alt={SHARED_INTRO.mediaAlt}
          loading="lazy"
          decoding="async"
          width={751}
          height={600}
        />
      </div>

      <div className="viewport-content">
        <p className="shared__body type-copy reveal">{SHARED_INTRO.body}</p>
      </div>

      <div className="viewport-content shared__ai">
        <div className="shared__ai-copy">
          <h3 className="shared__ai-title reveal">{APPLE_INTELLIGENCE.eyebrow}</h3>
          <p className="type-copy reveal">{APPLE_INTELLIGENCE.body}</p>
          <p className="type-caption shared__ai-note reveal">{APPLE_INTELLIGENCE.note}</p>
        </div>
        <figure className="shared__ai-media reveal">
          <img
            src={APPLE_INTELLIGENCE.image}
            alt={APPLE_INTELLIGENCE.alt}
            loading="lazy"
            decoding="async"
            width={630}
            height={630}
          />
        </figure>
      </div>

      <div className="viewport-content shared__connectivity">
        <h3 className="type-section-header reveal">
          {CONNECTIVITY_HEADLINE[0]}
          <br />
          {CONNECTIVITY_HEADLINE[1]}
        </h3>

        <ul className="shared__cards" data-reveal-group>
          {CONNECTIVITY_CARDS.map((card) => (
            <li className="shared__card reveal" key={card.id}>
              <div className="shared__card-media">
                <img
                  src={card.image}
                  alt={card.alt}
                  loading="lazy"
                  decoding="async"
                  width={420}
                  height={420}
                />
              </div>
              <p className="shared__card-copy">
                <strong>{card.title}</strong>
                <span>{card.body}</span>
              </p>
              {card.link && (
                <a
                  className="link-more"
                  href={card.link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {card.link.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export const SHARED_GEAR_ICON = ASSETS.shared.siriAi;
