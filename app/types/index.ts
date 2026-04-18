export interface User {
  _id?: string;
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  profilePicture?: string;
  lastLogin?: string | null;
}

export interface Project {
  _id: string;
  title: string;
  description?: string;
  owner: User;
  teamMembers: User[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketAttachment {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface Ticket {
  _id: string;
  title: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  status?: 'To Do' | 'In Progress' | 'Done';
  completedAt?: string | null;
  assignee?: User;
  project: Project;
  attachments: TicketAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  _id: string;
  ticketId: string;
  userId: User;
  text: string;
  createdAt: string;
  updatedAt?: string;
}
