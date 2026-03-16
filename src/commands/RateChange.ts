import { PrivateMessage } from "bancho.js";
import { ChatCommand } from "../models/ChatCommand";
import { RateChangeService } from "../services/RateChangeService";
import { OszPacker } from "../services/OszService";
import { Logger } from "../helpers/Logger";
import { BeatmapDecoder } from "osu-parsers";
import path from "path";
import fs from "fs";
import { DatabaseService } from "../services/DatabaseService";
import { BeatmapDownloader } from "../services/BeatmapDownloader";
import { CatboxService } from "../services/CatboxService";

export enum RateChangeInputType {
  BPM,
  Rate,
  Invalid,
}

export class RateChangeCommand extends ChatCommand {
  name = "ratechange";
  description = "Altera a velocidade do mapa (ex: !rate 1.2x ou !rate 220bpm)";
  aliases = ["rt", "rc"];

  async execute(pm: PrivateMessage, args: string[], db: DatabaseService) {
    let packedPath = "";
    let unpackedPath = "";
    let outputPath = "";

    try {
      const userData = await pm.user.fetchFromAPI();

      if (!userData) return pm.user.sendMessage("Player not found on bancho!");

      const latestNp = db.getLatestMapByUserId(userData.id);

      if (!latestNp.beatmapset_id)
        return pm.user.sendMessage(
          "Send /np again because i can't find that beatmapsetId",
        );

      const osuFile = await BeatmapDownloader.osuFile(latestNp.beatmap_id!);

      const decoder = new BeatmapDecoder();
      const beatmap = decoder.decodeFromString(osuFile);

      const options = {
        scaleAr: !args.includes("-noscalear"),
        scaleOd: !args.includes("-noscaleod"),
        modifyAudioPitch: !args.includes("-pitch"),
      };

      const rateInput = args[0];
      const stats = this.parseInput(rateInput);

      const sanitizedRate =
        stats.type === RateChangeInputType.Rate
          ? stats.value
          : this.getRateFromBpm(beatmap.bpm, stats.value);

      if (sanitizedRate < 0.2 || sanitizedRate > 2.0 || sanitizedRate === 1) {
        return pm.user.sendMessage(
          "Rate must be >= 0.5x and <= 2.0x or a bpm value !ratechange 180bpm or !ratechange 1.2x",
        );
      }

      pm.user.sendMessage(`Please wait while i do my magic...`);

      packedPath = await BeatmapDownloader.download(latestNp.beatmapset_id);
      unpackedPath = `temp/sets/${latestNp.beatmapset_id}`;

      await OszPacker.unpack(packedPath, unpackedPath);

      Logger.info(`Initializing ratechange...`);

      const rateChange = new RateChangeService(
        beatmap,
        path.join(unpackedPath, beatmap.general.audioFilename),
        sanitizedRate,
        unpackedPath,
        options,
      );

      await rateChange.generate();
      outputPath = await rateChange.packToOSZ();

      await rateChange.cleanup(); // clear all files used in ratechange

      fs.unlinkSync(packedPath); // delete original osz
      fs.rmSync(unpackedPath, { recursive: true, force: true }); // delete unpacked original file

      Logger.info(`Uploading to catbox.moe`);
      const catboxURL = await CatboxService.UploadFile(outputPath);

      fs.rmSync(outputPath, { recursive: true, force: true });

      Logger.success(`Rate changed!`);

      pm.user.sendMessage(
        `Your beatmap file is ready!   [${catboxURL} [download]]`,
      );
    } catch (err) {
      Logger.error("Erro no RateChangeCommand", err);
      pm.user.sendMessage(`Something happened: ${err}`);

      try {
        fs.unlinkSync(packedPath);
      } catch (e) {
        Logger.error("Cannot delete files", e);
      }

      try {
        fs.rmSync(unpackedPath, { recursive: true, force: true });
      } catch (e) {
        Logger.error("Cannot delete files", e);
      }

      try {
        fs.rmSync(outputPath, { recursive: true, force: true });
      } catch (e) {
        Logger.error("Cannot delete files", e);
      }
    }
  }

  private parseInput(input: string = "") {
    const raw = input.trim().toLowerCase();
    if (!raw) return { value: 0, type: RateChangeInputType.Invalid };

    if (raw.endsWith("bpm")) {
      const val = parseFloat(raw.replace("bpm", ""));
      return !isNaN(val) && val >= 60 && val <= 800
        ? { value: val, type: RateChangeInputType.BPM }
        : { value: 0, type: RateChangeInputType.Invalid };
    }

    const val = parseFloat(raw.replace("x", ""));
    return !isNaN(val) && val >= 0.2 && val <= 5.0
      ? { value: val, type: RateChangeInputType.Rate }
      : { value: 0, type: RateChangeInputType.Invalid };
  }

  private getRateFromBpm(baseBpm: number, targetBpm: number): number {
    return targetBpm / (baseBpm || 1);
  }
}
