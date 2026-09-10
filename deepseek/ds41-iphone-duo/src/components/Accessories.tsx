import { ACCESSORIES_INTRO, ACCESSORY_CARDS } from '../data/accessories';
import './accessories.css';

/** 「配件」章节：图文 + 两件配件图。 */
export function Accessories() {
  return (
    <section className="section story accessories" id="accessories">
      <div className="viewport-content">
        <div className="type-lockup type-lockup--center">
          <h2 className="type-lockup__eyebrow type-eyebrow reveal">{ACCESSORIES_INTRO.eyebrow}</h2>
          <p className="type-lockup__headline type-headline reveal">
            {ACCESSORIES_INTRO.headline[0]}
            <br />
            {ACCESSORIES_INTRO.headline[1]}
          </p>
          <div className="type-lockup__body type-copy reveal">{ACCESSORIES_INTRO.body}</div>
        </div>

        <ul className="accessories__bento" data-reveal-group>
          {ACCESSORY_CARDS.map((card, i) => (
            <li className={`accessories__item accessories__item--${i + 1} reveal`} key={card.id}>
              <img
                src={card.image}
                alt={card.alt}
                loading="lazy"
                decoding="async"
                width={1260}
                height={720}
              />
              <p className="visually-hidden">{card.caption}</p>
            </li>
          ))}
        </ul>

        <div className="accessories__cta reveal">
          <a
            className="button-pill"
            href={ACCESSORIES_INTRO.href}
            target="_blank"
            rel="noreferrer noopener"
          >
            {ACCESSORIES_INTRO.cta}
          </a>
        </div>
      </div>
    </section>
  );
}
