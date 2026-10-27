import type { ContentItem } from '../../models/content';

export interface SoftwarePlatform {
  readonly emulator?: string;
  readonly processor?: string;
  readonly os?: string;
}

function firstString(metadata: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = metadata[key];

  if (typeof value === 'string') {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);

    return typeof first === 'string' ? first.trim() : undefined;
  }

  return undefined;
}

export function readSoftwarePlatform(item: ContentItem): SoftwarePlatform {
  const emulator = firstString(item.metadata, 'emulator');
  const processor = firstString(item.metadata, 'processor');
  const os = firstString(item.metadata, 'os') ?? firstString(item.metadata, 'operating_system');

  return {
    ...(emulator !== undefined ? { emulator } : {}),
    ...(processor !== undefined ? { processor } : {}),
    ...(os !== undefined ? { os } : {}),
  };
}
