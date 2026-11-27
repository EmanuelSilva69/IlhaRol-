"""Teste de carga do feed, dos detalhes e da agenda.

Dispara usuários simultâneos contra uma API em execução e informa a latência
de cada rota. A meta é p95 abaixo de 500 ms. Rode antes ``seed_load_data``.

    python -m scripts.load_test --base-url http://localhost:8000
"""

from __future__ import annotations

import argparse
import asyncio
import random
import statistics
import time
from collections import defaultdict

import httpx

from scripts.load_constants import LOAD_PASSWORD, LOAD_USER_EMAIL

TARGET_P95_MS = 500.0


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, round(fraction * len(ordered)) - 1))
    return ordered[index]


async def user_session(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    event_ids: list[str],
    iterations: int,
    timings: dict[str, list[float]],
    rng: random.Random,
) -> None:
    routes = [
        ("feed", lambda: client.get("/api/eventos", params={"limit": 100})),
        ("detalhes", lambda: client.get(f"/api/eventos/{rng.choice(event_ids)}")),
        ("agenda", lambda: client.get("/api/me/agenda", headers=headers)),
    ]
    for _ in range(iterations):
        for name, call in routes:
            started = time.perf_counter()
            response = await call()
            elapsed = (time.perf_counter() - started) * 1000
            response.raise_for_status()
            timings[name].append(elapsed)


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--users", type=int, default=10)
    parser.add_argument("--iterations", type=int, default=20)
    args = parser.parse_args()

    async with httpx.AsyncClient(base_url=args.base_url, timeout=30) as client:
        login = await client.post(
            "/api/auth/login",
            json={"email": LOAD_USER_EMAIL, "password": LOAD_PASSWORD},
        )
        login.raise_for_status()
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        feed = await client.get("/api/eventos", params={"limit": 100})
        event_ids = [event["id"] for event in feed.json()]
        if not event_ids:
            raise SystemExit("Nenhum evento no feed. Rode antes o seed de carga.")

        timings: dict[str, list[float]] = defaultdict(list)
        started = time.perf_counter()
        await asyncio.gather(
            *(
                user_session(
                    client, headers, event_ids, args.iterations, timings, random.Random(i)
                )
                for i in range(args.users)
            )
        )
        total = time.perf_counter() - started

    print(f"{args.users} usuários simultâneos, {args.iterations} rodadas cada ({total:.1f}s)")
    print(f"{'rota':<10}{'reqs':>6}{'p50 ms':>10}{'p95 ms':>10}{'máx ms':>10}  meta")
    all_ok = True
    for name, values in timings.items():
        p95 = percentile(values, 0.95)
        ok = p95 < TARGET_P95_MS
        all_ok &= ok
        print(
            f"{name:<10}{len(values):>6}{statistics.median(values):>10.0f}"
            f"{p95:>10.0f}{max(values):>10.0f}  {'ok' if ok else 'ACIMA'}"
        )
    raise SystemExit(0 if all_ok else 1)


if __name__ == "__main__":
    asyncio.run(main())
