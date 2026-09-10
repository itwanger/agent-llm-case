import { useMemo, useState } from 'react';
import { FAQ_INTRO, FAQ_ITEMS } from '../data/faq';
import './faq.css';

/**
 * 「有问，就有答。」FAQ 折叠列表。
 * 单项展开/收起、全部展开、全部收起，aria-expanded 与图标状态保持一致。
 */
export function Faq() {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const allOpen = openIds.length === FAQ_ITEMS.length;

  const toggle = (id: string) =>
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAll = () => setOpenIds(allOpen ? [] : FAQ_ITEMS.map((i) => i.id));

  const label = useMemo(() => (allOpen ? '折叠全部项目' : '全部展开'), [allOpen]);

  return (
    <section className="section section--alt faq" id="faq">
      <div className="viewport-content">
        <header className="section-header faq__header">
          <h2 className="section-header__headline type-section-header reveal">{FAQ_INTRO}</h2>
          <div className="section-header__action reveal">
            <button type="button" className="link-more link-more--button" onClick={toggleAll}>
              {label}
            </button>
          </div>
        </header>

        <ul className="faq__list">
          {FAQ_ITEMS.map((item) => {
            const open = openIds.includes(item.id);
            return (
              <li className="faq__item" key={item.id} data-open={open}>
                <h3 className="faq__question">
                  <button
                    type="button"
                    className="faq__trigger"
                    id={`${item.id}-button`}
                    aria-expanded={open}
                    aria-controls={`${item.id}-tray`}
                    onClick={() => toggle(item.id)}
                  >
                    <span className="faq__question-text">{item.question}</span>
                    <span className="faq__icon" aria-hidden="true">
                      <svg viewBox="0 0 17 8.85" width="26" height="15" focusable="false">
                        <polyline
                          points="0.9,0.9 8.5,7.95 16.1,0.9"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                </h3>
                <div
                  className="faq__tray"
                  id={`${item.id}-tray`}
                  role="region"
                  aria-labelledby={`${item.id}-button`}
                  hidden={!open}
                >
                  <div className="faq__answer">
                    {item.answer.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
