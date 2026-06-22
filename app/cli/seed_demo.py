import asyncio
import sys

from pydantic import ValidationError

from app.core.demo_seed_config import DemoSeedSettings
from app.db.session import AsyncSessionLocal
from app.services.demo_seed import DemoSeedService
from app.services.errors import ServiceValidationError


async def run_seed() -> int:
    try:
        seed = DemoSeedSettings()
    except ValidationError as exc:
        print("Demo seed configuration is invalid:", file=sys.stderr)
        for error in exc.errors():
            location = ".".join(str(part) for part in error["loc"])
            print(f"- {location}: {error['msg']}", file=sys.stderr)
        return 2

    async with AsyncSessionLocal() as session:
        try:
            result = await DemoSeedService(session).seed(seed)
        except ServiceValidationError as exc:
            print(f"Demo seed refused: {exc}", file=sys.stderr)
            return 1
        except Exception:
            print("Demo seed failed. Transaction was rolled back.", file=sys.stderr)
            return 1

    state = "created" if result.created else "already present"
    print(
        f"Steward demo data {state}: "
        f"{result.artisans} artisans, {result.residents} residents, "
        f"{result.jobs} jobs."
    )
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(run_seed()))


if __name__ == "__main__":
    main()
