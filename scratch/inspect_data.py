import json
import os

dump_path = os.path.join('prisma', 'dump.json')
if not os.path.exists(dump_path):
    print("Dump not found!")
    exit(1)

with open(dump_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

empresas = data.get('Empresa', [])
print(f"Total empresas: {len(empresas)}")

zones = {}
vendedores = {}

for e in empresas:
    z = e.get('zona', 'N/A')
    v = e.get('vendedorAsignado', 'N/A')
    
    zones[z] = zones.get(z, 0) + 1
    vendedores[v] = vendedores.get(v, 0) + 1

print("\nCompanies by Zone:")
for z, count in zones.items():
    print(f"  - {z}: {count}")

print("\nCompanies by Vendedor Asignado:")
for v, count in vendedores.items():
    print(f"  - {v}: {count}")
