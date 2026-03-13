import { Litterbox } from "node-catbox";

export class CatboxService {
  private static litterbox = new Litterbox();

  public static async UploadFile(filePath: string) {
    return await CatboxService.litterbox.uploadFile({
      path: filePath,
    });
  }
}
