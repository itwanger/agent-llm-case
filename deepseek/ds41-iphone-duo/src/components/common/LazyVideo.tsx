import { useEffect, useRef, useState } from 'react';

interface LazyVideoProps {
  src: string;
  poster: string;
  /** 手机版起始帧（参考页面为独立裁切） */
  posterSmall?: string;
  /** 无字幕的装饰性动画用 true；有信息量时请传描述并设为 false */
  decorative?: boolean;
  label?: string;
  className?: string;
  ratio?: string;
  /** 进入视口后自动播放 */
  autoPlayOnView?: boolean;
  /** 是否循环。参考页面的首屏动画只播一次并停在结束帧（loop=false）。 */
  loop?: boolean;
}

/**
 * 视频组件：
 * - poster 必填，视频未就绪时先显示起始帧；
 * - muted + playsInline，符合自动播放策略；
 * - preload="none"，只有接近视口才开始下载；
 * - 播放失败时回退为 poster 静态图，不出现空白或加载中状态。
 */
export function LazyVideo({
  src,
  poster,
  posterSmall,
  decorative = true,
  label,
  className,
  ratio,
  autoPlayOnView = true,
  loop = true,
}: LazyVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFailed(false);
    setReady(false);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || failed || !autoPlayOnView) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    if (typeof IntersectionObserver === 'undefined') {
      void video.play().catch(() => undefined);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void video.play().catch(() => undefined);
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [failed, autoPlayOnView, src]);

  return (
    <span className={`lazy-video${className ? ` ${className}` : ''}`} style={{ aspectRatio: ratio }}>
      <picture>
        {posterSmall && <source media="(max-width: 734px)" srcSet={posterSmall} />}
        <img className="lazy-video__poster" src={poster} alt={decorative ? '' : (label ?? '')} />
      </picture>
      {!failed && (
        <video
          ref={videoRef}
          className="lazy-video__media"
          data-ready={ready}
          src={src}
          muted
          playsInline
          loop={loop}
          preload="none"
          aria-hidden={decorative ? true : undefined}
          aria-label={decorative ? undefined : label}
          onCanPlay={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
