from requests import *
from json import loads, dumps

base_url = 'https://www.bungie.net'
api_root = base_url + '/Platform'
path = '/Destiny2/Manifest/'

d2_manifest = loads(get(api_root+path, headers={'X-API-Key': 'cd4e01bd37b74c789af6a1479fa62801'}).text)
item_definitons = loads(get(base_url+d2_manifest['Response']['jsonWorldContentPaths']['en']).text)['DestinyInventoryItemDefinition']

with open('itemDefinitions.json', 'w') as f:
    f.write(dumps(item_definitons))
