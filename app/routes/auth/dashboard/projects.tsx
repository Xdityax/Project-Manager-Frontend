import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getData } from '@/lib/fetch-util';
import type { Project, Ticket } from '@/types';

const formatMemberSummary = (project: Project) => {
  if (!project.teamMembers?.length) {
    return 'No members added yet.';
  }

  return project.teamMembers.map((member) => member.name).join(', ');
};

const Projects = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getData<Project[]>('/projects'),
  });
  const { data: resolvedNotifications = [], isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['ticket-notifications'],
    queryFn: () => getData<Ticket[]>('/tickets/notifications/me'),
  });

  if (isProjectsLoading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-10">
        <section className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Projects Info</h1>
          </div>

          {!projects?.length ? (
            <Card>
              <CardContent className="py-6">
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>No projects found yet. Create your first project and continue directly into the raise-ticket form.</p>
                  <Button onClick={() => navigate('/dashboard/projects/new?redirectTo=ticket')}>
                    Create Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {projects.map((project) => (
                <Card key={project._id}>
                  <CardHeader>
                    <CardTitle>{project.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p>{project.description}</p>
                    <div className="mt-4 flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>Owner: {project.owner?.name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{project.teamMembers?.length || 0} members</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-foreground">Members</p>
                      <p className="text-muted-foreground">{formatMemberSummary(project)}</p>
                    </div>
                    {project.teamMembers?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {project.teamMembers.map((member) => (
                          <span key={member.id} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {member.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex gap-3">
                      <Button onClick={() => navigate(`/dashboard/tickets/new?projectId=${project._id}`)}>
                        Raise Ticket
                      </Button>
                      <Button variant="outline" onClick={() => navigate(`/dashboard/projects/${project._id}/kanban`)}>
                        Kanban Board
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4 border-l border-border pl-6 xl:sticky xl:top-8 xl:ml-4 2xl:ml-6">
          <div className="space-y-1">
            <h2 className="font-semibold">Notifications</h2>
            <p className="text-sm text-muted-foreground">Resolved issues from your projects and assignments.</p>
          </div>

          {isNotificationsLoading ? <div className="text-sm text-muted-foreground">Loading notifications...</div> : null}
          {!isNotificationsLoading && !resolvedNotifications.length ? (
            <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              No resolved-ticket notifications yet.
            </div>
          ) : null}

          {resolvedNotifications.map((ticket) => (
            <Card
              key={ticket._id}
              className="cursor-pointer border-border bg-background transition-colors hover:bg-muted/50"
              onClick={() => navigate(`/dashboard/projects/${ticket.project._id}/kanban`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Issue resolved</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{ticket.title}</p>
                <p>{ticket.project.title}</p>
                <p>
                  Resolved by {ticket.assignee?.name ?? 'Unknown'} on {new Date(ticket.completedAt ?? ticket.updatedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </aside>
      </div>
    </div>
  );
};

export default Projects;
