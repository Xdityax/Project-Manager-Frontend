import { useMutation } from "@tanstack/react-query";
import { postData } from "@/lib/fetch-util";
import type { SignInFormData } from "@/lib/schema";

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: (data: SignInFormData) => postData("/auth/login", data),
  });
};

