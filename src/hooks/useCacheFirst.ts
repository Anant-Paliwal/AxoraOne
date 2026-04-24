/**
 * Cache-First Data Loading Hook
 * Loads from cache instantly, fetches from server in background
 */

import { useState, useEffect } from 'react';
import { offlineDBHelpers } from '@/lib/offline-db';

export function useCacheFirstPage(pageId: string | undefined, fetchFn: () => Promise<any>) {
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  
  useEffect(() => {
    if (!pageId) return;
    
    let mounted = true;
    
    const loadPage = async () => {
      try {
        // 1. Load from cache INSTANTLY
        const cachedPage = await offlineDBHelpers.getPage(pageId);
        if (cachedPage && mounted) {
          setPage({
            ...cachedPage,
            content_json: JSON.parse(cachedPage.content_json || '[]'),
          });
          setFromCache(true);
          setLoading(false);
        }
        
        // 2. Fetch from server in background
        try {
          const serverPage = await fetchFn();
          if (mounted) {
            setPage(serverPage);
            setFromCache(false);
            
            // Update cache
            await offlineDBHelpers.savePage({
              ...serverPage,
              content_json: JSON.stringify(serverPage.content_json || []),
            });
          }
        } catch (error) {
          // If offline or error, cached data is still shown
          console.log('Using cached data (offline or error)');
          if (!cachedPage) {
            throw error;
          }
        }
      } catch (error) {
        console.error('Failed to load page:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadPage();
    
    return () => {
      mounted = false;
    };
  }, [pageId]);
  
  return { page, loading, fromCache, setPage };
}

export function useCacheFirstTasks(workspaceId: string | undefined, fetchFn: () => Promise<any[]>) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  
  useEffect(() => {
    if (!workspaceId) return;
    
    let mounted = true;
    
    const loadTasks = async () => {
      try {
        // 1. Load from cache INSTANTLY
        const cachedTasks = await offlineDBHelpers.getTasksByWorkspace(workspaceId);
        if (cachedTasks.length > 0 && mounted) {
          setTasks(cachedTasks);
          setFromCache(true);
          setLoading(false);
        }
        
        // 2. Fetch from server in background
        try {
          const serverTasks = await fetchFn();
          if (mounted) {
            setTasks(serverTasks);
            setFromCache(false);
            
            // Update cache
            for (const task of serverTasks) {
              await offlineDBHelpers.saveTask(task);
            }
          }
        } catch (error) {
          // If offline or error, cached data is still shown
          console.log('Using cached tasks (offline or error)');
          if (cachedTasks.length === 0) {
            throw error;
          }
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadTasks();
    
    return () => {
      mounted = false;
    };
  }, [workspaceId]);
  
  return { tasks, loading, fromCache, setTasks };
}

export function useCacheFirstPages(workspaceId: string | undefined, fetchFn: () => Promise<any[]>) {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  
  useEffect(() => {
    if (!workspaceId) return;
    
    let mounted = true;
    
    const loadPages = async () => {
      try {
        // 1. Load from cache INSTANTLY
        const cachedPages = await offlineDBHelpers.getPagesByWorkspace(workspaceId);
        if (cachedPages.length > 0 && mounted) {
          setPages(cachedPages.map(p => ({
            ...p,
            content_json: JSON.parse(p.content_json || '[]'),
          })));
          setFromCache(true);
          setLoading(false);
        }
        
        // 2. Fetch from server in background
        try {
          const serverPages = await fetchFn();
          if (mounted) {
            setPages(serverPages);
            setFromCache(false);
            
            // Update cache
            for (const page of serverPages) {
              await offlineDBHelpers.savePage({
                ...page,
                content_json: JSON.stringify(page.content_json || []),
              });
            }
          }
        } catch (error) {
          // If offline or error, cached data is still shown
          console.log('Using cached pages (offline or error)');
          if (cachedPages.length === 0) {
            throw error;
          }
        }
      } catch (error) {
        console.error('Failed to load pages:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadPages();
    
    return () => {
      mounted = false;
    };
  }, [workspaceId]);
  
  return { pages, loading, fromCache, setPages };
}

export function useCacheFirstSkills(workspaceId: string | undefined, fetchFn: () => Promise<any[]>) {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  
  useEffect(() => {
    if (!workspaceId) return;
    
    let mounted = true;
    
    const loadSkills = async () => {
      try {
        // 1. Load from cache INSTANTLY
        const cachedSkills = await offlineDBHelpers.getSkillsByWorkspace(workspaceId);
        if (cachedSkills.length > 0 && mounted) {
          setSkills(cachedSkills);
          setFromCache(true);
          setLoading(false);
        }
        
        // 2. Fetch from server in background
        try {
          const serverSkills = await fetchFn();
          if (mounted) {
            setSkills(serverSkills);
            setFromCache(false);
            
            // Update cache
            for (const skill of serverSkills) {
              await offlineDBHelpers.saveSkill(skill);
            }
          }
        } catch (error) {
          // If offline or error, cached data is still shown
          console.log('Using cached skills (offline or error)');
          if (cachedSkills.length === 0) {
            throw error;
          }
        }
      } catch (error) {
        console.error('Failed to load skills:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadSkills();
    
    return () => {
      mounted = false;
    };
  }, [workspaceId]);
  
  return { skills, loading, fromCache, setSkills };
}
