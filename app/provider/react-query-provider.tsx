import { QueryClient , QueryClientProvider} from "@tanstack/react-query";
import React from "react";
import { Toaster } from "sonner";
export const queryClient = new QueryClient();

const ReactQueryProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
        {children}
        <Toaster  position = "bottom-right"/>
    </QueryClientProvider>
  );
};

export default ReactQueryProvider;