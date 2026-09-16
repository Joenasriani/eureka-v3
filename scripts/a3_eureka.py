from pathlib import Path
import re

p = Path("public/index.html")
s = p.read_text(encoding="utf-8")

s = re.sub(r'<title>.*?</title>', '<title>Eureka | Structural Case Reasoning Instrument</title>', s, count=1, flags=re.S)
s = re.sub(
    r'<meta name="description" content="[^"]*">',
    '<meta name="description" content="Eureka is a case reasoning instrument that preserves reported episodes as traceable anchors, maps structural relationships across source fields, tests candidate transfers and keeps evidence, structure, recognition and outcome status separate.">',
    s,
    count=1,
)

marker = '<!-- A3: Eureka canonical search metadata -->'
if marker not in s:
    block = '''  <!-- A3: Eureka canonical search metadata -->
  <meta name="author" content="Joe Nasr">
  <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">
  <link rel="canonical" href="https://eureka-v3.vercel.app/">
  <link rel="author" href="https://joe-nasr-signals.vercel.app/v2/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Eureka | Structural Case Reasoning Instrument">
  <meta property="og:description" content="Trace episodes, extract relational structure, compare source fields, test mappings and keep evidence, recognition and transfer outcomes separate.">
  <meta property="og:url" content="https://eureka-v3.vercel.app/">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Eureka | Structural Case Reasoning Instrument">
  <meta name="twitter:description" content="A case reasoning instrument for traceable anchors, structural mappings, adversarial transfer checks and separate status axes.">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"WebApplication","@id":"https://eureka-v3.vercel.app/#application","name":"Eureka","alternateName":"Eureka Case Instrument","url":"https://eureka-v3.vercel.app/","description":"Case reasoning instrument that preserves reported episodes as traceable anchors, extracts relational structure, searches contrasting source fields, constructs explicit mappings, tests transfer and keeps evidence, structural, recognition and outcome status separate.","applicationCategory":"ProductivityApplication","operatingSystem":"Web browser","creator":{"@type":"Person","@id":"https://joe-nasr-signals.vercel.app/v2/#joe-nasr","name":"Joe Nasr","url":"https://joe-nasr-signals.vercel.app/v2/"},"sameAs":"https://github.com/Joenasriani/eureka-v3"}
  </script>
  <!-- /A3: Eureka canonical search metadata -->
'''
    s = s.replace('  <link rel="stylesheet" href="/styles.css">', block + '  <link rel="stylesheet" href="/styles.css">', 1)

p.write_text(s, encoding="utf-8")
