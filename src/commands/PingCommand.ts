import { ChatCommand } from "../models/ChatCommand";

export class PingCommand extends ChatCommand {
  name = "ping";
  description = "Pong?";
  aliases: string[] = [];

  async execute(message: any, args: string[]): Promise<void> {
    message.user.sendMessage("Pong!");
  }
}
