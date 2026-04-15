import { GroupManagerApp } from "./group-manager.js";
import { injectGroupRows } from "./ownership-inject.js";
import { registerBadgeHooks } from "./ownership-badges.js";

export const MODULE_ID = "player-groups";
export const SETTING_GROUPS = "groups";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTING_GROUPS, {
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.registerMenu(MODULE_ID, "manager", {
    name: "PLAYERGROUPS.SettingMenuName",
    label: "PLAYERGROUPS.SettingMenuLabel",
    hint: "PLAYERGROUPS.SettingMenuHint",
    icon: "fa-solid fa-users",
    type: GroupManagerApp,
    restricted: true
  });

  registerBadgeHooks();
});

Hooks.on("renderDocumentOwnershipConfig", (app, html, data) => {
  if ( !game.user.isGM ) return;
  injectGroupRows(app, html, data);
});

export function getGroups() {
  return foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTING_GROUPS) ?? {});
}

export async function setGroups(groups) {
  return game.settings.set(MODULE_ID, SETTING_GROUPS, groups);
}
