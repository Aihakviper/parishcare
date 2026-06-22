import asyncio
import sys

from pydantic import ValidationError

from app.core.bootstrap_config import BootstrapSettings
from app.db.session import AsyncSessionLocal
from app.services.bootstrap import BootstrapService
from app.services.errors import ResourceConflictError, ServiceValidationError


async def run_bootstrap() -> int:
    try:
        bootstrap = BootstrapSettings()
    except ValidationError as exc:
        print(
            "Bootstrap environment configuration is invalid:",
            file=sys.stderr,
        )
        for error in exc.errors():
            location = ".".join(str(part) for part in error["loc"])
            print(f"- {location}: {error['msg']}", file=sys.stderr)
        return 2

    async with AsyncSessionLocal() as session:
        try:
            user = await BootstrapService(session).create_first_hq(bootstrap)
        except (ResourceConflictError, ServiceValidationError) as exc:
            print(f"Bootstrap refused: {exc}", file=sys.stderr)
            return 1
        except Exception:
            print(
                "Bootstrap failed. No HQ administrator was created.",
                file=sys.stderr,
            )
            return 1

    print(f"First HQ administrator created successfully: {user.id}")
    print(
        "Remove all PARISHCARE_BOOTSTRAP_* variables from the environment now."
    )
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(run_bootstrap()))


if __name__ == "__main__":
    main()
