#!/usr/bin/env python3
"""Deploy foot-platform to production server."""
import paramiko
import os
import sys

HOST = "122.51.253.83"
PORT = 22
USER = "root"
PASSWORD = "Lms0564335"
REMOTE_DIR = "/opt/foot-platform"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

def run_ssh(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if err:
        print(f"  ERR: {err.strip()}")
    return out

def deploy():
    print(f"Connecting to {HOST}:{PORT}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, PORT, USER, PASSWORD)
    print("Connected!")

    # Create directory structure
    print("Setting up directories...")
    run_ssh(ssh, f"mkdir -p {REMOTE_DIR}/data {REMOTE_DIR}/foot-platform-server/src")
    run_ssh(ssh, f"mkdir -p {REMOTE_DIR}/foot-platform/dist")
    run_ssh(ssh, f"mkdir -p {REMOTE_DIR}/foot-platform-admin/dist")

    # Upload server code
    print("Uploading server code...")
    sftp = ssh.open_sftp()
    server_src = os.path.join(LOCAL_DIR, "foot-platform-server")

    def upload_dir(local, remote):
        for item in os.listdir(local):
            local_path = os.path.join(local, item)
            remote_path = f"{remote}/{item}"
            if item == "node_modules" or item == "data" or item.endswith(".db"):
                continue
            if os.path.isdir(local_path):
                try:
                    sftp.mkdir(remote_path)
                except:
                    pass
                upload_dir(local_path, remote_path)
            else:
                try:
                    sftp.put(local_path, remote_path)
                except Exception as e:
                    print(f"  Skip {item}: {e}")

    upload_dir(server_src, f"{REMOTE_DIR}/foot-platform-server")

    # Upload .env files
    print("Uploading env configs...")
    for project in ["foot-platform-server", "foot-platform", "foot-platform-admin"]:
        local_env = os.path.join(LOCAL_DIR, project, ".env.production")
        if os.path.exists(local_env):
            sftp.put(local_env, f"{REMOTE_DIR}/{project}/.env")
            print(f"  {project}/.env uploaded")

    sftp.close()

    # Install dependencies
    print("Installing server dependencies...")
    run_ssh(ssh, f"cd {REMOTE_DIR}/foot-platform-server && npm install --production 2>&1 | tail -3")

    # Build frontend
    print("Building frontend...")
    # Upload package.json and install
    sftp = ssh.open_sftp()
    for project in ["foot-platform", "foot-platform-admin"]:
        local_pkg = os.path.join(LOCAL_DIR, project, "package.json")
        remote_pkg = f"{REMOTE_DIR}/{project}/package.json"
        sftp.put(local_pkg, remote_pkg)
    sftp.close()

    run_ssh(ssh, f"cd {REMOTE_DIR}/foot-platform && npm install 2>&1 | tail -3")
    run_ssh(ssh, f"cd {REMOTE_DIR}/foot-platform-admin && npm install 2>&1 | tail -3")

    # Build (needs node_modules)
    print("Building frontend bundles...")
    # Upload all src files
    sftp = ssh.open_sftp()
    for project in ["foot-platform", "foot-platform-admin"]:
        local_dir = os.path.join(LOCAL_DIR, project, "src")
        remote_dir = f"{REMOTE_DIR}/{project}/src"
        upload_dir(local_dir, remote_dir)
        # Upload configs
        for fname in ["index.html", "vite.config.ts", "tsconfig.json", "tailwind.config.js", "postcss.config.js"]:
            local_f = os.path.join(LOCAL_DIR, project, fname)
            if os.path.exists(local_f):
                sftp.put(local_f, f"{REMOTE_DIR}/{project}/{fname}")
    sftp.close()

    run_ssh(ssh, f"cd {REMOTE_DIR}/foot-platform && npx vite build 2>&1 | tail -5")
    run_ssh(ssh, f"cd {REMOTE_DIR}/foot-platform-admin && npx vite build 2>&1 | tail -5")

    # Kill old server and start new one
    print("Starting server...")
    run_ssh(ssh, "pkill -f 'tsx src/index.ts' 2>/dev/null; pkill -f 'node.*foot-platform' 2>/dev/null; sleep 1")
    run_ssh(ssh, f"cd {REMOTE_DIR}/foot-platform-server && nohup npx tsx src/index.ts > /var/log/foot-platform.log 2>&1 &")
    run_ssh(ssh, "sleep 2 && curl -s http://localhost:5001/api/health")

    # Install nginx or simple static server for frontend
    print("Setting up static file server...")
    run_ssh(ssh, f"pkill -f 'vite preview' 2>/dev/null; sleep 1")

    # Use npx serve for frontend dist
    run_ssh(ssh, f"cd {REMOTE_DIR}/foot-platform && nohup npx vite preview --port 5002 --host 0.0.0.0 > /var/log/foot-frontend.log 2>&1 &")
    run_ssh(ssh, f"cd {REMOTE_DIR}/foot-platform-admin && nohup npx vite preview --port 5003 --host 0.0.0.0 > /var/log/foot-admin.log 2>&1 &")

    print("\n=== Deploy Complete ===")
    print(f"  Frontend: http://{HOST}:5002")
    print(f"  Admin:    http://{HOST}:5003")
    print(f"  API:      http://{HOST}:5001/api/health")

    ssh.close()

if __name__ == "__main__":
    deploy()
