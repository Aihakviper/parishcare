from enum import Enum
from typing import TypeVar

from sqlalchemy import Enum as SQLAlchemyEnum

EnumType = TypeVar("EnumType", bound=Enum)


def database_enum(enum_class: type[EnumType], name: str) -> SQLAlchemyEnum:
    return SQLAlchemyEnum(
        enum_class,
        name=name,
        values_callable=lambda members: [member.value for member in members],
        validate_strings=True,
    )
