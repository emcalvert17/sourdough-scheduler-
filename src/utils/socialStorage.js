const PROFILE_KEY   = 'ss_profile';
const LIKES_KEY     = 'ss_likes';
const SAVES_KEY     = 'ss_saves';
const FRIENDS_KEY   = 'ss_friends';

export function getProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null; } catch { return null; }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getLikes() {
  try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY)) || []); } catch { return new Set(); }
}

export function toggleLike(postId) {
  const likes = getLikes();
  if (likes.has(postId)) { likes.delete(postId); } else { likes.add(postId); }
  localStorage.setItem(LIKES_KEY, JSON.stringify([...likes]));
  return likes.has(postId);
}

export function getSaves() {
  try { return new Set(JSON.parse(localStorage.getItem(SAVES_KEY)) || []); } catch { return new Set(); }
}

export function toggleSave(postId) {
  const saves = getSaves();
  if (saves.has(postId)) { saves.delete(postId); } else { saves.add(postId); }
  localStorage.setItem(SAVES_KEY, JSON.stringify([...saves]));
  return saves.has(postId);
}

export function getFriends() {
  try { return new Set(JSON.parse(localStorage.getItem(FRIENDS_KEY)) || []); } catch { return new Set(); }
}

export function toggleFriend(userId) {
  const friends = getFriends();
  if (friends.has(userId)) { friends.delete(userId); } else { friends.add(userId); }
  localStorage.setItem(FRIENDS_KEY, JSON.stringify([...friends]));
  return friends.has(userId);
}
