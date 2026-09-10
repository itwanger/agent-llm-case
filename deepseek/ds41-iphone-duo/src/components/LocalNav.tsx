import { useEffect, useState } from 'react';
import { EXPLORE_SECTIONS, LOCAL_NAV_FAMILY, PRODUCT } from '../data/product';
import { ASSETS } from '../data/assets';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useActiveSection } from '../hooks/useScrollPast';
import { Modal } from './common/Modal';
import './local-nav.css';

const SECTION_IDS = EXPLORE_SECTIONS.map((s) => s.id);
const FAMILY_IMAGES: Record<string, string> = {
  iphoneDuo: ASSETS.localnav.iphoneDuo,
  iphone18Pro: ASSETS.localnav.iphone18Pro,
  iphone17: ASSETS.localnav.iphone17,
  iphone17e: ASSETS.localnav.iphone17e,
  iphone16: ASSETS.localnav.iphone16,
};

/**
 * 滚动后出现的圆角悬浮产品导航：左侧产品名，右侧探索入口与价格按钮。
 * 探索入口打开章节导航弹层（含机型列表）。
 */
export function LocalNav({ visible }: { visible: boolean }) {
  const [exploreOpen, setExploreOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS);
  const exploreRef = useFocusTrap<HTMLDivElement>(exploreOpen, () => setExploreOpen(false));
  const infoRef = useFocusTrap<HTMLDivElement>(infoOpen, () => setInfoOpen(false));

  useEffect(() => {
    if (!visible) setExploreOpen(false);
  }, [visible]);

  const goTo = (id: string) => {
    setExploreOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div className="localnav" data-visible={visible} aria-hidden={!visible}>
        <div className="localnav__inner">
          <a
            className="localnav__name"
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            tabIndex={visible ? 0 : -1}
          >
            {PRODUCT.eyebrow}
          </a>
          <div className="localnav__ctas">
            <button
              type="button"
              className="localnav__explore"
              aria-expanded={exploreOpen}
              aria-haspopup="dialog"
              onClick={() => setExploreOpen(true)}
              tabIndex={visible ? 0 : -1}
            >
              <span>探索</span>
            </button>
            <button
              type="button"
              className="localnav__buy"
              onClick={() => setInfoOpen(true)}
              tabIndex={visible ? 0 : -1}
            >
              查看价格
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={exploreOpen}
        label="探索 iPhone Duo"
        size="wide"
        onClose={() => setExploreOpen(false)}
        trapRef={exploreRef}
      >
        <div className="explore">
          <div className="explore__sections">
            <p className="explore__heading">本页内容</p>
            <ul className="explore__list">
              {EXPLORE_SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    className="explore__link"
                    data-active={active === section.id}
                    onClick={() => goTo(section.id)}
                  >
                    {section.label}
                  </button>
                </li>
              ))}
              <li>
                <span className="explore__link explore__link--muted">技术规格（未包含在本复刻中）</span>
              </li>
            </ul>
          </div>

          <div className="explore__family">
            <p className="explore__heading">探索 iPhone 系列</p>
            <ul className="explore__products">
              {LOCAL_NAV_FAMILY.map((item) => (
                <li key={item.name}>
                  <button
                    type="button"
                    className="explore__product"
                    data-current={item.current}
                    onClick={() => {
                      setExploreOpen(false);
                      if (!item.current) {
                        window.open('https://www.apple.com.cn/iphone/', '_blank', 'noopener');
                      }
                    }}
                  >
                    <span className="explore__product-image">
                      <img src={FAMILY_IMAGES[item.imageKey]} alt="" loading="lazy" />
                    </span>
                    <span className="explore__product-name">
                      {item.name}
                      {item.current && <span className="badge">当前浏览</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="explore__price">
              <p className="explore__price-value">{PRODUCT.priceFrom}</p>
              <p className="explore__price-value">{PRODUCT.priceMonthly}*</p>
              <button type="button" className="button-pill" onClick={() => setInfoOpen(true)}>
                查看价格
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={infoOpen}
        label="价格与购买说明"
        onClose={() => setInfoOpen(false)}
        trapRef={infoRef}
      >
        <div className="price-modal">
          <p className="price-modal__product">{PRODUCT.eyebrow}</p>
          <p className="price-modal__price">
            {PRODUCT.priceFrom}
            <br />
            {PRODUCT.priceMonthly}*
          </p>
          <p className="price-modal__note">
            本页是 iPhone Duo 产品页的前端复刻演示，价格与预购／发售日期取自参考页面公开内容。
            这里不会创建订单，也没有接入真实的账户与支付系统。
          </p>
          <p className="price-modal__note">
            预购与发售：{PRODUCT.availabilityFull}
          </p>
          <div className="price-modal__actions">
            <a
              className="button-pill"
              href={PRODUCT.buyPath}
              target="_blank"
              rel="noreferrer noopener"
            >
              前往 apple.com.cn 选购
            </a>
            <button type="button" className="price-modal__cancel" onClick={() => setInfoOpen(false)}>
              关闭
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
