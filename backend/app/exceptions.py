"""Erros de domínio lançados pelos serviços.

Cada classe carrega o status HTTP correspondente; o tratador registrado em
``errors.py`` converte para a resposta padronizada ``{"detail": ...}``.
"""


class AppError(Exception):
    status_code = 400

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class BusinessRuleError(AppError):
    status_code = 400


class AuthenticationError(AppError):
    status_code = 401


class PermissionDeniedError(AppError):
    status_code = 403


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class InvalidInputError(AppError):
    status_code = 422
