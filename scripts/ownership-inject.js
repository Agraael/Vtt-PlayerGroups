import { getGroups } from "./main.js";

export function injectGroupRows(app, html, data) {
  const groups = getGroups();
  const groupArr = Object.values(groups);
  if ( !groupArr.length ) return;

  const root = html instanceof HTMLElement ? html : (html?.[0] ?? html);
  if ( !root ) return;

  // v13: the "All Players" row sits inside <menu> as <li class="form-group"> containing
  // <select name="default">. v12 had a flat <div class="form-group"> structure.
  // Locate the All Players row by its default select rather than by sibling index.
  const defaultSelect = root.querySelector('select[name="default"]');
  const allPlayersRow = defaultSelect?.closest('.form-group');
  if ( !allPlayersRow ) return;

  const isV13Menu = allPlayersRow.tagName === 'LI';
  const rowTag = isV13Menu ? 'li' : 'div';

  const playerLevels = data.playerLevels ?? [];

  const userSelects = () => Array.from(root.querySelectorAll('select[name]:not([name="default"])'));

  // v12 used a wrapper <div> to visually group the rows. In v13 the rows are <li>s inside a <menu>;
  // nested LIs are invalid HTML so insert siblings directly after the All Players row instead.
  const wrapper = isV13Menu ? null : document.createElement('div');
  if ( wrapper ) wrapper.classList.add("pg-group-rows");

  const createdRows = [];
  for ( const g of groupArr ) {
    const memberIds = (g.members ?? []).filter(id => game.users.get(id));
    const row = document.createElement(rowTag);
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
      const current = currentSharedLevel(root, memberIds);
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
    if ( wrapper ) wrapper.appendChild(row);
    else createdRows.push(row);
  }

  if ( wrapper ) {
    allPlayersRow.after(wrapper);
  } else {
    // Insert in order so the first group row ends up immediately after All Players.
    let anchor = allPlayersRow;
    for ( const row of createdRows ) {
      anchor.after(row);
      anchor = row;
    }
  }

  app.setPosition({ height: "auto" });
}

function currentSharedLevel(root, memberIds) {
  let shared;
  for ( const uid of memberIds ) {
    const sel = root.querySelector(`select[name="${uid}"]`);
    if ( !sel ) continue;
    const v = sel.value;
    if ( shared === undefined ) shared = v;
    else if ( shared !== v ) return null;
  }
  return shared ?? null;
}
