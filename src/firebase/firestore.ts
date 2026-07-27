import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  startAfter,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

// Helper generik Firestore — dipakai lintas modul supaya hemat kode & konsisten
// Semua fungsi di sini dirancang agar mudah dipagination / dibatasi untuk hemat read (§13)

export const col = (name: string) => collection(db, name);

export async function getDocById<T = DocumentData>(collectionName: string, id: string) {
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as T) };
}

// Cari 1 dokumen berdasarkan field tertentu (mis. cari user berdasarkan "username")
// Dipakai untuk resolve username -> email saat login dua-cara (Email/Username)
export async function getDocByField<T = DocumentData>(
  collectionName: string,
  field: string,
  value: unknown
): Promise<(T & { id: string }) | null> {
  const q = query(col(collectionName), where(field, '==', value), fsLimit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as T) };
}

export async function getPaginated<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  pageSize = 25,
  cursor?: unknown
) {
  const baseConstraints = [...constraints, fsLimit(pageSize)];
  if (cursor) baseConstraints.push(startAfter(cursor));
  const q = query(col(collectionName), ...baseConstraints);
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
  const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { docs, lastDoc, hasMore: snap.docs.length === pageSize };
}

export async function createDoc<T extends object>(
  collectionName: string,
  data: T
) {
  const ref = await addDoc(col(collectionName), {
    ...data,
    createdAt: Timestamp.now()
  });
  return ref.id;
}

// Tulis dokumen dengan ID yang KITA tentukan sendiri (bukan auto-ID seperti createDoc).
// Dipakai untuk koleksi kecil semacam "directory" yang doc-id-nya = username,
// supaya lookup-nya bisa langsung getDocById tanpa query where().
export async function setDocById<T extends object>(
  collectionName: string,
  id: string,
  data: T
) {
  await setDoc(doc(db, collectionName, id), data, { merge: true });
}

export async function updateDocById(
  collectionName: string,
  id: string,
  data: Partial<Record<string, unknown>>
) {
  await updateDoc(doc(db, collectionName, id), data);
}

export async function deleteDocById(collectionName: string, id: string) {
  await deleteDoc(doc(db, collectionName, id));
}

// Subscribe realtime — dipakai TERBATAS hanya untuk ringkasan dashboard (§13, hemat read)
export function subscribeCollection<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (docs: (T & { id: string })[]) => void
) {
  const q = query(col(collectionName), ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })));
  });
}

// Subscribe realtime pada SATU dokumen — dipakai layar admin menunggu status
// verifikasi OTP berubah tanpa perlu refresh manual.
export function subscribeDoc<T = DocumentData>(
  collectionName: string,
  id: string,
  callback: (data: (T & { id: string }) | null) => void
) {
  return onSnapshot(doc(db, collectionName, id), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...(snap.data() as T) } : null);
  });
}

export { where, orderBy, fsLimit as limit };
