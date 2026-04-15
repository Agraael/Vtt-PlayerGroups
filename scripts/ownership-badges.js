import { getGroups } from "./main.js";

const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;

function escapeHtml(s) {
  return String(s ?? "").replaceAll(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function registerBadgeHooks() {
  const dirHooks = [
    "renderActorDirectory",
    "renderItemDirectory",
    "renderJournalDirectory",
    "renderSceneDirectory",
    "renderRollTableDirectory",
    "renderCardsDirectory",
    "renderMacroDirectory",
    "renderPlaylistDirectory"
  ];
  for ( const h of dirHooks ) Hooks.on(h, (app, html) => applyBadges(app, html));
}

function applyBadges(app, html) {
  if ( !game.user.isGM ) return;
  const root = html[0] ?? html;
  if ( !root?.querySelectorAll ) return;

  const collection = app.collection ?? app.documents ?? null;
  const groups = getGroups();

  root.querySelectorAll("li.directory-item, li.folder").forEach(li => {
    const isFolder = li.classList.contains("folder");
    const id = isFolder
      ? (li.dataset.folderId ?? li.dataset.uuid?.split(".").pop())
      : (li.dataset.documentId ?? li.dataset.entryId);
    if ( !id ) return;

    const doc = isFolder ? game.folders?.get(id) : collection?.get?.(id);
    if ( !doc ) return;
    if ( isFolder ) {
      if ( !(doc.ownership) ) return;
    } else if ( !doc.ownership ) return;

    const owners = ownerUserIds(doc);
    const badge = buildBadge(owners, groups);
    if ( !badge ) return;

    li.querySelector(".pg-owner-badge")?.remove();
    li.appendChild(badge);
  });
}

function ownerUserIds(doc) {
  const own = doc.ownership ?? {};
  const defaultLevel = own.default ?? 0;
  const ids = new Set();
  for ( const user of game.users ) {
    if ( user.isGM ) continue;
    const lvl = own[user.id] ?? defaultLevel;
    if ( lvl >= OWNER ) ids.add(user.id);
  }
  return ids;
}

function buildBadge(ownerIds, groups) {
  if ( !ownerIds.size ) return null;

  const matched = [];
  const remaining = new Set(ownerIds);
  const groupList = Object.values(groups);
  for ( const g of groupList ) {
    const members = (g.members ?? []).filter(id => game.users.get(id) && !game.users.get(id).isGM);
    if ( !members.length ) continue;
    if ( members.every(id => remaining.has(id)) ) {
      matched.push(g);
      for ( const id of members ) remaining.delete(id);
    }
  }

  if ( !matched.length && !remaining.size ) return null;

  const parts = [`<div class="pg-tt-title"><i class="fa-solid fa-user-shield"></i> ${game.i18n.localize("OWNERSHIP.OWNER")}</div>`];

  for ( const g of matched ) {
    const color = g.color || "#4a90e2";
    const members = (g.members ?? [])
      .map(id => game.users.get(id))
      .filter(u => u && !u.isGM);
    const memberHtml = members
      .map(u => `<span class="pg-tt-member" style="color:${u.color ?? "#ddd"}">${escapeHtml(u.name)}</span>`)
      .join("");
    parts.push(`
      <div class="pg-tt-group">
        <div class="pg-tt-group-head">
          <span class="pg-tt-dot" style="background:${color}"></span>
          <span class="pg-tt-group-name">${escapeHtml(g.name || "?")}</span>
          <span class="pg-tt-count">${members.length}</span>
        </div>
        <div class="pg-tt-members">${memberHtml}</div>
      </div>`);
  }

  if ( remaining.size ) {
    const userHtml = Array.from(remaining)
      .map(id => game.users.get(id))
      .filter(Boolean)
      .map(u => `<div class="pg-tt-user"><span class="pg-tt-dot" style="background:${u.color ?? "#888"}"></span>${escapeHtml(u.name)}</div>`)
      .join("");
    parts.push(`<div class="pg-tt-individuals">${userHtml}</div>`);
  }

  const icon = document.createElement("i");
  icon.classList.add("pg-owner-badge", "fa-solid", "fa-user-shield");
  if ( matched.length ) icon.style.color = matched[0].color || "#4a90e2";
  icon.dataset.tooltip = `<div class="pg-tooltip">${parts.join("")}</div>`;
  icon.dataset.tooltipDirection = "LEFT";
  icon.dataset.tooltipClass = "pg-tooltip-wrap";
  return icon;
}
