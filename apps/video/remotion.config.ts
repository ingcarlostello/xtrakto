import { Config } from "@remotion/cli/config";

// H.264 in yuv420p plays in every browser, Safari included; without bt709 the
// JPEG frames come out full range (yuvj420p). The scenes are flat colors and
// text, so a high CRF keeps the landing's file small.
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setColorSpace("bt709");
Config.setCrf(26);
Config.setAudioBitrate("128k");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
