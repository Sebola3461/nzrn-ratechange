import { PrivateMessage } from "bancho.js";
import { PingCommand } from "../commands/PingCommand";
import { Logger } from "../helpers/Logger";
import { ChatCommand } from "../models/ChatCommand";
import {
  BEATMAP_ID_REGEX,
  BEATMAP_URL_REGEX,
  BEATMAPSET_ID_REGEX,
} from "../constants/REgex";
import { DatabaseService } from "../services/DatabaseService";
import { RateChangeCommand } from "../commands/RateChange";

export class CommandHandler {
  private commands = new Map<string, ChatCommand>();
  private prefix = "!";

  constructor(private db: DatabaseService) {
    this.registerCommands();
  }

  private registerCommands() {
    const commandList: ChatCommand[] = [
      new PingCommand(),
      new RateChangeCommand(),
    ];

    commandList.forEach((cmd) => {
      this.commands.set(cmd.name, cmd);
      cmd.aliases.forEach((alias) => this.commands.set(alias, cmd));
    });
  }

  public async handleMessage(message: PrivateMessage) {
    if (message.getAction()) return this.handleAction(message);

    if (!message.content.startsWith(this.prefix)) return;

    const args = message.content.slice(this.prefix.length).split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    const command = this.commands.get(commandName || "");
    if (command) {
      Logger.info(`Requested run for command !${commandName}`);
      try {
        await command.execute(message, args, this.db);
      } catch (err) {
        console.error("Erro ao executar comando:", err);
      }
    }
  }

  public async handleAction(message: PrivateMessage) {
    const actionContent = message.getAction();
    const beatmapURL = actionContent?.match(BEATMAP_URL_REGEX)?.at(0);

    if (!beatmapURL) return;

    const beatmapId = beatmapURL.match(BEATMAP_ID_REGEX)?.at(0);
    const beatmapsetId = beatmapURL.match(BEATMAPSET_ID_REGEX)?.at(0);

    if (!beatmapId || !beatmapsetId) return;

    try {
      const userData = await message.user.fetchFromAPI();
      const userId = userData.id;

      if (!userId) return;

      this.db.registerLatestMapWithSet(userId, beatmapId, beatmapsetId);

      message.user.sendMessage(
        "Now use !ratechange to change beatmap's speed rate",
      );
    } catch (e) {
      Logger.error("Cannot process message action", e);
    }
  }
}
