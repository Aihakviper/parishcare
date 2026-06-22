from pydantic import BaseModel, ConfigDict, Field, model_validator


class ParishCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=200)
    region: str = Field(min_length=2, max_length=120)
    address: str | None = Field(default=None, max_length=1000)
    contact_name: str = Field(min_length=2, max_length=200)
    contact_phone: str = Field(min_length=8, max_length=20)


class ParishUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=2, max_length=200)
    region: str | None = Field(default=None, min_length=2, max_length=120)
    address: str | None = Field(default=None, max_length=1000)
    contact_name: str | None = Field(default=None, min_length=2, max_length=200)
    contact_phone: str | None = Field(default=None, min_length=8, max_length=20)

    @model_validator(mode="after")
    def require_change(self) -> "ParishUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one field must be supplied")
        non_nullable_fields = {"name", "region", "contact_name", "contact_phone"}
        if any(
            field in self.model_fields_set and getattr(self, field) is None
            for field in non_nullable_fields
        ):
            raise ValueError("Required parish fields cannot be null")
        return self
