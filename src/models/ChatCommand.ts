import { DatabaseService } from "../services/DatabaseService";

export abstract class ChatCommand {
  abstract name: string;
  abstract description: string;
  abstract aliases: string[];

  abstract execute(
    message: any,
    args: string[],
    db: DatabaseService,
  ): Promise<any>;
}
