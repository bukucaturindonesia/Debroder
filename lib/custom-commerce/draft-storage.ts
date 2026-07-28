"use client";

import type { CustomProject } from "@/lib/custom-commerce/types";
import { parseCustomProjectDraft } from "@/lib/custom-commerce/validation";

const STORAGE_KEY = "debroder-custom-projects-v1";

export function readCustomDraft(projectId?: string | null): CustomProject | null {
  const drafts = readDrafts();
  if (projectId) return drafts.find((draft) => draft.id === projectId) ?? null;
  return [...drafts].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null;
}

export function writeCustomDraft(project: CustomProject) {
  try {
    const safeProject = parseCustomProjectDraft(stripSignedUrls(project));
    if (!safeProject) return false;
    const drafts = readDrafts().filter((draft) => draft.id !== safeProject.id);
    const serialized = JSON.stringify([safeProject, ...drafts].slice(0, 5));
    if (window.localStorage.getItem(STORAGE_KEY) === serialized) return false;
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    // The builder remains usable in memory when storage is unavailable.
    return false;
  }
}

export function removeCustomDraft(projectId: string) {
  try {
    const serialized = JSON.stringify(readDrafts().filter((draft) => draft.id !== projectId));
    if (window.localStorage.getItem(STORAGE_KEY) === serialized) return false;
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch {
    // No-op when storage is unavailable.
    return false;
  }
}

function readDrafts(): CustomProject[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value)
      ? value.map(parseCustomProjectDraft).filter((draft): draft is CustomProject => Boolean(draft))
      : [];
  } catch {
    return [];
  }
}

function stripSignedUrls(project: CustomProject): CustomProject {
  return {
    ...project,
    items: project.items.map((item) => ({
      ...item,
      uploads: item.uploads.map((upload) => ({
        id: upload.id,
        file_name: upload.file_name,
        storage_path: upload.storage_path,
        mime_type: upload.mime_type,
        file_size: upload.file_size,
        status: upload.status,
        design_version: upload.design_version,
        design_stage: upload.design_stage,
        replaces_upload_id: upload.replaces_upload_id,
        version_note: upload.version_note
      }))
    }))
  };
}
