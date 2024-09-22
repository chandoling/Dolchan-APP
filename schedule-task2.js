let transactionTimeout;

// Load stored values from Chrome storage when the popup is opened
window.onload = function() {
  chrome.storage.local.get(['network', 'receivingAddress', 'amount', 'gasPrice', 'scheduledDate', 'scheduledTime'], (data) => {
    if (data.network) document.getElementById('network').value = data.network;
    if (data.receivingAddress) document.getElementById('receivingAddress').value = data.receivingAddress;
    if (data.amount) document.getElementById('amount').value = data.amount;
    if (data.gasPrice) document.getElementById('gasPrice').value = data.gasPrice;
    if (data.scheduledDate) document.getElementById('scheduledDate').value = data.scheduledDate;
    if (data.scheduledTime) document.getElementById('scheduledTime').value = data.scheduledTime;
  });
};

// Save individual input fields when they are changed
document.getElementById('network').addEventListener('change', () => {
  const network = document.getElementById('network').value;
  chrome.storage.local.set({ network });
  getRecommendedGasPrice(); // Update recommended gas price when network changes
});

document.getElementById('receivingAddress').addEventListener('change', () => {
  const receivingAddress = document.getElementById('receivingAddress').value;
  chrome.storage.local.set({ receivingAddress });
});

document.getElementById('amount').addEventListener('change', () => {
  const amount = document.getElementById('amount').value;
  chrome.storage.local.set({ amount });
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

// Function to calculate the recommended gas price
async function getRecommendedGasPrice() {
  const selectedNetwork = document.getElementById('network').value;
  const rpcUrl = selectRPC(selectedNetwork);
  
  // Initialize Web3 with the correct network's RPC
  const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
  
  try {
    // Fetch the current gas price from the network
    const gasPrice = await web3.eth.getGasPrice();
    
    // Convert from Wei to Gwei and apply a 50% increase
    const gasPriceInGwei = web3.utils.fromWei(gasPrice, 'gwei');
    const recommendedPrice = (parseFloat(gasPriceInGwei) * 1.5).toFixed(2); // 50% increase

    // Display the recommended gas price
    document.getElementById('recommendedGas').textContent = `${recommendedPrice} Gwei`;
  } catch (error) {
    console.error('Error fetching gas price:', error);
    document.getElementById('recommendedGas').textContent = 'Error';
  }
}

// Update recommended gas price
setInterval(getRecommendedGasPrice, 5000);

// Save button click event (No privateKey here)
document.getElementById('saveTransaction').addEventListener('click', () => {
  const network = document.getElementById('network').value;
  const receivingAddress = document.getElementById('receivingAddress').value;
  const amount = document.getElementById('amount').value;
  const gasPrice = document.getElementById('gasPrice').value;
  const scheduledDate = document.getElementById('scheduledDate').value;
  const scheduledTime = document.getElementById('scheduledTime').value;

  if (!network || !receivingAddress || !amount || !gasPrice || !scheduledDate || !scheduledTime) {
    alert('Please fill out all fields.');
    return;
  }

  chrome.storage.local.set({
    network, receivingAddress, amount, gasPrice, scheduledDate, scheduledTime
  }, () => {
    alert('Transaction data saved successfully.');
  });
});

// Send Transaction button click event
document.getElementById('sendTransaction').addEventListener('click', async () => {
  const privateKey = document.getElementById('privateKey').value;  // Get privateKey just before sending

  if (!privateKey) {
    alert('Please enter your private key.');
    return;
  }

  chrome.storage.local.get(['network', 'receivingAddress', 'amount', 'gasPrice', 'scheduledDate', 'scheduledTime'], async (data) => {
    const scheduledDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}`).getTime();
    const now = new Date().getTime();
    const delay = scheduledDateTime - now;

    if (delay > 0) {
      const statusPopup = window.open('schedule-transaction-status.html', 'Transaction Status', 'width=400,height=300');

      statusPopup.onload = () => {
        statusPopup.postMessage({ action: 'waiting', scheduledTime: scheduledDateTime }, '*');
      };

      // Adjust the logic to get the privateKey again when the transaction is being sent
      transactionTimeout = setTimeout(async () => {
        const updatedPrivateKey = document.getElementById('privateKey').value;
      
        if (!updatedPrivateKey) {
          alert('Private key is missing. Please re-enter.');
          return;
        }
      
        const rpcUrl = selectRPC(data.network);
        const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
        const wallet = web3.eth.accounts.privateKeyToAccount(updatedPrivateKey);
      
        try {
          // Fetch the latest nonce right before the transaction
          const nonce = await web3.eth.getTransactionCount(wallet.address, 'latest');
      
          const transaction = {
            to: data.receivingAddress,
            value: web3.utils.toWei(data.amount, 'ether'),
            gasPrice: web3.utils.toWei(data.gasPrice, 'gwei'),
            gasLimit: 21000,
            from: wallet.address,
            nonce: nonce, 
          };
      
          statusPopup.postMessage({ action: 'sendingTransaction' }, '*');
      
          const signedTx = await wallet.signTransaction(transaction);
          const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      
          const scanUrl = getScanUrl(data.network, receipt.transactionHash);
          
          statusPopup.postMessage({ action: 'transactionComplete', receipt, scanUrl }, '*');
          
          // Memory reset
          document.getElementById('privateKey').value = ''; 
          
        } catch (error) {
          statusPopup.postMessage({ action: 'transactionError', error: error.message }, '*');
          document.getElementById('privateKey').value = ''; 
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

document.getElementById('mainPageButton').addEventListener('click', () => {
  window.location.href = "index.html"; 
});

function selectRPC(networkName) {
  const networks = {
    sepolia: 'https://1rpc.io/sepolia',
    mainnet: 'https://rpc.flashbots.net/fast',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    polygon: 'https://polygon-rpc.com',
    optimism: 'https://mainnet.optimism.io',
    bsc: 'https://bsc-dataseed.binance.org/',
  };
  return networks[networkName] || networks['sepolia'];
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
