import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('png');
Config.setCodec('h264');
Config.setCrf(15);
Config.setPixelFormat('yuv420p');
Config.setAudioBitrate('320k');
// Each frame draws 5–8 motion-blur sub-frames; give slow machines room.
Config.setDelayRenderTimeoutInMilliseconds(120000);
