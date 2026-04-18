import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet, Link, useLocation, useNavigation } from 'react-router';
import { useAuth } from '@/provider/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getData } from '@/lib/fetch-util';
import type { Project } from '@/types';
import { ChevronDown, LogOut, LayoutDashboard } from 'lucide-react';
import ClientRedirect from '@/components/client-redirect';

const DashboardLayout = () => {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const navigation = useNavigation();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getData<Project[]>('/projects'),
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background">Loading dashboard...</div>;
  }

  if (!isAuthenticated) {
    return <ClientRedirect to="/sign-in" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="relative flex h-16 items-center px-4">
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold tracking-wide">Fixora</h1>
          <div className="relative ml-auto">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto gap-2 rounded-full px-2 py-1"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profilePicture} />
                <AvatarFallback>{user?.name?.split(' ')[0].charAt(0)}{user?.name?.split(' ')[1].charAt(0)}</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>

            {isProfileMenuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-border bg-background p-2 shadow-lg">
                <Link to="/dashboard" onClick={() => setIsProfileMenuOpen(false)}>
                  <Button className="w-full justify-start" variant="ghost" size="sm">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button
                  className="mt-1 w-full justify-start"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    void logout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex">
        <aside className="w-56 shrink-0 border-r bg-muted/40 xl:w-60">
          <nav className="space-y-4 px-2 py-4 xl:px-3">
            <div className="space-y-1 text-center text-xl font-semibold">
              <h3 className="font-semibold">Projects </h3>
              <p className="text-sm text-muted-foreground">Your active projects and their members.</p>
            </div>

            <div className="grid gap-2">
              <Link className="block" to="/dashboard/projects/new">
                <Button className="w-full" size="sm">New Project</Button>
              </Link>
              <Link className="block" to="/dashboard/tickets/new">
                <Button className="w-full" size="sm" variant="outline">New Ticket</Button>
              </Link>
            </div>

            <div className="space-y-3">
              {isProjectsLoading ? <div className="text-sm text-muted-foreground">Loading projects...</div> : null}
              {!isProjectsLoading && !projects.length ? (
                <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No projects yet.
                </div>
              ) : null}
              {projects.map((project) => (
                <Link
                  key={project._id}
                  to={`/dashboard/projects/${project._id}/kanban`}
                  className="block rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/60"
                >
                  <div className="font-medium text-foreground">{project.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Owner: {project.owner?.name ?? 'Unknown'}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {project.teamMembers?.length
                      ? project.teamMembers.map((member) => member.name).join(', ')
                      : 'No members added yet.'}
                  </div>
                </Link>
              ))}
            </div>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-6 xl:p-8">
          {navigation.state === 'loading' && <div>Loading...</div>}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
