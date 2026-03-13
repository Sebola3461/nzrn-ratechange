import { randomBytes } from "crypto";
import path from "path";
import {
  Beatmap,
  ControlPoint,
  ControlPointType,
  DifficultyPoint,
  EffectPoint,
  SamplePoint,
  TimingPoint,
} from "osu-classes";
import { BeatmapEncoder, HoldableObject, SpinnableObject } from "osu-parsers";
import { OszPacker } from "./OszService";
import { AudioService } from "./AudioService";
import fs from "fs";
import { Logger } from "../helpers/Logger";

export enum RateChangeInputType {
  BPM,
  Rate,
  Invalid,
}

export interface BeatmapRateChangerOptions {
  scaleOd?: boolean;
  scaleAr?: boolean;
  modifyAudioPitch?: boolean;
  inputType?: RateChangeInputType;
}

export class RateChangeService {
  public fileHash = randomBytes(16).toString("hex");
  private baseTempPath = path.resolve("./temp/ratechange");
  private tempPath = path.resolve(path.join(this.baseTempPath, this.fileHash));

  constructor(
    public beatmap: Beatmap,
    private audioPath: string,
    public rate: number,
    private sourcePath: string,
    public options?: BeatmapRateChangerOptions,
  ) {}

  async generate(): Promise<string> {
    OszPacker.createFolders(this.baseTempPath, this.fileHash);

    this.applyBeatmapChanges();

    // 1. Process Audio
    const audioOutputPath = path.join(
      this.tempPath,
      this.beatmap.general.audioFilename,
    );
    await AudioService.changeAudioPlaybackRate(
      this.audioPath,
      audioOutputPath,
      this.rate,
    );

    // 2. Copy Background (New Step)
    this.copyBackground();

    // 3. Encode modified .osu
    const encoder = new BeatmapEncoder();
    const filename = this.formatFilename();
    await encoder.encodeToPath(
      path.join(this.tempPath, filename),
      this.beatmap,
    );

    return this.fileHash;
  }

  /**
   * Locates and copies the background image to the target folder
   */
  private copyBackground() {
    const bgFilename = this.beatmap.events.backgroundPath;

    if (bgFilename) {
      const src = path.join(this.sourcePath, bgFilename);
      const dest = path.join(this.tempPath, bgFilename);

      try {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      } catch (err) {
        Logger.error(`Failed to copy background`, err);
      }
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.tempPath)) {
        // Remove a pasta recursivamente (contém o áudio e o .osu editados)
        fs.rmSync(this.tempPath, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`[RateChangeService] Error during cleanup:`, err);
    }
  }

  private applyBeatmapChanges() {
    this.scaleTimingPoints();
    this.scaleObjects();
    this.changeMetadata();
    if (this.options?.scaleOd) {
      this.scaleDifficulty();
    }

    if (this.options?.scaleAr) {
      this.scaleAr();
    }

    this.scaleBreakTimes();

    this.beatmap.events.storyboard = null;
  }

  private scaleTimingPoints() {
    const allPoints = this.beatmap.controlPoints.allPoints;
    const newPoints: [ControlPoint, number][] = [];

    for (const point of allPoints) {
      const newStartTime =
        point.startTime === 0
          ? 0
          : Math.round(point.startTime / this.rate - 0.5) - 0.2; // math
      const newPoint = this.getNewPointInstance(point.pointType);

      if (point instanceof TimingPoint && newPoint instanceof TimingPoint) {
        newPoint.timeSignature = point.timeSignature;
        newPoint.beatLength = point.beatLength / this.rate;
      }

      if (
        point instanceof DifficultyPoint &&
        newPoint instanceof DifficultyPoint
      ) {
        newPoint.sliderVelocity = point.sliderVelocity;
        newPoint.bpmMultiplier = point.bpmMultiplier;
      }

      if (point instanceof EffectPoint && newPoint instanceof EffectPoint) {
        newPoint.kiai = point.kiai;
        newPoint.omitFirstBarLine = point.omitFirstBarLine;
        newPoint.scrollSpeed = point.scrollSpeed;
      }

      if (point instanceof SamplePoint && newPoint instanceof SamplePoint) {
        newPoint.volume = point.volume;
        newPoint.sampleSet = point.sampleSet;
        newPoint.customIndex = point.customIndex;
      }

      newPoints.push([newPoint, newStartTime]);
    }

    this.beatmap.controlPoints.clear();
    for (const [p, start] of newPoints) {
      this.beatmap.controlPoints.add(p, start);
    }
  }

  private scaleObjects() {
    this.beatmap.hitObjects.forEach((obj) => {
      obj.startTime = Math.round(obj.startTime / this.rate);

      if (obj instanceof SpinnableObject || obj instanceof HoldableObject) {
        obj.endTime = Math.round(obj.endTime / this.rate);
      }
    });
  }

  private scaleBreakTimes() {
    const allBreakTimes = this.beatmap.events.breaks;

    for (const breakTime of allBreakTimes) {
      breakTime.startTime = Math.round(breakTime.startTime / this.rate);
      breakTime.endTime = Math.round(this.rate);
    }
  }

  // --- CÁLCULOS DE DIFICULDADE (AR/OD) ---

  private scaleDifficulty() {
    const originalMs = -6.0 * this.beatmap.difficulty.overallDifficulty + 79.5;
    const newMs = originalMs / this.rate;
    const newOD = (79.5 - newMs) / 6.0;

    this.beatmap.difficulty.overallDifficulty = this.clamp(
      Math.round(newOD * 10) / 10,
      0,
      11,
    );
  }

  private scaleAr() {
    const ar = this.beatmap.difficulty.approachRate;
    const originalMs = ar <= 5 ? 1800 - ar * 120 : 1200 - (ar - 5) * 150;
    const newMs = originalMs / this.rate;

    // Inverso do cálculo de MS para AR
    let newAR: number;
    if (newMs >= 1200) {
      newAR = (1800 - newMs) / 120;
    } else {
      newAR = (1200 - newMs) / 150 + 5;
    }

    this.beatmap.difficulty.approachRate = this.clamp(
      Math.round(newAR * 10) / 10,
      0,
      11,
    );
  }

  // --- AUXILIARES & METADATA ---

  private changeMetadata() {
    const rateText = `(${this.rate.toFixed(2)}x [${Math.round(this.beatmap.bpm)}bpm])`;
    this.beatmap.metadata.version = `${this.beatmap.metadata.version} ${rateText}`;
    this.beatmap.general.audioFilename = `(${this.rate.toFixed(4)}x) ${this.beatmap.general.audioFilename}`;
    this.beatmap.general.previewTime = Math.round(
      this.beatmap.general.previewTime / this.rate,
    );
    this.beatmap.metadata.beatmapId = -1;
    this.beatmap.metadata.tags.push("nzrn", "ratechange", "osutrainer");
  }

  private formatFilename(): string {
    return `${this.beatmap.metadata.artist} - ${this.beatmap.metadata.title} (${this.beatmap.metadata.creator}) [${this.beatmap.metadata.version}]`.replace(
      /[\\\/<>:"|?*]/g,
      "",
    );
  }

  async packToOSZ(): Promise<string> {
    const oszName =
      `${this.beatmap.metadata.beatmapSetId} ${this.beatmap.metadata.artist} - ${this.beatmap.metadata.title}`.replace(
        /[\\\/<>:"|?*]/g,
        "",
      );
    const outputPath = path.join(
      this.baseTempPath,
      "osz",
      this.fileHash,
      `${oszName}.osz`,
    );

    await OszPacker.pack(this.tempPath, outputPath);

    return outputPath;
  }

  private getNewPointInstance(type: ControlPointType) {
    switch (type) {
      case ControlPointType.DifficultyPoint:
        return new DifficultyPoint();
      case ControlPointType.SamplePoint:
        return new SamplePoint();
      case ControlPointType.EffectPoint:
        return new EffectPoint();
      default:
        return new TimingPoint();
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
