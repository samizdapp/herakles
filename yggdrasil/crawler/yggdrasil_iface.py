import socket as s
import json


class YggdrasilQuery():
    """An Enum-like class for useful Yggdrasil requests."""

    SELF = {"request": "getSelf"}
    PEERS = {"request": "getPeers"}
    def NODEINFO(key): return {"request": "getNodeInfo", "key": key}

    def REMOTE_SELF(key):
        return {"request": "debug_remoteGetSelf", "key": key}

    def REMOTE_PEERS(key):
        return {"request": "debug_remoteGetPeers", "key": key}

    def REMOTE_DHT(key):
        return {"request":"debug_remoteGetDHT", "key": key}


yqq = YggdrasilQuery


class YggdrasilConnection():
    """Represents a connection to the Yggdrasil daemon.

    Usage:
      Creation:
        ygg = YggdrasilConnection.fromSocket(PATH)
      or,
        ygg = YggdrasilConnection.fromServer(HOST, PORT)

      Querying:
        ygg.query(yqq.SELF)
    """

    def __init__(self, family, address):
        self.socket = s.socket(family, s.SOCK_STREAM)
        self.socket.connect(address)

        self.props = self.query(yqq.SELF)
        self.neighbours = self.query(yqq.PEERS)

        self.key = list(self.props.values())[0]["key"]
        self.groups = set(
            self.query(yqq.NODEINFO(self.key))["samizdapp"]["groups"]
        )

    @classmethod
    def fromSocket(cls, path="/var/run/yggdrasil.sock"):
        return cls(s.AF_UNIX, path)

    @classmethod
    def fromServer(cls, host="localhost", port=9001):
        return cls(s.AF_INET, (host, port))

    def query(self, query, getAddr = False):
        # Always keep the connection to the yggdrasil daemon open.
        query["keepalive"] = True
        self.socket.send(json.dumps(query).encode("utf-8"))

        try:
            res = json.loads(self.socket.recv(1024*128))
        except:
            return None

        if res["status"] == "success":
            # Remove the nesting of response->msg->...
            response = res["response"]
            addr = list(response.keys())[0]

            rval = list(res["response"].values())[0]
            # print('RVAL')
            if getAddr == True:
                rval["addr"] = addr
            # print(rval)
            return list(res["response"].values())[0]
        else:
            return None

