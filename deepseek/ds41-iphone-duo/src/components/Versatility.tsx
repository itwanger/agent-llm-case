import { VERSATILITY_CARDS, VERSATILITY_HEADLINE, VERSATILITY_INTRO } from '../data/versatility';
import { useCarousel } from '../hooks/useCarousel';
import { PaddleNav } from './common/PaddleNav';
import { PictureImage } from './common/PictureImage';
import './product-stories.css';

/** 「灵活多用」章节：顶部大图 + 多个姿态的横向画廊。 */
export function Versatility() {
  const { ref, index, atStart, atEnd, scrollByPage, scrollToIndex, onKeyDown } =
    useCarousel<HTMLUListElement>(VERSATILITY_CARDS.length);

  return (
    <section className="section story versatility" id="versatility">
      <div className="versatility__hero">
        <div className="viewport-content">
          <div className="type-lockup type-lockup--center">
            <h2 className="type-lockup__eyebrow type-eyebrow reveal">{VERSATILITY_INTRO.eyebrow}</h2>
            <p className="type-lockup__headline type-headline reveal">
              {VERSATILITY_INTRO.headline[0]}
              <span aria-hidden="true">，</span>
              <br />
              {VERSATILITY_INTRO.headline[1]}
              <span aria-hidden="true">。</span>
            </p>
          </div>
        </div>
        <div className="versatility__hero-media reveal">
          <img
            src={VERSATILITY_INTRO.media}
            alt={VERSATILITY_INTRO.mediaAlt}
            loading="lazy"
            decoding="async"
            width={1440}
            height={648}
          />
        </div>
        <div className="viewport-content">
          <p className="story__body type-copy reveal">{VERSATILITY_INTRO.body}</p>
        </div>
      </div>

      <div className="viewport-content versatility__header">
        <h2 className="type-section-header reveal">
          {VERSATILITY_HEADLINE[0]}
          <br />
          {VERSATILITY_HEADLINE[1]}
        </h2>
      </div>

      <div className="versatility__gallery">
        <ul
          className="versatility__track"
          ref={ref}
          tabIndex={0}
          role="group"
          aria-label="多种使用姿态画廊，可使用左右方向键浏览"
          onKeyDown={onKeyDown}
        >
          {VERSATILITY_CARDS.map((card, i) => (
            <li
              className="versatility__card"
              key={card.id}
              data-current={index === i}
              aria-hidden={index !== i}
            >
              <div className="versatility__card-media">
                <PictureImage
                  src={card.image}
                  srcSmall={card.imageSmall}
                  alt={card.alt}
                  width={1260}
                  height={708}
                />
              </div>
              <div className="versatility__card-copy">
                <p className="versatility__card-title">{card.title}</p>
                <p className="versatility__card-body">{card.body}</p>
                {card.note && <p className="versatility__card-note type-caption">{card.note}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="viewport-content versatility__controls">
        <ul className="versatility__dots">
          {VERSATILITY_CARDS.map((card, i) => (
            <li key={card.id}>
              <button
                type="button"
                className="highlights__dot"
                data-current={index === i}
                aria-label={`第 ${i + 1} 项：${card.title}`}
                aria-current={index === i}
                onClick={() => scrollToIndex(i)}
              >
                <span aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <PaddleNav
          onPrev={() => scrollByPage(-1)}
          onNext={() => scrollByPage(1)}
          atStart={atStart}
          atEnd={atEnd}
          label="多种使用姿态画廊"
        />
      </div>
    </section>
  );
}
