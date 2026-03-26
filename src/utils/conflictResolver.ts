export interface VersionedData<T> {
  data: T;
  version: number;
  timestamp: number;
  deviceId: string;
}

export interface Conflict<T> {
  type: 'reminder' | 'project' | 'habit';
  id: string;
  local: VersionedData<T>;
  remote: VersionedData<T>;
  conflictFields: string[];
}

type MaybeVersioned = {
  id?: string;
  version?: number;
  timestamp?: number;
  deviceId?: string;
};

export class ConflictResolver {
  private static cachedDeviceId: string | null = null;

  private static getDeviceId(): string {
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }

    const globalLike = globalThis as Record<string, any>;
    const identitySeeds = [
      globalLike?.siyuan?.config?.system?.id,
      globalLike?.siyuan?.config?.system?.workspaceDir,
      globalLike?.navigator?.platform,
      globalLike?.navigator?.userAgent,
      globalLike?.location?.host,
    ].filter((item) => typeof item === 'string' && item.length > 0) as string[];

    const fallbackSeed = identitySeeds.join('|') || `runtime_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    this.cachedDeviceId = `device_${this.hashString(fallbackSeed)}`;
    return this.cachedDeviceId;
  }

  private static hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  private static inferType(value: unknown): 'reminder' | 'project' | 'habit' {
    const item = value as Record<string, any> | null;
    if (item && 'frequency' in item && 'checkIns' in item) {
      return 'habit';
    }
    if (item && 'milestones' in item) {
      return 'project';
    }
    return 'reminder';
  }

  private static normalizeVersion(value: MaybeVersioned): number {
    return typeof value.version === 'number' && value.version > 0 ? value.version : 1;
  }

  private static stableStringify(value: unknown): string {
    try {
      return JSON.stringify(value) ?? '';
    } catch {
      return '';
    }
  }

  private static deepEqual(left: unknown, right: unknown): boolean {
    return this.stableStringify(left) === this.stableStringify(right);
  }

  private static collectConflictFields(localData: unknown, remoteData: unknown): string[] {
    const localObj = localData as Record<string, unknown> | null;
    const remoteObj = remoteData as Record<string, unknown> | null;

    if (!localObj || !remoteObj || typeof localObj !== 'object' || typeof remoteObj !== 'object') {
      return this.deepEqual(localData, remoteData) ? [] : ['value'];
    }

    const keys = new Set<string>([...Object.keys(localObj), ...Object.keys(remoteObj)]);
    const fields: string[] = [];

    for (const key of keys) {
      if (!this.deepEqual(localObj[key], remoteObj[key])) {
        fields.push(key);
      }
    }

    return fields;
  }

  static wrapWithVersion<T>(data: T): VersionedData<T> {
    const current = data as MaybeVersioned;
    return {
      data,
      version: this.normalizeVersion(current) + 1,
      timestamp: Date.now(),
      deviceId: this.getDeviceId(),
    };
  }

  static detectConflicts<T>(
    local: VersionedData<T>,
    remote: VersionedData<T>
  ): Conflict<T> | null {
    const conflictFields = this.collectConflictFields(local.data, remote.data);
    if (conflictFields.length === 0) {
      return null;
    }

    const localObj = local.data as MaybeVersioned;
    const remoteObj = remote.data as MaybeVersioned;

    return {
      type: this.inferType(local.data),
      id: localObj?.id || remoteObj?.id || '',
      local,
      remote,
      conflictFields,
    };
  }

  static autoResolve<T>(conflict: Conflict<T>): T {
    const { local, remote } = conflict;

    if (local.version > remote.version) {
      return local.data;
    }
    if (remote.version > local.version) {
      return remote.data;
    }

    if (local.timestamp > remote.timestamp) {
      return local.data;
    }
    if (remote.timestamp > local.timestamp) {
      return remote.data;
    }

    return local.deviceId <= remote.deviceId ? local.data : remote.data;
  }

  static resolveTakeLocal<T>(conflict: Conflict<T>): T {
    return conflict.local.data;
  }

  static resolveTakeRemote<T>(conflict: Conflict<T>): T {
    return conflict.remote.data;
  }

  static resolveMerge<T>(conflict: Conflict<T>, merged: T): T {
    void conflict;
    return merged;
  }
}
