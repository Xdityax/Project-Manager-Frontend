import React, { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { deleteData, getData, postData, putData } from '@/lib/fetch-util';
import { useAuth } from '@/provider/auth-context';
import type { Project, Ticket, TicketComment } from '@/types';
import { toast } from 'sonner';

const ticketStatuses = ['To Do', 'In Progress', 'Done'] as const;
const ticketPriorities = ['Low', 'Medium', 'High', 'Urgent'] as const;
type TicketStatus = (typeof ticketStatuses)[number];

const ticketStatusStyles: Record<TicketStatus, string> = {
  'To Do': 'border-slate-200 bg-slate-50',
  'In Progress': 'border-amber-200 bg-amber-50',
  'Done': 'border-emerald-200 bg-emerald-50',
};

const priorityStyles: Record<NonNullable<Ticket['priority']>, string> = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Urgent: 'bg-red-100 text-red-700',
};

type TicketUpdatePayload = {
  title?: string;
  description?: string;
  assignee?: string;
  status?: TicketStatus;
};

type TicketEditorState = {
  title: string;
  description: string;
  assignee: string;
  status: TicketStatus;
};

interface ProjectKanbanBoardProps {
  projectId: string;
}

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api-v1';

const resolveAttachmentUrl = (attachmentUrl: string) => {
  if (!attachmentUrl) {
    return '#';
  }

  if (/^https?:\/\//i.test(attachmentUrl)) {
    return attachmentUrl;
  }

  const backendOrigin = apiBaseUrl.replace(/\/api-v1\/?$/, '');
  return new URL(attachmentUrl, `${backendOrigin}/`).toString();
};

const formatAttachmentSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const ProjectKanbanBoard = ({ projectId }: ProjectKanbanBoardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeDropStatus, setActiveDropStatus] = useState<TicketStatus | null>(null);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [ticketEditor, setTicketEditor] = useState<TicketEditorState | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | NonNullable<Ticket['priority']>>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getData<Project[]>('/projects'),
  });

  const { data: tickets = [], isLoading: isTicketsLoading } = useQuery({
    queryKey: ['tickets', 'project', projectId],
    queryFn: () => getData<Ticket[]>(`/tickets/project/${projectId}`),
    enabled: Boolean(projectId),
  });

  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['ticket-comments', projectId],
    queryFn: () => getData<TicketComment[]>(`/tickets/project/${projectId}/comments`),
    enabled: Boolean(projectId),
  });

  const project = projects.find((entry) => entry._id === projectId);
  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());
  const getUserId = (value?: { id?: string; _id?: string } | null) => value?.id ?? value?._id ?? '';

  const assigneeOptions = useMemo(() => {
    if (!project) {
      return [];
    }

    const uniqueMembers = new Map<string, Project['owner']>();
    const candidates = [project.owner, ...(project.teamMembers ?? [])];

    for (const member of candidates) {
      const memberId = member.id ?? member._id;
      if (memberId) {
        uniqueMembers.set(memberId, member);
      }
    }

    return Array.from(uniqueMembers.values());
  }, [project]);

  const commentsByTicketId = useMemo(() => {
    return comments.reduce<Record<string, TicketComment[]>>((accumulator, comment) => {
      if (!accumulator[comment.ticketId]) {
        accumulator[comment.ticketId] = [];
      }

      accumulator[comment.ticketId].push(comment);
      return accumulator;
    }, {});
  }, [comments]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const ticketStatusValue = ticket.status ?? 'To Do';
      const ticketPriorityValue = ticket.priority ?? 'Medium';
      const ticketAssigneeId = getUserId(ticket.assignee);

      if (statusFilter !== 'all' && ticketStatusValue !== statusFilter) {
        return false;
      }

      if (priorityFilter !== 'all' && ticketPriorityValue !== priorityFilter) {
        return false;
      }

      if (assigneeFilter !== 'all' && ticketAssigneeId !== assigneeFilter) {
        return false;
      }

      if (!deferredSearchTerm) {
        return true;
      }

      const searchableText = [
        ticket.title,
        ticket.description,
        ticket.assignee?.name,
        ...(ticket.attachments ?? []).map((attachment) => attachment.originalName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(deferredSearchTerm);
    });
  }, [assigneeFilter, deferredSearchTerm, priorityFilter, statusFilter, tickets]);

  const updateTicketMutation = useMutation({
    mutationFn: async ({
      ticketId,
      payload,
    }: {
      ticketId: string;
      payload: TicketUpdatePayload;
    }) => {
      return putData<Ticket, TicketUpdatePayload>(`/tickets/${ticketId}`, payload);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Unable to update the ticket.';
      toast.error(message);
    },
    onSuccess: (_ticket, variables) => {
      const isCompletionUpdate = variables.payload.status === 'Done';
      toast.success(isCompletionUpdate ? 'Ticket marked as complete.' : 'Ticket updated successfully.');
      if (editingTicketId === variables.ticketId) {
        setEditingTicketId(null);
        setTicketEditor(null);
      }
    },
    onSettled: () => {
      setActiveDropStatus(null);
      void queryClient.invalidateQueries({ queryKey: ['tickets', 'project', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['ticket-notifications'] });
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      return deleteData<{ message: string }>(`/tickets/${ticketId}`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Unable to delete the ticket.';
      toast.error(message);
    },
    onSuccess: () => {
      toast.success('Ticket deleted successfully.');
      setEditingTicketId(null);
      setTicketEditor(null);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets', 'project', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['ticket-notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['ticket-comments', projectId] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ ticketId, text }: { ticketId: string; text: string }) => {
      return postData<TicketComment, { text: string }>(`/tickets/${ticketId}/comments`, { text });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Unable to add the comment.';
      toast.error(message);
    },
    onSuccess: (_comment, variables) => {
      toast.success('Comment added.');
      setCommentDrafts((current) => ({
        ...current,
        [variables.ticketId]: '',
      }));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['ticket-comments', projectId] });
    },
  });

  const ticketsByStatus = useMemo(() => {
    return ticketStatuses.reduce<Record<TicketStatus, Ticket[]>>((columns, status) => {
      columns[status] = filteredTickets.filter((ticket) => (ticket.status ?? 'To Do') === status);
      return columns;
    }, {
      'To Do': [],
      'In Progress': [],
      'Done': [],
    });
  }, [filteredTickets]);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, ticketId: string) => {
    if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select, option')) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', ticketId);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, status: TicketStatus) => {
    event.preventDefault();
    const ticketId = event.dataTransfer.getData('text/plain');
    const ticket = tickets.find((item) => item._id === ticketId);

    setActiveDropStatus(null);

    if (!ticket || (ticket.status ?? 'To Do') === status) {
      return;
    }

    updateTicketMutation.mutate({ ticketId, payload: { status } });
  };

  const openTicketEditor = (ticket: Ticket) => {
    setEditingTicketId(ticket._id);
    setTicketEditor({
      title: ticket.title,
      description: ticket.description ?? '',
      assignee: getUserId(ticket.assignee),
      status: ticket.status ?? 'To Do',
    });
  };

  const closeTicketEditor = () => {
    setEditingTicketId(null);
    setTicketEditor(null);
  };

  const handleTicketEditorChange = (field: keyof TicketEditorState, value: string) => {
    setTicketEditor((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });
  };

  const handleTicketSave = (ticketId: string) => {
    if (!ticketEditor) {
      return;
    }

    updateTicketMutation.mutate({
      ticketId,
      payload: {
        title: ticketEditor.title.trim(),
        description: ticketEditor.description.trim(),
        assignee: ticketEditor.assignee,
        status: ticketEditor.status,
      },
    });
  };

  const handleMarkComplete = (ticketId: string) => {
    updateTicketMutation.mutate({
      ticketId,
      payload: { status: 'Done' },
    });
  };

  const handleTicketDelete = (ticketId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this ticket? This action cannot be undone.')) {
      return;
    }

    deleteTicketMutation.mutate(ticketId);
  };

  const handleCommentDraftChange = (ticketId: string, value: string) => {
    setCommentDrafts((current) => ({
      ...current,
      [ticketId]: value,
    }));
  };

  const handleCommentSubmit = (ticketId: string) => {
    const text = commentDrafts[ticketId]?.trim();
    if (!text) {
      return;
    }

    addCommentMutation.mutate({ ticketId, text });
  };

  const renderCommentSection = (ticket: Ticket) => {
    const ticketComments = commentsByTicketId[ticket._id] ?? [];
    const draftValue = commentDrafts[ticket._id] ?? '';

    return (
      <div className="space-y-3 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-foreground">Comments</p>
          <span className="text-xs text-muted-foreground">
            {isCommentsLoading ? 'Loading...' : `${ticketComments.length} comment${ticketComments.length === 1 ? '' : 's'}`}
          </span>
        </div>

        <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
          {!ticketComments.length ? (
            <p className="text-xs text-muted-foreground">No comments yet.</p>
          ) : null}
          {ticketComments.map((comment) => (
            <div key={comment._id} className="rounded-lg border border-border bg-background/80 p-3">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{comment.userId?.name ?? 'Unknown user'}</span>
                <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{comment.text}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Textarea
            value={draftValue}
            onChange={(event) => handleCommentDraftChange(ticket._id, event.target.value)}
            placeholder="Write a comment for this ticket"
            className="min-h-20"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => handleCommentSubmit(ticket._id)}
              disabled={addCommentMutation.isPending || !draftValue.trim()}
            >
              {addCommentMutation.isPending ? 'Posting...' : 'Add Comment'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (isProjectsLoading || isTicketsLoading) {
    return <div>Loading kanban board...</div>;
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Project not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{project.title} Kanban Board</h1>
        <p className="text-sm text-muted-foreground">
          Drag tickets between To Do, In Progress, and Done for this project.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground" htmlFor="kanban-search">
                Search tickets
              </label>
              <Input
                id="kanban-search"
                placeholder="Search by title, description, assignee, or file name"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground" htmlFor="kanban-status-filter">
                Status
              </label>
              <select
                id="kanban-status-filter"
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | TicketStatus)}
              >
                <option value="all">All statuses</option>
                {ticketStatuses.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground" htmlFor="kanban-priority-filter">
                Priority
              </label>
              <select
                id="kanban-priority-filter"
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as 'all' | NonNullable<Ticket['priority']>)}
              >
                <option value="all">All priorities</option>
                {ticketPriorities.map((priorityOption) => (
                  <option key={priorityOption} value={priorityOption}>
                    {priorityOption}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground" htmlFor="kanban-assignee-filter">
                Assignee
              </label>
              <select
                id="kanban-assignee-filter"
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value)}
              >
                <option value="all">All assignees</option>
                {assigneeOptions.map((member) => {
                  const memberId = getUserId(member);

                  return (
                    <option key={memberId} value={memberId}>
                      {member.name}{memberId === user?.id ? ' (You)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Showing {filteredTickets.length} of {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setAssigneeFilter('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {!tickets.length ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No tickets found for this project yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {ticketStatuses.map((status) => (
            <div
              key={status}
              className={`rounded-2xl border p-4 transition-colors ${ticketStatusStyles[status]} ${activeDropStatus === status ? 'ring-2 ring-primary/40' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setActiveDropStatus(status);
              }}
              onDragLeave={() => {
                if (activeDropStatus === status) {
                  setActiveDropStatus(null);
                }
              }}
              onDrop={(event) => handleDrop(event, status)}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{status}</h3>
                  <p className="text-sm text-muted-foreground">{ticketsByStatus[status].length} ticket{ticketsByStatus[status].length === 1 ? '' : 's'}</p>
                </div>
              </div>

              <div className="min-h-40 space-y-3">
                {!ticketsByStatus[status].length ? (
                  <div className="rounded-xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                    {filteredTickets.length ? 'No tickets match this column.' : 'No tickets match the current filters.'}
                  </div>
                ) : null}

                {ticketsByStatus[status].map((ticket) => {
                  const priority = ticket.priority ?? 'Medium';
                  const assigneeId = getUserId(ticket.assignee);
                  const currentUserId = user?.id ?? '';
                  const canManageTicket = Boolean(currentUserId && assigneeId === currentUserId);
                  const isEditing = editingTicketId === ticket._id && ticketEditor;

                  return (
                    <Card
                      key={ticket._id}
                      className="cursor-grab active:cursor-grabbing"
                      draggable={!isEditing}
                      onDragStart={(event) => handleDragStart(event, ticket._id)}
                    >
                      <CardHeader className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">{ticket.title}</CardTitle>
                            <CardDescription>{ticket.assignee?.name ?? 'Unassigned'}</CardDescription>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${priorityStyles[priority]}`}>
                            {priority}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {isEditing ? (
                          <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/40 p-3">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-foreground" htmlFor={`ticket-title-${ticket._id}`}>
                                Title
                              </label>
                              <Input
                                id={`ticket-title-${ticket._id}`}
                                value={ticketEditor.title}
                                onChange={(event) => handleTicketEditorChange('title', event.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-medium text-foreground" htmlFor={`ticket-description-${ticket._id}`}>
                                Description
                              </label>
                              <Textarea
                                id={`ticket-description-${ticket._id}`}
                                value={ticketEditor.description}
                                onChange={(event) => handleTicketEditorChange('description', event.target.value)}
                              />
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-foreground" htmlFor={`ticket-assignee-${ticket._id}`}>
                                  Assignee
                                </label>
                                <select
                                  id={`ticket-assignee-${ticket._id}`}
                                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                  value={ticketEditor.assignee}
                                  onChange={(event) => handleTicketEditorChange('assignee', event.target.value)}
                                >
                                  {assigneeOptions.map((member) => {
                                    const memberId = getUserId(member);
                                    return (
                                      <option key={memberId} value={memberId}>
                                        {member.name}{memberId === currentUserId ? ' (You)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-medium text-foreground" htmlFor={`ticket-status-${ticket._id}`}>
                                  Status
                                </label>
                                <select
                                  id={`ticket-status-${ticket._id}`}
                                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                                  value={ticketEditor.status}
                                  onChange={(event) => handleTicketEditorChange('status', event.target.value as TicketStatus)}
                                >
                                  {ticketStatuses.map((statusOption) => (
                                    <option key={statusOption} value={statusOption}>
                                      {statusOption}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleTicketSave(ticket._id)}
                                disabled={updateTicketMutation.isPending || deleteTicketMutation.isPending || !ticketEditor.title.trim()}
                              >
                                {updateTicketMutation.isPending ? 'Saving...' : 'Save Changes'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleTicketDelete(ticket._id)}
                                disabled={updateTicketMutation.isPending || deleteTicketMutation.isPending}
                              >
                                {deleteTicketMutation.isPending ? 'Deleting...' : 'Delete Ticket'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={closeTicketEditor}
                                disabled={updateTicketMutation.isPending || deleteTicketMutation.isPending}
                              >
                                Cancel
                              </Button>
                              {ticketEditor.status !== 'Done' ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleMarkComplete(ticket._id)}
                                  disabled={updateTicketMutation.isPending || deleteTicketMutation.isPending}
                                >
                                  Mark Complete
                                </Button>
                              ) : null}
                            </div>
                            {ticket.attachments?.length ? (
                              <div className="space-y-2 border-t border-border pt-3">
                                <p className="text-xs font-medium text-foreground">Attached files</p>
                                <div className="space-y-2">
                                  {ticket.attachments.map((attachment) => (
                                    <a
                                      key={attachment.fileName}
                                      href={resolveAttachmentUrl(attachment.url)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
                                    >
                                      <span className="truncate pr-3 text-foreground">{attachment.originalName}</span>
                                      <span>{formatAttachmentSize(attachment.size)}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {renderCommentSection(ticket)}
                          </div>
                        ) : (
                          <>
                            <p className="line-clamp-3 text-sm text-muted-foreground">
                              {ticket.description || 'No description provided.'}
                            </p>
                            {ticket.attachments?.length ? (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-foreground">Attached files</p>
                                <div className="space-y-2">
                                  {ticket.attachments.map((attachment) => (
                                    <a
                                      key={attachment.fileName}
                                      href={resolveAttachmentUrl(attachment.url)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-between rounded-lg border border-border bg-background/80 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
                                    >
                                      <span className="truncate pr-3 text-foreground">{attachment.originalName}</span>
                                      <span>{formatAttachmentSize(attachment.size)}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {renderCommentSection(ticket)}
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full bg-muted px-2 py-1">Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                              <span className="rounded-full bg-muted px-2 py-1">Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                              {ticket.completedAt ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                                  Resolved: {new Date(ticket.completedAt).toLocaleDateString()}
                                </span>
                              ) : null}
                            </div>
                            {canManageTicket ? (
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => openTicketEditor(ticket)}>
                                  Open Ticket
                                </Button>
                                {(ticket.status ?? 'To Do') !== 'Done' ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleMarkComplete(ticket._id)}
                                    disabled={updateTicketMutation.isPending}
                                  >
                                    Mark Complete
                                  </Button>
                                ) : null}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Only the assignee can edit or complete this ticket from the board.
                              </p>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectKanbanBoard;