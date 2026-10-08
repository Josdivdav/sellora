import { io, Socket } from 'socket.io-client';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();


export interface FastDBCredentials {
  databaseId: string;
  userEmail: string;
  author: string;
  apiKey: string;
  host: string;
}

// ---------------------------------------------------------------------------
// 1. Sentinel / FieldValue Support
// ---------------------------------------------------------------------------

export class FieldValue {
  readonly _fastdb_transform: boolean = true;
  readonly _type: 'increment' | 'arrayUnion' | 'arrayRemove' | 'serverTimestamp' | 'delete';
  readonly operand?: number;
  readonly elements?: any[];

  constructor(type: 'increment' | 'arrayUnion' | 'arrayRemove' | 'serverTimestamp' | 'delete', operand?: number, elements?: any[]) {
    this._type = type;
    this.operand = operand;
    this.elements = elements;
  }

  static increment(n: number): FieldValue {
    return new FieldValue('increment', n);
  }

  static arrayUnion(...elements: any[]): FieldValue {
    return new FieldValue('arrayUnion', undefined, elements.flat());
  }

  static arrayRemove(...elements: any[]): FieldValue {
    return new FieldValue('arrayRemove', undefined, elements.flat());
  }

  static serverTimestamp(): FieldValue {
    return new FieldValue('serverTimestamp');
  }

  static delete(): FieldValue {
    return new FieldValue('delete');
  }
}

function isTransform(val: any): boolean {
  if (!val || typeof val !== 'object') return false;
  if (val._fastdb_transform || val instanceof FieldValue) return true;
  const name = val.constructor?.name;
  if (
    name === 'NumericIncrementTransform' ||
    name === 'ArrayUnionTransform' ||
    name === 'ArrayRemoveTransform' ||
    name === 'ServerTimestampTransform' ||
    name === 'DeleteTransform'
  ) {
    return true;
  }
  if ('operand' in val && typeof val.operand === 'number') return true;
  if ('elements' in val && Array.isArray(val.elements)) return true;
  return false;
}

function hasAnyTransforms(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  return Object.values(data).some((v) => isTransform(v));
}

function applyTransforms(existing: Record<string, any>, updates: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = { ...(existing || {}) };
  for (const [key, val] of Object.entries(updates)) {
    if (isTransform(val)) {
      const name = val.constructor?.name;
      // 1. Numeric Increment
      if (
        val._type === 'increment' ||
        name === 'NumericIncrementTransform' ||
        ('operand' in val && typeof val.operand === 'number')
      ) {
        const delta = typeof val.operand === 'number' ? val.operand : (typeof val.delta === 'number' ? val.delta : 0);
        const curr = typeof result[key] === 'number' ? result[key] : 0;
        result[key] = curr + delta;
      }
      // 2. Array Union
      else if (
        val._type === 'arrayUnion' ||
        name === 'ArrayUnionTransform' ||
        (Array.isArray(val.elements) && val._type !== 'arrayRemove' && name !== 'ArrayRemoveTransform')
      ) {
        const elems = val.elements || [];
        const curr = Array.isArray(result[key]) ? [...result[key]] : [];
        for (const el of elems) {
          if (!curr.includes(el)) curr.push(el);
        }
        result[key] = curr;
      }
      // 3. Array Remove
      else if (val._type === 'arrayRemove' || name === 'ArrayRemoveTransform') {
        const elems = val.elements || [];
        const curr = Array.isArray(result[key]) ? [...result[key]] : [];
        result[key] = curr.filter((el) => !elems.includes(el));
      }
      // 4. Server Timestamp
      else if (val._type === 'serverTimestamp' || name === 'ServerTimestampTransform') {
        result[key] = new Date().toISOString();
      }
      // 5. Delete
      else if (val._type === 'delete' || name === 'DeleteTransform') {
        delete result[key];
      }
    } else {
      result[key] = val;
    }
  }
  return result;
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  if (path in obj) return obj[path];
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

// ---------------------------------------------------------------------------
// 2. Singleton Socket Connection Manager & Cache
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __FASTDB_SOCKET__: Socket | undefined;
  // eslint-disable-next-line no-var
  var __FASTDB_AUTHED__: boolean | undefined;
  // eslint-disable-next-line no-var
  var __FASTDB_AUTH_PROMISE__: Promise<boolean> | null | undefined;
  // eslint-disable-next-line no-var
  var __FASTDB_CACHE__: Map<string, { data: any[]; timestamp: number }> | undefined;
}

const CACHE_TTL_MS = 15000; // 15 seconds cache for collections

function getCache(key: string): any[] | null {
  const cache = globalThis.__FASTDB_CACHE__;
  if (!cache) return null;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any[]): void {
  if (!globalThis.__FASTDB_CACHE__) {
    globalThis.__FASTDB_CACHE__ = new Map();
  }
  globalThis.__FASTDB_CACHE__.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(collectionPath?: string): void {
  const cache = globalThis.__FASTDB_CACHE__;
  if (!cache) return;
  if (!collectionPath) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key === collectionPath || key.startsWith(collectionPath + '/') || collectionPath.startsWith(key + '/')) {
      cache.delete(key);
    }
  }
}

export class FastDBConnection {
  readonly creds: FastDBCredentials;

  constructor(creds?: Partial<FastDBCredentials>) {
    this.creds = {
      databaseId: creds?.databaseId || process.env.FASTDB_DATABASE_ID || '94d4370c-6b7f-441f-9a69-00bd7eb629fb',
      userEmail: creds?.userEmail || process.env.FASTDB_USER_EMAIL || 'joshuadivine985@gmail.com',
      author: creds?.author || process.env.FASTDB_AUTHOR_ID || '0600b36a-be8d-4010-a468-374b78d77a37',
      apiKey: creds?.apiKey || process.env.FASTDB_API_KEY || 'CifGJrNlTRh3uE6ckaYilHZA9UGawFn1p1qz',
      host: creds?.host || process.env.FASTDB_HOST || 'http://129.146.69.138:5500',
    };

  }

  getSocket(): Socket {
    if (!globalThis.__FASTDB_SOCKET__) {
      globalThis.__FASTDB_SOCKET__ = io(this.creds.host, {
        transports: ['websocket', 'polling'],
        timeout: 60000,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        ...({ maxHttpBufferSize: 1e8 } as any),
      });

      globalThis.__FASTDB_SOCKET__.on('connect', () => {
        globalThis.__FASTDB_AUTHED__ = false;
        this.authenticate().catch((err) => {
          console.warn('[FastDB] Reconnect auth failed:', err.message);
        });
      });

      globalThis.__FASTDB_SOCKET__.on('disconnect', () => {
        globalThis.__FASTDB_AUTHED__ = false;
      });
    }
    return globalThis.__FASTDB_SOCKET__;
  }

  private async authenticate(): Promise<boolean> {
    if (globalThis.__FASTDB_AUTHED__) return true;
    if (globalThis.__FASTDB_AUTH_PROMISE__) return globalThis.__FASTDB_AUTH_PROMISE__;

    const socket = this.getSocket();

    globalThis.__FASTDB_AUTH_PROMISE__ = new Promise<boolean>((resolve, reject) => {
      const _reqId = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      const payload = {
        databaseId: this.creds.databaseId,
        userEmail: this.creds.userEmail,
        author: this.creds.author,
        apiKey: this.creds.apiKey,
        _reqId,
      };

      const timer = setTimeout(() => {
        socket.off('database:connect', onAuth);
        reject(new Error('[FastDB] Auth timeout'));
      }, 20000);

      const onAuth = (res: any) => {
        if (res && res._reqId && res._reqId !== _reqId) return;
        clearTimeout(timer);
        socket.off('database:connect', onAuth);
        if (res && res.error) {
          globalThis.__FASTDB_AUTHED__ = false;
          reject(new Error(res.error));
        } else {
          globalThis.__FASTDB_AUTHED__ = true;
          resolve(true);
        }
      };

      socket.on('database:connect', onAuth);
      socket.emit('database:connect', payload);
    }).finally(() => {
      globalThis.__FASTDB_AUTH_PROMISE__ = null;
    });

    return globalThis.__FASTDB_AUTH_PROMISE__;
  }

  async ensureConnected(): Promise<void> {
    const socket = this.getSocket();
    if (!socket.connected) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('[FastDB] Socket connection timeout'));
        }, 20000);
        socket.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    await this.authenticate();
  }

  async request(event: string, data: Record<string, any> = {}, timeoutMs = 60000): Promise<any> {
    await this.ensureConnected();
    const socket = this.getSocket();

    return new Promise((resolve, reject) => {
      const _reqId = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      const payload = {
        databaseId: this.creds.databaseId,
        userEmail: this.creds.userEmail,
        author: this.creds.author,
        apiKey: this.creds.apiKey,
        ...data,
        _reqId,
      };

      let done = false;

      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          socket.off(event, onEvent);
          reject(new Error(`[FastDB] Request timeout on event ${event}`));
        }
      }, timeoutMs);

      const onEvent = (res: any) => {
        if (res && res._reqId && res._reqId !== _reqId) return;
        if (!done) {
          done = true;
          clearTimeout(timer);
          socket.off(event, onEvent);
          if (res && res.error) {
            reject(new Error(typeof res.error === 'string' ? res.error : JSON.stringify(res.error)));
          } else {
            resolve(res);
          }
        }
      };

      socket.on(event, onEvent);
      socket.emit(event, payload);
    });
  }
}


// ---------------------------------------------------------------------------
// 3. DocumentSnapshot & QuerySnapshot
// ---------------------------------------------------------------------------

export interface DocumentData {
  [field: string]: any;
}

export class DocumentSnapshot {
  readonly id: string;
  readonly ref: DocumentReference;
  readonly exists: boolean;
  private readonly _raw: Record<string, any> | null;

  constructor(id: string, ref: DocumentReference, rawData: Record<string, any> | null) {
    this.id = id;
    this.ref = ref;
    this.exists = rawData !== null && rawData !== undefined;
    this._raw = rawData;
  }

  data(): DocumentData {
    if (!this.exists || !this._raw) return {};
    const copy = { ...this._raw };
    if (!copy.id) copy.id = this.id;
    return copy;
  }


  get(fieldPath: string): any {
    if (!this.exists || !this._raw) return undefined;
    return getNestedValue(this._raw, fieldPath);
  }
}

export class QuerySnapshot {
  readonly docs: DocumentSnapshot[];
  readonly empty: boolean;
  readonly size: number;

  constructor(docs: DocumentSnapshot[]) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
  }

  forEach(callback: (doc: DocumentSnapshot) => void): void {
    this.docs.forEach(callback);
  }

  map<T>(callback: (doc: DocumentSnapshot) => T): T[] {
    return this.docs.map(callback);
  }

  filter(callback: (doc: DocumentSnapshot) => boolean): DocumentSnapshot[] {
    return this.docs.filter(callback);
  }

  find(callback: (doc: DocumentSnapshot) => boolean): DocumentSnapshot | undefined {
    return this.docs.find(callback);
  }
}

// ---------------------------------------------------------------------------
// 4. Query
// ---------------------------------------------------------------------------

interface FilterClause {
  field: string;
  op: string;
  value: any;
}

interface OrderByClause {
  field: string;
  direction: 'asc' | 'desc';
}

export class Query {
  protected conn: FastDBConnection;
  readonly path: string;
  protected filters: FilterClause[];
  protected orderBys: OrderByClause[];
  protected limitCount: number | null;
  protected selectFields: string[] | null;
  protected isGroup: boolean;

  constructor(
    conn: FastDBConnection,
    path: string,
    filters: FilterClause[] = [],
    orderBys: OrderByClause[] = [],
    limitCount: number | null = null,
    selectFields: string[] | null = null,
    isGroup = false
  ) {
    this.conn = conn;
    this.path = path;
    this.filters = filters;
    this.orderBys = orderBys;
    this.limitCount = limitCount;
    this.selectFields = selectFields;
    this.isGroup = isGroup;
  }

  where(field: string, op: string, value: any): Query {
    return new Query(
      this.conn,
      this.path,
      [...this.filters, { field, op, value }],
      [...this.orderBys],
      this.limitCount,
      this.selectFields ? [...this.selectFields] : null,
      this.isGroup
    );
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Query {
    return new Query(
      this.conn,
      this.path,
      [...this.filters],
      [...this.orderBys, { field, direction }],
      this.limitCount,
      this.selectFields ? [...this.selectFields] : null,
      this.isGroup
    );
  }

  limit(n: number): Query {
    return new Query(
      this.conn,
      this.path,
      [...this.filters],
      [...this.orderBys],
      n,
      this.selectFields ? [...this.selectFields] : null,
      this.isGroup
    );
  }

  select(...fields: string[]): Query {
    return new Query(
      this.conn,
      this.path,
      [...this.filters],
      [...this.orderBys],
      this.limitCount,
      fields,
      this.isGroup
    );
  }

  count(): { get: () => Promise<{ data: () => { count: number } }> } {
    return {
      get: async () => {
        const snap = await this.get();
        return {
          data: () => ({ count: snap.docs.length }),
        };
      },
    };
  }

  async get(): Promise<QuerySnapshot> {
    const cached = getCache(this.path);
    let items: any[];

    if (cached) {
      items = cached;
    } else {
      const res = await this.conn.request('document:read', {
        collection: this.path,
      });
      items = Array.isArray(res.data) ? res.data : [];
      setCache(this.path, items);
    }

    let filtered = [...items];


    // 1. Filter clauses
    for (const { field, op, value } of this.filters) {
      filtered = filtered.filter((item) => {
        if (!item) return false;
        const itemVal = getNestedValue(item, field);
        switch (op) {
          case '==':
          case '===':
            return itemVal === value;
          case '!=':
          case '!==':
            return itemVal !== value;
          case '<':
            return itemVal < value;
          case '<=':
            return itemVal <= value;
          case '>':
            return itemVal > value;
          case '>=':
            return itemVal >= value;
          case 'in':
            return Array.isArray(value) && value.includes(itemVal);
          case 'not-in':
            return Array.isArray(value) && !value.includes(itemVal);
          case 'array-contains':
            return Array.isArray(itemVal) && itemVal.includes(value);
          case 'array-contains-any':
            return Array.isArray(itemVal) && Array.isArray(value) && value.some((v) => itemVal.includes(v));
          default:
            return itemVal === value;
        }
      });
    }

    // 2. OrderBy clauses
    if (this.orderBys.length > 0) {
      filtered.sort((a, b) => {
        for (const order of this.orderBys) {
          const valA = getNestedValue(a, order.field);
          const valB = getNestedValue(b, order.field);
          if (valA === valB) continue;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          let cmp = 0;
          if (typeof valA === 'number' && typeof valB === 'number') {
            cmp = valA - valB;
          } else if (valA instanceof Date && valB instanceof Date) {
            cmp = valA.getTime() - valB.getTime();
          } else {
            cmp = String(valA).localeCompare(String(valB));
          }
          return order.direction === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
    }

    // 3. Limit
    if (typeof this.limitCount === 'number' && this.limitCount >= 0) {
      filtered = filtered.slice(0, this.limitCount);
    }

    // 4. Select fields projection
    if (this.selectFields && this.selectFields.length > 0) {
      const allowed = new Set([...this.selectFields, 'id', '_id']);
      filtered = filtered.map((item) => {
        const projected: Record<string, any> = {};
        for (const key of Object.keys(item)) {
          if (allowed.has(key)) {
            projected[key] = item[key];
          }
        }
        return projected;
      });
    }

    const colRef = new CollectionReference(this.conn, this.path);
    const docSnaps = filtered.map((item) => {
      const id = String(item._id || item.id || randomUUID());
      const docRef = new DocumentReference(this.conn, id, colRef);
      return new DocumentSnapshot(id, docRef, item);
    });

    return new QuerySnapshot(docSnaps);
  }
}

// ---------------------------------------------------------------------------
// 5. CollectionReference & DocumentReference
// ---------------------------------------------------------------------------

export class CollectionReference extends Query {
  readonly id: string;
  readonly parent: DocumentReference | null;

  constructor(conn: FastDBConnection, path: string, parent: DocumentReference | null = null) {
    super(conn, path);
    this.parent = parent;
    const parts = path.split('/');
    this.id = parts[parts.length - 1];
  }

  doc(id?: string): DocumentReference {
    const docId = id ? String(id).trim() : randomUUID();
    return new DocumentReference(this.conn, docId, this);
  }

  async add(data: Record<string, any>): Promise<DocumentReference> {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

export class DocumentReference {
  private conn: FastDBConnection;
  readonly id: string;
  readonly path: string;
  readonly parent: CollectionReference;

  constructor(conn: FastDBConnection, id: string, parent: CollectionReference) {
    this.conn = conn;
    this.id = id;
    this.parent = parent;
    this.path = `${parent.path}/${id}`;
  }

  collection(subcollectionName: string): CollectionReference {
    const subPath = `${this.path}/${subcollectionName}`;
    return new CollectionReference(this.conn, subPath, this);
  }

  async get(): Promise<DocumentSnapshot> {
    // Check if collection is already in cache
    const cachedItems = getCache(this.parent.path);
    if (cachedItems) {
      const match = cachedItems.find((d) => (d._id || d.id) === this.id);
      if (match) {
        return new DocumentSnapshot(this.id, this, match);
      }
    }

    const res = await this.conn.request('document:get', {
      collection: this.parent.path,
      id: this.id,
    });

    const data = res && res.data ? res.data : null;
    return new DocumentSnapshot(this.id, this, data);
  }

  async set(data: Record<string, any>, options?: { merge?: boolean }): Promise<void> {
    invalidateCache(this.parent.path);

    const shouldMerge = Boolean(options?.merge);
    const needsTransform = hasAnyTransforms(data);

    if (shouldMerge || needsTransform) {
      let existing: Record<string, any> = {};
      try {
        const snap = await this.get();
        if (snap.exists && snap.data()) {
          existing = snap.data() || {};
        }
      } catch {
        // Doc might not exist yet
      }

      const merged = applyTransforms(shouldMerge ? existing : {}, data);
      await this.conn.request('document:set', {
        collection: this.parent.path,
        id: this.id,
        data: merged,
      });
    } else {
      await this.conn.request('document:set', {
        collection: this.parent.path,
        id: this.id,
        data,
      });
    }
  }

  async update(data: Record<string, any>): Promise<void> {
    invalidateCache(this.parent.path);

    const needsTransform = hasAnyTransforms(data);

    if (needsTransform) {
      let existing: Record<string, any> = {};
      try {
        const snap = await this.get();
        if (snap.exists && snap.data()) {
          existing = snap.data() || {};
        }
      } catch {
        // Doc might not exist yet
      }

      const merged = applyTransforms(existing, data);
      await this.conn.request('document:update', {
        collection: this.parent.path,
        id: this.id,
        data: merged,
      });
    } else {
      await this.conn.request('document:update', {
        collection: this.parent.path,
        id: this.id,
        data,
      });
    }
  }

  async delete(): Promise<void> {
    invalidateCache(this.parent.path);
    await this.conn.request('document:delete', {
      collection: this.parent.path,
      id: this.id,
    });
  }
}

// ---------------------------------------------------------------------------
// 6. WriteBatch
// ---------------------------------------------------------------------------

type BatchOperation =
  | { type: 'set'; ref: DocumentReference; data: Record<string, any>; options?: { merge?: boolean } }
  | { type: 'update'; ref: DocumentReference; data: Record<string, any> }
  | { type: 'delete'; ref: DocumentReference };

export class WriteBatch {
  private operations: BatchOperation[] = [];

  set(ref: DocumentReference, data: Record<string, any>, options?: { merge?: boolean }): WriteBatch {
    this.operations.push({ type: 'set', ref, data, options });
    return this;
  }

  update(ref: DocumentReference, data: Record<string, any>): WriteBatch {
    this.operations.push({ type: 'update', ref, data });
    return this;
  }

  delete(ref: DocumentReference): WriteBatch {
    this.operations.push({ type: 'delete', ref });
    return this;
  }

  async commit(): Promise<void> {
    for (const op of this.operations) {
      if (op.type === 'set') {
        await op.ref.set(op.data, op.options);
      } else if (op.type === 'update') {
        await op.ref.update(op.data);
      } else if (op.type === 'delete') {
        await op.ref.delete();
      }
    }
    this.operations = [];
  }
}

// ---------------------------------------------------------------------------
// 7. FastDB Client Main Instance
// ---------------------------------------------------------------------------

export class FastDB {
  readonly conn: FastDBConnection;

  constructor(creds?: Partial<FastDBCredentials>) {
    this.conn = new FastDBConnection(creds);
  }

  collection(collectionPath: string): CollectionReference {
    return new CollectionReference(this.conn, collectionPath);
  }

  collectionGroup(name: string): Query {
    // In FastDB, root `name` contains all group documents
    return new Query(this.conn, name, [], [], null, null, true);
  }

  doc(fullPath: string): DocumentReference {
    const parts = fullPath.split('/').filter(Boolean);
    if (parts.length % 2 !== 0) {
      throw new Error(`Invalid document path: ${fullPath}`);
    }
    const docId = parts.pop()!;
    const colPath = parts.join('/');
    const col = this.collection(colPath);
    return col.doc(docId);
  }

  batch(): WriteBatch {
    return new WriteBatch();
  }

  settings(_settingsObj: Record<string, any>): void {
    // No-op compatibility method
  }
}

export const fastdb = new FastDB();
export default fastdb;
