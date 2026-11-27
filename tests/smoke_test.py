import base64
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
JAR = ROOT / "backend" / "target" / "chengmai-backend.jar"
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def request(base, method, path, token=None, body=None, raw=None, content_type=None, origin=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if origin:
        headers["Origin"] = origin
    if body is not None:
        raw = json.dumps(body).encode()
        content_type = "application/json"
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(base + path, data=raw, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read()
            payload = json.loads(data) if "application/json" in response.headers.get("Content-Type", "") else None
            return response.status, dict(response.headers), payload
    except urllib.error.HTTPError as error:
        data = error.read()
        payload = json.loads(data) if "application/json" in error.headers.get("Content-Type", "") else None
        return error.code, dict(error.headers), payload


def expect(status, result, expected):
    assert result[0] == expected, (status, result)
    return result


def upload(base, token, filename="pixel.png", content_type="image/png", content=PNG):
    boundary = "----chengmai-smoke-boundary"
    parts = []
    for name, value, mime, payload in (
        ("file", filename, content_type, content),
        ("title", "冒烟测试", None, "冒烟测试".encode()),
        ("tags", '["测试"]', None, '["测试"]'.encode()),
    ):
        parts.append(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\""
            + (f'; filename="{value}"' if mime else "")
            + "\r\n"
            + (f"Content-Type: {mime}\r\n" if mime else "")
            + "\r\n"
        )
        parts.append(payload)
        parts.append("\r\n")
    parts.append(f"--{boundary}--\r\n")
    raw = b"".join(p if isinstance(p, bytes) else p.encode() for p in parts)
    return request(base, "POST", "/api/gallery", token=token, raw=raw,
                   content_type=f"multipart/form-data; boundary={boundary}")


def run_smoke(jar):
    port = free_port()
    base = f"http://127.0.0.1:{port}"
    with tempfile.TemporaryDirectory(prefix="chengmai-smoke-") as temp:
        env = os.environ.copy()
        env.update({
            "PORT": str(port),
            "DATA_DIR": str(Path(temp) / "data"),
            "STATIC_DIR": str(Path(temp) / "no-static"),
            "CORS_ORIGINS": "http://localhost:3266",
        })
        process = subprocess.Popen(
            ["java", "--enable-native-access=ALL-UNNAMED", "-jar", str(jar)],
            cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        )
        try:
            for _ in range(100):
                if process.poll() is not None:
                    raise AssertionError(process.stdout.read().decode(errors="replace"))
                try:
                    health = request(base, "GET", "/health")
                    if health[0] == 200:
                        break
                except (OSError, urllib.error.URLError):
                    pass
                time.sleep(0.1)
            else:
                raise AssertionError("backend startup timed out")

            assert health[2] == {"status": "ok", "database": True}
            expect("unauthorized member list", request(base, "GET", "/api/members"), 401)

            admin_login = expect("admin login", request(base, "POST", "/api/auth/login",
                body={"username": "admin", "password": "demo123"}), 200)
            viewer_login = expect("viewer login", request(base, "POST", "/api/auth/login",
                body={"username": "viewer", "password": "demo123"}), 200)
            admin = admin_login[2]["token"]
            viewer = viewer_login[2]["token"]
            assert admin_login[2]["user"]["password_change_required"] is True
            assert viewer_login[2]["user"]["password_change_required"] is True
            blocked = expect("default password blocks API", request(base, "GET", "/api/members", admin), 403)
            assert blocked[2]["error"] == "请先修改默认密码"
            expect("default user can read profile", request(base, "GET", "/api/auth/me", admin), 200)
            expect("admin changes default password", request(base, "PUT", "/api/auth/password", admin,
                body={"currentPassword": "demo123", "newPassword": "newadmin123"}), 200)
            expect("viewer changes default password", request(base, "PUT", "/api/auth/password", viewer,
                body={"currentPassword": "demo123", "newPassword": "newviewer123"}), 200)

            expect("viewer cannot create member", request(base, "POST", "/api/members", viewer,
                body={"name": "访客"}), 403)
            expect("viewer cannot manage accounts", request(base, "GET", "/api/users", viewer), 403)
            expect("malformed JSON", request(base, "POST", "/api/members", admin, raw=b"{",
                content_type="application/json"), 400)

            parent = expect("create parent", request(base, "POST", "/api/members", admin,
                body={"name": "父辈", "generation": 1, "sibling_rank": 2}), 201)[2]
            child = expect("create child", request(base, "POST", "/api/members", admin,
                body={"name": "子辈", "parent_id": parent["id"], "generation": 2}), 201)[2]
            expect("reject hierarchy cycle", request(base, "PUT", f"/api/members/{parent['id']}", admin,
                body={"parent_id": child["id"]}), 400)
            expect("reject invalid batch atomically", request(base, "POST", "/api/members/batch", admin,
                body=[{"name": "应回滚"}, {"generation": 1}]), 400)
            members = expect("member list", request(base, "GET", "/api/members", admin), 200)[2]
            assert not any(member["name"] == "应回滚" for member in members)

            expect("batch update rolls back on failure", request(base, "PUT", "/api/members/batch", admin,
                body=[{"id": parent["id"], "name": "不应保存"}, {"generation": 2}]), 400)
            unchanged = next(member for member in expect("members after failed batch",
                request(base, "GET", "/api/members", admin), 200)[2] if member["id"] == parent["id"])
            assert unchanged["name"] == "父辈"
            expect("viewer cannot batch update", request(base, "PUT", "/api/members/batch", viewer,
                body=[{"id": parent["id"], "name": "访客修改"}]), 403)
            expect("batch update requires ids", request(base, "PUT", "/api/members/batch", admin,
                body=[{"name": "缺少 id"}]), 400)
            expect("batch update succeeds", request(base, "PUT", "/api/members/batch", admin,
                body=[{"id": parent["id"], "bio": "批量更新"}]), 200)

            sibling_a = expect("create first sibling", request(base, "POST", "/api/members", admin,
                body={"name": "长子", "parent_id": parent["id"], "generation": 2, "gender": "male"}), 201)[2]
            sibling_b = expect("create second sibling", request(base, "POST", "/api/members", admin,
                body={"name": "次女", "parent_id": parent["id"], "generation": 2, "gender": "female"}), 201)[2]
            group = [member for member in expect("siblings before reorder", request(base, "GET", "/api/members", admin), 200)[2]
                     if member["parent_id"] == parent["id"]]
            reordered_ids = list(reversed([member["id"] for member in group]))
            expect("reorder requires complete group", request(base, "PUT", "/api/members/order", admin,
                body={"parent_id": parent["id"], "member_ids": reordered_ids[:-1]}), 400)
            expect("reorder rejects duplicate ids", request(base, "PUT", "/api/members/order", admin,
                body={"parent_id": parent["id"], "member_ids": [reordered_ids[0]] + reordered_ids}), 400)
            expect("viewer cannot reorder", request(base, "PUT", "/api/members/order", viewer,
                body={"parent_id": parent["id"], "member_ids": reordered_ids}), 403)
            reordered = expect("reorder siblings", request(base, "PUT", "/api/members/order", admin,
                body={"parent_id": parent["id"], "member_ids": reordered_ids}), 200)[2]
            assert [member["id"] for member in reordered] == reordered_ids
            assert [member["family_rank"] for member in reordered] == list(range(1, len(group) + 1))
            gender_ranks = {}
            for member in reordered:
                gender = member["gender"] or "other"
                gender_ranks[gender] = gender_ranks.get(gender, 0) + 1
                assert member["sibling_rank"] == gender_ranks[gender]

            editor = expect("create editor", request(base, "POST", "/api/users", admin,
                body={"username": "editor01", "password": "editorpass", "role": "editor"}), 201)[2]
            editor_login = request(base, "POST", "/api/auth/login",
                body={"username": "editor01", "password": "editorpass"})
            expect("editor content write", request(base, "POST", "/api/members", editor_login[2]["token"],
                body={"name": "编辑维护", "generation": 1}), 201)
            assert editor["role"] == "editor"

            stranger = expect("create stranger", request(base, "POST", "/api/users", admin,
                body={"username": "other01", "password": "otherpass", "role": "viewer"}), 201)[2]
            stranger_token = request(base, "POST", "/api/auth/login",
                body={"username": "other01", "password": "otherpass"})[2]["token"]

            image = expect("upload image", upload(base, viewer), 201)[2]
            image_path = "/api/gallery/file?" + urllib.parse.urlencode({"path": image["url"]})
            expect("uploader reads pending image", request(base, "GET", image_path, viewer), 200)
            expect("admin reads pending image", request(base, "GET", image_path, admin), 200)
            expect("stranger cannot read pending image", request(base, "GET", image_path, stranger_token), 403)
            expect("stranger cannot see pending metadata", request(base, "GET", "/api/gallery", stranger_token), 200)
            assert not request(base, "GET", "/api/gallery", stranger_token)[2]

            expect("viewer cannot moderate", request(base, "PATCH", f"/api/gallery/{image['id']}/status", viewer,
                body={"status": "approved"}), 403)
            approved = expect("approve image", request(base, "PATCH", f"/api/gallery/{image['id']}/status", admin,
                body={"status": "approved"}), 200)[2]
            assert approved["approved_at"] and approved["approved_by"]
            expect("stranger reads approved image", request(base, "GET", image_path, stranger_token), 200)
            hidden = expect("hide image", request(base, "PATCH", f"/api/gallery/{image['id']}/status", admin,
                body={"status": "hidden"}), 200)[2]
            assert hidden["approved_at"] is None and hidden["approved_by"] is None
            expect("stranger loses hidden image", request(base, "GET", image_path, stranger_token), 403)

            expect("reject spoofed image", upload(base, viewer, filename="fake.png",
                content_type="image/png", content=b"not-an-image-content"), 400)
            expect("preflight allowed", request(base, "OPTIONS", "/api/members",
                origin="http://localhost:3266"), 204)
            denied = expect("preflight denied", request(base, "OPTIONS", "/api/members",
                origin="https://untrusted.example"), 403)
            assert "Access-Control-Allow-Origin" not in denied[1]

            expect("change password", request(base, "PUT", "/api/auth/password", admin,
                body={"currentPassword": "newadmin123", "newPassword": "finaladmin123"}), 200)
            me = expect("current user after password change", request(base, "GET", "/api/auth/me", admin), 200)[2]
            assert me["user"]["password_change_required"] is False

            audit = expect("audit log", request(base, "GET", "/api/audit?limit=20", admin), 200)[2]
            assert any(entry["action"] == "POST" and entry["target"] == "/api/members" for entry in audit)
            assert all("password" not in entry for entry in audit)

            backup_lock = Path(temp, "data", ".backup-lock")
            backup_lock.mkdir()
            try:
                expect("backup blocks new writes", request(base, "POST", "/api/members", admin,
                    body={"name": "备份期间拒绝"}), 503)
            finally:
                backup_lock.rmdir()
            expect("writes resume after backup", request(base, "POST", "/api/members", admin,
                body={"name": "备份结束后恢复"}), 201)

            writers = Path(temp, "data", ".writers")
            assert writers.is_dir()
            assert not any(writers.iterdir())
            assert not backup_lock.exists()
            print("API smoke tests passed")
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == "__main__":
    if not JAR.is_file():
        raise SystemExit(f"missing backend jar: {JAR}; run mvn package first")
    run_smoke(JAR)
