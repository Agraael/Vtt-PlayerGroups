import { MODULE_ID, getGroups, setGroups } from "./main.js";

export class GroupManagerApp extends FormApplication {

  constructor(...args) {
    super(...args);
    this._groups = getGroups();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "player-groups-manager",
      title: game.i18n.localize("PLAYERGROUPS.ManagerTitle"),
      template: `modules/${MODULE_ID}/templates/group-manager.hbs`,
      width: 520,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
      submitOnChange: false,
      classes: ["player-groups", "manager"]
    });
  }

  getData() {
    const users = game.users
      .filter(u => !u.isGM)
      .map(u => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

    const groupList = Object.values(this._groups).map(g => ({
      id: g.id,
      name: g.name ?? "",
      color: g.color ?? "#cccccc",
      memberSet: Object.fromEntries((g.members ?? []).map(id => [id, true]))
    }));

    return { users, groupList };
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html[0];

    root.querySelector(".pg-add")?.addEventListener("click", () => this._onAdd());

    root.querySelectorAll(".pg-group").forEach(fs => {
      const id = fs.dataset.groupId;
      fs.querySelector(".pg-delete")?.addEventListener("click", () => this._onDelete(id));
      fs.querySelector(".pg-name")?.addEventListener("input", e => this._sync(id, "name", e.target.value));
      fs.querySelector(".pg-color")?.addEventListener("input", e => this._sync(id, "color", e.target.value));
      fs.querySelectorAll(".pg-member input[type=checkbox]").forEach(cb => {
        cb.addEventListener("change", e => this._toggleMember(id, e.target.dataset.userId, e.target.checked));
      });
    });
  }

  _sync(id, key, value) {
    if ( !this._groups[id] ) return;
    this._groups[id][key] = value;
  }

  _toggleMember(id, userId, on) {
    const g = this._groups[id];
    if ( !g ) return;
    const set = new Set(g.members ?? []);
    if ( on ) set.add(userId);
    else set.delete(userId);
    g.members = Array.from(set);
  }

  async _onAdd() {
    const id = foundry.utils.randomID(16);
    this._groups[id] = {
      id,
      name: game.i18n.localize("PLAYERGROUPS.UntitledGroup"),
      color: "#4a90e2",
      members: []
    };
    this.render();
  }

  async _onDelete(id) {
    const g = this._groups[id];
    if ( !g ) return;
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("PLAYERGROUPS.ConfirmDeleteTitle"),
      content: `<p>${game.i18n.format("PLAYERGROUPS.ConfirmDelete", { name: g.name || "?" })}</p>`
    });
    if ( !confirmed ) return;
    delete this._groups[id];
    this.render();
  }

  async _updateObject(_event, _formData) {
    const cleaned = {};
    for ( const [id, g] of Object.entries(this._groups) ) {
      cleaned[id] = {
        id,
        name: (g.name ?? "").trim() || game.i18n.localize("PLAYERGROUPS.UntitledGroup"),
        color: g.color ?? "#cccccc",
        members: Array.from(new Set(g.members ?? []))
      };
    }
    await setGroups(cleaned);
  }
}
