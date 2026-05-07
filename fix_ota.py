import json

# Fix app.json
with open('app.json', 'r') as f:
    app = json.load(f)

app['expo']['updates'] = {
    'url': 'https://u.expo.dev/883af0e2-8826-4a99-aedb-f85eb1d2d912',
    'enabled': True,
    'checkAutomatically': 'ON_LOAD',
    'channel': 'production'
}
app['expo']['runtimeVersion'] = '1.0.0'

with open('app.json', 'w') as f:
    json.dump(app, f, indent=2)

print('app.json fixed')

# Fix eas.json
with open('eas.json', 'r') as f:
    eas = json.load(f)

eas['build']['preview']['channel'] = 'production'
eas['build']['production']['channel'] = 'production'

with open('eas.json', 'w') as f:
    json.dump(eas, f, indent=2)

print('eas.json fixed')
