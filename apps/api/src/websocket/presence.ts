const connections = new Map<string, number>();

export function userConnected(userId: string) {
  const count = connections.get(userId) ?? 0;

  connections.set(userId, count + 1);

  return count === 0;
}

export function userDisconnected(userId: string) {
  const count = connections.get(userId) ?? 0;

  if (count <= 1) {
    connections.delete(userId);
    return true;
  }

  connections.set(userId, count - 1);

  return false;
}

export function isUserOnline(userId: string) {
  return connections.has(userId);
}