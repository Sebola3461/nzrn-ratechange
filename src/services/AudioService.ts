import ffmpeg from "fluent-ffmpeg";
import { Logger } from "../helpers/Logger";

export class AudioService {
  static changeAudioPlaybackRate(
    inputPath: string,
    outputPath: string,
    speed: number = 1.0,
    modifyAudioPitch: boolean = false,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Validação de limite para o filtro 'atempo'
      if (!modifyAudioPitch && (speed < 0.5 || speed > 2.0)) {
        return reject(
          new Error(
            "Speed multiplier must be between 0.5 and 2.0 when not modifying pitch",
          ),
        );
      }

      let filterChain: string;

      if (modifyAudioPitch) {
        const baseSampleRate = 44100;
        const newRate = Math.round(baseSampleRate * speed);
        filterChain = `asetrate=${newRate},aresample=${baseSampleRate}`;
      } else {
        filterChain = `atempo=${speed}`;
      }

      ffmpeg(inputPath)
        .toFormat("mp3")
        .audioCodec("libmp3lame")
        .audioBitrate("192k")
        .audioFilters(filterChain) // Aplica o filtro dinâmico
        .on("start", (cmd) =>
          Logger.info(
            `FFmpeg (${modifyAudioPitch ? "Pitch+Speed" : "Speed Only"} ${speed}x) initialized: ${cmd}`,
          ),
        )
        .on("error", (err) => {
          Logger.error(`Error during audio rate change`, err);
          reject(err);
        })
        .on("end", () => {
          Logger.success(
            `Audio processed successfully: ${speed}x (${modifyAudioPitch ? "Pitch modified" : "Pitch preserved"})`,
          );
          resolve();
        })
        .save(outputPath);
    });
  }
}
