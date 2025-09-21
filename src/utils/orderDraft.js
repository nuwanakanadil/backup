// src/utils/orderDraft.js
const KEY_BASE = "orderDraftItems";

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";
const key = (userId) => `${KEY_BASE}::${userId || "anon"}`;

export function getDraftItems(userId) {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDraftItems(items, userId) {
  if (!isBrowser()) return;
  localStorage.setItem(key(userId), JSON.stringify(items));
}

export function addToDraft(item, userId) {
  const items = getDraftItems(userId);
  const i = items.findIndex((x) => x._id === item._id);
  if (i >= 0) items[i].quantity = (items[i].quantity || 1) + 1;
  else items.push({ ...item, quantity: 1 });
  saveDraftItems(items, userId);
}

export function removeFromDraft(productId, userId) {
  const items = getDraftItems(userId).filter((x) => x._id !== productId);
  saveDraftItems(items, userId);
  return items;
}

export function clearDraft(userId) {
  if (!isBrowser()) return;
  localStorage.removeItem(key(userId));
}
