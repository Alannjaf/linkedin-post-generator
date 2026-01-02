import { Draft } from '@/types';

const API_BASE = '/api/drafts';

export async function saveDraft(draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>): Promise<Draft> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(draft),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save draft');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to save draft:', error);
    throw error instanceof Error ? error : new Error('Failed to save draft');
  }
}

export async function getAllDrafts(): Promise<Draft[]> {
  try {
    const response = await fetch(API_BASE);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to load drafts');
    }

    const drafts = await response.json();
    return drafts.sort((a: Draft, b: Draft) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Failed to load drafts:', error);
    return [];
  }
}

export async function getDraft(id: string): Promise<Draft | null> {
  try {
    const response = await fetch(`${API_BASE}/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to load draft');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to load draft:', error);
    return null;
  }
}

export async function updateDraft(id: string, updates: Partial<Omit<Draft, 'id' | 'createdAt'>>): Promise<Draft | null> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update draft');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to update draft:', error);
    throw error instanceof Error ? error : new Error('Failed to update draft');
  }
}

export async function deleteDraft(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return false;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete draft');
    }

    return true;
  } catch (error) {
    console.error('Failed to delete draft:', error);
    return false;
  }
}

export async function clearAllDrafts(): Promise<void> {
  // Note: This function is not currently used, but kept for API compatibility
  // If needed, we could implement a DELETE /api/drafts endpoint
  console.warn('clearAllDrafts is not implemented for database storage');
}

