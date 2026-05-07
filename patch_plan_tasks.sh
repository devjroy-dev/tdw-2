#!/bin/bash
# patch_plan_tasks.sh
# Fixes task fetching in plan.tsx
# Changes /api/v2/couple/tasks/:userId → /api/couple/checklist/:userId
# Maps DB columns: text→title, couple_id→user_id, event→event_name, is_complete→status
# Run from: /workspaces/tdw-2

set -e
FILE="app/(couple)/plan.tsx"

echo "=== SAFETY CHECKS ==="
if [ ! -f "$FILE" ]; then echo "ERROR: $FILE not found."; exit 1; fi
if ! grep -q "api/v2/couple/tasks" "$FILE"; then echo "ERROR: Pattern not found."; exit 1; fi
echo "Checks passed."

python3 << 'PYEOF'
content = open('app/(couple)/plan.tsx', 'r').read()

old = """  async function loadTasks(triggerSeedIfEmpty = false) {
    try {
      const r = await fetch(`${API}/api/v2/couple/tasks/${userId}`);
      const d = await r.json();
      const taskList: Task[] = Array.isArray(d) ? d : [];
      if (triggerSeedIfEmpty && taskList.length === 0) {
        await fetch(`${API}/api/couple/checklist/seed/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const r2 = await fetch(`${API}/api/v2/couple/tasks/${userId}`);
        const d2 = await r2.json();
        setTasks(Array.isArray(d2) ? d2 : []);
      } else {
        setTasks(taskList);
      }
    } catch {}
    finally { setLoading(false); }
  }"""

new = """  async function loadTasks(triggerSeedIfEmpty = false) {
    try {
      const r = await fetch(`${API}/api/couple/checklist/${userId}`);
      const d = await r.json();
      // Map DB columns to Task interface
      // DB: text, couple_id, event, is_complete → App: title, user_id, event_name, status
      const mapTask = (t: any): Task => ({
        id: t.id,
        title: t.title || t.text || '',
        status: t.is_complete ? 'done' : (t.status || 'pending'),
        priority: t.priority || 'medium',
        due_date: t.due_date || undefined,
        event_name: t.event_name || t.event || undefined,
        assigned_to: t.assigned_to || undefined,
        notes: t.notes || undefined,
        is_complete: !!t.is_complete,
      });
      const taskList: Task[] = Array.isArray(d) ? d.map(mapTask) : [];
      setTasks(taskList);
    } catch {}
    finally { setLoading(false); }
  }"""

if old not in content:
    print("ERROR: Could not find loadTasks function to replace.")
    exit(1)

fixed = content.replace(old, new, 1)
open('app/(couple)/plan.tsx', 'w').write(fixed)
print("Patch applied.")
PYEOF

echo ""
echo "=== VERIFICATION ==="
grep -n "api/couple/checklist\|api/v2/couple/tasks" "$FILE"
echo ""
echo "=== DONE ==="
echo "Run:"
echo "  git add app/\(couple\)/plan.tsx"
echo "  git commit -m 'fix: tasks tab calls correct endpoint + maps DB columns'"
echo "  git push"
echo "  eas update --branch production --message 'fix: tasks tab showing 55 tasks'"
