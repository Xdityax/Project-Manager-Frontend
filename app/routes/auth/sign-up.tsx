import React from 'react'
import { signUpSchema, type SignUpFormData } from "@/lib/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/provider/auth-context';
import { getPasswordStrength } from '@/lib/password-strength';
import ClientRedirect from '@/components/client-redirect';

const SignUp = () => {
  const navigate = useNavigate();
  const { isLoading, register } = useAuth();
  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", name: "" },
  });
  const isSubmitting = form.formState.isSubmitting;
  const password = form.watch('password');
  const passwordStrength = getPasswordStrength(password);


  const handleOnSubmit = async (values:  SignUpFormData) => {
    try {
      await register(values.name.trim(), values.email.trim().toLowerCase(), values.password);
      toast.success("Account created successfully.");
      form.reset();
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "An error occurred during sign-up.";
      if (errorMessage.includes('email')) {
        form.setError('email', { type: 'server', message: errorMessage });
      }
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-muted/40">Checking session...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-6">
      <Card className='max-w-md w-full'>
        <CardHeader>
          <CardTitle className='text-2xl font-bold text-center' >Create an account</CardTitle>
          <CardDescription className='text-muted-foreground text-center'>Create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}
          className='space-y-6'>
            <FormField 
              control={form.control}
              name='email'
              render={({field}: {field: any})=>(
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type='email' placeholder='Enter your email' {...field}/>
                  </FormControl>
                  <FormMessage/>  
                </FormItem>
              )}
            />
            <FormField 
              control={form.control}
              name='name'
              render={({field}: {field: any})=>(
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input type='text' placeholder='Enter your name' {...field}/>
                  </FormControl>
                  <FormMessage/>  
                </FormItem>
              )}
            />
            <FormField 
              control={form.control}
              name='password'
              render={({field}: {field: any})=>(
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder='Enter your password' {...field}/>
                  </FormControl>
                  <div className='space-y-2 text-sm'>
                    <div className='flex items-center justify-between text-muted-foreground'>
                      <span>Password strength</span>
                      <span className='font-medium text-foreground'>{passwordStrength.label}</span>
                    </div>
                    <div className='grid grid-cols-3 gap-2'>
                      <span className={`h-2 rounded-full ${passwordStrength.score >= 1 ? 'bg-red-500' : 'bg-muted'}`} />
                      <span className={`h-2 rounded-full ${passwordStrength.score >= 3 ? 'bg-amber-500' : 'bg-muted'}`} />
                      <span className={`h-2 rounded-full ${passwordStrength.score >= 4 ? 'bg-emerald-500' : 'bg-muted'}`} />
                    </div>
                    <p className='text-muted-foreground'>Use letters, numbers, symbols, and mixed upper/lowercase for a harder password.</p>
                  </div>
                  <FormMessage/>  
                </FormItem>
              )}
            />
            <FormField 
              control={form.control}
              name='confirmPassword'
              render={({field}: {field: any})=>(
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput toggleLabel='Show confirm password' placeholder='Confirm your password' {...field}/>
                  </FormControl>
                  <FormMessage/>  
                </FormItem>
              )}
            />
            <Button type='submit' className='w-full bg-blue-500 text-white ' disabled = {isSubmitting}>
              {isSubmitting ? "Signing Up..." : "Sign Up"}
            </Button>
          </form>
          <CardFooter className='flex items-center justify-center mt-4'>
            <div className='text-sm text-muted-foreground'>
              Already have an account?
              <Link to="/sign-in" className='text-blue-500 hover:underline ml-1'>Sign In</Link>
            </div>
          </CardFooter>
          </Form>
        </CardContent>

      </Card>
    </div>
  )
}

export default SignUp;
