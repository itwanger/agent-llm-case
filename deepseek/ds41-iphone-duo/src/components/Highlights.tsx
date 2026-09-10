import { useCallback, useEffect, useRef, useState } from 'react';
import { HIGHLIGHTS, HIGHLIGHTS_FILM } from '../data/highlights';
import { ASSETS } from '../data/assets';
import { useCarousel } from '../hooks/useCarousel';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { LazyVideo } from './common/LazyVideo';
import { PictureImage } from './common/PictureImage';
import { PaddleNav } from './common/PaddleNav';
import { Modal } from './common/Modal';
import './highlights.css';

/** 每张卡片对应的视频与起始帧；没有视频的卡片用静态图。 */
const CARD_MEDIA: Record<string, { video?: string; poster: string; posterSm?: string }> = {
  display: { poster: ASSETS.highlights.display, posterSm: ASSETS.highlights.displaySm },
  ios: { poster: ASSETS.highlights.ios, posterSm: ASSETS.highlights.iosSm },
  titanium: {
    video: ASSETS.highlights.durabilityVideo,
    poster: ASSETS.highlights.titanium,
    posterSm: ASSETS.highlights.titaniumSm,
  },
  camera: { video: ASSETS.highlights.cameraVideo, poster: ASSETS.highlights.camera, posterSm: ASSETS.highlights.cameraSm },
  chip: { poster: ASSETS.highlights.chip, posterSm: ASSETS.highlights.chipSm },
  battery: {
    video: ASSETS.highlights.batteryVideo,
    poster: ASSETS.highlights.battery,
    posterSm: ASSETS.highlights.batterySm,
  },
};

/**
 * 「先刷重点」：逐张全宽卡片（1260×612，圆角 28px）的横向画廊。
 * 支持左右按钮翻页、触摸横滑、键盘方向键，以及自动播放的启停。
 */
export function Highlights() {
  const { ref, index, atStart, atEnd, scrollByPage, scrollToIndex, onKeyDown } =
    useCarousel<HTMLUListElement>(HIGHLIGHTS.length);
  const [playing, setPlaying] = useState(false);
  const [filmOpen, setFilmOpen] = useState(false);
  const filmRef = useFocusTrap<HTMLDivElement>(filmOpen, () => setFilmOpen(false));
  const reduced = usePrefersReducedMotion();
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    if (!playing || reduced) return;
    const timer = window.setInterval(() => {
      const next = (indexRef.current + 1) % HIGHLIGHTS.length;
      scrollToIndex(next);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [playing, reduced, scrollToIndex]);

  const togglePlay = useCallback(() => setPlaying((v) => !v), []);

  return (
    <section className="section section--alt highlights" id="highlights">
      <div className="viewport-content">
        <header className="section-header">
          <h2 className="section-header__headline type-section-header reveal">先刷重点</h2>
          <div className="section-header__action reveal">
            <ul className="section-header__links">
              <li>
                <button
                  type="button"
                  className="link-more link-more--button"
                  onClick={() => setFilmOpen(true)}
                  aria-haspopup="dialog"
                >
                  观看影片
                </button>
              </li>
            </ul>
          </div>
        </header>
      </div>

      <div className="highlights__gallery">
        <ul
          className="highlights__track"
          ref={ref}
          tabIndex={0}
          role="group"
          aria-label="重点功能画廊，可使用左右方向键浏览"
          onKeyDown={onKeyDown}
        >
          {HIGHLIGHTS.map((card, i) => {
            const media = CARD_MEDIA[card.id];
            return (
              <li
                className="highlights__item"
                key={card.id}
                aria-hidden={index !== i}
                data-current={index === i}
              >
                <div className="highlights__card">
                  <div className="highlights__caption">
                    <p>
                      {card.caption[0]}
                      <br />
                      {card.caption[1]}
                    </p>
                  </div>
                  <div className="highlights__media">
                    {media.video ? (
                      <LazyVideo
                        src={media.video}
                        poster={media.poster}
                        posterSmall={media.posterSm}
                        ratio="1260 / 500"
                        label={card.alt}
                        decorative={false}
                      />
                    ) : (
                      <PictureImage
                        src={media.poster}
                        srcSmall={media.posterSm}
                        alt={card.alt}
                        priority={i === 0}
                        width={1260}
                        height={612}
                      />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="viewport-content highlights__controls">
        <ul className="highlights__dots">
          <li>
            <button
              type="button"
              className="highlights__playpause"
              aria-label={playing ? '暂停自动播放' : '开始自动播放'}
              aria-pressed={playing}
              onClick={togglePlay}
              disabled={reduced}
              title={reduced ? '已按系统偏好关闭自动播放' : undefined}
            >
              <span aria-hidden="true" data-playing={playing} />
            </button>
          </li>
          {HIGHLIGHTS.map((card, i) => (
            <li key={card.id}>
              <button
                type="button"
                className="highlights__dot"
                data-current={index === i}
                aria-label={`第 ${i + 1} 张：${card.label}`}
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
          label="重点功能画廊"
        />
      </div>

      <Modal open={filmOpen} label="iPhone Duo 影片" size="wide" onClose={() => setFilmOpen(false)} trapRef={filmRef}>
        <video
          className="modal__video"
          src={ASSETS.hero.video}
          poster={HIGHLIGHTS_FILM.poster}
          controls
          autoPlay
          muted
          playsInline
          preload="none"
        />
        <p className="hero__film-note">
          这里播放的是本地保存的官方首屏动画短片。完整产品影片体积较大，未随仓库分发，
          可在{' '}
          <a href={HIGHLIGHTS_FILM.src} target="_blank" rel="noreferrer noopener">
            apple.com.cn 的公开地址
          </a>{' '}
          观看。
        </p>
      </Modal>
    </section>
  );
}
