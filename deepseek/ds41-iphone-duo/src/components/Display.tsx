import { ASSETS } from '../data/assets';
import { DISPLAY_COPY, DISPLAY_FEATURES, DISPLAY_FOOTNOTES, DISPLAY_STAT } from '../data/display';
import { LazyVideo } from './common/LazyVideo';
import './product-stories.css';

/** 「宽阔大屏」章节：大图 + 说明 + 关键数字。 */
export function Display() {
  return (
    <section className="section story display-story" id="display">
      <div className="viewport-content story__intro">
        <div className="type-lockup type-lockup--center">
          <h2 className="type-lockup__eyebrow type-eyebrow reveal">{DISPLAY_COPY.eyebrow}</h2>
          <p className="type-lockup__headline type-headline reveal">{DISPLAY_COPY.headline}</p>
        </div>
      </div>

      <div className="viewport-content story__stage-wrap">
        <div className="story__stage reveal">
          <LazyVideo
            src={ASSETS.display.immersiveVideo}
            poster={ASSETS.display.immersive}
            posterSmall={ASSETS.display.immersiveSm}
            ratio="1050 / 754"
            label={DISPLAY_COPY.mediaAlt}
            decorative={false}
          />
        </div>
        <p className="story__caption type-caption reveal">{DISPLAY_COPY.caption}</p>
      </div>

      <div className="viewport-content display-story__details">
        <div className="display-story__body type-copy reveal">{DISPLAY_COPY.body}</div>
        <div className="display-story__facts">
          <ul className="display-story__features">
            {DISPLAY_FEATURES.map((f) => (
              <li key={f.title} className="reveal">
                <p className="display-story__feature-title">{f.title}</p>
                <p className="display-story__feature-body">{f.body}</p>
              </li>
            ))}
          </ul>
          <p className="display-story__stat reveal">
            <span className="display-story__stat-value">{DISPLAY_STAT.value}</span>
            <span className="display-story__stat-label">{DISPLAY_STAT.label}</span>
          </p>
        </div>
      </div>

      <div className="viewport-content">
        <div className="display-story__band" data-reveal-group>
          {DISPLAY_FOOTNOTES.map((item) => (
            <div className="display-story__band-item reveal" key={item.value}>
              <p className="display-story__band-caption">{item.caption}</p>
              <p className="display-story__band-value">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
