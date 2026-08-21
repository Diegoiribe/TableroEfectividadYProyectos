import { useEffect, useRef, useState } from 'react';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const STORAGE_KEY = 'tablero-interno-data';
const MIGRATION_KEY = 'tablero-interno-cloud-migrated-tablerointerno2';
const dashboardRef = doc(db, 'dashboards', 'principal');
const DEMO_ROW_IDS = new Set([1, 2, 3, 4, 5, 6, 1787351063387]);

function removeDemoRows(data) {
  if (!data?.tables) return data;
  return {
    ...data,
    members: (data.members ?? []).map((member) =>
      member === 'Alfredo' ? 'JR' : member
    ),
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
    return saved?.members && saved?.tables ? removeDemoRows(saved) : fallback;
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

function cloudMigrationDone() {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'true';
  } catch {
    return true;
  }
}

function markCloudMigrationDone() {
  try {
    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch {
    // Firestore already contains the merged data.
  }
}

function normalizeRows(table, columns) {
  if (!table) return [];
  return (table.rows ?? []).map((row) => ({
    ...row,
    values: columns.map((column) => {
      const index = (table.columns ?? []).indexOf(column);
      return index >= 0 ? row.values?.[index] ?? '' : '';
    })
  }));
}

function mergeDashboards(remote, local) {
  const remoteData = removeDemoRows(remote);
  const localData = removeDemoRows(local);
  const viewIds = new Set([
    ...Object.keys(remoteData?.tables ?? {}),
    ...Object.keys(localData?.tables ?? {})
  ]);

  return {
    members: [
      ...new Set([
        ...(remoteData?.members ?? []),
        ...(localData?.members ?? [])
      ])
    ],
    tables: Object.fromEntries(
      [...viewIds].map((view) => {
        const remoteTable = remoteData?.tables?.[view];
        const localTable = localData?.tables?.[view];
        const columns = [
          ...new Set([
            ...(localTable?.columns ?? []),
            ...(remoteTable?.columns ?? [])
          ])
        ];
        const rows = new Map(
          normalizeRows(remoteTable, columns).map((row) => [row.id, row])
        );
        normalizeRows(localTable, columns).forEach((row) =>
          rows.set(row.id, row)
        );

        return [
          view,
          {
            ...(remoteTable ?? {}),
            ...(localTable ?? {}),
            columns,
            rows: [...rows.values()],
            resources: []
          }
        ];
      })
    )
  };
}

export function useDashboardStorage(initialData) {
  const [data, setData] = useState(() => readLocal(initialData));
  const dataRef = useRef(data);
  const cloudAvailableRef = useRef(true);
  const localDirtyRef = useRef(false);
  const changeVersionRef = useRef(0);
  const [remoteReady, setRemoteReady] = useState(false);
  const [syncState, setSyncState] = useState('connecting');

  const updateData = (next) => {
    localDirtyRef.current = true;
    changeVersionRef.current += 1;
    setData(next);
  };

  useEffect(() => {
    let active = true;
    let connectionTimeout;
    let unsubscribe = () => {};

    const connect = async () => {
      try {
        if (!cloudMigrationDone()) {
          const remoteSnapshot = await getDoc(dashboardRef);
          if (!active) return;
          const remoteData = remoteSnapshot.exists()
            ? {
                members: remoteSnapshot.data().members,
                tables: remoteSnapshot.data().tables
              }
            : { members: [], tables: {} };
          const merged = mergeDashboards(remoteData, dataRef.current);

          await setDoc(dashboardRef, {
            ...merged,
            updatedAt: serverTimestamp()
          });
          markCloudMigrationDone();
          dataRef.current = merged;
          setData(merged);
          writeLocal(merged);
        }

        unsubscribe = onSnapshot(
          dashboardRef,
          { includeMetadataChanges: true },
          (snapshot) => {
            window.clearTimeout(connectionTimeout);
            cloudAvailableRef.current = true;
            if (snapshot.exists()) {
              const remote = snapshot.data();
              if (remote.members && remote.tables) {
                const next = removeDemoRows({
                  members: remote.members,
                  tables: remote.tables
                });
                const nextValue = JSON.stringify(next);
                const currentValue = JSON.stringify(dataRef.current);
                if (
                  localDirtyRef.current &&
                  nextValue === currentValue &&
                  !snapshot.metadata.hasPendingWrites
                ) {
                  localDirtyRef.current = false;
                  writeLocal(next);
                } else if (
                  !localDirtyRef.current &&
                  nextValue !== currentValue
                ) {
                  dataRef.current = next;
                  setData(next);
                  writeLocal(next);
                }
              }
            }
            setRemoteReady(true);
            setSyncState('synced');
          },
          () => {
            window.clearTimeout(connectionTimeout);
            cloudAvailableRef.current = false;
            setRemoteReady(true);
            setSyncState('local');
          }
        );

        connectionTimeout = window.setTimeout(() => {
          cloudAvailableRef.current = false;
          unsubscribe();
          setRemoteReady(true);
          setSyncState('local');
        }, 5000);
      } catch {
        cloudAvailableRef.current = false;
        setRemoteReady(true);
        setSyncState('local');
      }
    };

    connect();

    return () => {
      active = false;
      window.clearTimeout(connectionTimeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    dataRef.current = data;
    writeLocal(data);
    if (!remoteReady || !cloudAvailableRef.current) return;

    const version = changeVersionRef.current;
    const timeout = window.setTimeout(async () => {
      setSyncState('saving');
      try {
        await setDoc(dashboardRef, { ...data, updatedAt: serverTimestamp() });
        if (changeVersionRef.current === version) {
          setSyncState('synced');
        }
      } catch {
        if (changeVersionRef.current === version) setSyncState('local');
      }
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [data, remoteReady]);

  return [data, updateData, syncState];
}
