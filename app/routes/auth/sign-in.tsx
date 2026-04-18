import React from 'react';
import { signInSchema, type SignInFormData } from "@/lib/schema";
import { useForm} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from "sonner";
import { useAuth } from '@/provider/auth-context';
import ClientRedirect from '@/components/client-redirect';

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading, login } = useAuth();
  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  const handleOnSubmit = async (data: SignInFormData) => {
    try {
      await login(data.email.trim().toLowerCase(), data.password);
      toast.success("Login successful");

      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/dashboard";
      navigate(destination, { replace: true });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "An error occurred during login.";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-muted/40">Checking session...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <Card className='max-w-md w-full'>
        <CardHeader>
          <CardTitle className='text-2xl font-bold text-center'>Welcome Back</CardTitle>
          <CardDescription className='text-muted-foreground flex items-center justify-center'>Please sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleOnSubmit)} className='space-y-6'>
              <FormField 
                control={form.control}
                name='email'
                render={({field }: {field: any}) => {
                  return (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type='email' placeholder='Enter your email' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              < FormField 
                control={form.control}
                name="password"
                render={({ field }: {field: any}) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />                           
                                                                 
              <Button type='submit' className='w-full' disabled={isSubmitting}>
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>
            </form>
            <CardFooter className='flex items-center justify-center mt-4'>
              <p className='text-sm text-muted-foreground'>
                Don't have an account? 
                <Link to="/sign-up" className='text-blue-500 hover:underline ml-1'>Sign Up</Link>
              </p>
            </CardFooter>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
