"""Worker to run jwttool commands."""

import subprocess
import sys


def crack_jwt(token: str, wordlist: str = None):
    cmd = ["jwttool", token]
    if wordlist:
        cmd += ["-d", wordlist]
    return subprocess.run(cmd, capture_output=True, text=True)

if __name__ == "__main__":
    token = sys.argv[1] if len(sys.argv) > 1 else ""
    result = crack_jwt(token)
    print(result.stdout)
