import { useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
  /** 宽弹层用于影片，窄弹层用于文字说明 */
  size?: 'narrow' | 'wide';
  trapRef: React.RefObject<HTMLElement | null>;
}

/**
 * 通用弹层外壳。焦点约束、Escape 关闭、焦点恢复由 useFocusTrap 提供，
 * 这里只负责结构、遮罩与关闭按钮。
 */
export function Modal({ open, label, onClose, children, size = 'narrow', trapRef }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      ref={backdropRef}
      onMouseDown={(event) => {
        if (event.target === backdropRef.current) onClose();
      }}
    >
      <div
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        ref={trapRef as React.RefObject<HTMLDivElement>}
      >
        <div className="modal__bar">
          <p className="modal__title">{label}</p>
          <button type="button" className="modal__close" onClick={onClose} aria-label={`关闭${label}`}>
            <span aria-hidden="true" />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
