import { useState } from 'react';
import { DESIGN_COLORS, DESIGN_COPY } from '../data/design';
import { PictureImage } from './common/PictureImage';
import './design.css';

/**
 * 「可折叠设计」：章节引导 + 大标题 + 介绍文字 + 大幅机身展示，
 * 下方是配色切换（夜空色 / 星光白色）。切换时图片淡入淡出，
 * 两种配色使用各自独立的产品图，而不是同一张图加滤镜。
 */
export function Design() {
  const [activeId, setActiveId] = useState(DESIGN_COLORS[0].id);

  return (
    <section className="section design" id="design">
      <div className="viewport-content design__intro">
        <div className="type-lockup type-lockup--center">
          <h2 className="type-lockup__eyebrow type-eyebrow reveal">{DESIGN_COPY.eyebrow}</h2>
          <p className="design__headline reveal">
            {DESIGN_COPY.headline[0]}
            <br />
            {DESIGN_COPY.headline[1]}
          </p>
          <div className="type-lockup__body type-copy reveal">{DESIGN_COPY.body}</div>
        </div>
      </div>

      <div className="viewport-content design__gallery">
        <div className="design__stage">
          {DESIGN_COLORS.map((color) => (
            <figure
              className="design__figure"
              key={color.id}
              data-active={color.id === activeId}
              aria-hidden={color.id !== activeId}
            >
              <PictureImage
                src={color.image}
                srcSmall={color.imageSmall}
                alt={color.alt}
                priority={color.id === DESIGN_COLORS[0].id}
                width={2524}
                height={1376}
              />
            </figure>
          ))}
        </div>

        <fieldset className="colornav colornav--center">
          <legend className="visually-hidden">选择外观</legend>
          <ul className="colornav__items">
            {DESIGN_COLORS.map((color) => (
              <li className="colornav__item" key={color.id}>
                <input
                  className="colornav__input"
                  type="radio"
                  name="design-color"
                  id={`design-color-${color.id}`}
                  value={color.id}
                  checked={color.id === activeId}
                  onChange={() => setActiveId(color.id)}
                />
                <label className="colornav__label" htmlFor={`design-color-${color.id}`}>
                  <span className="colornav__swatch" style={{ background: color.swatch }} aria-hidden="true" />
                  <span className="colornav__name">{color.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </div>
    </section>
  );
}
