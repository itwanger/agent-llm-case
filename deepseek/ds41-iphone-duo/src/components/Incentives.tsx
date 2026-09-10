import { useState } from 'react';
import { INCENTIVE_CARDS, INCENTIVE_INTRO, type IncentiveCard } from '../data/incentives';
import { useCarousel } from '../hooks/useCarousel';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { PaddleNav } from './common/PaddleNav';
import { Modal } from './common/Modal';
import './incentives.css';

/** 「在 Apple 购买 iPhone 好处多多」横向权益卡片。 */
export function Incentives() {
  const { ref, index, atStart, atEnd, scrollByPage, scrollToIndex, onKeyDown } =
    useCarousel<HTMLUListElement>(INCENTIVE_CARDS.length);
  const [detail, setDetail] = useState<IncentiveCard | null>(null);
  const detailRef = useFocusTrap<HTMLDivElement>(Boolean(detail), () => setDetail(null));

  return (
    <section className="section section--alt incentives" id="incentive">
      <div className="viewport-content">
        <header className="section-header">
          <h2 className="section-header__headline type-section-header reveal">
            {INCENTIVE_INTRO.eyebrow}
            <br />
            {INCENTIVE_INTRO.headline[0]}
          </h2>
          <div className="section-header__action reveal">
            <a
              className="link-more"
              href={INCENTIVE_INTRO.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              {INCENTIVE_INTRO.cta}
            </a>
          </div>
        </header>
      </div>

      <div className="incentives__gallery">
        <ul
          className="incentives__track"
          ref={ref}
          tabIndex={0}
          role="group"
          aria-label="购买权益画廊，可使用左右方向键浏览"
          onKeyDown={onKeyDown}
        >
          {INCENTIVE_CARDS.map((card, i) => (
            <li
              className="incentives__card"
              key={card.id}
              data-current={index === i}
              aria-hidden={index !== i}
            >
              <div className="incentives__card-copy">
                <p className="incentives__card-eyebrow">{card.eyebrow}</p>
                <p className="incentives__card-headline">
                  {card.headline.map((line) => (
                    <span key={line}>
                      {line}
                      <br />
                    </span>
                  ))}
                </p>
                <p className="incentives__card-body">{card.body}</p>
                {card.details ? (
                  <button
                    type="button"
                    className="link-more link-more--button"
                    onClick={() => setDetail(card)}
                    aria-haspopup="dialog"
                  >
                    了解详情
                  </button>
                ) : (
                  card.href && (
                    <a className="link-more" href={card.href} target="_blank" rel="noreferrer noopener">
                      {card.cta ?? '进一步了解'}
                    </a>
                  )
                )}
              </div>
              <div className="incentives__card-media">
                <img
                  src={card.image}
                  alt={card.alt}
                  loading="lazy"
                  decoding="async"
                  width={372}
                  height={284}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="viewport-content incentives__controls">
        <ul className="incentives__dots">
          {INCENTIVE_CARDS.map((card, i) => (
            <li key={card.id}>
              <button
                type="button"
                className="highlights__dot"
                data-current={index === i}
                aria-label={`第 ${i + 1} 项：${card.eyebrow}`}
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
          label="购买权益画廊"
        />
      </div>

      <Modal
        open={Boolean(detail)}
        label={detail?.details?.title ?? '说明'}
        onClose={() => setDetail(null)}
        trapRef={detailRef}
      >
        {detail?.details && (
          <div>
            {detail.details.paragraphs.map((p) => (
              <p key={p} className="type-body">
                {p}
              </p>
            ))}
            {detail.href && (
              <p className="incentives__modal-link">
                <a className="link-more" href={detail.href} target="_blank" rel="noreferrer noopener">
                  {detail.cta ?? '进一步了解'}
                </a>
              </p>
            )}
            <p className="incentives__modal-note type-caption">
              以上条款文字取自参考页面公开内容，用于前端复刻演示。
            </p>
          </div>
        )}
      </Modal>
    </section>
  );
}
