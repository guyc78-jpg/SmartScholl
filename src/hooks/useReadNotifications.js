import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sch_read_notifications_v1';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveToStorage(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / privacy errors
  }
}

/**
 * Tracks which "virtual" notifications the user already opened.
 * A notification is identified by a stable id + a signature derived from its
 * current count, so a *new* event (e.g., new task added) re-surfaces it.
 */
export default function useReadNotifications() {
  const [readMap, setReadMap] = useState(() => loadFromStorage());

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setReadMap(loadFromStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markAsRead = useCallback((id, signature = '') => {
    setReadMap(prev => {
      if (prev[id] === signature) return prev;
      const next = { ...prev, [id]: signature };
      saveToStorage(next);
      return next;
    });
  }, []);

  const isRead = useCallback((id, signature = '') => {
    return readMap[id] === signature;
  }, [readMap]);

  return { isRead, markAsRead };
}