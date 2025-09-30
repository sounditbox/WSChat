import asyncio

from dotenv import load_dotenv

from src.server import main

load_dotenv()

if __name__ == '__main__':
    asyncio.run(main())
