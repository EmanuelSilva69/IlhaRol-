"""Respostas de erro padronizadas.

Todas as respostas de erro seguem o formato ``{"detail": "<mensagem>"}``;
erros de validação acrescentam ``errors`` com os campos inválidos.
Stack traces nunca são enviados ao cliente.
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("ilharole.errors")

DEFAULT_MESSAGES = {
    400: "Requisição inválida",
    401: "Não autenticado",
    403: "Acesso negado",
    404: "Recurso não encontrado",
    405: "Método não permitido",
    409: "Conflito com o estado atual do recurso",
    422: "Dados inválidos",
    500: "Erro interno do servidor",
}


def error_response(
    status_code: int, detail: str | None = None, headers: dict[str, str] | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"detail": detail or DEFAULT_MESSAGES.get(status_code, "Erro")},
        headers=headers,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else None
    return error_response(exc.status_code, detail, getattr(exc, "headers", None))


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [
        {
            "campo": ".".join(str(p) for p in err.get("loc", ()) if p != "body"),
            "mensagem": err.get("msg", ""),
        }
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": DEFAULT_MESSAGES[422], "errors": errors},
    )


async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.warning("Violação de integridade: %s", exc.orig)
    return error_response(status.HTTP_409_CONFLICT)


async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Erro não tratado em %s %s", request.method, request.url.path)
    return error_response(status.HTTP_500_INTERNAL_SERVER_ERROR)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
