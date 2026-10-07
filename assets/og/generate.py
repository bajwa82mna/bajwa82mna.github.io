from pathlib import Path
import html
import subprocess

OUT=Path(__file__).parent
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
  <text x="105" y="260" font-family="Arial,sans-serif" font-size="62" font-weight="700" fill="#172019">{lines}</text>
  <text x="105" y="525" font-family="Arial,sans-serif" font-size="31" font-weight="700" fill="#58645c">smbajwa.com</text></svg>'''
  subprocess.run(['rsvg-convert','-f','png','-o',str(OUT/f'{slug}.png')],input=svg.encode(),check=True)

brand='''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#1f4d2e"/><circle cx="256" cy="286" r="126" fill="#d9482b"/><path d="M256 166c-56-6-91-36-91-78 49 0 85 27 91 78zm0 0c56-6 91-36 91-78-49 0-85 27-91 78zm0 0c-12-43 0-79 30-103 12 43 0 79-30 103z" fill="#8fd19e"/></svg>'''
for name,size in [('wechat-thumb.png',512),('apple-touch-icon.png',180),('favicon-32x32.png',32)]:
  target=OUT/'wechat-thumb.png' if name=='wechat-thumb.png' else OUT.parent.parent/name
  subprocess.run(['rsvg-convert','-w',str(size),'-h',str(size),'-f','png','-o',str(target)],input=brand.encode(),check=True)
