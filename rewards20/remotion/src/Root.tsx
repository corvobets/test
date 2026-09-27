import { Composition } from 'remotion';
import { Film, filmSchema } from './Film';

// 150 BPM, 48 beats = 19.2 s. Timings live in ../timeline.js (shared with the soundtrack).
const FPS = 60, FRAMES = Math.round(19.2 * FPS);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Vertical" component={Film} schema={filmSchema}
      width={1080} height={1920} fps={FPS} durationInFrames={FRAMES}
      defaultProps={{ format: 'vertical' as const, motionBlur: 5, music: true }} />
    <Composition id="Horizontal" component={Film} schema={filmSchema}
      width={1920} height={1080} fps={FPS} durationInFrames={FRAMES}
      defaultProps={{ format: 'horizontal' as const, motionBlur: 5, music: true }} />
  </>
);
