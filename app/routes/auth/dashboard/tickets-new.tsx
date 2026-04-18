import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getData, postFormData } from '@/lib/fetch-util';
import { useAuth } from '@/provider/auth-context';
import type { Project, Ticket, User } from '@/types';
import { toast } from 'sonner';

const allowedFileTypes = new Set([
  'application/msword',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);

const ticketFormSchema = z.object({
  projectId: z.string().min(1, 'Please select a project.'),
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  description: z.string().min(10, 'Description must be at least 10 characters long.'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  assignee: z.string().min(1, 'Please select an assignee.'),
});

type TicketFormData = z.infer<typeof ticketFormSchema>;

const mapUserId = (user: User) => user.id ?? user._id ?? '';

const TicketNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getData<Project[]>('/projects'),
  });

  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getData<User[]>('/auth/users'),
  });

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      projectId: searchParams.get('projectId') ?? '',
      title: '',
      description: '',
      priority: 'Medium',
      assignee: user?.id ?? '',
    },
  });

  useEffect(() => {
    const requestedProjectId = searchParams.get('projectId');
    if (requestedProjectId) {
      form.setValue('projectId', requestedProjectId);
    }
  }, [form, searchParams]);

  useEffect(() => {
    if (!form.getValues('projectId') && projects[0]) {
      form.setValue('projectId', projects[0]._id);
    }
  }, [form, projects]);

  const assigneeOptions = useMemo(() => {
    const uniqueUsers = new Map<string, User>();

    for (const candidate of users) {
      const candidateId = mapUserId(candidate);
      if (candidateId) {
        uniqueUsers.set(candidateId, candidate);
      }
    }

    return Array.from(uniqueUsers.values());
  }, [users]);

  useEffect(() => {
    const currentAssignee = form.getValues('assignee');
    if (!currentAssignee && assigneeOptions[0]) {
      form.setValue('assignee', mapUserId(assigneeOptions[0]));
      return;
    }

    if (
      currentAssignee
      && !assigneeOptions.some((candidate) => mapUserId(candidate) === currentAssignee)
      && assigneeOptions[0]
    ) {
      form.setValue('assignee', mapUserId(assigneeOptions[0]));
    }
  }, [assigneeOptions, form]);

  const createTicketMutation = useMutation({
    mutationFn: async (values: TicketFormData) => {
      const payload = new FormData();
      payload.append('project', values.projectId);
      payload.append('title', values.title);
      payload.append('description', values.description);
      payload.append('priority', values.priority);
      payload.append('assignee', values.assignee);

      for (const file of selectedFiles) {
        payload.append('attachments', file);
      }

      return postFormData<Ticket>('/tickets', payload);
    },
    onSuccess: () => {
      toast.success('Ticket created successfully.');
      navigate('/dashboard', { replace: true });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Unable to create the ticket.';
      toast.error(errorMessage);
    },
  });

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length > 5) {
      setFileError('You can upload up to 5 files at a time.');
      return;
    }

    const invalidFile = files.find((file) => !allowedFileTypes.has(file.type));
    if (invalidFile) {
      setFileError('Only .doc, .docx, .pdf, .jpg, .png, .xls, and .xlsx files are allowed.');
      return;
    }

    const oversizedFile = files.find((file) => file.size > 5 * 1024 * 1024);
    if (oversizedFile) {
      setFileError('Each file must be 5MB or smaller.');
      return;
    }

    setFileError(null);
    setSelectedFiles(files);
  };

  const handleSubmit = (values: TicketFormData) => {
    createTicketMutation.mutate(values);
  };

  if (isProjectsLoading || isUsersLoading) {
    return <div>Loading ticket form...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Raise Ticket</CardTitle>
          <CardDescription>
            Raising ticket as {user?.name ?? 'current user'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!projects.length ? (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>Create a project first before adding tickets.</p>
              <Button onClick={() => navigate('/dashboard/projects/new?redirectTo=ticket')}>
                Create Project
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <FormControl>
                        <select className="h-10 w-full rounded-lg border border-input bg-transparent px-3" {...field}>
                          {projects.map((project) => (
                            <option key={project._id} value={project._id}>
                              {project.title}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the ticket title" {...field} />
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
                        <Textarea placeholder="Describe the issue in detail" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <select className="h-10 w-full rounded-lg border border-input bg-transparent px-3" {...field}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="ticket-attachments">
                    Issue Files
                  </label>
                  <Input
                    id="ticket-attachments"
                    type="file"
                    accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.xls,.xlsx"
                    multiple
                    onChange={handleFilesChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload up to 5 files. Supported formats: .doc, .docx, .pdf, .jpg, .png, .xls, .xlsx. Max 5MB each.
                  </p>
                  {fileError ? <p className="text-sm text-red-500">{fileError}</p> : null}
                  {selectedFiles.length > 0 ? (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {selectedFiles.map((file) => (
                        <li key={`${file.name}-${file.size}`}>{file.name}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <FormField
                  control={form.control}
                  name="assignee"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <FormControl>
                        <select
                          className="h-10 w-full rounded-lg border border-input bg-transparent px-3"
                          disabled={!assigneeOptions.length}
                          {...field}
                        >
                          {!assigneeOptions.length ? <option value="">No users available</option> : null}
                          {assigneeOptions.map((candidate) => {
                            const candidateId = mapUserId(candidate);
                            const isSelf = candidateId === user?.id;

                            return (
                              <option key={candidateId} value={candidateId}>
                                {candidate.name}{isSelf ? ' (You)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </FormControl>
                      <p className="text-sm text-muted-foreground">Any user in the workspace can be assigned to this ticket.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                    Close
                  </Button>
                  <Button type="submit" disabled={createTicketMutation.isPending}>
                    {createTicketMutation.isPending ? 'Raising...' : 'Raise Ticket'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketNew;