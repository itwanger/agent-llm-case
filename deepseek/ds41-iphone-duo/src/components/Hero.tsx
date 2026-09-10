import { useState } from 'react';
import { PRODUCT } from '../data/product';
import { ASSETS } from '../data/assets';
import { HIGHLIGHTS_FILM } from '../data/highlights';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Modal } from './common/Modal';
import { LazyVideo } from './common/LazyVideo';
import './hero.css';

/**
 * 首屏。
 *
 * 构图按参考页面在 1440×900 下的实测值还原：
 * 内容宽 1260 居中；眉题 21px、主标题 80/87px、预购信息 14/19px；
 * 主视觉 927×614 居中并贴住首屏底部；价格胶囊 + 蓝色按钮压在底部留白上。
 */
export function Hero() {
  const [filmOpen, setFilmOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const filmRef = useFocusTrap<HTMLDivElement>(filmOpen, () => setFilmOpen(false));
  const priceRef = useFocusTrap<HTMLDivElement>(priceOpen, () => setPriceOpen(false));

  return (
    <section className="section hero" id="top">
      <div className="hero__marquee viewport-content">
        <div className="hero__header">
          <h1 className="hero__eyebrow type-eyebrow reveal">{PRODUCT.eyebrow}</h1>
          <p className="hero__headline reveal">
            <span>{PRODUCT.headline}</span>
            <span className="hero__headline-period" aria-hidden="true">
              {PRODUCT.headlinePeriod}
            </span>
          </p>
          <div className="hero__availability reveal">
            <p className="visually-hidden">{PRODUCT.availabilityFull}</p>
            <p aria-hidden="true">
              {PRODUCT.availabilityLines.map((line, i) => (
                <span key={line} className="hero__availability-line">
                  {line}
                  {i === 0 && <br />}
                </span>
              ))}
            </p>
            <button
              type="button"
              className="hero__film-link"
              onClick={() => setFilmOpen(true)}
              aria-haspopup="dialog"
            >
              观看影片
            </button>
          </div>
        </div>

        <div className="hero__media">
          {/* 视频播放失败或未就绪时，始终由 poster 静态图兜底 */}
          <LazyVideo
            className="hero__video"
            src={ASSETS.hero.video}
            poster={ASSETS.hero.heroEnd}
            posterSmall={ASSETS.hero.heroSm}
            ratio="927 / 614"
            label={PRODUCT.heroAlt}
            decorative={false}
            /* 参考页面首屏动画 loop=false：播一次后停在展开的结束帧 */
            loop={false}
          />
        </div>

        <div className="hero__detail">
          <div className="hero__detail-group">
            <p className="hero__pricing">
              {/* 参考页面：桌面一行显示，手机断成两行 */}
              {PRODUCT.priceFrom}
              <br className="small-only" />
              {PRODUCT.priceMonthly}
              <span className="footnote">{PRODUCT.priceNote}</span>
            </p>
            <button
              type="button"
              className="button-pill hero__buy"
              onClick={() => setPriceOpen(true)}
              aria-haspopup="dialog"
            >
              {PRODUCT.priceCta}
            </button>
          </div>
        </div>
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
          本地保存的是参考页面首屏使用的官方动画短片。完整产品影片体积较大，未随仓库分发，
          可在{' '}
          <a href={HIGHLIGHTS_FILM.src} target="_blank" rel="noreferrer noopener">
            apple.com.cn 的公开地址
          </a>{' '}
          观看。
        </p>
      </Modal>

      <Modal open={priceOpen} label="价格与购买说明" onClose={() => setPriceOpen(false)} trapRef={priceRef}>
        <div className="price-modal">
          <p className="price-modal__product">{PRODUCT.eyebrow}</p>
          <p className="price-modal__price">
            {PRODUCT.priceFrom}
            <br />
            {PRODUCT.priceMonthly}*
          </p>
          <p className="price-modal__note">预购与发售：{PRODUCT.availabilityFull}</p>
          <p className="price-modal__note">
            本页是 iPhone Duo 产品页的前端复刻演示，价格与日期取自参考页面公开内容，
            不会创建订单，也未接入账户与支付系统。
          </p>
          <div className="price-modal__actions">
            <a className="button-pill" href={PRODUCT.buyPath} target="_blank" rel="noreferrer noopener">
              前往 apple.com.cn 选购
            </a>
            <button type="button" className="price-modal__cancel" onClick={() => setPriceOpen(false)}>
              关闭
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
