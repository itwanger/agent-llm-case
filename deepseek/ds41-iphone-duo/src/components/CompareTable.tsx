import { COMPARE_INTRO, COMPARE_PRODUCTS } from '../data/compare';
import './compare-table.css';

/** 「看看哪款 iPhone 适合你」：两张对齐的机型卡片。 */
export function CompareTable() {
  return (
    <section className="section section--alt compare" id="compare">
      <div className="viewport-content">
        <header className="section-header">
          <h2 className="section-header__headline type-section-header reveal">
            {COMPARE_INTRO.headline}
          </h2>
          <div className="section-header__action reveal">
            <a
              className="link-more"
              href={COMPARE_INTRO.href}
              target="_blank"
              rel="noreferrer noopener"
            >
              {COMPARE_INTRO.cta}
            </a>
          </div>
        </header>
      </div>

      <div className="viewport-content compare__scroll">
        <ul className="compare__grid">
          {COMPARE_PRODUCTS.map((product) => (
            <li className="compare__tile" key={product.id}>
              <div className="compare__head">
                <span className="compare__badge">{product.badge}</span>
                <p className="compare__name">{product.name}</p>
              </div>

              <div className="compare__image">
                <img
                  src={product.image}
                  alt={product.alt}
                  loading="lazy"
                  decoding="async"
                  width={628}
                  height={628}
                />
              </div>

              <ul className="compare__colors" aria-label="可选颜色">
                {product.colors.map((color) => (
                  <li key={color.name}>
                    <span
                      className="compare__swatch"
                      style={{ background: color.swatch }}
                      role="img"
                      aria-label={color.name}
                    />
                  </li>
                ))}
              </ul>

              <p className="compare__positioning">
                {product.positioning.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>

              <p className="compare__price">
                {product.price[0]}
                <br />
                {product.price[1]}
              </p>

              <div className="compare__ctas">
                {product.ctas.map((cta) =>
                  cta.current ? (
                    <span className="compare__current" key={cta.label}>
                      {cta.label}
                      <span className="visually-hidden">{product.name}</span>
                    </span>
                  ) : (
                    <a
                      key={cta.label}
                      className="link-more"
                      href={cta.href}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {cta.label}
                    </a>
                  ),
                )}
              </div>

              <ul className="compare__touts">
                {product.touts.map((tout, i) => (
                  <li className="compare__tout" key={`${product.id}-${i}`}>
                    {tout.icon ? (
                      <img className="compare__tout-icon" src={tout.icon} alt="" loading="lazy" />
                    ) : (
                      <p className="compare__tout-icon compare__tout-icon--text">{tout.subheading}</p>
                    )}
                    <ul className="compare__tout-list">
                      {tout.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div className="compare__footer">
        <a
          className="compare__footer-pill"
          href={COMPARE_INTRO.compareHref}
          target="_blank"
          rel="noreferrer noopener"
        >
          {COMPARE_INTRO.compareCta}
        </a>
      </div>
    </section>
  );
}
