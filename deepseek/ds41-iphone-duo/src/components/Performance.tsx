import { useState } from 'react';
import { ASSETS } from '../data/assets';
import {
  PERFORMANCE_BASE_STATS,
  PERFORMANCE_BATTERY,
  PERFORMANCE_DEFAULT_MODEL,
  PERFORMANCE_INTRO,
  PERFORMANCE_MODELS,
} from '../data/performance';
import './performance.css';

/** 「实力全屏全开」：芯片素材 + 大字号数字 + 机型比较选择器。 */
export function Performance() {
  const [modelId, setModelId] = useState(PERFORMANCE_DEFAULT_MODEL);
  const model = PERFORMANCE_MODELS.find((m) => m.id === modelId) ?? PERFORMANCE_MODELS[0];

  return (
    <section className="section story performance" id="performance">
      <div className="viewport-content performance__intro">
        <div className="type-lockup type-lockup--start">
          <h2 className="type-lockup__eyebrow type-eyebrow reveal">{PERFORMANCE_INTRO.eyebrow}</h2>
          <p className="type-lockup__headline type-headline reveal">{PERFORMANCE_INTRO.headline}</p>
          <div className="type-lockup__body type-copy reveal">{PERFORMANCE_INTRO.body}</div>
        </div>
      </div>

      <div className="viewport-content">
        <ul className="performance__base-stats" data-reveal-group>
          {PERFORMANCE_BASE_STATS.map((stat) => (
            <li className="performance__base-stat reveal" key={stat.label}>
              <p className="performance__stat-caption">{stat.caption}</p>
              <p className="performance__stat-value">{stat.value}</p>
              <p className="performance__stat-label">{stat.label}</p>
              <p className="performance__stat-note">{stat.note}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="performance__media">
        <img
          src={PERFORMANCE_INTRO.media}
          alt={PERFORMANCE_INTRO.mediaAlt}
          loading="lazy"
          decoding="async"
          width={1440}
          height={960}
        />
      </div>

      <div className="viewport-content performance__battery">
        <div className="performance__battery-copy">
          <h3 className="performance__battery-title reveal">{PERFORMANCE_BATTERY.title}</h3>
          <p className="type-copy reveal">{PERFORMANCE_BATTERY.body}</p>
        </div>
        <ul className="performance__battery-stats" data-reveal-group>
          {PERFORMANCE_BATTERY.stats.map((stat) => (
            <li className="performance__battery-stat reveal" key={stat.label}>
              <p className="performance__stat-caption">{stat.caption}</p>
              <p className="performance__stat-value performance__stat-value--lg">{stat.value}</p>
              <p className="performance__stat-label">{stat.label}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="viewport-content performance__compare">
        <div className="performance__compare-bar">
          <label className="performance__compare-label" htmlFor="performance-model-select">
            选个机型比比看
          </label>
          <div className="performance__select-wrap">
            <select
              id="performance-model-select"
              className="performance__select"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
            >
              {PERFORMANCE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <span className="performance__select-chevron" aria-hidden="true" />
          </div>
        </div>

        <p className="performance__compare-note type-caption">
          与 A20 Pro 芯片相比，{model.name} 的性能与续航差异如下：
        </p>

        <ul className="performance__compare-grid" aria-live="polite">
          {model.stats.map((stat) => (
            <li className="performance__compare-item" key={stat.label}>
              <p className="performance__stat-caption">{stat.caption}</p>
              <p className="performance__stat-value">{stat.value}</p>
              <p className="performance__stat-label">{stat.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export const PERFORMANCE_ICON = ASSETS.performance.iconBattery;
