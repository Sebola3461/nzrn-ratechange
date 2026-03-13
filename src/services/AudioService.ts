import ffmpeg from "fluent-ffmpeg";
import { Logger } from "../helpers/Logger";

export class AudioService {
  static changeAudioPlaybackRate(
    inputPath: string,
    outputPath: string,
    speed: number = 1.0,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // FFmpeg 'atempo' filter only supports values between 0.5 and 2.0
      if (speed < 0.5 || speed > 2.0) {
        return reject(
          new Error("Speed multiplier must be between 0.5 and 2.0"),
        );
      }

      ffmpeg(inputPath)
        // Set format to mp3 for high compression
        .toFormat("mp3")
        // Use libmp3lame encoder for better quality/compatibility
        .audioCodec("libmp3lame")
        // 192kbps is the osu! standard for good quality at a small size
        .audioBitrate("192k")
        // Apply the time-stretch filter
        .audioFilters(`atempo=${speed}`)
        .on("start", (cmd) =>
          Logger.info(`FFmpeg (Speed ${speed}x) initialized: ${cmd}`),
        )
        .on("error", (err) => {
          Logger.error(`Error during audio rate change`, err);
          reject(err);
        })
        .on("end", () => {
          Logger.success(
            `Audio rate changed successfully: ${speed}x (MP3 192kbps)`,
          );
          resolve();
        })
        .save(outputPath);
    });
  }
}
