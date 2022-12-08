from abc import ABC, abstractmethod
from bloom_filter2 import BloomFilter
from http.client import HTTPSConnection
from lxml.html import parse
from lxml.etree import XPath

import requests
import sys
import random
from collections import defaultdict

from yggdrasil_iface import yqq

def send_status (status, message):
    requests.post("http://localhost/smz/api/status/logs", json={
        'service': "yggdrasil_crawler",
        'status': status,
        'message': message
    })

class PeerSource(ABC):
    """Parent class of all the ways peers can be discovered.

    Attributes:
        resource: The fetched resource.
        peers: A collection of extracted peers.
    """

    @abstractmethod
    def fetch(self):
        """Grab the latest resource from the network."""

    @abstractmethod
    def extract(self, resource=None):
        """Return a list of peers from the last requested resource.

        Args:
            resource: Use this resource instead (optional).
        """

    @abstractmethod
    def write(self, fd=sys.stdout):
        """Write the contents of this object to a configuation file.

        Args:
            fd: A file descriptor (default stdout).
        """

    def perform(self):
        """Perform all steps in sequence with their defaults."""
        # self.max_depth = max_depth
        self.fetch()
        self.extract()
        self.write()


class PublicPeers(PeerSource):
    """First hops scraped from configured directory websites.

    Attributes:
        resource: The parsed web page.
        peers: A list of extracted peers.
        directory: The location of the page containing active peers.
        find: An XPath object that extracts peers from the directory.

    Variables:
        OVERLAP: The minimum number of peers that remain between
    subsequent calls (constant).
    """

    directory = "publicpeers.neilalexander.dev"
    find = XPath("//tr[@class='statusgood']/td[@id='address']/text()")
    OVERLAP = 3

    def __init__(self, dx=()):
        if len(dx) == 2:
            self.directory, self.find = dx
            if type(self.find) == str:
                self.find = XPath(self.find)

    def fetch(self):
        conn = HTTPSConnection(self.directory)
        conn.request("GET", "/index.html")
        self.resource = parse(conn.getresponse())
        conn.close()

    def extract(self, resource=None):
        if not resource:
            resource = self.resource
        first_hops = self.find(resource)
        self.peers = random.sample(first_hops,
                                   len(first_hops) // 2 + self.OVERLAP)
        return self.peers

    def write(self, fd=sys.stdout):
        # Yggdrasil recommends configuring only 2-3 peers.
        fd.writelines(", \n".join(self.peers[:3]))

        if fd is not sys.stdout:
            fd.close()


class CrawledPeers(PeerSource):
    """Peers that have been discovered after crawling the network.

    Attributes:
        resource: A dictionary of Yggdrasil keys to NodeInfo.
        # peers: A collection of extracted samizdApp peers.
        cohorts: A dictionary of cohorts to members.

    Variables:
        MAX_DEPTH: The furthest nodes to be reached.
    """

    def __init__(self, ygg, keys = [], max_depth = 1):
        self.ygg = ygg
        self.keys = keys
        self.max_depth = max_depth
        self.bloom = BloomFilter(max_elements=10**8, error_rate=0.01) #, filename=('/shared_etc/bloom8.bin', -1))
        self.bloom_peered = BloomFilter(max_elements=10**8, error_rate=0.01)
        self.bloom_queried = BloomFilter(max_elements=10**8, error_rate=0.01)
    def fetch(self):
        self.resource = dict()
        print('start fetch', self.max_depth, self.keys)
        depth = 0
        max = 500
        i = 0
        max_depth = self.max_depth
        if self.max_depth > 1:
            for key in self.keys:
                nodeInfo = self.ygg.query(yqq.NODEINFO(key), True)
                if nodeInfo == None:
                    print('key', key, 'returned no node_info at start, decrement max_depth')
                    max_depth -= 1
                    continue
                if "samizdapp" in nodeInfo.keys():
                    print('found samizdapp key alive', key)


        while depth < max_depth and i < max:

            send_status("ONLINE", "Crawling for new hosts.")

            try:
                key = self.keys.pop(0)
                # print('checking key', key)
            except:
                print('out of keys')
                return
            
            if key not in self.bloom and key not in self.bloom_queried:
                i += 1
                self.bloom_queried.add(key)
                # print('query nodeInfo for key: ', key )
                nodeInfo = self.ygg.query(yqq.NODEINFO(key), True)
                if nodeInfo == None:
                    self.bloom.add(key)
                    continue
                # print(nodeInfo)
                if "samizdapp" in nodeInfo.keys():
                    print('found samizdapp')
                    depth += 1  # Reduce search space as cohort members are found.
                    nodeInfo["key"] = key
                    self.resource[key] = nodeInfo
                else:
                    self.bloom.add(key)
            # else:
            #     print('skip nodeInfo ', key)

            if key not in self.bloom_peered:
                # print('query peers for key: ', key)
                self.bloom_peered.add(key)
                children = self.ygg.query(yqq.REMOTE_PEERS(key), True)
                if children == None:
                    continue
                # print('children')
                # print(children )
                # peers = self.ygg.query(yqq.REMOTE_SELF(key))
                # print('peers')
                # print(peers)
                # dht = self.ygg.query(yqq.REMOTE_DHT(key))
                # print('dht')
                # print(dht)
                try:
                    self.keys += children['keys']
                except:
                    continue
            # else:
            #     print('skip peers: ', key)
        print('max depth', depth, self.max_depth)

    def extract(self, resource=None):
        self.cohort = defaultdict(list)

        for key, info in self.resource.items():
            for group in info["samizdapp"]["groups"]:
                if group in self.ygg.groups:
                    print('append')
                    print(info)
                    self.cohort[group].append(info)

    def write(self, fd=sys.stdout):
        # fd.write("# Samizdapp negotiated peers:\n")
        for protocol, cohort in self.cohort.items():
            # fd.write(f"## Protocol: {protocol}\n")

            for info in cohort:
                addr = info['addr']
                key = info['key']
                fd.write(f"{addr} {protocol}.{key[:63]}.{key[63:64]}.yg\n")

        if fd is not sys.stdout:
            fd.close()
