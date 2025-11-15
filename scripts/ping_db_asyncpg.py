import os
import asyncio
import asyncpg

HOST = os.getenv("PGHOST", "127.0.0.1")
PORT = int(os.getenv("PGPORT", "5433"))
USER = os.getenv("PGUSER", "nectar")
PASSWORD = os.getenv("PGPASSWORD", "nectar")
DATABASE = os.getenv("PGDATABASE", "nectar")


async def main() -> int:
    print(f"Connecting to Postgres via asyncpg: {USER}@{HOST}:{PORT}/{DATABASE}")
    try:
        conn = await asyncpg.connect(user=USER, password=PASSWORD, host=HOST, port=PORT, database=DATABASE)
        print("Connected via asyncpg")
        await conn.close()
        print("Connection closed")
        return 0
    except Exception as e:
        print("Connection failed:", repr(e))
        return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))