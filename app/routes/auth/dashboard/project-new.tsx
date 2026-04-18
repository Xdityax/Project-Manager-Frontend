import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getData, postData } from '@/lib/fetch-util';
import { useAuth } from '@/provider/auth-context';
import type { Project, User } from '@/types';
import { toast } from 'sonner';

const projectFormSchema = z.object({
  title: z.string().min(3, 'Project title must be at least 3 characters long.'),
  description: z.string().min(10, 'Project description must be at least 10 characters long.'),
  teamMembers: z.array(z.string()),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

const ProjectNew = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const redirectTo = searchParams.get('redirectTo');

  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getData<User[]>('/auth/users'),
  });

  const form = useForm<ProjectFormData>({
  resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: '',
      description: '',
      teamMembers: [],
    },
  });

  const selectedMembers = form.watch('teamMembers');
  const availableMembers = users.filter((candidate) => candidate.id !== user?.id);

  const createProjectMutation = useMutation({
    mutationFn: (values: ProjectFormData) => postData<Project, ProjectFormData>('/projects', values),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully.');

      if (redirectTo === 'ticket') {
        navigate(`/dashboard/tickets/new?projectId=${project._id}`, { replace: true });
        return;
      }

      navigate('/dashboard', { replace: true });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Unable to create the project.';
      toast.error(message);
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Create Project</CardTitle>
          <CardDescription>
            Create a project first, then continue to the raise-ticket form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isUsersLoading ? <div>Loading team members...</div> : null}
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit((values) => createProjectMutation.mutate(values))}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter the project title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }: { field: any }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the project and the work it covers" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teamMembers"
                render={() => (
                  <FormItem>
                    <FormLabel>Project Members</FormLabel>
                    <div className="rounded-lg border border-input p-4 space-y-3">
                      <div className="text-sm text-muted-foreground">
                        No. of members selected: {selectedMembers.length}
                      </div>
                      {!availableMembers.length ? (
                        <p className="text-sm text-muted-foreground">No other users are available yet.</p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {availableMembers.map((member) => {
                            const isChecked = selectedMembers.includes(member.id);

                            return (
                              <label
                                key={member.id}
                                className="flex items-start gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(event) => {
                                    const currentMembers = form.getValues('teamMembers');
                                    if (event.target.checked) {
                                      form.setValue('teamMembers', [...currentMembers, member.id], { shouldValidate: true });
                                      return;
                                    }

                                    form.setValue(
                                      'teamMembers',
                                      currentMembers.filter((memberId) => memberId !== member.id),
                                      { shouldValidate: true }
                                    );
                                  }}
                                />
                                <span>
                                  <span className="block font-medium text-foreground">{member.name}</span>
                                  <span className="text-muted-foreground">{member.email}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                  Close
                </Button>
                <Button type="submit" disabled={createProjectMutation.isPending}>
                  {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectNew;