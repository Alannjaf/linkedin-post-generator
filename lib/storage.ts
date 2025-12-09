import { Draft } from '@/types';

const STORAGE_KEY = 'linkedin_post_drafts';

export function saveDraft(draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>): Draft {
  const drafts = getAllDrafts();
  
  const newDraft: Draft = {
    ...draft,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  drafts.unshift(newDraft);
  
  // Keep only last 50 drafts
  const limitedDrafts = drafts.slice(0, 50);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedDrafts));
  } catch (error) {
    console.error('Failed to save draft:', error);
    throw new Error('Failed to save draft. LocalStorage might be full.');
  }

  return newDraft;
}

export function getAllDrafts(): Draft[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const drafts = JSON.parse(data) as Draft[];
    return drafts.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Failed to load drafts:', error);
    return [];
  }
}

export function getDraft(id: string): Draft | null {
  const drafts = getAllDrafts();
  return drafts.find((d) => d.id === id) || null;
}

export function updateDraft(id: string, updates: Partial<Omit<Draft, 'id' | 'createdAt'>>): Draft | null {
  const drafts = getAllDrafts();
  const index = drafts.findIndex((d) => d.id === id);
  
  if (index === -1) return null;

  const updatedDraft: Draft = {
    ...drafts[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  drafts[index] = updatedDraft;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error('Failed to update draft:', error);
    throw new Error('Failed to update draft.');
  }

  return updatedDraft;
}

export function deleteDraft(id: string): boolean {
  const drafts = getAllDrafts();
  const filtered = drafts.filter((d) => d.id !== id);
  
  if (filtered.length === drafts.length) return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Failed to delete draft:', error);
    return false;
  }
}

export function clearAllDrafts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear drafts:', error);
  }
}

