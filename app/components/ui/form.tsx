"use client"

import * as React from "react"
import { Controller, FormProvider, useFormContext, type ControllerProps, type FieldPath, type FieldValues } from "react-hook-form"

import { cn } from "@/lib/utils"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(undefined)
const FormItemContext = React.createContext<{ id: string } | undefined>(undefined)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  if (!fieldContext) {
    throw new Error("useFormField must be used within <FormField>")
  }

  const fieldState = getFieldState(fieldContext.name, formState)
  const id = itemContext?.id ?? fieldContext.name

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formMessageId: `${id}-form-message`,
    ...fieldState,
  }
}

const FormItem = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("space-y-2", className)}>{children}</div>
    </FormItemContext.Provider>
  )
}

const FormLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { error, formItemId } = useFormField()

  return (
    <label htmlFor={formItemId} className={cn("text-sm font-medium", error && "text-red-500", className)}>
      {children}
    </label>
  )
}

const FormControl = ({ children }: { children: React.ReactNode }) => {
  const { error, formItemId, formMessageId } = useFormField()

  if (!React.isValidElement(children)) {
    return <>{children}</>
  }

  const child = children as React.ReactElement<Record<string, unknown>>

  return React.cloneElement(child, {
    id: formItemId,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? formMessageId : undefined,
  })
}

const FormMessage = ({ children, className }: { children?: React.ReactNode; className?: string }) => {
  const { error, formMessageId } = useFormField()

  const message = error ? String(error.message ?? "") : children

  if (!message) return null

  return (
    <p id={formMessageId} className={cn("text-sm text-red-500", className)}>
      {message}
    </p>
  )
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
}