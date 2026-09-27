import { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';

export const filmSchema = z.object({
  format: z.enum(['vertical', 'horizontal']),
  // Motion-blur sub-frames per frame (5 = final quality, 1 = fast preview).
  motionBlur: z.number().int().min(1).max(8),
  music: z.boolean(),
});

type SceneWindow = Window & { ready: Promise<boolean>; renderFrame: (t: number) => Promise<void> };

// The scenes are the same canvas code as the build.sh pipeline (comp.js + layout-*.js + engine.js).
// They run inside an iframe; each Remotion frame asks it to draw time t = frame / fps.
export const Film: React.FC<z.infer<typeof filmSchema>> = ({ format, motionBlur, music }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ref = useRef<HTMLIFrameElement>(null);
  const [loaded] = useState(() => delayRender(`Loading ${format} scene`));
  const [win, setWin] = useState<SceneWindow | null>(null);

  const onLoad = () => {
    const w = ref.current?.contentWindow as SceneWindow | null;
    if (!w?.ready) { cancelRender(new Error(`${format}.html did not boot`)); return; }
    w.ready.then(() => { setWin(w); continueRender(loaded); }, cancelRender);
  };

  useEffect(() => {
    if (!win) return;
    const h = delayRender(`Drawing frame ${frame}`);
    win.renderFrame(frame / fps).then(() => continueRender(h), cancelRender);
  }, [win, frame, fps]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#090A10' }}>
      <iframe ref={ref} onLoad={onLoad} scrolling="no"
        src={staticFile(`${format}.html`) + `?render&sub=${motionBlur}`}
        style={{ width, height, border: 0, overflow: 'hidden' }} />
      {music && <Audio src={staticFile('rewards-audio.wav')} />}
    </AbsoluteFill>
  );
};
