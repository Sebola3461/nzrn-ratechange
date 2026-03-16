import axios from "axios";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import path from "path";
import { Logger } from "../helpers/Logger";

export class BeatmapDownloader {
  private static readonly BASE_URL = "https://api.nerinyan.moe/d";
  private static readonly TEMP_DIR = path.resolve("./temp/downloads");

  static async download(beatmapsetId: string | number): Promise<string> {
    const url = `${this.BASE_URL}/${beatmapsetId}?noVideo=1&noStoryboard=1`;
    const outputPath = path.join(this.TEMP_DIR, `${beatmapsetId}.osz`);

    if (!existsSync(this.TEMP_DIR)) {
      mkdirSync(this.TEMP_DIR, { recursive: true });
    }

    Logger.info(`Initializing beatmap download (beatmapsetId=${beatmapsetId})`);

    try {
      const response = await axios({
        method: "GET",
        url: url,
        responseType: "stream",
        timeout: 30000,
      });

      const writer = createWriteStream(outputPath);

      return new Promise((resolve, reject) => {
        response.data.pipe(writer);

        writer.on("finish", () => {
          Logger.success(
            `Downloaded (beatmapId=${beatmapsetId}): ${beatmapsetId}.osz`,
          );
          resolve(outputPath);
        });

        writer.on("error", (err) => {
          Logger.error(`Erro ao gravar arquivo no disco`, err);
          reject(err);
        });
      });
    } catch (error) {
      Logger.error(`Falha ao baixar beatmap da Nerinyan`, error);
      throw new Error("Não foi possível baixar o mapa da API externa.");
    }
  }

  static async osuFile(beatmapId: string): Promise<string> {
    const res = await axios(`https://osu.ppy.sh/osu/${beatmapId}`, {
      responseType: "text",
    });

    return res.data;
  }
}
