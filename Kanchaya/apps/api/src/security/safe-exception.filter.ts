import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

const SAFE_ERRORS: Record<number, { code: string; message: string }> = {
  400: { code: 'BAD_REQUEST', message: 'La solicitud no es válida.' },
  401: { code: 'UNAUTHORIZED', message: 'Las credenciales o la sesión no son válidas.' },
  403: { code: 'FORBIDDEN', message: 'No tienes permiso para realizar esta acción.' },
  404: { code: 'NOT_FOUND', message: 'No se encontró el recurso solicitado.' },
  409: { code: 'CONFLICT', message: 'La solicitud entra en conflicto con el estado actual.' },
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'La solicitud es demasiado grande.' },
  422: { code: 'VALIDATION_ERROR', message: 'Los datos enviados no son válidos.' },
  429: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
};

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SafeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const requestId = randomUUID();
    const safeError = status < 500
      ? SAFE_ERRORS[status] ?? { code: 'REQUEST_REJECTED', message: 'No se pudo procesar la solicitud.' }
      : { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno. Inténtalo más tarde.' };

    if (status >= 500) {
      const exceptionType = exception instanceof Error ? exception.constructor.name : 'UnknownError';
      this.logger.error(JSON.stringify({ requestId, status, exceptionType }));
    }

    response.status(status).json({
      statusCode: status,
      message: safeError.message,
      error: safeError.code,
      requestId,
    });
  }
}
