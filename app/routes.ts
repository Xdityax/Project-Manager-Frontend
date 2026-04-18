import { type RouteConfig, index, layout, route,} from "@react-router/dev/routes";

export default [
  index("routes/root/home.tsx"),
  route("sign-in", "routes/auth/sign-in.tsx"),
  route("sign-up", "routes/auth/sign-up.tsx"),
  layout("routes/auth/auth-layout.tsx", [
    route("dashboard", "routes/auth/dashboard/layout.tsx", [
      index("routes/dashboard/projects.tsx"),
      route("projects/new", "routes/auth/dashboard/project-new.tsx"),
      route("projects/:projectId/kanban", "routes/auth/dashboard/project-kanban.tsx"),
      route("tickets/new", "routes/auth/dashboard/tickets-new.tsx"),
    ])
  ])
] satisfies RouteConfig;
