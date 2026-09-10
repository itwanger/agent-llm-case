import { useMemo, useState } from 'react';
import { VIEWER_INTRO, VIEWER_SLIDER, VIEWER_STATES } from '../data/viewer';
import { PictureImage } from './common/PictureImage';
import './product-viewer.css';

const SLIDER = VIEWER_STATES[0];
const CLOSED = VIEWER_STATES.find((s) => s.id === 'closed')!;
const TENT = VIEWER_STATES.find((s) => s.id === 'tent')!;

/**
 * 折叠滑块使用真实拍摄的闭合 / 半开 / 展开三帧。
 *
 * 三帧是同一台机器的不同姿态，直接交叉淡化会出现「重影」，
 * 所以这里只按进度选中其中一帧（分段切换），切换时做一次短促淡入。
 */
const FOLD_FRAMES = [CLOSED, TENT, SLIDER] as const;

function foldIndex(value: number) {
  if (value < 0.25) return 0;
  if (value < 0.75) return 1;
  return 2;
}

function foldLabel(value: number) {
  if (value <= 0.15) return VIEWER_SLIDER.minLabel;
  if (value >= 0.85) return VIEWER_SLIDER.maxLabel;
  return VIEWER_SLIDER.midLabel;
}

function StateIcon({ id }: { id: string }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 } as const;
  switch (id) {
    case 'foldable':
      return (
        <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
          <rect x="2.5" y="6" width="8" height="12" rx="1.6" {...common} />
          <rect x="13.5" y="6" width="8" height="12" rx="1.6" {...common} />
        </svg>
      );
    case 'landscape':
      return (
        <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
          <rect x="1.8" y="6.5" width="20.4" height="11" rx="2" {...common} />
        </svg>
      );
    case 'portrait':
      return (
        <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
          <rect x="6.5" y="1.8" width="11" height="20.4" rx="2" {...common} />
        </svg>
      );
    case 'closed':
      return (
        <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
          <rect x="7.5" y="2" width="9" height="20" rx="2.2" {...common} />
        </svg>
      );
    case 'laptop':
      return (
        <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
          <path d="M5 15V8.5h14V15" {...common} />
          <path d="M3 15h18l-1.4 2.4H4.4z" {...common} />
        </svg>
      );
    case 'tent':
      return (
        <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
          <path d="M12 3.5 4 20h16z" {...common} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
          <path d="M12 3.2 19 6v5.6c0 4.3-2.9 7.4-7 8.9-4.1-1.5-7-4.6-7-8.9V6z" {...common} />
          <path d="m9 12 2.2 2.2L15.4 10" {...common} />
        </svg>
      );
  }
}

/**
 * 「定睛细看」产品查看器。
 *
 * 参考页面是浅灰章节里一块 1440×760 的整幅产品画面（白底），
 * 左侧 90px 处浮着一列 56px 高、圆角 28px 的浅灰控制胶囊：
 * 第一项是可拖动的开合滑块，其余六项是固定姿态。
 * 原站用 3D 序列驱动；这里用同一组真实产品图，滑块进度在
 * 闭合 → 半开 → 展开之间交叉淡化，固定姿态各自切换实拍图与说明。
 */
export function ProductViewer() {
  const [activeId, setActiveId] = useState<string>(SLIDER.id);
  // 默认落在展开态，与参考页面进入该章节时的画面一致
  const [fold, setFold] = useState(1);

  const active = useMemo(() => VIEWER_STATES.find((s) => s.id === activeId) ?? SLIDER, [activeId]);
  const isSlider = activeId === SLIDER.id;
  const frame = FOLD_FRAMES[foldIndex(fold)];

  return (
    <section className="section section--alt viewer" id="product-viewer">
      <div className="viewport-content">
        <header className="section-header">
          <h2 className="section-header__headline type-section-header reveal">{VIEWER_INTRO}</h2>
        </header>
      </div>

      <div className="viewer__component">
        <div className="viewer__inner">
          <div className="viewer__stage">
            {isSlider ? (
              <div
                className="viewer__frames"
                role="img"
                aria-label={`${SLIDER.alt}（当前姿态：${foldLabel(fold)}）`}
              >
                <PictureImage
                  key={frame.id}
                  className="viewer__frame viewer__frame--enter"
                  src={frame.image}
                  srcSmall={frame.imageSmall}
                  alt=""
                  priority
                />
              </div>
            ) : (
              <div className="viewer__frames" role="img" aria-label={active.alt}>
                <PictureImage
                  key={active.id}
                  className="viewer__frame viewer__frame--enter"
                  src={active.image}
                  srcSmall={active.imageSmall}
                  alt=""
                />
              </div>
            )}
          </div>

          <div className="viewer__rail" role="group" aria-label="定睛细看图库">
            <ul className="viewer__controls">
              {VIEWER_STATES.map((state) => {
                const selected = state.id === activeId;
                return (
                  <li key={state.id} className="viewer__control-item">
                    <button
                      type="button"
                      className="viewer__control"
                      data-selected={selected}
                      aria-pressed={selected}
                      onClick={() => setActiveId(state.id)}
                    >
                      <span className="viewer__control-icon">
                        <StateIcon id={state.id} />
                      </span>
                      <span className="viewer__control-label">{state.label}</span>
                    </button>

                    {selected && (
                      <div className="viewer__panel">
                        <p className="viewer__panel-copy">
                          <strong>{state.bodyTitle}</strong>
                          <span>{state.body}</span>
                        </p>

                        {state.id === SLIDER.id && (
                          <div className="viewer__slider">
                            <p className="viewer__slider-caption type-caption" id="detent-caption">
                              {VIEWER_SLIDER.caption}
                            </p>
                            <input
                              type="range"
                              className="viewer__range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={fold}
                              aria-labelledby="detent-caption"
                              aria-valuetext={foldLabel(fold)}
                              onChange={(e) => setFold(Number(e.target.value))}
                            />
                            <div className="viewer__slider-row">
                              <span className="viewer__slider-end" aria-hidden="true">
                                闭合
                              </span>
                              <span className="viewer__slider-state" aria-live="polite">
                                {foldLabel(fold)}
                              </span>
                              <span className="viewer__slider-end" aria-hidden="true">
                                展开
                              </span>
                            </div>
                            <div className="viewer__slider-actions">
                              <button
                                type="button"
                                className="viewer__step"
                                onClick={() => setFold((v) => Math.max(0, Number((v - 0.25).toFixed(2))))}
                              >
                                折起
                              </button>
                              <button
                                type="button"
                                className="viewer__step"
                                onClick={() => setFold((v) => Math.min(1, Number((v + 0.25).toFixed(2))))}
                              >
                                展开
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
