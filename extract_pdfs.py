import fitz
import os
import json
import re

reports_dir = r"D:\Reporte de Visitas\Reportes de visitas"
files = [f for f in os.listdir(reports_dir) if f.endswith('.pdf')]

all_texts = []

def parse_date(filename):
    name = filename.replace('.pdf', '')
    parts = name.split('-')
    if len(parts) == 3:
        return f"{parts[2]}-{parts[1]}-{parts[0]}T12:00:00Z"
    return None

for file in files:
    date_str = parse_date(file)
    if not date_str:
        continue
        
    doc = fitz.open(os.path.join(reports_dir, file))
    text = ""
    for page in doc:
        text += page.get_text()
    
    all_texts.append({
        "filename": file,
        "date": date_str,
        "text": text
    })

with open(r'd:\Reporte de Visitas\crm-visitas\pdf_texts.json', 'w', encoding='utf-8') as f:
    json.dump(all_texts, f, ensure_ascii=False, indent=2)

print(f"Extracted text from {len(all_texts)} PDFs.")
