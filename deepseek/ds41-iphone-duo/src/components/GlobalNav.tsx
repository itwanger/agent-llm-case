import { useEffect, useState } from 'react';
import { GLOBAL_NAV_ITEMS } from '../data/product';
import './global-nav.css';

/**
 * 顶部全局导航。
 * 参考页面是 44px 高的 Apple 全局导航：左侧 Apple 标志、中间分类、
 * 右侧搜索与购物袋。小屏幕下折叠为可展开菜单。
 */
export function GlobalNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<'search' | 'bag' | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <nav className="globalnav" aria-label="全部网页">
      <div className="globalnav__content">
        <button
          type="button"
          className={`globalnav__burger${menuOpen ? ' is-open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="globalnav-menu"
          aria-label={menuOpen ? '关闭主菜单' : '主菜单'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <a className="globalnav__apple" href="https://www.apple.com.cn/" aria-label="Apple">
          <AppleLogo />
        </a>

        <ul className="globalnav__list" id="globalnav-menu" data-open={menuOpen}>
          {GLOBAL_NAV_ITEMS.map((item) => (
            <li key={item} className="globalnav__item">
              <a
                className="globalnav__link"
                href="https://www.apple.com.cn/"
                onClick={(e) => e.preventDefault()}
                title={`${item}（本地复刻演示，未接入真实站点）`}
              >
                {item}
              </a>
            </li>
          ))}
        </ul>

        <div className="globalnav__actions">
          <button
            type="button"
            className="globalnav__icon"
            aria-label="搜索 apple.com.cn"
            aria-expanded={panel === 'search'}
            onClick={() => setPanel((p) => (p === 'search' ? null : 'search'))}
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className="globalnav__icon"
            aria-label="购物袋"
            aria-expanded={panel === 'bag'}
            onClick={() => setPanel((p) => (p === 'bag' ? null : 'bag'))}
          >
            <BagIcon />
          </button>
        </div>
      </div>

      {panel && (
        <div className="globalnav__panel" role="dialog" aria-label={panel === 'search' ? '搜索' : '购物袋'}>
          {panel === 'search' ? (
            <form
              className="globalnav__search"
              onSubmit={(e) => {
                e.preventDefault();
                setPanel(null);
              }}
            >
              <label className="visually-hidden" htmlFor="globalnav-search">
                搜索 apple.com.cn
              </label>
              <input
                id="globalnav-search"
                type="search"
                autoFocus
                placeholder="搜索 apple.com.cn"
                className="globalnav__search-input"
              />
              <p className="globalnav__panel-note">
                这是前端复刻演示，搜索不会发起真实请求。
              </p>
            </form>
          ) : (
            <div className="globalnav__bag">
              <p className="globalnav__bag-title">你的购物袋是空的。</p>
              <p className="globalnav__panel-note">
                这是前端复刻演示，未接入真实的账户与订单系统。
              </p>
              <a
                className="button-pill"
                href="https://www.apple.com.cn/cn/shop/goto/buy_iphone/iphone_duo"
                target="_blank"
                rel="noreferrer noopener"
              >
                去选购 iPhone
              </a>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 14 44" width="14" height="44" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="m13.0729 17.6825a3.61 3.61 0 0 0 -1.7248 3.0365 3.5132 3.5132 0 0 0 2.1379 3.2223 8.394 8.394 0 0 1 -1.0948 2.2618c-.6816.9812-1.3943 1.9623-2.4787 1.9623s-1.3633-.63-2.613-.63c-1.2187 0-1.6525.6507-2.644.6507s-1.6834-.9089-2.4787-2.0243a9.7842 9.7842 0 0 1 -1.6628-5.2776c0-3.0984 2.014-4.7405 3.9969-4.7405 1.0535 0 1.9314.6919 2.5924.6919.63 0 1.6112-.7333 2.8092-.7333a3.7579 3.7579 0 0 1 3.1604 1.5802zm-3.7284-2.8918a3.5615 3.5615 0 0 0 .8469-2.22 1.5353 1.5353 0 0 0 -.031-.32 3.5686 3.5686 0 0 0 -2.3445 1.2084 3.4629 3.4629 0 0 0 -.8779 2.1585 1.419 1.419 0 0 0 .031.2892 1.19 1.19 0 0 0 .2169.0207 3.0935 3.0935 0 0 0 2.1586-1.1368z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 17 17" width="17" height="17" aria-hidden="true" focusable="false">
      <path
        d="M15.5 15.5 11.2 11.2M12.6 7.6a5 5 0 1 1-10 0 5 5 0 0 1 10 0z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 17 17" width="17" height="17" aria-hidden="true" focusable="false">
      <path
        d="M3.2 5.6h10.6l-.9 9.1a1.2 1.2 0 0 1-1.2 1.1H5.3a1.2 1.2 0 0 1-1.2-1.1L3.2 5.6zM6.2 5.6V4.2a2.3 2.3 0 0 1 4.6 0v1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
