import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STORAGE_KEY = 'tablero-interno-data';
const DIRTY_KEY = 'tablero-interno-cloud-pending-tablerointerno2';
const dashboardRef = doc(db, 'dashboards', 'principal');
const DEMO_ROW_IDS = new Set([1, 2, 3, 4, 5, 6, 1787351063387]);
const TRASH_LIFETIME = 5 * 24 * 60 * 60 * 1000;

function removeDemoRows(data) {
  if (!data?.tables) return data;
  return {
    ...data,
    members: (data.members ?? []).map((member) =>
      member === 'Alfredo' ? 'JR' : member
    ),
    tools: data.tools ?? [],
    docs: data.docs ?? [],
    docsTrash: (data.docsTrash ?? []).filter(
      (document) => Date.now() - (document.deletedAt ?? 0) < TRASH_LIFETIME
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

function localSavePending() {
  try {
    return localStorage.getItem(DIRTY_KEY) === 'true';
  } catch {
    return false;
  }
}

function markLocalSavePending(pending) {
  try {
    localStorage.setItem(DIRTY_KEY, String(pending));
  } catch {
    // Firestore remains the primary persistence layer.
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

function normalizeResources(table) {
  return (table?.resources ?? []).filter(
    (resource) => resource?.url && (resource.label || resource.name)
  );
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
    tools: [
      ...new Map(
        [...(remoteData?.tools ?? []), ...(localData?.tools ?? [])].map(
          (resource) => [
            resource.id ?? `${resource.url}:${resource.label ?? resource.name}`,
            resource
          ]
        )
      ).values()
    ],
    docs: [
      ...new Map(
        [...(remoteData?.docs ?? []), ...(localData?.docs ?? [])].map(
          (document) => [document.id, document]
        )
      ).values()
    ],
    docsTrash: [
      ...new Map(
        [...(remoteData?.docsTrash ?? []), ...(localData?.docsTrash ?? [])].map(
          (document) => [document.id, document]
        )
      ).values()
    ].filter(
      (document) => Date.now() - (document.deletedAt ?? 0) < TRASH_LIFETIME
    ),
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
        const resources = new Map(
          normalizeResources(remoteTable).map((resource) => [
            resource.id ?? `${resource.url}:${resource.label ?? resource.name}`,
            resource
          ])
        );
        normalizeResources(localTable).forEach((resource) =>
          resources.set(
            resource.id ?? `${resource.url}:${resource.label ?? resource.name}`,
            resource
          )
        );

        return [
          view,
          {
            ...(remoteTable ?? {}),
            ...(localTable ?? {}),
            columns,
            rows: [...rows.values()],
            resources: [...resources.values()]
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
    markLocalSavePending(true);
    changeVersionRef.current += 1;
    setData(next);
  };

  useEffect(() => {
    let active = true;

    const connect = async () => {
      try {
        const remoteSnapshot = await getDoc(dashboardRef);
        if (!active) return;
        const remoteData = remoteSnapshot.exists()
          ? removeDemoRows({
              members: remoteSnapshot.data().members,
              tables: remoteSnapshot.data().tables,
              tools: remoteSnapshot.data().tools ?? [],
              docs: remoteSnapshot.data().docs ?? [],
              docsTrash: remoteSnapshot.data().docsTrash ?? []
            })
          : { members: [], tables: {}, tools: [], docs: [], docsTrash: [] };
        const merged = mergeDashboards(remoteData, dataRef.current);
        const needsCloudSave =
          localSavePending() ||
          !remoteSnapshot.exists() ||
          JSON.stringify(merged) !== JSON.stringify(remoteData);

        dataRef.current = merged;
        localDirtyRef.current = needsCloudSave;
        setData(merged);
        writeLocal(merged);
        setRemoteReady(true);
        setSyncState(needsCloudSave ? 'saving' : 'synced');
      } catch (error) {
        console.error('No se pudo conectar con Firestore.', error);
        cloudAvailableRef.current = false;
        setRemoteReady(true);
        setSyncState('local');
      }
    };

    connect();

    return () => {
      active = false;
    };
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
          markLocalSavePending(false);
          setSyncState('synced');
        }
      } catch (error) {
        console.error(
          'No se pudieron guardar los cambios en Firestore.',
          error
        );
        markLocalSavePending(true);
        if (changeVersionRef.current === version) setSyncState('error');
      }
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [data, remoteReady]);

  return [data, updateData, syncState];
}
