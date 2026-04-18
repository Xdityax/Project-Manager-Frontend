import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

type PasswordInputProps = React.ComponentProps<typeof Input> & {
  toggleLabel?: string;
};

const PasswordInput = ({ className, toggleLabel = 'Show password', id, ...props }: PasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        {...props}
        className={`${className ?? ''} pr-12`}
        type={isVisible ? 'text' : 'password'}
      />
      <button
        type="button"
        aria-label={isVisible ? 'Hide password' : toggleLabel}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setIsVisible((current) => !current)}
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

export { PasswordInput };