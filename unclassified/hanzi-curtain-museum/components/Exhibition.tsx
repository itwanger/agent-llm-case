"use client";

import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { artifacts } from "@/data/artifacts";
import { CurtainAudio } from "@/lib/curtain-audio";
import { TextCurtain } from "./TextCurtain";

type ViewMode = "scene" | "gallery";
type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

function transitionStyle(id: string): CSSProperties {
  return { viewTransitionName: `artifact-${id}` } as CSSProperties;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function Exhibition() {
  const [view, setView] = useState<ViewMode>("scene");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sceneLayoutVersion, setSceneLayoutVersion] = useState(0);
  const [galleryLayoutVersion, setGalleryLayoutVersion] = useState(0);
  const sceneImageRef = useRef<HTMLImageElement>(null);
  const galleryImageRef = useRef<HTMLImageElement>(null);
  const audioRef = useRef<CurtainAudio | null>(null);
  const reducedMotion = useReducedMotion();
  const artifact = artifacts[currentIndex];
  const previousIndex = (currentIndex - 1 + artifacts.length) % artifacts.length;
  const nextIndex = (currentIndex + 1) % artifacts.length;

  useEffect(() => {
    const audio = new CurtainAudio();
    audioRef.current = audio;
    return () => {
      audio.dispose();
      audioRef.current = null;
    };
  }, []);

  const updateWithTransition = useCallback(
    (update: () => void) => {
      const transitionDocument = document as TransitionDocument;
      if (reducedMotion || !transitionDocument.startViewTransition) {
        update();
        return;
      }
      transitionDocument.startViewTransition(update);
    },
    [reducedMotion],
  );

  const changeArtifact = useCallback(
    (index: number) => updateWithTransition(() => setCurrentIndex(index)),
    [updateWithTransition],
  );

  const changeView = useCallback(
    (nextView: ViewMode) => {
      if (nextView !== view) updateWithTransition(() => setView(nextView));
    },
    [updateWithTransition, view],
  );

  const unlockAudio = useCallback(() => {
    void audioRef.current?.unlock();
  }, []);

  const handleGesture = useCallback((speed: number, pan: number, compact: boolean) => {
    audioRef.current?.gesture(speed, pan, compact);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((enabled) => {
      const next = !enabled;
      audioRef.current?.setEnabled(next);
      if (next) void audioRef.current?.unlock();
      return next;
    });
  }, []);

  return (
    <main className="museum-shell" onPointerDownCapture={unlockAudio}>
      <div className="lacquer-grain" aria-hidden="true" />

      <header className="museum-header">
        <div className="brand-lockup" aria-label="字垂华光，中国器物数字展">
          <span className="brand-seal">字</span>
          <span className="brand-name">字垂华光</span>
          <span className="brand-en">WORDS IN RELIC</span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="round-button"
            onClick={toggleSound}
            aria-label={soundEnabled ? "关闭拨帘音效" : "开启拨帘音效"}
            aria-pressed={soundEnabled}
          >
            <span aria-hidden="true">{soundEnabled ? "音" : "静"}</span>
          </button>
          <div className="view-switch" aria-label="展览视图">
            <button type="button" className={view === "scene" ? "active" : ""} onClick={() => changeView("scene")}>
              单件
            </button>
            <button type="button" className={view === "gallery" ? "active" : ""} onClick={() => changeView("gallery")}>
              三器
            </button>
          </div>
        </div>
      </header>

      {view === "scene" ? (
        <section className="scene-view" aria-label={`${artifact.name}单件展览`}>
          <div className="artifact-stage scene-artifact" style={transitionStyle(artifact.id)}>
            {/* Plain img is intentional: TextCurtain samples this element's exact rendered rectangle. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={sceneImageRef}
              src={artifact.image}
              alt={artifact.alt}
              style={{ transform: `scale(${artifact.imageScale})` }}
              draggable={false}
              onLoad={() => setSceneLayoutVersion((version) => version + 1)}
            />
          </div>

          <TextCurtain
            key={`scene-${artifact.id}`}
            artifact={artifact}
            imageRef={sceneImageRef}
            imageSelector=".scene-artifact img"
            layoutVersion={sceneLayoutVersion}
            reducedMotion={reducedMotion}
            onGesture={handleGesture}
          />

          <button
            type="button"
            className="neighbor-card neighbor-left"
            onClick={() => changeArtifact(previousIndex)}
            aria-label={`上一件：${artifacts[previousIndex].name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artifacts[previousIndex].image} alt="" draggable={false} />
            <span className="neighbor-direction">上一器</span>
            <span className="neighbor-name">{artifacts[previousIndex].name}</span>
          </button>
          <button
            type="button"
            className="neighbor-card neighbor-right"
            onClick={() => changeArtifact(nextIndex)}
            aria-label={`下一件：${artifacts[nextIndex].name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artifacts[nextIndex].image} alt="" draggable={false} />
            <span className="neighbor-direction">下一器</span>
            <span className="neighbor-name">{artifacts[nextIndex].name}</span>
          </button>

          <div className="artifact-copy">
            <p className="artifact-era">{artifact.era}</p>
            <h1>{artifact.name}</h1>
            <p className="artifact-description">{artifact.shortDescription}</p>
            <p className="artifact-note">{artifact.culturalNote}</p>
            <p className="asset-note">自绘透明 PNG 示意器物 · 非馆藏实拍</p>
          </div>

          <div className="gesture-hint" aria-hidden="true">
            <span className="gesture-line" />
            <span>移动指针，拨开字帘</span>
          </div>
        </section>
      ) : (
        <section className="gallery-view" aria-label="三件器物陈列">
          <p className="gallery-kicker">三器同观</p>
          <h1 className="gallery-title">器物不语，文字垂光</h1>

          <div className="gallery-stage">
            {artifacts.map((item, index) => {
              const offset = (index - currentIndex + artifacts.length) % artifacts.length;
              const position = offset === 0 ? "center" : offset === 1 ? "right" : "left";
              const isCenter = position === "center";
              return (
                <button
                  type="button"
                  className={`gallery-artifact gallery-${position}`}
                  style={transitionStyle(item.id)}
                  key={item.id}
                  onClick={() => (isCenter ? changeView("scene") : changeArtifact(index))}
                  aria-label={isCenter ? `进入${item.name}单件展览` : `将${item.name}移到中央`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={isCenter ? galleryImageRef : undefined}
                    src={item.image}
                    alt={item.alt}
                    draggable={false}
                    style={{ transform: `scale(${item.imageScale})` }}
                    onLoad={isCenter ? () => setGalleryLayoutVersion((version) => version + 1) : undefined}
                  />
                  <span className="gallery-index">0{index + 1}</span>
                  <span className="gallery-item-name">{item.name}</span>
                  {isCenter && <span className="gallery-enter">进入单件展览</span>}
                </button>
              );
            })}
          </div>

          <TextCurtain
            key={`gallery-${artifact.id}`}
            artifact={artifact}
            imageRef={galleryImageRef}
            imageSelector=".gallery-center img"
            layoutVersion={galleryLayoutVersion}
            reducedMotion={reducedMotion}
            onGesture={handleGesture}
          />

          <div className="gallery-copy">
            <span>{artifact.era}</span>
            <p>{artifact.shortDescription}</p>
          </div>
        </section>
      )}

      <footer className="museum-footer">
        <span>数字器物实验 · 01—03</span>
        <span className="footer-rule" />
        <span>首次点击后开启合成声音</span>
      </footer>
    </main>
  );
}
