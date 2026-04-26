import { getGroups } from "./main.js";

const LEVELS = CONST.DOCUMENT_OWNERSHIP_LEVELS;
const LEVEL_META = [
  { level: LEVELS.OWNER,    key: "OWNER",    icon: "fa-user-shield", color: "#4a90e2" },
  { level: LEVELS.OBSERVER, key: "OBSERVER", icon: "fa-eye",         color: "#6cc24a" },
  { level: LEVELS.LIMITED,  key: "LIMITED",  icon: "fa-eye-low-vision", color: "#c49a4a" }
];

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
    if ( !doc?.ownership ) return;

    const byLevel = usersByLevel(doc);
    const badge = buildBadge(byLevel, groups, doc.ownership.default ?? 0);
    if ( !badge ) return;

    li.querySelector(".pg-owner-badge")?.remove();
    li.appendChild(badge);
  });
}

function usersByLevel(doc) {
  const own = doc.ownership ?? {};
  const defaultLevel = own.default ?? 0;
  const buckets = new Map();
  for ( const meta of LEVEL_META ) buckets.set(meta.level, new Set());
  for ( const user of game.users ) {
    if ( user.isGM ) continue;
    const lvl = own[user.id] ?? defaultLevel;
    if ( buckets.has(lvl) ) buckets.get(lvl).add(user.id);
  }
  return buckets;
}

function buildBadge(byLevel, groups, defaultLevel) {
  const sections = [];
  const iconLevels = [];
  const groupList = Object.values(groups);

  for ( const meta of LEVEL_META ) {
    const ids = byLevel.get(meta.level);
    if ( !ids?.size ) continue;
    iconLevels.push(meta);
    sections.push(renderLevelSection(meta, ids, groupList));
  }

  if ( !sections.length ) return null;

  const defaultLabel = defaultLevel > 0
    ? `<div class="pg-tt-default">${game.i18n.localize("OWNERSHIP.AllPlayers")}: <strong>${game.i18n.localize(`OWNERSHIP.${levelKey(defaultLevel)}`)}</strong></div>`
    : "";

  const html = `<div class="pg-tooltip">${defaultLabel}${sections.join("")}</div>`;

  const wrap = document.createElement("span");
  wrap.classList.add("pg-owner-badge");
  if ( iconLevels.length === 1 ) {
    wrap.innerHTML = `<i class="fa-solid ${iconLevels[0].icon}" style="color:${iconLevels[0].color}"></i>`;
  } else {
    wrap.innerHTML = iconLevels
      .map(m => `<i class="fa-solid ${m.icon}" style="color:${m.color}"></i>`)
      .join("");
    wrap.classList.add("pg-multi");
  }
  wrap.dataset.tooltip = html;
  wrap.dataset.tooltipDirection = "LEFT";
  wrap.dataset.tooltipClass = "pg-tooltip-wrap";
  return wrap;
}

function renderLevelSection(meta, userIds, groupList) {
  const remaining = new Set(userIds);
  const matched = [];
  for ( const g of groupList ) {
    const members = (g.members ?? []).filter(id => game.users.get(id) && !game.users.get(id).isGM);
    if ( !members.length ) continue;
    if ( members.every(id => remaining.has(id)) ) {
      matched.push({ g, members });
      for ( const id of members ) remaining.delete(id);
    }
  }

  const groupsHtml = matched.map(({ g, members }) => {
    const color = g.color || "#4a90e2";
    const memberHtml = members
      .map(id => game.users.get(id))
      .map(u => `<span class="pg-tt-member" style="color:${u.color ?? "#ddd"}">${escapeHtml(u.name)}</span>`)
      .join("");
    return `
      <div class="pg-tt-group">
        <div class="pg-tt-group-head">
          <span class="pg-tt-dot" style="background:${color}"></span>
          <span class="pg-tt-group-name">${escapeHtml(g.name || "?")}</span>
          <span class="pg-tt-count">${members.length}</span>
        </div>
        <div class="pg-tt-members">${memberHtml}</div>
      </div>`;
  }).join("");

  const usersHtml = Array.from(remaining)
    .map(id => game.users.get(id))
    .filter(Boolean)
    .map(u => `<div class="pg-tt-user"><span class="pg-tt-dot" style="background:${u.color ?? "#888"}"></span>${escapeHtml(u.name)}</div>`)
    .join("");

  return `
    <div class="pg-tt-section">
      <div class="pg-tt-title" style="color:${meta.color}">
        <i class="fa-solid ${meta.icon}"></i> ${game.i18n.localize(`OWNERSHIP.${meta.key}`)}
      </div>
      ${groupsHtml}
      ${usersHtml ? `<div class="pg-tt-individuals">${usersHtml}</div>` : ""}
    </div>`;
}

function levelKey(level) {
  const entry = Object.entries(LEVELS).find(([, v]) => v === level);
  return entry?.[0] ?? "NONE";
}
