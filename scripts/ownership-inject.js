import { getGroups } from "./main.js";

export function injectGroupRows(app, html, data) {
  const groups = getGroups();
  const groupArr = Object.values(groups);
  if ( !groupArr.length ) return;

  const root = html[0] ?? html;
  const form = root.matches("form") ? root : root.querySelector("form");
  if ( !form ) return;

  const formGroups = form.querySelectorAll(":scope > .form-group");
  const allPlayersRow = formGroups[1] ?? null;
  if ( !allPlayersRow ) return;

  const playerLevels = data.playerLevels ?? [];

  const userSelects = () => Array.from(form.querySelectorAll('select[name]:not([name="default"])'));

  const wrapper = document.createElement("div");
  wrapper.classList.add("pg-group-rows");

  for ( const g of groupArr ) {
    const memberIds = (g.members ?? []).filter(id => game.users.get(id));
    const row = document.createElement("div");
    row.classList.add("form-group", "pg-group-row");
    row.dataset.groupId = g.id;

    const label = document.createElement("label");
    const dot = document.createElement("span");
    dot.classList.add("pg-color-dot");
    dot.style.background = g.color || "#cccccc";
    label.appendChild(dot);
    label.appendChild(document.createTextNode(" " + (g.name || game.i18n.localize("PLAYERGROUPS.UntitledGroup"))));
    row.appendChild(label);

    const select = document.createElement("select");
    select.dataset.dtype = "Number";
    select.dataset.groupId = g.id;

    const mixedOpt = document.createElement("option");
    mixedOpt.value = "";
    mixedOpt.textContent = game.i18n.localize("PLAYERGROUPS.Mixed");
    mixedOpt.disabled = true;
    mixedOpt.hidden = true;
    select.appendChild(mixedOpt);

    for ( const lv of playerLevels ) {
      const opt = document.createElement("option");
      opt.value = String(lv.level);
      opt.textContent = lv.label;
      select.appendChild(opt);
    }

    if ( !memberIds.length ) {
      select.disabled = true;
      row.dataset.tooltip = game.i18n.localize("PLAYERGROUPS.EmptyTooltip");
    } else {
      const current = currentSharedLevel(form, memberIds);
      select.value = current === null ? "" : String(current);
      if ( current === null ) mixedOpt.hidden = false;
    }

    select.addEventListener("change", e => {
      const val = e.target.value;
      if ( val === "" ) return;
      const targets = userSelects();
      for ( const uid of memberIds ) {
        const userSel = targets.find(s => s.name === uid);
        if ( !userSel ) continue;
        userSel.value = val;
        userSel.dispatchEvent(new Event("change", { bubbles: true }));
      }
      mixedOpt.hidden = true;
    });

    row.appendChild(select);
    wrapper.appendChild(row);
  }

  allPlayersRow.after(wrapper);

  app.setPosition({ height: "auto" });
}

function currentSharedLevel(form, memberIds) {
  let shared;
  for ( const uid of memberIds ) {
    const sel = form.querySelector(`select[name="${uid}"]`);
    if ( !sel ) continue;
    const v = sel.value;
    if ( shared === undefined ) shared = v;
    else if ( shared !== v ) return null;
  }
  return shared ?? null;
}
