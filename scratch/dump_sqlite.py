import sqlite3
import json
import os

db_path = os.path.join('prisma', 'dev.db')
dump_path = os.path.join('prisma', 'dump.json')

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

data = {}

# List of tables to dump
tables = ['Empresa', 'Visita', 'Accion', 'Alerta', 'ConfiguracionSistema']

for table in tables:
    try:
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        data[table] = [dict(row) for row in rows]
        print(f"Dumped {len(rows)} rows from {table}")
    except sqlite3.OperationalError as e:
        print(f"Skipping table {table}: {e}")

with open(dump_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Successfully wrote database dump to {dump_path}")
conn.close()
