#coding:utf8

import json

addrs = json.loads(open("deployments/contract-addresses.json").read())
addr_miner = addrs["gv"]["miner"]
addr_pnft = addrs["gv"]["pNftToken"]

conf_str = open("../pnft-subgraph/subgraph.yaml").read()
i = conf_str.find("address:", 0)
conf_str = conf_str[:i + 10] + addr_miner + conf_str[i + 10 + len(addr_miner):]
i = conf_str.find("address:", i + 10)
conf_str = conf_str[:i + 10] + addr_pnft + conf_str[i + 10 + len(addr_pnft):]

open("../pnft-subgraph/subgraph.yaml", "w").write(conf_str)

print("Updated miner=%s pnft=%s" % (addr_miner, addr_pnft))