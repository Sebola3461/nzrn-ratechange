import { BanchoClient } from "bancho.js";
import { CommandHandler } from "./CommandHandler";
import { Logger } from "../helpers/Logger";
import { DatabaseService } from "../services/DatabaseService";

export class ChatBot {
  private Database = new DatabaseService();
  private CommandHandler = new CommandHandler(this.Database);
  private Client = new BanchoClient({
    username: process.env.IRC_USERNAME!,
    password: process.env.IRC_PASSWORD!,
    apiKey: process.env.API_V1_KEY!,
  });

  constructor() {}

  public Initialize() {
    Logger.info("Initializing...");

    this.Database.Initialize();

    Logger.info("Connecting to Bancho's IRC");
    this.Client.connect()
      .then(() => {
        Logger.success("Connected to Bancho's IRC");

        this.Client.on("PM", (pm) => this.CommandHandler.handleMessage(pm));
      })
      .catch((e) => {
        Logger.error("Cannot connect to Bancho's IRC", e);
      });
  }
}

// https://api.nerinyan.moe/d/2511492
