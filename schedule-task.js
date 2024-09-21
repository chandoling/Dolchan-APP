let transactionTimeout;
let privateKey;  // Declare global privateKey variable

// Load stored values from Chrome storage when the popup is opened
window.onload = function() {
  chrome.storage.local.get(['network', 'contractAddress', 'hexData', 'gasPrice', 'scheduledDate', 'scheduledTime'], (data) => {
    if (data.network) document.getElementById('network').value = data.network;
    if (data.contractAddress) document.getElementById('contractAddress').value = data.contractAddress;
    if (data.hexData) document.getElementById('hexData').value = data.hexData;
    if (data.gasPrice) document.getElementById('gasPrice').value = data.gasPrice;
    if (data.scheduledDate) document.getElementById('scheduledDate').value = data.scheduledDate;
    if (data.scheduledTime) document.getElementById('scheduledTime').value = data.scheduledTime;
  });
};

// Save individual input fields when they are changed
document.getElementById('network').addEventListener('change', () => {
  const network = document.getElementById('network').value;
  chrome.storage.local.set({ network });
});

document.getElementById('contractAddress').addEventListener('change', () => {
  const contractAddress = document.getElementById('contractAddress').value;
  chrome.storage.local.set({ contractAddress });
});

document.getElementById('hexData').addEventListener('change', () => {
  const hexData = document.getElementById('hexData').value;
  chrome.storage.local.set({ hexData });
});

document.getElementById('gasPrice').addEventListener('change', () => {
  const gasPrice = document.getElementById('gasPrice').value;
  chrome.storage.local.set({ gasPrice });
});

document.getElementById('scheduledDate').addEventListener('change', () => {
  const scheduledDate = document.getElementById('scheduledDate').value;
  chrome.storage.local.set({ scheduledDate });
});

document.getElementById('scheduledTime').addEventListener('change', () => {
  const scheduledTime = document.getElementById('scheduledTime').value;
  chrome.storage.local.set({ scheduledTime });
});

// Save button click event (No privateKey here)
document.getElementById('saveTransaction').addEventListener('click', () => {
  const network = document.getElementById('network').value;
  const contractAddress = document.getElementById('contractAddress').value;
  const hexData = document.getElementById('hexData').value;
  const gasPrice = document.getElementById('gasPrice').value;
  const scheduledDate = document.getElementById('scheduledDate').value;
  const scheduledTime = document.getElementById('scheduledTime').value;

  if (!network || !contractAddress || !hexData || !gasPrice || !scheduledDate || !scheduledTime) {
    alert('Please fill out all fields.');
    return;
  }

  chrome.storage.local.set({
    network, contractAddress, hexData, gasPrice, scheduledDate, scheduledTime
  }, () => {
    alert('Transaction data saved successfully.');
  });
});

document.getElementById('sendTransaction').addEventListener('click', async () => {
  privateKey = document.getElementById('privateKey').value; // Get privateKey when sending transaction

  if (!privateKey) {
    alert('Please enter your private key.');
    return;
  }

  chrome.storage.local.get(['network', 'contractAddress', 'hexData', 'gasPrice', 'scheduledDate', 'scheduledTime'], async (data) => {
    const scheduledDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}`).getTime();
    const now = new Date().getTime();
    const delay = scheduledDateTime - now;

    if (delay > 0) {
      const statusPopup = window.open('transaction-status.html', 'Transaction Status', 'width=400,height=300');

      statusPopup.onload = () => {
        statusPopup.postMessage({ action: 'waiting', scheduledTime: scheduledDateTime }, '*');
      };

      transactionTimeout = setTimeout(async () => {
        const updatedPrivateKey = document.getElementById('privateKey').value;  // Get privateKey again before transaction

        if (!updatedPrivateKey) {
          alert('Private key is missing. Please re-enter.');
          return;
        }

        const rpcUrl = selectRPC(data.network);
        const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
        const wallet = web3.eth.accounts.privateKeyToAccount(updatedPrivateKey);  // Use saved privateKey

        const transaction = {
          to: data.contractAddress,
          data: data.hexData,
          gasPrice: web3.utils.toWei(data.gasPrice, 'gwei'),
          gasLimit: 500000,
          from: wallet.address,
        };

        try {
          statusPopup.postMessage({ action: 'sendingTransaction' }, '*');

          const signedTx = await wallet.signTransaction(transaction);
          const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

          const scanUrl = getScanUrl(data.network, receipt.transactionHash);
          
          // Ensure transactionComplete message is posted after transaction finishes
          statusPopup.postMessage({ action: 'transactionComplete', receipt, scanUrl }, '*');
          
        } catch (error) {
          statusPopup.postMessage({ action: 'transactionError', error: error.message }, '*');
        }
      }, delay);
    } else {
      alert('The specified time is in the past. Please set a valid future time.');
    }
  });
});


document.getElementById('cancelTransaction').addEventListener('click', () => {
  if (transactionTimeout) {
    clearTimeout(transactionTimeout);
    transactionTimeout = null;
    alert('Transaction canceled');
  } else {
    alert('No transaction to cancel');
  }
});

function selectRPC(networkName) {
  const networks = {
    mainnet: 'https://rpc.flashbots.net/fast',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    polygon: 'https://polygon-rpc.com',
    optimism: 'https://mainnet.optimism.io',
    bsc: 'https://bsc-dataseed.binance.org/',
    sepolia: 'https://1rpc.io/sepolia'
  };
  return networks[networkName] || networks['mainnet'];
}

function getScanUrl(network, txHash) {
  const scanSites = {
    mainnet: `https://etherscan.io/tx/${txHash}`,
    arbitrum: `https://arbiscan.io/tx/${txHash}`,
    polygon: `https://polygonscan.com/tx/${txHash}`,
    optimism: `https://optimistic.etherscan.io/tx/${txHash}`,
    bsc: `https://bscscan.com/tx/${txHash}`,
    sepolia: `https://sepolia.etherscan.io/tx/${txHash}`
  };
  return scanSites[network] || scanSites['mainnet'];
}
