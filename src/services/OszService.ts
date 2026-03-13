import archiver from "archiver";
import unzipper from "unzipper";
import { createReadStream, createWriteStream, existsSync, mkdirSync } from "fs";
import path from "path";

export class OszPacker {
  /**
   * Cria a estrutura de pastas necessária de forma recursiva.
   */
  static createFolders(basePath: string, hash: string) {
    const targetPath = path.join(basePath, hash);
    const oszPath = path.join(basePath, "osz", hash);

    if (!existsSync(targetPath)) mkdirSync(targetPath, { recursive: true });
    if (!existsSync(oszPath)) mkdirSync(oszPath, { recursive: true });
  }

  /**
   * Compacta um diretório em um arquivo .osz (ZIP).
   */
  static async pack(sourceDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outputPath);
      const archive = archiver("zip", { zlib: { level: 9 } }); // Compressão máxima

      output.on("close", resolve);
      archive.on("error", reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Extrai um arquivo .osz para um diretório específico.
   */
  static async unpack(inputPath: string, targetDir: string): Promise<void> {
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

    return new Promise((resolve, reject) => {
      createReadStream(inputPath)
        .pipe(unzipper.Extract({ path: targetDir }))
        .on("close", resolve)
        .on("error", reject);
    });
  }
}
