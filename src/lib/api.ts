import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
  };
}

export const api = {
  // Workspaces
  async getWorkspaces() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces`, { headers });
    if (!response.ok) throw new Error('Failed to fetch workspaces');
    return response.json();
  },

  async getWorkspace(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch workspace');
    return response.json();
  },

  async createWorkspace(workspace: { name: string; description?: string; icon?: string; color?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces`, {
      method: 'POST',
      headers,
      body: JSON.stringify(workspace)
    });
    if (!response.ok) throw new Error('Failed to create workspace');
    return response.json();
  },

  async updateWorkspace(workspaceId: string, updates: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update workspace');
    return response.json();
  },

  async deleteWorkspace(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete workspace');
    return response.json();
  },

  async getWorkspaceInsights(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/insights`, { headers });
    if (!response.ok) throw new Error('Failed to fetch workspace insights');
    return response.json();
  },

  async getRecentActivity(workspaceId?: string, limit: number = 10) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/blocks/activity/recent?workspace_id=${workspaceId}&limit=${limit}`
      : `${API_BASE_URL}/blocks/activity/recent?limit=${limit}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch recent activity');
    return response.json();
  },

  // AI Chat
  // AI Feedback
  async submitFeedback(feedback: {
    workspace_id: string;
    preview_id: string;
    query: string;
    mode: string;
    rating: 'helpful' | 'not_helpful';
    comment?: string;
    executed_actions?: any[];
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/feedback/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(feedback)
    });
    if (!response.ok) throw new Error('Failed to submit feedback');
    return response.json();
  },

  async getFeedbackInsights(workspaceId: string, daysBack: number = 30) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/feedback/insights/${workspaceId}?days_back=${daysBack}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch feedback insights');
    return response.json();
  },

  async getUserPreferences(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/ai/feedback/preferences?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/ai/feedback/preferences`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch user preferences');
    return response.json();
  },

  async query(
    query: string, 
    mode: string = 'ask', 
    scope: string = 'all', 
    model?: string, 
    workspace_id?: string | null, 
    mentioned_items?: Array<{type: string, id: string, name: string}>,
    enabled_sources?: string[],
    session_id?: string
  ) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        query, 
        mode, 
        scope, 
        model, 
        workspace_id, 
        mentioned_items,
        enabled_sources,
        session_id
      })
    });
    if (!response.ok) throw new Error('Failed to process query');
    const result = await response.json();
    
    // Debug logging
    console.log('API query result:', result);
    
    // Handle raw Redis response format (value field contains JSON string)
    if (result.value && typeof result.value === 'string') {
      try {
        const parsed = JSON.parse(result.value);
        result.response = parsed.response || parsed.text || '';
        result.sources = parsed.sources || [];
        result.type = parsed.type;
        result.data = parsed.data;
      } catch (e) {
        console.error('Failed to parse cached value:', e);
      }
    }
    
    // Handle both 'response' and 'text' fields (cache returns 'text', fresh returns 'response')
    if (!result.response && result.text) {
      result.response = result.text;
    }
    
    // Ensure response field exists
    if (!result.response) {
      console.error('API returned empty response:', result);
      result.response = 'I apologize, but I could not generate a response. Please try again.';
    }
    
    // Ensure sources is an array
    if (!result.sources) {
      result.sources = [];
    }
    
    return result;
  },

  async getAIModels() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/models`, { headers });
    if (!response.ok) throw new Error('Failed to fetch models');
    return response.json();
  },

  // Enhanced AI Query with intelligent intent detection and smart building
  async queryEnhanced(
    query: string, 
    mode: string = 'ask', 
    workspace_id?: string | null, 
    mentioned_items?: Array<{type: string, id: string, name: string}>,
    session_id?: string,
    page_id?: string,
    skill_id?: string
  ) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/query/enhanced`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        query, 
        mode, 
        workspace_id, 
        mentioned_items,
        session_id,
        page_id,
        skill_id
      })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to process query');
    }
    const result = await response.json();
    
    // Ensure response field exists
    if (!result.response) {
      result.response = 'I apologize, but I could not generate a response. Please try again.';
    }
    
    // Ensure sources is an array
    if (!result.sources) {
      result.sources = [];
    }
    
    return result;
  },

  // Submit feedback on AI intent detection
  async submitAIFeedback(query: string, wasCorrect: boolean, workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/feedback`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, was_correct: wasCorrect, workspace_id: workspaceId })
    });
    if (!response.ok) throw new Error('Failed to submit feedback');
    return response.json();
  },

  // Get weak areas from learning memory
  async getWeakAreas(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/memory/weak-areas/${workspaceId}`, { headers });
    if (!response.ok) {
      // Return empty if endpoint not available
      return { weak_areas: [] };
    }
    return response.json();
  },

  // Get learning memory for a workspace
  async getLearningMemory(workspaceId: string, skillId?: string) {
    const headers = await getAuthHeaders();
    const url = skillId 
      ? `${API_BASE_URL}/ai/memory/learning/${workspaceId}?skill_id=${skillId}`
      : `${API_BASE_URL}/ai/memory/learning/${workspaceId}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return { learning_memory: [] };
    }
    return response.json();
  },

  // Agentic AI Query with goal decomposition and Thought-Action-Observation loop
  async queryAgent(
    query: string, 
    workspace_id?: string | null, 
    mentioned_items?: Array<{type: string, id: string, name: string}>,
    session_id?: string,
    page_id?: string
  ) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/query/agent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        query, 
        mode: 'agent',
        workspace_id, 
        mentioned_items,
        session_id,
        page_id
      })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to process goal');
    }
    const result = await response.json();
    
    // Ensure response field exists
    if (!result.response) {
      result.response = 'I apologize, but I could not complete the goal. Please try again.';
    }
    
    return result;
  },

  // Pages
  async getPages(options?: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    workspaceId?: string;
    isArchived?: boolean;
    isFavorite?: boolean;
    search?: string;
  }) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    
    if (options?.page) params.append('page', options.page.toString());
    if (options?.pageSize) params.append('page_size', options.pageSize.toString());
    if (options?.sortBy) params.append('sort_by', options.sortBy);
    if (options?.order) params.append('order', options.order);
    if (options?.workspaceId) params.append('workspace_id', options.workspaceId);
    if (options?.isArchived !== undefined) params.append('is_archived', options.isArchived.toString());
    if (options?.isFavorite !== undefined) params.append('is_favorite', options.isFavorite.toString());
    if (options?.search) params.append('search', options.search);
    
    const url = `${API_BASE_URL}/pages${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch pages');
    return response.json();
  },

  async getPagesByWorkspace(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/by-workspace/${workspaceId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch pages');
    return response.json();
  },

  async getPage(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch page');
    return response.json();
  },

  async createPage(page: { 
    title: string; 
    content?: string; 
    icon?: string; 
    tags?: string[]; 
    workspace_id?: string;
    parent_page_id?: string;
    page_order?: number;
    blocks?: any[];
    page_type?: string;
    view_type?: string;
    database_config?: any;
    cover_image?: string;
  }) {
    console.log('API: Creating page with data:', page);
    const headers = await getAuthHeaders();
    console.log('API: Headers:', headers);
    
    const response = await fetch(`${API_BASE_URL}/pages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(page)
    });
    
    console.log('API: Response status:', response.status);
    const responseData = await response.json();
    console.log('API: Response data:', responseData);
    
    if (!response.ok) {
      console.error('API: Failed to create page:', responseData);
      throw new Error('Failed to create page');
    }
    return responseData;
  },

  async updatePage(pageId: string, updates: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update page');
    return response.json();
  },

  async deletePage(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete page');
    return response.json();
  },

  async getSubPages(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/subpages`, { headers });
    if (!response.ok) throw new Error('Failed to fetch sub-pages');
    return response.json();
  },

  async searchPages(query: string, workspaceId?: string, limit?: number) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ query });
    if (workspaceId) params.append('workspace_id', workspaceId);
    if (limit) params.append('limit', limit.toString());
    
    const response = await fetch(`${API_BASE_URL}/pages/search?${params.toString()}`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to search pages');
    return response.json();
  },

  async bulkUpdatePages(pageIds: string[], updates: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/bulk-update`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ page_ids: pageIds, updates })
    });
    if (!response.ok) throw new Error('Failed to bulk update pages');
    return response.json();
  },

  async bulkDeletePages(pageIds: string[], permanent: boolean = false) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/bulk-delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ page_ids: pageIds, permanent })
    });
    if (!response.ok) throw new Error('Failed to bulk delete pages');
    return response.json();
  },

  async duplicatePage(pageId: string, titleSuffix?: string) {
    const headers = await getAuthHeaders();
    const params = titleSuffix ? `?title_suffix=${encodeURIComponent(titleSuffix)}` : '';
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/duplicate${params}`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to duplicate page');
    return response.json();
  },

  async trackPageView(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/view`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to track page view');
    return response.json();
  },

  async getPageAnalytics(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/analytics`, { headers });
    if (!response.ok) throw new Error('Failed to fetch page analytics');
    return response.json();
  },

  async getPageTemplates() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/templates`, { headers });
    if (!response.ok) throw new Error('Failed to fetch page templates');
    return response.json();
  },

  async makePageTemplate(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/make-template`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to make page template');
    return response.json();
  },

  // Page Links & Backlinks
  async getPageLinks(pageId: string, workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/pages/${pageId}/links?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/pages/${pageId}/links`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch page links');
    return response.json();
  },

  async createPageLink(pageId: string, link: { target_page_id: string; relation_type?: string; context?: string; workspace_id?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/links`, {
      method: 'POST',
      headers,
      body: JSON.stringify(link)
    });
    if (!response.ok) throw new Error('Failed to create page link');
    return response.json();
  },

  async updatePageLink(pageId: string, linkId: string, link: { relation_type?: string; context?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/links/${linkId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(link)
    });
    if (!response.ok) throw new Error('Failed to update page link');
    return response.json();
  },

  async deletePageLink(pageId: string, linkId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/links/${linkId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete page link');
    return response.json();
  },

  async getBacklinks(pageId: string, workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/pages/${pageId}/backlinks?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/pages/${pageId}/backlinks`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch backlinks');
    return response.json();
  },

  // Page Hierarchy / Nested Sub-pages
  async getPageAncestors(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/ancestors`, { headers });
    if (!response.ok) throw new Error('Failed to fetch page ancestors');
    return response.json();
  },

  async getPageDescendants(pageId: string, maxDepth: number = 10) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/descendants?max_depth=${maxDepth}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch page descendants');
    return response.json();
  },

  async getPageTree(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/tree/${workspaceId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch page tree');
    return response.json();
  },

  async movePage(pageId: string, newParentId: string | null, newOrder: number = 0) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (newParentId) params.append('new_parent_id', newParentId);
    params.append('new_order', newOrder.toString());
    
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/move?${params.toString()}`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to move page');
    return response.json();
  },

  async reorderSubpages(parentPageId: string, pageOrders: Array<{ id: string; order: number }>) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${parentPageId}/reorder`, {
      method: 'POST',
      headers,
      body: JSON.stringify(pageOrders)
    });
    if (!response.ok) throw new Error('Failed to reorder pages');
    return response.json();
  },

  async getPagePreview(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/preview`, { headers });
    if (!response.ok) throw new Error('Failed to fetch page preview');
    return response.json();
  },

  async getRelatedSuggestions(pageId: string, workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/pages/${pageId}/suggestions?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/pages/${pageId}/suggestions`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch suggestions');
    return response.json();
  },

  async respondToSuggestion(pageId: string, suggestionId: string, status: 'accepted' | 'rejected') {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/suggestions/${suggestionId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('Failed to respond to suggestion');
    return response.json();
  },

  async syncPageMentions(pageId: string, mentions: Array<{ mention_type: string; mention_id?: string; mention_text: string }>) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/mentions/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mentions)
    });
    if (!response.ok) throw new Error('Failed to sync mentions');
    return response.json();
  },

  // Page Sharing
  async updatePageSharing(pageId: string, isPublic: boolean) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/share`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ is_public: isPublic })
    });
    if (!response.ok) throw new Error('Failed to update page sharing');
    return response.json();
  },

  async getPageSharingStatus(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}/share-status`, { headers });
    if (!response.ok) throw new Error('Failed to get sharing status');
    return response.json();
  },

  // Trash/Bin
  async movePageToTrash(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/trash/move/${pageId}`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to move page to trash');
    return response.json();
  },

  async getTrashItems(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/trash?workspace_id=${workspaceId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch trash items');
    return response.json();
  },

  async restoreFromTrash(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/trash/restore/${pageId}`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to restore from trash');
    return response.json();
  },

  async deletePermanently(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/trash/permanent/${pageId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete permanently');
    return response.json();
  },

  async emptyTrash(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/trash/empty?workspace_id=${workspaceId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to empty trash');
    return response.json();
  },

  async getTrashCount(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/trash/count?workspace_id=${workspaceId}`, { headers });
    if (!response.ok) throw new Error('Failed to get trash count');
    return response.json();
  },

  // Skills
  async getSkills(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/skills?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/skills`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch skills');
    return response.json();
  },

  async createSkill(skill: { name: string; level?: string; description?: string; evidence?: string[]; goals?: string[]; workspace_id?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/skills`, {
      method: 'POST',
      headers,
      body: JSON.stringify(skill)
    });
    if (!response.ok) throw new Error('Failed to create skill');
    return response.json();
  },

  async updateSkill(skillId: string, updates: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/skills/${skillId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update skill');
    return response.json();
  },

  async deleteSkill(skillId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/skills/${skillId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete skill');
    return response.json();
  },

  async addSkillEvidence(skillId: string, evidence: { page_id: string; evidence_type?: string; notes?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/skills/${skillId}/evidence`, {
      method: 'POST',
      headers,
      body: JSON.stringify(evidence)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to add evidence');
    }
    return response.json();
  },

  async removeSkillEvidence(skillId: string, evidenceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/skills/${skillId}/evidence/${evidenceId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to remove evidence');
    return response.json();
  },

  // Skill Chaining
  async getSuggestedNextSkills(skillId: string, workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/skills/${skillId}/suggested-next?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/skills/${skillId}/suggested-next`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to get suggested skills');
    return response.json();
  },

  async executeSkill(skillId: string, execution: { 
    trigger_source?: string; 
    input_context?: any; 
    output_type?: string; 
    output_id?: string 
  }, workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/skills/${skillId}/execute?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/skills/${skillId}/execute`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(execution)
    });
    if (!response.ok) throw new Error('Failed to execute skill');
    return response.json();
  },

  async linkSkills(sourceSkillId: string, targetSkillId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/skills/${sourceSkillId}/link/${targetSkillId}`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to link skills');
    return response.json();
  },

  async unlinkSkills(sourceSkillId: string, targetSkillId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/skills/${sourceSkillId}/link/${targetSkillId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to unlink skills');
    return response.json();
  },

  // Skill Intelligence & Contributions
  async getSkillRealProgress(skillId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/intelligence/skills/${skillId}/real-progress`, { headers });
    if (!response.ok) throw new Error('Failed to fetch skill progress');
    return response.json();
  },

  async trackSuggestionAccepted(skillId: string, suggestionId: string, workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/skills/${skillId}/contribution/suggestion-accepted?suggestion_id=${suggestionId}&workspace_id=${workspaceId}`,
      { method: 'POST', headers }
    );
    if (!response.ok) throw new Error('Failed to track suggestion');
    return response.json();
  },

  // Skill Marketplace
  async getMarketplaceSkills(category: string = 'all', sortBy: string = 'popular') {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/skills/marketplace?category=${category}&sort_by=${sortBy}`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch marketplace skills');
    return response.json();
  },

  async getRecommendedSkills(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/skills/marketplace/recommended?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/skills/marketplace/recommended`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch recommended skills');
    return response.json();
  },

  async getTopRatedSkills(limit: number = 5) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/skills/marketplace/top-rated?limit=${limit}`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch top rated skills');
    return response.json();
  },

  async installMarketplaceSkill(marketplaceSkillId: string, workspaceId?: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/skills/marketplace/install`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        marketplace_skill_id: marketplaceSkillId,
        workspace_id: workspaceId
      })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to install skill');
    }
    return response.json();
  },

  async getSkillBundles() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/skills/marketplace/bundles`, { headers });
    if (!response.ok) throw new Error('Failed to fetch skill bundles');
    return response.json();
  },

  async trackSuggestionRejected(skillId: string, suggestionId: string, workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/skills/${skillId}/contribution/suggestion-rejected?suggestion_id=${suggestionId}&workspace_id=${workspaceId}`,
      { method: 'POST', headers }
    );
    if (!response.ok) throw new Error('Failed to track rejection');
    return response.json();
  },

  async autoLinkPageToSkills(pageId: string, pageTitle: string, pageContent: string, pageTags: string[], workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/intelligence/skills/auto-link/page`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        page_id: pageId,
        page_title: pageTitle,
        page_content: pageContent,
        page_tags: pageTags,
        workspace_id: workspaceId
      })
    });
    if (!response.ok) throw new Error('Failed to auto-link page');
    return response.json();
  },

  async autoLinkTaskToSkill(taskId: string, taskTitle: string, taskDescription: string, workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/intelligence/skills/auto-link/task`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        task_id: taskId,
        task_title: taskTitle,
        task_description: taskDescription,
        workspace_id: workspaceId
      })
    });
    if (!response.ok) throw new Error('Failed to auto-link task');
    return response.json();
  },

  async getSuggestedSkillLinks(pageId: string, workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/skills/suggest-links/page/${pageId}?workspace_id=${workspaceId}`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to get suggestions');
    return response.json();
  },

  async getSkillExecutions(skillId: string, limit: number = 10) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/skills/${skillId}/executions?limit=${limit}`, { headers });
    if (!response.ok) throw new Error('Failed to get skill executions');
    return response.json();
  },

  // Tasks
  async getTasks(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/tasks?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/tasks`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },

  async createTask(task: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('Failed to create task');
    return response.json();
  },

  async updateTask(taskId: string, updates: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update task');
    return response.json();
  },

  async deleteTask(taskId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete task');
    return response.json();
  },

  // Knowledge Graph
  async getGraphNodes(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/graph/nodes?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/graph/nodes`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch graph nodes');
    return response.json();
  },

  async getGraphEdges(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/graph/edges?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/graph/edges`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch graph edges');
    return response.json();
  },

  async getConnectedItems(itemId: string, itemType: string = 'page', workspaceId?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    params.append('item_type', itemType);
    if (workspaceId) params.append('workspace_id', workspaceId);
    const url = `${API_BASE_URL}/page-links/connected/${itemId}?${params.toString()}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch connected items');
    return response.json();
  },

  async getConnectionCounts(workspaceId: string) {
    const headers = await getAuthHeaders();
    const url = `${API_BASE_URL}/page-links/connection-counts?workspace_id=${workspaceId}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch connection counts');
    return response.json();
  },

  async inferEdges(workspaceId?: string, nodeId?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspace_id', workspaceId);
    if (nodeId) params.append('node_id', nodeId);
    const url = `${API_BASE_URL}/graph/infer-edges${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to infer edges');
    return response.json();
  },

  async createEdge(data: {
    source_id: string;
    source_type: string;
    target_id: string;
    target_type: string;
    edge_type?: string;
    workspace_id?: string;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/graph/edges`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create edge');
    return response.json();
  },

  async deleteEdge(edgeId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/graph/edges/${edgeId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete edge');
    return response.json();
  },

  async acceptSuggestion(data: {
    source_id: string;
    source_type: string;
    target_id: string;
    target_type: string;
    workspace_id?: string;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/graph/edges/accept-suggestion`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to accept suggestion');
    return response.json();
  },

  async updateEdgeType(edgeId: string, edgeType: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/graph/edges/${edgeId}/type`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ edge_type: edgeType })
    });
    if (!response.ok) throw new Error('Failed to update edge type');
    return response.json();
  },

  async getGraphInsights(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/graph/insights?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/graph/insights`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch graph insights');
    return response.json();
  },

  async findLearningPath(startId: string, endId: string, workspaceId?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ start_id: startId, end_id: endId });
    if (workspaceId) params.append('workspace_id', workspaceId);
    const response = await fetch(`${API_BASE_URL}/graph/path?${params.toString()}`, { headers });
    if (!response.ok) throw new Error('Failed to find learning path');
    return response.json();
  },

  async getGraphBacklinks(nodeId: string, workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/graph/backlinks/${nodeId}?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/graph/backlinks/${nodeId}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch graph backlinks');
    return response.json();
  },

  async extractConcepts(pageId: string, workspaceId?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ page_id: pageId });
    if (workspaceId) params.append('workspace_id', workspaceId);
    const response = await fetch(`${API_BASE_URL}/graph/concepts/extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ page_id: pageId, workspace_id: workspaceId })
    });
    if (!response.ok) throw new Error('Failed to extract concepts');
    return response.json();
  },

  async getNodePreview(nodeId: string, nodeType: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/graph/node/${nodeId}/preview?node_type=${nodeType}`, 
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch node preview');
    return response.json();
  },

  // Chat Sessions
  async getChatSessions(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/chat-sessions?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/chat-sessions`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch chat sessions');
    return response.json();
  },

  async getChatSession(sessionId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/chat-sessions/${sessionId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch chat session');
    return response.json();
  },

  async createChatSession(session: { title?: string; workspace_id?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/chat-sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(session)
    });
    if (!response.ok) throw new Error('Failed to create chat session');
    return response.json();
  },

  async updateChatSession(sessionId: string, updates: { title?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/chat-sessions/${sessionId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update chat session');
    return response.json();
  },

  async deleteChatSession(sessionId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/chat-sessions/${sessionId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete chat session');
    return response.json();
  },

  async addMessageToSession(sessionId: string, message: { role: string; content: string; sources?: any[]; model?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/chat-sessions/${sessionId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to add message';
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (e) {
        // If we can't parse the error response, use the status
        errorMessage = `Failed to add message (${response.status})`;
      }
      throw new Error(errorMessage);
    }
    
    return response.json();
  },

  // Learning Objects - Quizzes
  async getQuizzes(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/learning/quizzes?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/learning/quizzes`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch quizzes');
    return response.json();
  },

  async getFlashcardDecks(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/learning/flashcard-decks?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/learning/flashcard-decks`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch flashcard decks');
    return response.json();
  },

  async getLearningStats(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const url = workspaceId 
      ? `${API_BASE_URL}/learning/stats?workspace_id=${workspaceId}`
      : `${API_BASE_URL}/learning/stats`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch learning stats');
    return response.json();
  },

  async getQuiz(quizId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/quizzes/${quizId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch quiz');
    return response.json();
  },

  async createQuiz(quiz: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/quizzes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(quiz)
    });
    if (!response.ok) throw new Error('Failed to create quiz');
    return response.json();
  },

  async recordQuizAttempt(quizId: string, score: number, totalQuestions: number) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/quizzes/attempts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ quiz_id: quizId, score, total_questions: totalQuestions })
    });
    if (!response.ok) throw new Error('Failed to record quiz attempt');
    return response.json();
  },

  async getQuizAttempts(quizId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/quizzes/${quizId}/attempts`, { headers });
    if (!response.ok) throw new Error('Failed to fetch quiz attempts');
    return response.json();
  },

  async deleteQuiz(quizId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/quizzes/${quizId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete quiz');
    return response.json();
  },

  // Learning Objects - Flashcards
  async getFlashcardDeck(deckId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/flashcards/${deckId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch flashcard deck');
    return response.json();
  },

  async createFlashcardDeck(deck: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/flashcards`, {
      method: 'POST',
      headers,
      body: JSON.stringify(deck)
    });
    if (!response.ok) throw new Error('Failed to create flashcard deck');
    return response.json();
  },

  async updateFlashcardProgress(deckId: string, cardIndex: number, status: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/flashcards/progress`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ deck_id: deckId, card_index: cardIndex, status })
    });
    if (!response.ok) throw new Error('Failed to update flashcard progress');
    return response.json();
  },

  async getFlashcardProgress(deckId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/flashcards/${deckId}/progress`, { headers });
    if (!response.ok) throw new Error('Failed to fetch flashcard progress');
    return response.json();
  },

  async deleteFlashcardDeck(deckId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/flashcards/${deckId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete flashcard deck');
    return response.json();
  },

  // Get learning objects by page or skill
  async getPageLearningObjects(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/pages/${pageId}/learning-objects`, { headers });
    if (!response.ok) throw new Error('Failed to fetch page learning objects');
    return response.json();
  },

  async getSkillLearningObjects(skillId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/learning/skills/${skillId}/learning-objects`, { headers });
    if (!response.ok) throw new Error('Failed to fetch skill learning objects');
    return response.json();
  },

  // Memory Management
  async updateLearningMemory(data: {
    workspace_id: string;
    skill_id: string;
    topic: string;
    is_correct: boolean;
    study_time?: number;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/memory/update-learning`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update learning memory');
    return response.json();
  },

  async uploadJSON(file: File) {
    const { data: { session } } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/files/upload/json`, {
      method: 'POST',
      headers: {
        ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload JSON');
    }
    return response.json();
  },

  async uploadExcel(file: File) {
    const { data: { session } } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/files/upload/excel`, {
      method: 'POST',
      headers: {
        ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload Excel');
    }
    return response.json();
  },

  // Subscriptions
  async getSubscriptionPlans() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/subscriptions/plans`, { headers });
    if (!response.ok) throw new Error('Failed to fetch subscription plans');
    return response.json();
  },

  async getCurrentSubscription() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/subscriptions/current`, { headers });
    if (!response.ok) throw new Error('Failed to fetch current subscription');
    return response.json();
  },

  async getUsageStats() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/subscriptions/usage`, { headers });
    if (!response.ok) throw new Error('Failed to fetch usage stats');
    return response.json();
  },

  async upgradeSubscription(planName: string, billingCycle: 'monthly' | 'yearly') {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/subscriptions/upgrade`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ plan_name: planName, billing_cycle: billingCycle })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upgrade subscription');
    }
    return response.json();
  },

  async verifyPayment(paymentData: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/subscriptions/verify-payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Payment verification failed');
    }
    return response.json();
  },

  async getBillingHistory() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/subscriptions/billing-history`, { headers });
    if (!response.ok) throw new Error('Failed to fetch billing history');
    return response.json();
  },

  async cancelSubscription(immediate: boolean = false) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/subscriptions/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ immediate })
    });
    if (!response.ok) throw new Error('Failed to cancel subscription');
    return response.json();
  },

  async checkFeatureAccess(workspaceId: string, featureName: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/subscriptions/check-feature?workspace_id=${workspaceId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ feature_name: featureName })
    });
    if (!response.ok) throw new Error('Failed to check feature access');
    return response.json();
  },

  // Templates
  async getTemplateCategories() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/templates/categories`, { headers });
    if (!response.ok) throw new Error('Failed to fetch template categories');
    return response.json();
  },

  async getTemplates(category?: string, search?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    const url = `${API_BASE_URL}/templates${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
  },

  async getTemplate(templateId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch template');
    return response.json();
  },

  async useTemplate(templateId: string, workspaceId: string, title?: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/templates/${templateId}/use`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ workspace_id: workspaceId, title })
    });
    if (!response.ok) throw new Error('Failed to use template');
    return response.json();
  },

  async createCustomTemplate(pageId: string, category: string, description: string, isPublic: boolean = false) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/templates/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        page_id: pageId,
        template_category: category,
        template_description: description,
        is_public: isPublic
      })
    });
    if (!response.ok) throw new Error('Failed to create custom template');
    return response.json();
  },

  async deleteCustomTemplate(templateId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete template');
    return response.json();
  },

  async getPopularTemplates(limit: number = 10) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/templates/popular?limit=${limit}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch popular templates');
    return response.json();
  },

  async getRecentTemplates(limit: number = 10) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/templates/recent?limit=${limit}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch recent templates');
    return response.json();
  },

  // Database Properties
  async getDatabaseProperties(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/database/pages/${pageId}/properties`, { headers });
    if (!response.ok) throw new Error('Failed to fetch database properties');
    return response.json();
  },

  async createDatabaseProperty(pageId: string, property: {
    name: string;
    property_type: string;
    config?: any;
    property_order?: number;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/database/pages/${pageId}/properties`, {
      method: 'POST',
      headers,
      body: JSON.stringify(property)
    });
    if (!response.ok) throw new Error('Failed to create database property');
    return response.json();
  },

  async updateDatabaseProperty(propertyId: string, updates: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/database/properties/${propertyId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update database property');
    return response.json();
  },

  async deleteDatabaseProperty(propertyId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/database/properties/${propertyId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete database property');
    return response.json();
  },

  // Database Rows
  async getDatabaseRows(pageId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/database/pages/${pageId}/rows`, { headers });
    if (!response.ok) throw new Error('Failed to fetch database rows');
    return response.json();
  },

  async createDatabaseRow(pageId: string, row: { properties: Record<string, any> }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/database/pages/${pageId}/rows`, {
      method: 'POST',
      headers,
      body: JSON.stringify(row)
    });
    if (!response.ok) throw new Error('Failed to create database row');
    return response.json();
  },

  async updateDatabaseRow(rowId: string, updates: { properties: Record<string, any> }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/database/rows/${rowId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update database row');
    return response.json();
  },

  async deleteDatabaseRow(rowId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/database/rows/${rowId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete database row');
    return response.json();
  },

  // =====================================================
  // AI PREVIEW & EXECUTE (Human Verification Loop)
  // =====================================================

  async generateActionPreview(data: {
    query: string;
    mode: 'agent' | 'plan';
    workspace_id?: string;
    session_id?: string;
    model?: string;
    mentioned_items?: Array<{type: string, id: string, name: string}>;
    enabled_sources?: string[];
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/actions/preview`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate preview');
    }
    return response.json();
  },

  async executeActions(data: {
    preview_id: string;
    selected_actions: string[];
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/actions/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to execute actions');
    }
    return response.json();
  },

  async undoActions(data: {
    preview_id: string;
    action_ids?: string[];
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/actions/undo`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to undo actions');
    }
    return response.json();
  },

  async sendActionFeedback(data: {
    preview_id: string;
    rating: 'helpful' | 'not_helpful';
    comment?: string;
    executed_actions: string[];
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/actions/feedback`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    // Don't throw on feedback errors - it's optional
    return response.json();
  },

  async getActionPreview(previewId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/ai/actions/preview/${previewId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch preview');
    return response.json();
  },

  // =====================================================
  // DASHBOARD LAYOUT
  // =====================================================

  async getDashboardLayout(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard/layout/${workspaceId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch dashboard layout');
    return response.json();
  },

  async updateDashboardLayout(
    workspaceId: string, 
    layout: any[], 
    gridColumns?: 1 | 2 | 3, 
    spacing?: 'none' | 'compact' | 'comfortable'
  ) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard/layout/${workspaceId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ 
        layout,
        gridColumns,
        spacing
      })
    });
    if (!response.ok) throw new Error('Failed to update dashboard layout');
    return response.json();
  },

  async resetDashboardLayout(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard/layout/${workspaceId}/reset`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to reset dashboard layout');
    return response.json();
  },

  async getAvailableWidgets() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/dashboard/widgets/available`, { headers });
    if (!response.ok) throw new Error('Failed to fetch available widgets');
    return response.json();
  },

  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  async getNotifications(workspaceId?: string, isRead?: boolean, limit: number = 50) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspace_id', workspaceId);
    if (isRead !== undefined) params.append('is_read', String(isRead));
    params.append('limit', String(limit));
    const response = await fetch(`${API_BASE_URL}/notifications?${params.toString()}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  async getUnreadNotificationCount(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const params = workspaceId ? `?workspace_id=${workspaceId}` : '';
    const response = await fetch(`${API_BASE_URL}/notifications/unread-count${params}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch unread count');
    return response.json();
  },

  async createNotification(notification: {
    title: string;
    message?: string;
    type?: string;
    workspace_id?: string;
    link?: string;
    link_label?: string;
    icon?: string;
    metadata?: Record<string, any>;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'POST',
      headers,
      body: JSON.stringify(notification)
    });
    if (!response.ok) throw new Error('Failed to create notification');
    return response.json();
  },

  async updateNotification(notificationId: string, updates: { is_read?: boolean; is_archived?: boolean }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update notification');
    return response.json();
  },

  async markAllNotificationsRead(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const params = workspaceId ? `?workspace_id=${workspaceId}` : '';
    const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read${params}`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to mark all as read');
    return response.json();
  },

  async deleteNotification(notificationId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete notification');
    return response.json();
  },

  async clearAllNotifications(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const params = workspaceId ? `?workspace_id=${workspaceId}` : '';
    const response = await fetch(`${API_BASE_URL}/notifications/clear-all${params}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to clear notifications');
    return response.json();
  },

  async checkDueNotifications(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const params = workspaceId ? `?workspace_id=${workspaceId}` : '';
    const response = await fetch(`${API_BASE_URL}/notifications/check-due${params}`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to check due notifications');
    return response.json();
  },

  async sendLearningReminder(workspaceId?: string) {
    const headers = await getAuthHeaders();
    const params = workspaceId ? `?workspace_id=${workspaceId}` : '';
    const response = await fetch(`${API_BASE_URL}/notifications/send-reminder${params}`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to send reminder');
    return response.json();
  },

  // =====================================================
  // ENHANCED GRAPH (NetworkX)
  // =====================================================

  async getGraphReactFlow(workspaceId: string, nodeTypes?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (nodeTypes) params.append('node_types', nodeTypes);
    const response = await fetch(`${API_BASE_URL}/graph/nx/react-flow?${params.toString()}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch graph data');
    return response.json();
  },

  async getGraphStats(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/graph/nx/stats?workspace_id=${workspaceId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch graph stats');
    return response.json();
  },

  async getGraphHubs(workspaceId: string, topN: number = 10) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/graph/nx/hubs?workspace_id=${workspaceId}&top_n=${topN}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch hub nodes');
    return response.json();
  },

  async getGraphCommunities(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/graph/nx/communities?workspace_id=${workspaceId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch communities');
    return response.json();
  },

  async getGraphNeighbors(nodeId: string, workspaceId: string, depth: number = 1) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/graph/nx/neighbors/${nodeId}?workspace_id=${workspaceId}&depth=${depth}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch neighbors');
    return response.json();
  },

  async findGraphPath(workspaceId: string, source: string, target: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ workspace_id: workspaceId, source, target });
    const response = await fetch(`${API_BASE_URL}/graph/nx/path?${params.toString()}`, { headers });
    if (!response.ok) throw new Error('Failed to find path');
    return response.json();
  },

  async getGraphCentrality(workspaceId: string, metric: 'degree' | 'betweenness' | 'pagerank' = 'degree') {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/graph/nx/centrality?workspace_id=${workspaceId}&metric=${metric}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch centrality');
    return response.json();
  },

  async getGraphSuggestions(nodeId: string, workspaceId: string, topN: number = 5) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/graph/nx/suggestions/${nodeId}?workspace_id=${workspaceId}&top_n=${topN}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch suggestions');
    return response.json();
  },

  async getEgoGraph(nodeId: string, workspaceId: string, radius: number = 2) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/graph/nx/ego/${nodeId}?workspace_id=${workspaceId}&radius=${radius}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch ego graph');
    return response.json();
  },

  async getLearningPath(workspaceId: string, startSkill: string, endSkill: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ workspace_id: workspaceId, start_skill: startSkill, end_skill: endSkill });
    const response = await fetch(`${API_BASE_URL}/graph/nx/learning-path?${params.toString()}`, { headers });
    if (!response.ok) throw new Error('Failed to find learning path');
    return response.json();
  },

  // User Settings
  async getUserSettings() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/settings`, { headers });
    if (!response.ok) throw new Error('Failed to fetch user settings');
    return response.json();
  },

  async updateUserSettings(settings: {
    full_name?: string;
    avatar_url?: string;
    bio?: string;
    theme?: 'light' | 'dark' | 'system';
    accent_color?: string;
    font_size?: 'small' | 'medium' | 'large';
    email_notifications?: boolean;
    task_reminders?: boolean;
    skill_updates?: boolean;
    ai_suggestions?: boolean;
    weekly_digest?: boolean;
    mentions?: boolean;
    default_ai_model?: string;
    auto_suggest?: boolean;
    context_awareness?: boolean;
    streaming_responses?: boolean;
    profile_visibility?: 'public' | 'private' | 'workspace';
    show_activity_status?: boolean;
    default_workspace_id?: string;
    sidebar_collapsed?: boolean;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(settings)
    });
    if (!response.ok) throw new Error('Failed to update user settings');
    return response.json();
  },

  async getWorkspaceSettings(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/settings/workspace/${workspaceId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch workspace settings');
    return response.json();
  },

  async updateWorkspaceSettings(workspaceId: string, settings: {
    is_public?: boolean;
    allow_invites?: boolean;
    default_page_icon?: string;
    default_page_template_id?: string;
    workspace_ai_model?: string;
    ai_context_scope?: 'page' | 'workspace' | 'all';
    mute_notifications?: boolean;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/settings/workspace/${workspaceId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(settings)
    });
    if (!response.ok) throw new Error('Failed to update workspace settings');
    return response.json();
  },

  async updateAvatar(avatarUrl: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/settings/avatar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ avatar_url: avatarUrl })
    });
    if (!response.ok) throw new Error('Failed to update avatar');
    return response.json();
  },

  async deleteAvatar() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/upload/profile-photo`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete avatar');
    return response.json();
  },

  async uploadProfilePhoto(file: File) {
    const { data: { session } } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload/profile-photo`, {
      method: 'POST',
      headers: {
        ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
      },
      body: formData
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload photo');
    }
    return response.json();
  },

  // ============================================
  // WORKSPACE MEMBERS & INVITATIONS
  // ============================================

  async getWorkspaceMembers(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/members`, { headers });
    if (!response.ok) throw new Error('Failed to fetch workspace members');
    return response.json();
  },

  async updateMemberRole(workspaceId: string, memberUserId: string, role: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/members/${memberUserId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ role })
    });
    if (!response.ok) throw new Error('Failed to update member role');
    return response.json();
  },

  async removeMember(workspaceId: string, memberUserId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/members/${memberUserId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to remove member');
    return response.json();
  },

  async leaveWorkspace(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/leave`, {
      method: 'POST',
      headers
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to leave workspace');
    }
    return response.json();
  },

  async getWorkspaceInvitations(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/invitations`, { headers });
    if (!response.ok) throw new Error('Failed to fetch invitations');
    return response.json();
  },

  async inviteMember(workspaceId: string, email: string, role: string = 'member') {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/invitations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, role })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send invitation');
    }
    return response.json();
  },

  async acceptInvitation(token: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/invitations/${token}/accept`, {
      method: 'POST',
      headers
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to accept invitation');
    }
    return response.json();
  },

  async declineInvitation(token: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/invitations/${token}/decline`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to decline invitation');
    return response.json();
  },

  async cancelInvitation(workspaceId: string, invitationId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/invitations/${invitationId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to cancel invitation');
    return response.json();
  },

  async getMyInvitations() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/workspaces/my-invitations`, { headers });
    if (!response.ok) throw new Error('Failed to fetch your invitations');
    return response.json();
  },

  // =====================================================
  // INTELLIGENCE ENGINE (Living Intelligence OS)
  // =====================================================

  async getInsights(workspaceId: string, dismissed: boolean = false) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/insights?workspace_id=${workspaceId}&dismissed=${dismissed}`, 
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch insights');
    return response.json();
  },

  async dismissInsight(insightId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/intelligence/insights/${insightId}/dismiss`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to dismiss insight');
    return response.json();
  },

  async actOnInsight(insightId: string, actionIndex: number = 0) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/insights/${insightId}/act?action_index=${actionIndex}`, 
      {
        method: 'POST',
        headers
      }
    );
    if (!response.ok) throw new Error('Failed to act on insight');
    return response.json();
  },

  async getProposedActions(workspaceId: string, executed: boolean = false) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/actions/proposed?workspace_id=${workspaceId}&executed=${executed}`, 
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch proposed actions');
    return response.json();
  },

  async approveAction(actionId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/intelligence/actions/${actionId}/approve`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to approve action');
    return response.json();
  },

  async rejectAction(actionId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/intelligence/actions/${actionId}/reject`, {
      method: 'POST',
      headers
    });
    if (!response.ok) throw new Error('Failed to reject action');
    return response.json();
  },

  async analyzePatterns(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/patterns?workspace_id=${workspaceId}`, 
      { headers }
    );
    if (!response.ok) throw new Error('Failed to analyze patterns');
    return response.json();
  },

  async getHomeIntelligence(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/home?workspace_id=${workspaceId}`, 
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch home intelligence');
    return response.json();
  },

  async getRankedTasks(workspaceId: string, limit: number = 20) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/tasks/ranked?workspace_id=${workspaceId}&limit=${limit}`, 
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch ranked tasks');
    return response.json();
  },

  async getTaskPriority(taskId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/tasks/${taskId}/priority`, 
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch task priority');
    return response.json();
  },

  async emitSignal(workspaceId: string, signal: {
    signal_type: string;
    source_id: string;
    source_type: string;
    data?: Record<string, any>;
    priority?: number;
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/signals?workspace_id=${workspaceId}`, 
      {
        method: 'POST',
        headers,
        body: JSON.stringify(signal)
      }
    );
    if (!response.ok) throw new Error('Failed to emit signal');
    return response.json();
  },

  // Skill Lifecycle APIs
  async getSkillAgentStatus(skillId: string, workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/skills/${skillId}/status?workspace_id=${workspaceId}`, 
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch skill status');
    return response.json();
  },

  async activateSkill(skillId: string, workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/skills/${skillId}/activate?workspace_id=${workspaceId}`, 
      {
        method: 'POST',
        headers
      }
    );
    if (!response.ok) throw new Error('Failed to activate skill');
    return response.json();
  },

  async evolveSkill(skillId: string, workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/skills/${skillId}/evolve?workspace_id=${workspaceId}`, 
      {
        method: 'POST',
        headers
      }
    );
    if (!response.ok) throw new Error('Failed to evolve skill');
    return response.json();
  },

  async getSkillsLifecycleSummary(workspaceId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/intelligence/skills/lifecycle-summary?workspace_id=${workspaceId}`, 
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch skills lifecycle summary');
    return response.json();
  },

  // File Upload - CSV/Excel
  async uploadCSV(file: File, workspaceId?: string, pageId?: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append('file', file);
    if (workspaceId) formData.append('workspace_id', workspaceId);
    if (pageId) formData.append('page_id', pageId);

    const response = await fetch(`${API_BASE_URL}/files/upload/csv`, {
      method: 'POST',
      headers: {
        ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Failed to upload CSV');
    }

    return response.json();
  },

  // Block Databases API (for database blocks like Notion)
  async getBlockDatabase(blockId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/block-databases/${blockId}`, { headers });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch block database');
    }
    return response.json();
  },

  async createBlockDatabase(data: {
    block_id: string;
    page_id?: string;
    workspace_id?: string;
    name?: string;
    columns?: any[];
    rows?: any[];
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/block-databases`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create block database');
    return response.json();
  },

  async updateBlockDatabase(blockId: string, data: {
    name?: string;
    columns?: any[];
    rows?: any[];
    view_type?: string;
    sort_config?: any[];
    filter_config?: any[];
    hidden_columns?: string[];
  }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/block-databases/${blockId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update block database');
    return response.json();
  },

  async deleteBlockDatabase(blockId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/block-databases/${blockId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete block database');
    return response.json();
  },

  // Offline Sync
  async syncEvents(events: Array<{
    id: string;
    entity_type: 'page' | 'task';
    entity_id: string;
    op_type: 'upsert' | 'patch' | 'delete';
    payload: any;
    created_at: number;
    client_version?: number;
  }>) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/sync/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events })
    });
    if (!response.ok) throw new Error('Failed to sync events');
    return response.json();
  },
};
