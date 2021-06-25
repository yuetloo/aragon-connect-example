const { default: connect, describeScript } = require("@aragon/connect");
const { default: connectVoting } = require("@aragon/connect-voting");
const ethers = require("ethers");

function voteId(vote) {
  return (
    "#" +
    String(parseInt(vote.id.match(/voteId:(.+)$/)?.[1] || "0")).padEnd(2, " ")
  );
}

class Eip1193Provider {
  provider;

  constructor(provider) {
    this.provider = provider;
  }

  request({ method, params }) {
    return this.send(method, params || []);
  }

  async send(method, params) {
    function throwUnsupported(message) {
      throw new Error(`unsupported operation: ${message} ${method} ${params}`);
    }

    let coerce = (value) => value;

    switch (method) {
      case "eth_gasPrice": {
        const result = await this.provider.getGasPrice();
        return result.toHexString();
      }
      case "eth_accounts": {
        throwUnsupported("eth_accounts");
      }
      case "eth_blockNumber": {
        return await this.provider.getBlockNumber();
      }
      case "eth_chainId": {
        const result = await this.provider.getNetwork();
        return result.chainId;
      }
      case "eth_getBalance": {
        const result = await this.provider.getBalance(params[0], params[1]);
        return result.toHexString();
      }
      case "eth_getStorageAt": {
        return this.provider.getStorageAt(params[0], params[1], params[2]);
      }
      case "eth_getTransactionCount": {
        const result = await this.provider.getTransactionCount(
          params[0],
          params[1]
        );
        return ethers.utils.hexValue(result);
      }
      case "eth_getBlockTransactionCountByHash":
      case "eth_getBlockTransactionCountByNumber": {
        const result = await this.provider.getBlock(params[0]);
        return ethers.utils.hexValue(result.transactions.length);
      }
      case "eth_getCode": {
        const result = await this.provider.getBlock(params[0]);
        return result;
      }
      case "eth_sendRawTransaction": {
        return await this.provider.sendTransaction(params[0]);
      }
      case "eth_call": {
        const req = ethers.providers.JsonRpcProvider.hexlifyTransaction(
          params[0]
        );
        return await this.provider.call(req, params[1]);
      }
      case "estimateGas": {
        if (params[1] && params[1] !== "latest") {
          throwUnsupported("estimateGas does not support blockTag");
        }

        const req = ethers.providers.JsonRpcProvider.hexlifyTransaction(
          params[0]
        );
        const result = await this.provider.estimateGas(req);
        return result.toHexString();
      }

      // @TOOD: Transform? No uncles?
      case "eth_getBlockByHash":
      case "eth_getBlockByNumber": {
        if (params[1]) {
          return await this.provider.getBlockWithTransactions(params[0]);
        } else {
          return await this.provider.getBlock(params[0]);
        }
      }
      case "eth_getTransactionByHash": {
        return await this.provider.getTransaction(params[0]);
      }
      case "eth_getTransactionReceipt": {
        return await this.provider.getTransactionReceipt(params[0]);
      }

      case "eth_sign": {
        throwUnsupported("eth_sign");
      }

      case "eth_sendTransaction": {
        return throwUnsupported("eth_sendTransaction requires an account");
      }

      case "eth_getUncleCountByBlockHash":
      case "eth_getUncleCountByBlockNumber": {
        coerce = ethers.utils.hexValue;
        break;
      }

      case "eth_getTransactionByBlockHashAndIndex":
      case "eth_getTransactionByBlockNumberAndIndex":
      case "eth_getUncleByBlockHashAndIndex":
      case "eth_getUncleByBlockNumberAndIndex":
      case "eth_newFilter":
      case "eth_newBlockFilter":
      case "eth_newPendingTransactionFilter":
      case "eth_uninstallFilter":
      case "eth_getFilterChanges":
      case "eth_getFilterLogs":
      case "eth_getLogs":
        break;
    }

    // If our provider supports send, maybe it can do a better job?
    if (this.provider.send) {
      const result = await this.provider.send(method, params);
      return coerce(result);
    }

    return throwUnsupported(`unsupported method: ${method}`);
  }
}

async function main() {
  const provider = new ethers.providers.InfuraProvider();
  const ethereum = new Eip1193Provider(provider);
  let orgAddress = 'beehive.aragonid.eth'
  orgAddress = 'api3daov1.aragonid.eth'

  console.log('connecting...');

  // connect using our own provider
  // const org = await connect(orgAddress, "thegraph", { ethereum });
  // connect using aragon's default provider
  const org = await connect(orgAddress, "thegraph");
  const apps = await org.apps();

  console.log('connect voting...');
  const voting = await connectVoting(org.app("voting"));
  const votes = await voting.votes();

//  const vote = votes.find((vote) => voteId(vote) === "#54");
  const vote = votes[0]

  const description = await describeScript(vote.script, apps, provider);

  console.log("\nScript descriptions:");
  description.map((tx) => console.log(tx.description));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("");
    console.error(err);
    console.log(
      "Please report any problem to https://github.com/aragon/connect/issues"
    );
    process.exit(1);
  });
