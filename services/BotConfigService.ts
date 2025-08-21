import {ipcMain} from "electron";
import ElectronStore from "electron-store";
import {BotConfig, StoreSchema} from "./store/StoreSchema";

export class BotConfigService {
    private appStorage: ElectronStore<StoreSchema>;

    constructor(
        store: ElectronStore<StoreSchema>,
        onConfigurationChanged: (newConfig: BotConfig) => void
    ) {
        this.appStorage = store;

        const name =  this.appStorage.get('currentBot') || 'default';
        const configs = this.appStorage.get('bots');
        const currentBot = configs[name] || configs['default']
        if (currentBot) {
            onConfigurationChanged(currentBot);
        }

        ipcMain.handle('bot:get-all', async () => {
            return store.get('bots') || {};
        });
        ipcMain.handle('bot:get-by-name', async (_e, botName: string) => {
            const config = store.get('bots')
            return config[botName];
        });
        ipcMain.handle('bot:set', async (_e, botName: string, botConfig: BotConfig) => {
            const config = this.appStorage.get('bots') || {};
            config[botName] = botConfig;
            this.appStorage.set('bots', config);
            onConfigurationChanged(config[botName]);
            return true;
        });
        ipcMain.handle('bot:create', async (_e, botName: string) => {
            const configs = this.appStorage.get('bots') || {};
            if (configs[botName]) {
                throw new Error(`Bot with name ${botName} already exists`);
            }
            configs[botName] = configs['default'];
            this.appStorage.set('bots', configs);
            return true;
        });
        ipcMain.handle('bot:delete', async (_e, botName: string) => {
            if (botName === 'default') {
                throw new Error("Cannot delete the default bot");
            }
            const config = this.appStorage.get('bots') || {};
            if (config[botName]) {
                delete config[botName];
                this.appStorage.set('bots', config);
                return true;
            }
            return false;
        });
        ipcMain.handle('bot:select', async (_e, botName: string) => {
            const config = this.appStorage.get('bots') || {};
            if (config[botName]) {
                this.appStorage.set('currentBot', botName);
                onConfigurationChanged(config[botName]);
                return true;
            }
            return false;
        });
        ipcMain.handle('bot:get-current', async () => {
            const name =  this.appStorage.get('currentBot') || 'default';
            const config = this.appStorage.get('bots') || {};
            return { name: name, config: config[name] || null };
        });
    }

}