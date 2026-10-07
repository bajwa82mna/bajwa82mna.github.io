from pathlib import Path
import html
import re
import subprocess

OUT=Path(__file__).parent
LOGO=OUT.parent/'logo'
mark=re.search(r'<svg[^>]*>([\s\S]*)</svg>',(LOGO/'logo-mark.svg').read_text()).group(1)
ITEMS={
  'home':'Shoaib Munir\nPlant Molecular Biology',
  'tools':'Open Research Tools',
  'emerging-journals-2026':'Emerging Journals\nDatabase 2026',
  'reference-checker':'Reference Integrity\nChecker',
  'identifier-toolkit':'Identifier & Citation\nToolkit',
  'journal-trust-profile':'Journal Trust Profile',
  'oa-apc-explorer':'OA & APC Explorer',
  'plant-lab-calculators':'Plant Lab Calculator\nSuite',
  'abstract-journal-matcher':'Abstract-to-Journal\nMatcher',
  'privacy':'Privacy Policy',
}
for slug,title in ITEMS.items():
  lines=''.join(f'<tspan x="105" dy="{0 if i==0 else 76}">{html.escape(line)}</tspan>' for i,line in enumerate(title.splitlines()))
  svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f7f8f4"/><rect x="58" y="58" width="1084" height="514" rx="32" fill="#fff" stroke="#cbd8ce" stroke-width="3"/>
  <circle cx="1099" cy="81" r="161" fill="#dcecdf"/><circle cx="60" cy="600" r="130" fill="#f6ddd3"/>
  <text x="105" y="128" font-family="Arial,sans-serif" font-size="27" fill="#287d4f">OPEN RESEARCH · PRIVACY-FIRST</text>
  <svg x="930" y="95" width="165" height="165" viewBox="0 0 512 512">{mark}</svg>
  <text x="105" y="260" font-family="Arial,sans-serif" font-size="62" font-weight="700" fill="#172019">{lines}</text>
  <text x="105" y="525" font-family="Arial,sans-serif" font-size="31" font-weight="700" fill="#58645c">smbajwa.com</text></svg>'''
  subprocess.run(['rsvg-convert','-f','png','-o',str(OUT/f'{slug}.png')],input=svg.encode(),check=True)

subprocess.run(['rsvg-convert','-w','512','-h','512','-f','png','-o',str(OUT/'wechat-thumb.png'),str(LOGO/'logo-mark.svg')],check=True)
