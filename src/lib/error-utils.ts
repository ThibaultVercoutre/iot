import { ZodError } from 'zod';

/**
 * Interface standard pour les erreurs de l'application
 */
export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  status?: number;
  timestamp: Date;
}

// Interface pour les erreurs HTTP/Axios-like
interface HttpErrorLike {
  isAxiosError?: boolean;
  response?: {
    status?: number;
    data?: unknown;
  };
  config?: {
    url?: string;
    method?: string;
  };
  message?: string;
}

// Interface pour les erreurs Prisma
interface PrismaErrorLike {
  code: string;
  clientVersion: string;
  meta?: Record<string, unknown>;
  message?: string;
}

/**
 * Enumération des codes d'erreur
 */
export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  INPUT = 'INPUT'
}

/**
 * Fonction de journalisation centralisée des erreurs
 */
export function logError(error: unknown, context?: string): AppError {
  const appError = formatError(error);
  
  // En production, on pourrait envoyer l'erreur à un service comme Sentry
  // ou écrire dans un système de logs plus sophistiqué
  console.error(
    `[ERROR] ${context ? `[${context}] ` : ''}${appError.code}: ${appError.message}`,
    appError.details || ''
  );
  
  return appError;
}

/**
 * Formate une erreur en AppError
 */
export function formatError(error: unknown): AppError {
  // Si l'erreur est déjà au format AppError
  if (isAppError(error)) {
    return error;
  }

  // Erreur de validation Zod
  if (error instanceof ZodError) {
    return {
      code: ErrorCode.VALIDATION,
      message: 'Validation error',
      details: error.errors,
      status: 400,
      timestamp: new Date()
    };
  }

  // Erreur HTTP (comme Axios)
  if (isHttpError(error)) {
    const status = error.response?.status || 500;
    
    return {
      code: getErrorCodeFromStatus(status),
      message: error.message || 'HTTP request failed',
      details: {
        url: error.config?.url,
        method: error.config?.method,
        status,
        data: error.response?.data
      },
      status,
      timestamp: new Date()
    };
  }

  // Si nous sommes côté serveur, vérifier les erreurs Prisma
  if (typeof window === 'undefined') {
    try {
      // On ne peut pas utiliser instanceof avec une importation dynamique
      // mais on peut vérifier les propriétés caractéristiques
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        'clientVersion' in error &&
        typeof (error as PrismaErrorLike).code === 'string' &&
        (error as PrismaErrorLike).code.startsWith('P')
      ) {
        const prismaError = error as PrismaErrorLike;
        return {
          code: ErrorCode.DATABASE,
          message: `Database error: ${prismaError.message || 'Unknown database error'}`,
          details: {
            code: prismaError.code,
            meta: prismaError.meta,
            clientVersion: prismaError.clientVersion
          },
          status: 500,
          timestamp: new Date()
        };
      }
    } catch {
      // Ignorez l'erreur d'importation si nous sommes sur le client
    }
  }

  // Erreur JavaScript standard
  const jsError = error instanceof Error ? error : new Error(String(error));
  
  return {
    code: ErrorCode.UNKNOWN,
    message: jsError.message || 'An unknown error occurred',
    details: {
      name: jsError.name,
      stack: jsError.stack
    },
    status: 500,
    timestamp: new Date()
  };
}

/**
 * Vérifie si un objet est une AppError
 */
function isAppError(error: unknown): error is AppError {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'timestamp' in error
  );
}

/**
 * Vérifie si un objet est une erreur HTTP (comme Axios)
 */
function isHttpError(error: unknown): error is HttpErrorLike {
  return Boolean(
    error &&
    typeof error === 'object' &&
    (
      ('isAxiosError' in error && (error as HttpErrorLike).isAxiosError) ||
      ('response' in error && typeof (error as HttpErrorLike).response === 'object')
    )
  );
}

/**
 * Obtient le code d'erreur à partir du statut HTTP
 */
function getErrorCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.VALIDATION;
    case 401:
      return ErrorCode.AUTHENTICATION;
    case 403:
      return ErrorCode.AUTHORIZATION;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 409:
      return ErrorCode.CONFLICT;
    default:
      return ErrorCode.UNKNOWN;
  }
}

/**
 * Hook pour gérer les erreurs de manière uniforme côté client
 */
export function useErrorHandler() {
  return (error: unknown, context?: string) => {
    const appError = logError(error, context);
    // Ici, on pourrait également afficher une notification à l'utilisateur
    // ou effectuer d'autres actions spécifiques au client
    return appError;
  };
}

/**
 * Gère les erreurs dans les routes API de Next.js
 */
export function handleApiError(error: unknown, context?: string) {
  const appError = logError(error, context);
  
  return {
    status: appError.status || 500,
    body: {
      error: {
        code: appError.code,
        message: appError.message,
        timestamp: appError.timestamp
      }
    }
  };
} 