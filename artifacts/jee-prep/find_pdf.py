
import urllib.request, re

url = 'https://vidcloud.eu.org/shree-radhe-app.js?v=1201'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=15) as res:
    content = res.read().decode('utf-8', errors='ignore')

# Search for openAttachmentPopup
for m in re.finditer(r'openAttachmentPopup\([^\)]*\)', content):
    print('Call:', m.group(0))

# Search for createPdfCard implementation
idx = content.find('createPdfCard')
while idx != -1:
    print('createPdfCard snippet:', content[max(0, idx-50):min(len(content), idx+200)])
    idx = content.find('createPdfCard', idx + 1)
