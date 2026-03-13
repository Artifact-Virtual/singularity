"""
Workspace Scanner — Enterprise Data → ERP Populator
=====================================================
Scans a workspace/enterprise directory and populates the ERP database
via the Fastify API. One-time bootstrap for existing companies.

Usage:
    python -m singularity.erp.scanner --workspace /path/to/enterprise --api http://localhost:3100
"""

import asyncio
import json
import re
import os
import logging
from pathlib import Path
from typing import Any
from datetime import datetime

try:
    import aiohttp
except ImportError:
    aiohttp = None  # Will use urllib fallback

logger = logging.getLogger("singularity.erp.scanner")


class ERPScanner:
    """Scans enterprise workspace and populates ERP via API."""

    def __init__(self, workspace: str, api_url: str = "http://localhost:3100",
                 admin_email: str = "admin@artifactvirtual.com",
                 admin_password: str = None):
        self.workspace = Path(workspace)
        self.api_url = api_url.rstrip("/")
        self.admin_email = admin_email
        self.admin_password = admin_password or os.getenv("ERP_ADMIN_PASSWORD", "")
        self.token = None
        self.stats = {
            "departments_created": 0,
            "employees_created": 0,
            "projects_created": 0,
            "contacts_created": 0,
            "activities_created": 0,
            "errors": [],
        }

    # ── Auth ─────────────────────────────────────────────

    async def authenticate(self) -> bool:
        """Get JWT token from ERP."""
        try:
            data = await self._post("/api/auth/login", {
                "email": self.admin_email,
                "password": self.admin_password,
            }, auth=False)
            self.token = data.get("accessToken") or data.get("token")
            if self.token:
                logger.info("Authenticated with ERP")
                return True
            logger.error(f"Auth failed: {data}")
            return False
        except Exception as e:
            logger.error(f"Auth error: {e}")
            return False

    # ── HTTP helpers ─────────────────────────────────────

    async def _post(self, path: str, body: dict, auth: bool = True) -> dict:
        """POST to ERP API."""
        import urllib.request
        import urllib.error

        url = f"{self.api_url}{path}"
        headers = {"Content-Type": "application/json"}
        if auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        req = urllib.request.Request(
            url, 
            data=json.dumps(body).encode(),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else str(e)
            return {"error": error_body, "status": e.code}
        except Exception as e:
            return {"error": str(e)}

    async def _get(self, path: str) -> dict:
        """GET from ERP API."""
        import urllib.request
        url = f"{self.api_url}{path}"
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            return {"error": str(e)}

    # ── Scanners ─────────────────────────────────────────

    async def scan_all(self) -> dict:
        """Run full workspace scan and populate ERP."""
        logger.info(f"Scanning workspace: {self.workspace}")

        if not await self.authenticate():
            return {"error": "Authentication failed", "stats": self.stats}

        # Scan in order (no department model — department is a string on employee)
        await self.scan_employees()
        await self.scan_projects()
        await self.scan_contacts()
        await self.scan_financial_data()
        await self.scan_stakeholders()
        await self.scan_activities()

        logger.info(f"Scan complete: {self.stats}")
        return self.stats

    async def scan_departments(self):
        """Departments are string fields, not a separate model. Skip."""
        pass

    async def scan_employees(self):
        """Scan HR data for employee records."""
        hr_dir = self.workspace / "enterprise" / "divisions" / "departments" / "hr"
        if not hr_dir.exists():
            hr_dir = self.workspace / "divisions" / "departments" / "hr"
        if not hr_dir.exists():
            return

        # Look for employee/team/org data files
        for pattern in ["*employee*", "*team*", "*roster*", "*staff*", "*org*"]:
            for f in hr_dir.rglob(pattern):
                if f.suffix in (".md", ".json", ".csv", ".yaml", ".yml"):
                    await self._parse_hr_file(f)

    async def _parse_hr_file(self, filepath: Path):
        """Parse an HR file and extract employee data."""
        try:
            content = filepath.read_text(errors="ignore")

            if filepath.suffix == ".json":
                data = json.loads(content)
                if isinstance(data, list):
                    for emp in data:
                        await self._create_employee(emp)
                elif isinstance(data, dict) and "employees" in data:
                    for emp in data["employees"]:
                        await self._create_employee(emp)
            elif filepath.suffix == ".csv":
                lines = content.strip().split("\n")
                if len(lines) > 1:
                    headers = [h.strip().lower() for h in lines[0].split(",")]
                    for line in lines[1:]:
                        values = [v.strip() for v in line.split(",")]
                        emp = dict(zip(headers, values))
                        await self._create_employee(emp)
            elif filepath.suffix == ".md":
                # Parse markdown tables for employee data
                await self._parse_md_employees(content)
        except Exception as e:
            self.stats["errors"].append(f"hr/{filepath.name}: {e}")

    async def _parse_md_employees(self, content: str):
        """Extract employee data from markdown tables."""
        # Look for tables with name/role/department columns
        lines = content.split("\n")
        table_start = None
        headers = []

        for i, line in enumerate(lines):
            if "|" in line and ("name" in line.lower() or "employee" in line.lower()):
                headers = [h.strip().lower() for h in line.split("|") if h.strip()]
                table_start = i + 2  # Skip header separator
            elif table_start and i >= table_start and "|" in line:
                values = [v.strip() for v in line.split("|") if v.strip()]
                if len(values) >= len(headers):
                    emp = dict(zip(headers, values))
                    await self._create_employee(emp)
            elif table_start and "|" not in line:
                table_start = None

    async def _create_employee(self, data: dict):
        """Create an employee record in ERP."""
        name = data.get("name") or data.get("full_name") or data.get("employee", "")
        if not name or name.startswith("-"):
            return None

        # Split name
        parts = name.strip().split()
        first = parts[0] if parts else "Unknown"
        last = " ".join(parts[1:]) if len(parts) > 1 else ""

        email = data.get("email", f"{first.lower()}.{last.lower()}@artifactvirtual.com".replace(" ", ""))
        role = data.get("role") or data.get("position") or data.get("title") or "Team Member"
        dept = data.get("department") or data.get("dept") or "General"
        hire_date = data.get("hireDate") or data.get("hire_date") or datetime.now().isoformat()

        result = await self._post("/api/hrm/employees", {
            "firstName": first,
            "lastName": last,
            "email": email,
            "position": role,
            "department": dept,
            "hireDate": hire_date,
            "status": "active",
        })

        if "error" not in result:
            self.stats["employees_created"] += 1
            logger.info(f"Employee: {first} {last}")
            return result.get("id")
        return None

    async def scan_projects(self):
        """Scan projects/ directory and create Project records."""
        proj_dir = self.workspace / "enterprise" / "projects"
        if not proj_dir.exists():
            proj_dir = self.workspace / "projects"
        if not proj_dir.exists():
            return

        # We need an employeeId — get the admin user
        admin_id = await self._get_admin_employee_id()

        for proj_path in sorted(proj_dir.iterdir()):
            if not proj_path.is_dir():
                continue

            proj_name = proj_path.name
            
            # Read README or main doc
            description = ""
            status = "planning"
            readme = proj_path / "README.md"
            if not readme.exists():
                readmes = list(proj_path.glob("*.md"))
                readme = readmes[0] if readmes else None

            if readme and readme.exists():
                try:
                    content = readme.read_text(errors="ignore")
                    lines = content.split("\n")
                    for line in lines:
                        line = line.strip()
                        if line and not line.startswith("#") and not line.startswith("|") and not line.startswith("!") and len(line) > 20:
                            description = line[:500]
                            break

                    content_lower = content.lower()
                    if "active" in content_lower or "🟢" in content:
                        status = "active"
                    elif "complete" in content_lower or "🔵" in content:
                        status = "completed"
                    elif "concept" in content_lower or "research" in content_lower:
                        status = "planning"
                except Exception:
                    pass

            body = {
                "name": proj_name.upper() if len(proj_name) <= 8 else proj_name.replace("-", " ").title(),
                "description": description or f"Project {proj_name}",
                "status": status,
                "startDate": datetime.now().isoformat(),
            }
            if admin_id:
                body["employeeId"] = admin_id

            result = await self._post("/api/development/projects", body)

            if "error" not in result:
                self.stats["projects_created"] += 1
                logger.info(f"Project: {proj_name}")
            else:
                self.stats["errors"].append(f"project/{proj_name}: {result.get('error', '')[:100]}")

    async def _get_admin_employee_id(self) -> str:
        """Get or create admin employee record, return its ID."""
        if hasattr(self, "_admin_emp_id"):
            return self._admin_emp_id
        
        # Try to get existing employees
        result = await self._get("/api/hrm/employees?limit=1")
        if isinstance(result, dict) and "employees" in result:
            employees = result["employees"]
            if employees:
                self._admin_emp_id = employees[0].get("id", "")
                return self._admin_emp_id
        elif isinstance(result, list) and result:
            self._admin_emp_id = result[0].get("id", "")
            return self._admin_emp_id

        # Create admin employee
        emp_result = await self._post("/api/hrm/employees", {
            "firstName": "Ali",
            "lastName": "Shakil",
            "email": "ali@artifactvirtual.com",
            "position": "CEO",
            "department": "Executive",
            "hireDate": "2025-01-01T00:00:00.000Z",
            "status": "active",
        })
        self._admin_emp_id = emp_result.get("id", "")
        return self._admin_emp_id

    async def scan_contacts(self):
        """Scan CRM/stakeholder data."""
        # Look for stakeholder, contact, client data
        search_dirs = [
            self.workspace / "enterprise" / "divisions" / "departments" / "sales",
            self.workspace / "enterprise" / "divisions" / "departments" / "marketing",
            self.workspace / "enterprise" / "stakeholders",
            self.workspace / "admin" / "stakeholders",
        ]

        for d in search_dirs:
            if not d.exists():
                continue
            for f in d.rglob("*.md"):
                try:
                    content = f.read_text(errors="ignore")
                    await self._parse_contacts(content)
                except Exception:
                    pass

    async def _parse_contacts(self, content: str):
        """Extract contact data from markdown."""
        # Look for email patterns and associated names
        email_pattern = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+')
        lines = content.split("\n")
        
        for i, line in enumerate(lines):
            emails = email_pattern.findall(line)
            for email in emails:
                if "@artifactvirtual.com" in email:
                    continue  # Skip internal
                
                # Try to find name nearby
                name = "Unknown Contact"
                for check_line in [line] + lines[max(0, i-2):i]:
                    # Look for name-like patterns before the email
                    name_match = re.search(r'\*\*([^*]+)\*\*', check_line)
                    if name_match:
                        name = name_match.group(1)
                        break

                parts = name.split()
                result = await self._post("/api/crm/contacts", {
                    "firstName": parts[0] if parts else "Unknown",
                    "lastName": " ".join(parts[1:]) if len(parts) > 1 else "Contact",
                    "email": email,
                    "company": "",
                    "status": "active",
                })

                if "error" not in result:
                    self.stats["contacts_created"] += 1

    async def scan_financial_data(self):
        """Scan finance department for financial records."""
        fin_dir = self.workspace / "enterprise" / "divisions" / "departments" / "finance"
        if not fin_dir.exists():
            return

        # Look for ledger accounts, budget data
        for f in fin_dir.rglob("*.md"):
            try:
                content = f.read_text(errors="ignore")
                if "account" in content.lower() or "ledger" in content.lower():
                    await self._parse_ledger_accounts(content, f.name)
            except Exception:
                pass

    async def _parse_ledger_accounts(self, content: str, filename: str):
        """Extract ledger account data from finance docs."""
        lines = content.split("\n")
        for line in lines:
            if "|" in line and any(kw in line.lower() for kw in ["revenue", "expense", "asset", "liability", "equity"]):
                cells = [c.strip() for c in line.split("|") if c.strip()]
                if len(cells) >= 2:
                    account_name = cells[0]
                    account_type = "expense"
                    for t in ["revenue", "asset", "liability", "equity"]:
                        if t in line.lower():
                            account_type = t
                            break

                    result = await self._post("/api/finance/accounts", {
                        "name": account_name,
                        "type": account_type,
                        "code": f"AUTO-{hash(account_name) % 10000:04d}",
                    })
                    if "error" not in result:
                        logger.info(f"Ledger: {account_name}")

    async def scan_stakeholders(self):
        """Scan BOD.md and enterprise docs for stakeholders."""
        bod_file = self.workspace / "enterprise" / "BOD.md"
        if not bod_file.exists():
            bod_file = self.workspace / "BOD.md"
        
        if bod_file.exists():
            try:
                content = bod_file.read_text(errors="ignore")
                await self._parse_stakeholders(content)
            except Exception as e:
                self.stats["errors"].append(f"stakeholders/BOD: {e}")

        # Also check enterprise.md for org structure
        ent_file = self.workspace / "enterprise" / "ENTERPRISE.md"
        if not ent_file.exists():
            ent_file = self.workspace / "ENTERPRISE.md"
        if ent_file.exists():
            try:
                content = ent_file.read_text(errors="ignore")
                await self._parse_stakeholders(content)
            except Exception as e:
                pass

    async def _parse_stakeholders(self, content: str):
        """Extract stakeholder data from markdown."""
        lines = content.split("\n")
        for line in lines:
            # Look for patterns like **Name** — Role or | Name | Role | etc.
            name_match = re.search(r'\*\*([A-Z][a-z]+ [A-Z][a-z]+)\*\*', line)
            if name_match:
                name = name_match.group(1)
                # Determine type from context
                stype = "advisor"
                line_lower = line.lower()
                if "ceo" in line_lower or "founder" in line_lower or "director" in line_lower:
                    stype = "board-member"
                elif "investor" in line_lower:
                    stype = "investor"
                elif "partner" in line_lower:
                    stype = "partner"

                title = ""
                title_match = re.search(r'(?:—|–|-)\s*(.+?)(?:\||$)', line)
                if title_match:
                    title = title_match.group(1).strip()[:100]

                result = await self._post("/api/stakeholders", {
                    "name": name,
                    "type": stype,
                    "title": title,
                    "status": "active",
                })
                if "error" not in result:
                    self.stats["contacts_created"] += 1
                    logger.info(f"Stakeholder: {name}")

    async def scan_activities(self):
        """Scan ops checklists and SOPs for activity records."""
        # Look for operational checklists and convert to activities
        ops_file = self.workspace / "enterprise" / "01_OPS_CHECKLIST.md"
        if not ops_file.exists():
            return

        try:
            content = ops_file.read_text(errors="ignore")
            lines = content.split("\n")
            
            # Get the user ID for activities
            user_data = await self._get("/api/auth/me")
            user_id = user_data.get("id", "")
            if not user_id:
                return

            for line in lines:
                # Look for checkbox items: - [ ] or - [x]
                check_match = re.match(r'\s*-\s*\[([ x])\]\s*(.+)', line)
                if check_match:
                    completed = check_match.group(1) == "x"
                    subject = check_match.group(2).strip()[:200]
                    
                    if len(subject) < 5:
                        continue

                    result = await self._post("/api/activities", {
                        "type": "task",
                        "subject": subject,
                        "status": "completed" if completed else "pending",
                        "userId": user_id,
                    })
                    if "error" not in result:
                        self.stats["activities_created"] += 1
        except Exception as e:
            self.stats["errors"].append(f"activities: {e}")


async def run_scanner(workspace: str, api_url: str = "http://localhost:3100",
                      admin_password: str = None) -> dict:
    """Run the workspace scanner."""
    scanner = ERPScanner(
        workspace=workspace,
        api_url=api_url,
        admin_password=admin_password,
    )
    return await scanner.scan_all()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Scan workspace and populate ERP")
    parser.add_argument("--workspace", default="/home/adam/workspace", help="Workspace path")
    parser.add_argument("--api", default="http://localhost:3100", help="ERP API URL")
    parser.add_argument("--password", default=None, help="Admin password")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
    result = asyncio.run(run_scanner(args.workspace, args.api, args.password))
    print(json.dumps(result, indent=2, default=str))
