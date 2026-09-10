import type React from 'react';

interface PictureImageProps {
  /** 桌面素材 */
  src: string;
  /** 手机素材（参考页面为独立裁切的小尺寸版本） */
  srcSmall?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  /** 手机断点，与参考页面的 small 断点一致 */
  breakpoint?: number;
  style?: React.CSSProperties;
}

/**
 * 图片组件。
 *
 * 参考页面为同一个位置准备了桌面（large）与手机（small）两套不同裁切的素材，
 * 手机版并不是桌面版等比缩小。这里用 <picture> 复现同样的行为；
 * 缺少手机素材时自动退回桌面素材。
 */
export function PictureImage({
  src,
  srcSmall,
  alt,
  className,
  width,
  height,
  priority = false,
  breakpoint = 734,
  style,
}: PictureImageProps) {
  return (
    <picture className={className} style={style}>
      {srcSmall && <source media={`(max-width: ${breakpoint}px)`} srcSet={srcSmall} />}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        /* React 18 还不认识 fetchPriority，用小写属性名直接透传 */
        {...({ fetchpriority: priority ? 'high' : 'auto' } as Record<string, string>)}
      />
    </picture>
  );
}

/** 视频 poster 的手机 / 桌面双份地址。 */
export function posterPair(desktop: string, small?: string) {
  return { desktop, small };
}
