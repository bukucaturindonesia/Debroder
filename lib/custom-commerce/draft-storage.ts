"use client";

import type { CustomProject } from "@/lib/custom-commerce/types";
import { parseCustomProject } from "@/lib/custom-commerce/validation";

const STORAGE_KEY = "debroder-custom-projects-v1";

export function readCustomDraft(projectId?: string | null): CustomProject | null {
  const drafts = readDrafts();
  if (projectId) return drafts.find((draft) => draft.id === projectId) ?? null;
  return drafts.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null;
}

export function writeCustomDraft(project: CustomProject) {
  try {
    const safeProject = parseCustomProject(stripSignedUrls(project));
    if (!safeProject) return;
    const drafts = readDrafts().filter((draft) => draft.id !== safeProject.id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([safeProject, ...drafts].slice(0, 5)));
  } catch {
    // The builder remains usable in memory when storage is unavailable.
  }
}

export function removeCustomDraft(projectId: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readDrafts().filter((draft) => draft.id !== projectId)));
  } catch {
    // No-op when storage is unavailable.
  }
}

function readDrafts(): CustomProject[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value)
      ? value.map(parseCustomProject).filter((draft): draft is CustomProject => Boolean(draft))
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
