import { useMutation } from "@tanstack/react-query";
import { postData } from "@/lib/fetch-util";
import type { SignUpFormData } from "@/lib/schema";

export const useSignUpMutation = () => {
    return useMutation({
        mutationFn: ({ confirmPassword, ...data }: SignUpFormData) => postData("/auth/register", data),
    });
};