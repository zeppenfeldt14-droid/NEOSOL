import os

admin_path = r"D:\Users\ERNESTO\Desktop\Nootbook\margarita-viajes\src\pages\Admin.tsx"
out_path = r"d:\Reporte de Visitas\crm-visitas\scratch\search_users.txt"

if not os.path.exists(admin_path):
    print("Admin.tsx not found at", admin_path)
    exit(1)

with open(admin_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

user_lines = []
in_user_block = False
brace_count = 0

print(f"Read {len(lines)} lines from Admin.tsx")

# Let's search for keywords and save surrounding lines
for i, line in enumerate(lines):
    if "user" in line.lower() or "nivel" in line.lower() or "alias" in line.lower() or "rol" in line.lower() or "staff" in line.lower():
        start = max(0, i - 10)
        end = min(len(lines), i + 10)
        user_lines.append(f"--- Line {i+1} ---\n")
        user_lines.extend(lines[start:end])
        user_lines.append("\n=====================================\n")

with open(out_path, 'w', encoding='utf-8') as f:
    f.writelines(user_lines[:2000]) # Cap it to avoid huge file

print(f"Wrote user-related matches to {out_path}")
