import { useState } from 'react';
import { ASSETS } from '../data/assets';
import {
  CAMERA_FEATURES,
  CAMERA_GALLERY,
  CAMERA_STATS,
  CAMERAS_INTRO,
} from '../data/cameras';
import { LazyVideo } from './common/LazyVideo';
import { PictureImage } from './common/PictureImage';
import './product-stories.css';

const FEATURE_VIDEO: Record<string, string> = {
  'smart-take': ASSETS.camera.smartTakeVideo,
  'duo-preview': ASSETS.camera.duoPreviewVideo,
  'kid-cue': ASSETS.camera.kidCueVideo,
  'duo-facetime': ASSETS.camera.duoFacetimeVideo,
};

/** 「先进的拍摄系统」章节。 */
export function Cameras() {
  const [tab, setTab] = useState(0);

  return (
    <section className="section story cameras" id="cameras">
      <div className="viewport-content cameras__intro">
        <div className="type-lockup type-lockup--start">
          <h2 className="type-lockup__eyebrow type-eyebrow reveal">{CAMERAS_INTRO.eyebrow}</h2>
          <p className="type-lockup__headline type-headline reveal">
            {CAMERAS_INTRO.headline[0]}
            <br />
            {CAMERAS_INTRO.headline[1]}
          </p>
          <div className="type-lockup__body type-copy reveal">{CAMERAS_INTRO.body}</div>
        </div>
      </div>

      <div className="viewport-content cameras__hardware" data-reveal-group>
        <figure className="cameras__hardware-item reveal">
          <PictureImage
            src={CAMERAS_INTRO.leftImage}
            srcSmall={CAMERAS_INTRO.leftImageSmall}
            alt={CAMERAS_INTRO.leftAlt}
            width={491}
            height={1145}
          />
        </figure>
        <figure className="cameras__hardware-item reveal">
          <PictureImage
            src={CAMERAS_INTRO.rightImage}
            srcSmall={CAMERAS_INTRO.rightImageSmall}
            alt={CAMERAS_INTRO.rightAlt}
            width={491}
            height={1145}
          />
        </figure>

        <ul className="cameras__stats">
          {CAMERA_STATS.map((stat) => (
            <li className="cameras__stat reveal" key={stat.label}>
              {stat.value && (
                <p className="cameras__stat-value">
                  {stat.value}
                  <span className="cameras__stat-unit">{stat.unit}</span>
                </p>
              )}
              <p className="cameras__stat-label">{stat.label}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="cameras__features">
        <div className="viewport-content">
          <h2 className="type-section-header reveal">
            全是妙招，
            <br />
            全家都圈粉。
          </h2>
        </div>

        <div className="viewport-content cameras__tabs-wrap">
          <div className="tabnav" role="tablist" aria-label="拍摄功能">
            {CAMERA_FEATURES.map((feature, i) => (
              <button
                key={feature.id}
                type="button"
                role="tab"
                id={`camera-tab-${feature.id}`}
                aria-selected={i === tab}
                aria-controls={`camera-panel-${feature.id}`}
                tabIndex={i === tab ? 0 : -1}
                className="tabnav__link"
                data-selected={i === tab}
                onClick={() => setTab(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') setTab((tab + 1) % CAMERA_FEATURES.length);
                  if (e.key === 'ArrowLeft')
                    setTab((tab - 1 + CAMERA_FEATURES.length) % CAMERA_FEATURES.length);
                }}
              >
                {feature.tab}
              </button>
            ))}
          </div>
        </div>

        <div className="cameras__panel">
          {CAMERA_FEATURES.map((feature, i) => (
            <div
              key={feature.id}
              id={`camera-panel-${feature.id}`}
              role="tabpanel"
              aria-labelledby={`camera-tab-${feature.id}`}
              hidden={i !== tab}
              className="cameras__panel-item"
            >
              <LazyVideo
                src={FEATURE_VIDEO[feature.id]}
                poster={feature.image}
                ratio="1260 / 708"
                label={feature.alt}
                decorative={false}
              />
              <div className="viewport-content">
                <p className="cameras__panel-copy">
                  <strong>{feature.title}</strong>
                  <span>{feature.body}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cameras__gallery-block">
        <div className="viewport-content">
          <h2 className="type-section-header reveal">
            一设好，
            <br />
            一连串惊艳。
          </h2>
        </div>
        <div className="viewport-content">
          <ul className="cameras__gallery" data-reveal-group>
            {CAMERA_GALLERY.map((item) => (
              <li className="cameras__gallery-item reveal" key={item.id}>
                <div className="cameras__gallery-media">
                  <img
                    src={item.image}
                    alt={item.alt}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={360}
                  />
                </div>
                <p className="cameras__gallery-copy">
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
