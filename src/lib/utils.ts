import { supabase } from '../supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
  }
}

export async function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  
  let errorMessage = 'Unknown error';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    // PostgrestError has message, details, hint, code
    const e = error as any;
    errorMessage = e.message || e.details || e.hint || e.code || JSON.stringify(error, Object.getOwnPropertyNames(error));
  } else {
    errorMessage = String(error);
  }

  const errInfo: SupabaseErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: user?.id,
      email: user?.email,
    },
    operationType,
    path
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
