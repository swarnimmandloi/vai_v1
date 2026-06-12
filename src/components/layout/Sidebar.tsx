'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, FolderOpen, ChevronRight, Layers } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import type { Project, Canvas } from '@/types/canvas';
import { createNewProjectAction, createCanvasAction, loadProjectsAction } from '@/app/(workspace)/actions';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { projects, setProjects, addProject, addCanvas } = useProjectStore();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const result = await loadProjectsAction();
    if (result.projects.length > 0) {
      setProjects(result.projects as Project[]);
      setExpandedProjects(new Set([result.projects[0].id]));
    }
    setLoading(false);
  }

  async function createProject() {
    const result = await createNewProjectAction();
    if ('error' in result && result.error) {
      console.error('Create project failed:', result.error);
      return;
    }
    if ('project' in result && result.project && result.canvas) {
      addProject({ ...result.project, canvases: [result.canvas] });
      setExpandedProjects((prev) => new Set([...prev, result.project.id]));
      router.push(`/${result.project.id}/canvas/${result.canvas.id}`);
    }
  }

  async function createCanvas(projectId: string) {
    const existingCount = projects.find((p) => p.id === projectId)?.canvases?.length ?? 0;
    const result = await createCanvasAction(projectId, existingCount);
    if ('error' in result && result.error) {
      console.error('Create canvas failed:', result.error);
      return;
    }
    if ('canvas' in result && result.canvas) {
      addCanvas(result.canvas as Canvas);
      router.push(`/${projectId}/canvas/${result.canvas.id}`);
    }
  }

  function toggleProject(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside
      className="hidden md:flex flex-col w-56 h-full border-r shrink-0"
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-4 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
          style={{ background: 'var(--accent)' }}
        >
          V
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
          VAI
        </span>
      </div>

      {/* New Project button */}
      <div className="px-3 py-3">
        <button
          onClick={createProject}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors cursor-pointer"
          style={{ color: 'var(--muted-fg)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.12)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-fg)';
          }}
        >
          <Plus size={14} />
          <span>New Project</span>
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <div className="px-3 py-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
            Loading...
          </div>
        ) : projects.length === 0 ? (
          <div className="px-3 py-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
            No projects yet
          </div>
        ) : (
          projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              expanded={expandedProjects.has(project.id)}
              onToggle={() => toggleProject(project.id)}
              onCreateCanvas={() => createCanvas(project.id)}
              currentPath={pathname}
              onNavigate={(path) => router.push(path)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function ProjectItem({
  project,
  expanded,
  onToggle,
  onCreateCanvas,
  currentPath,
  onNavigate,
}: {
  project: Project;
  expanded: boolean;
  onToggle: () => void;
  onCreateCanvas: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  const canvases = project.canvases ?? [];

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-sm text-left transition-colors cursor-pointer"
        style={{ color: 'var(--muted-fg)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-fg)';
        }}
      >
        <ChevronRight
          size={12}
          className="shrink-0 transition-transform duration-150"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
        <FolderOpen size={13} className="shrink-0" />
        <span className="truncate text-xs font-medium">{project.name}</span>
      </button>

      {expanded && (
        <div className="ml-4 mt-0.5 space-y-0.5">
          {canvases.map((canvas) => {
            const path = `/${project.id}/canvas/${canvas.id}`;
            const isActive = currentPath === path;
            return (
              <button
                key={canvas.id}
                onClick={() => onNavigate(path)}
                className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-xs text-left transition-colors cursor-pointer"
                style={{
                  background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: isActive ? 'var(--accent-hover)' : 'var(--muted-fg)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-fg)';
                  }
                }}
              >
                <Layers size={11} className="shrink-0" />
                <span className="truncate">{canvas.name}</span>
              </button>
            );
          })}
          <button
            onClick={onCreateCanvas}
            className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-xs text-left transition-colors cursor-pointer"
            style={{ color: 'var(--muted-fg)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted-fg)';
            }}
          >
            <Plus size={11} className="shrink-0" />
            <span>Add canvas</span>
          </button>
        </div>
      )}
    </div>
  );
}
