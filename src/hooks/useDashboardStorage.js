import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STORAGE_KEY = 'tablero-interno-data';
const dashboardRef = doc(db, 'dashboards', 'principal');
const DEMO_ROW_IDS = new Set([1, 2, 3, 4, 5, 6, 1787351063387]);

function removeDemoRows(data) {
  if (!data?.tables) return data;
  return {
    tools: data.tools ?? [],
    docs: data.docs ?? [],
    updates: data.updates ?? [],
    tables: Object.fromEntries(
      Object.entries(data.tables).map(([view, table]) => [
        view,
        {
          ...table,
          rows: (table.rows ?? []).filter((row) => !DEMO_ROW_IDS.has(row.id))
        }
      ])
    )
  };
}

function readLocal(fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved?.tables ? removeDemoRows(saved) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // The in-memory state still keeps the dashboard usable.
  }
}

export function useDashboardStorage(initialData) {
  const [data, setData] = useState(() => readLocal(initialData));
  const dataRef = useRef(data);
  const cloudAvailableRef = useRef(true);
  const localDirtyRef = useRef(false);
  const changeVersionRef = useRef(0);
  const remoteInitializedRef = useRef(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [syncState, setSyncState] = useState('connecting');

  const updateData = (next) => {
    localDirtyRef.current = true;
    changeVersionRef.current += 1;
    setData((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      dataRef.current = resolved;
      return resolved;
    });
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(
      dashboardRef,
      { includeMetadataChanges: true },
      (remoteSnapshot) => {
        cloudAvailableRef.current = true;

        if (remoteSnapshot.metadata.fromCache) {
          setSyncState((current) =>
            current === 'saving' ? current : 'connecting'
          );
          return;
        }

        if (!remoteSnapshot.exists()) {
          if (!remoteInitializedRef.current) {
            remoteInitializedRef.current = true;
            localDirtyRef.current = true;
            changeVersionRef.current += 1;
            setRemoteReady(true);
            setSyncState('saving');
          }
          return;
        }

        if (remoteSnapshot.metadata.hasPendingWrites) {
          setSyncState('saving');
          return;
        }

        const rawRemoteData = remoteSnapshot.data();
        const remoteData = removeDemoRows(rawRemoteData);
        const hasLegacyFields = ['docsTrash', 'members'].some((field) =>
          Object.prototype.hasOwnProperty.call(rawRemoteData, field)
        );

        remoteInitializedRef.current = true;
        setRemoteReady(true);

        // Never mix a browser's stale local cache into the shared dashboard.
        // Firebase is authoritative and pushes every committed change in real time.
        if (!localDirtyRef.current) {
          dataRef.current = remoteData;
          setData(remoteData);
          writeLocal(remoteData);
          setSyncState('synced');
        }

        // Removed interface fields are also removed from Firebase on the next write.
        if (hasLegacyFields && !localDirtyRef.current) {
          localDirtyRef.current = true;
          changeVersionRef.current += 1;
          setSyncState('saving');
        }
      },
      (error) => {
        console.error('No se pudo conectar con Firestore.', error);
        cloudAvailableRef.current = false;
        setRemoteReady(true);
        setSyncState('local');
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    dataRef.current = data;
    writeLocal(data);
    if (!remoteReady || !cloudAvailableRef.current || !localDirtyRef.current)
      return;

    const version = changeVersionRef.current;
    const timeout = window.setTimeout(async () => {
      setSyncState('saving');
      try {
        await setDoc(dashboardRef, { ...data, updatedAt: serverTimestamp() });
        if (changeVersionRef.current === version) {
          localDirtyRef.current = false;
          setSyncState('synced');
        }
      } catch (error) {
        console.error(
          'No se pudieron guardar los cambios en Firestore.',
          error
        );
        if (changeVersionRef.current === version) setSyncState('error');
      }
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [data, remoteReady]);

  return [data, updateData, syncState];
}
