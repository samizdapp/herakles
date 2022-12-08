from peer_sources import PublicPeers, CrawledPeers
from yggdrasil_iface import YggdrasilConnection, yqq
import os

# public = PublicPeers()
# public.perform()

# with open("peers", 'w') as f:
#     public.write(f)

print('connect server', True)
ygg = YggdrasilConnection.fromServer()
print("query self", True)
ygg.query(yqq.SELF)
max_depth = 1
version = os.environ.get('VERSION')
hosts_cache = "/shared_etc/hosts_crawled" + version
try:
    with open(hosts_cache, 'r') as file:
        lines = file.readlines()
        keys = [line.rstrip().split(' ').pop().split('.')[1] + line.rstrip().split(' ').pop().split('.')[2] for line in lines]
        file.close()
        max_depth = len(list(dict.fromkeys(keys))) + 1
        if len(keys) == 0:
            raise 0
        print('bootstrap from previously crawled')
except:
    print('get neighbors')
    keys = [data["key"] for data in ygg.neighbours.values()]
    keys.insert(0, ygg.key)

# keys.insert(0, ygg.key)
keys = list(dict.fromkeys(keys))
print('make crawler', keys)
crawler = CrawledPeers(ygg, keys, max_depth)
print('do perform')
crawler.perform()
print('do open', True) 
with open(hosts_cache, 'w') as f:
    crawler.write(f)
