import React from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import ProjectKanbanBoard from '@/components/project-kanban-board';

const ProjectKanban = () => {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
        <Button onClick={() => navigate(`/dashboard/tickets/new?projectId=${projectId}`)}>
          Raise Ticket
        </Button>
      </div>

      <ProjectKanbanBoard projectId={projectId} />
    </div>
  );
};

export default ProjectKanban;