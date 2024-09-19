let transactionTimeout;

// 페이지 로드 시 저장된 값을 불러오는 함수
window.onload = function() {
  chrome.storage.local.get(['network', 'contractAddress', 'hexData', 'gasPrice', 'scheduledDate', 'scheduledTime', 'privateKey'], (data) => {
    if (data.network) document.getElementById('network').value = data.network;
    if (data.contractAddress) document.getElementById('contractAddress').value = data.contractAddress;
    if (data.hexData) document.getElementById('hexData').value = data.hexData;
    if (data.gasPrice) document.getElementById('gasPrice').value = data.gasPrice;
    if (data.scheduledDate) document.getElementById('scheduledDate').value = data.scheduledDate;
    if (data.scheduledTime) document.getElementById('scheduledTime').value = data.scheduledTime;
    if (data.privateKey) document.getElementById('privateKey').value = data.privateKey;
  });
};

// Save 버튼 클릭 시 입력 값을 저장하는 함수
document.getElementById('saveTransaction').addEventListener('click', () => {
  const network = document.getElementById('network').value;
  const contractAddress = document.getElementById('contractAddress').value;
  const hexData = document.getElementById('hexData').value;
  const gasPrice = document.getElementById('gasPrice').value;
  const scheduledDate = document.getElementById('scheduledDate').value;
  const scheduledTime = document.getElementById('scheduledTime').value;
  const privateKey = document.getElementById('privateKey').value;

  if (!network || !contractAddress || !hexData || !gasPrice || !scheduledDate || !scheduledTime || !privateKey) {
    alert('Please fill out all fields.');
    return;
  }

  // 입력 값을 저장
  chrome.storage.local.set({
    network, contractAddress, hexData, gasPrice, scheduledDate, scheduledTime, privateKey
  }, () => {
    alert('Transaction data saved');
  });
});

// Send Transaction 버튼 클릭 시 트랜잭션 실행
// Send Transaction 버튼 클릭 시 트랜잭션 실행 부분
// Send Transaction 버튼 클릭 시 트랜잭션 실행
document.getElementById('sendTransaction').addEventListener('click', async () => {
  chrome.storage.local.get(['network', 'contractAddress', 'hexData', 'gasPrice', 'scheduledDate', 'scheduledTime', 'privateKey'], async (data) => {
    const scheduledDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}`).getTime();
    const now = new Date().getTime();
    const delay = scheduledDateTime - now;

    if (delay > 0) {
      // 남은 시간 표시 및 트랜잭션 진행 상태 팝업 창 열기
      const statusPopup = window.open('transaction-status.html', 'Transaction Status', 'width=400,height=300');

      // 스케줄된 시간을 상태 창에 전송
      statusPopup.onload = () => {
        statusPopup.postMessage({ action: 'waiting', scheduledTime: scheduledDateTime }, '*');
      };

      // 트랜잭션 타이머 설정
      transactionTimeout = setTimeout(async () => {
        const rpcUrl = selectRPC(data.network);
        const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
        const wallet = web3.eth.accounts.privateKeyToAccount(data.privateKey);

        const transaction = {
          to: data.contractAddress,
          data: data.hexData,
          gasPrice: web3.utils.toWei(data.gasPrice, 'gwei'),
          gasLimit: 500000,
          from: wallet.address,
        };

        try {
          // 트랜잭션 전송 중 상태 업데이트
          statusPopup.postMessage({ action: 'sendingTransaction' }, '*');

          const signedTx = await wallet.signTransaction(transaction);
          const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

          // 트랜잭션 완료 상태를 팝업 창에 전달
          const scanUrl = getScanUrl(data.network, receipt.transactionHash);
          statusPopup.postMessage({ action: 'transactionComplete', receipt, scanUrl }, '*');
        } catch (error) {
          // 트랜잭션 오류 상태를 팝업 창에 전달
          statusPopup.postMessage({ action: 'transactionError', error: error.message }, '*');
        }
      }, delay);
    } else {
      alert('The specified time is in the past. Please set a valid future time.');
    }
  });
});



// Cancel 버튼 클릭 시 타이머 취소
document.getElementById('cancelTransaction').addEventListener('click', () => {
  if (transactionTimeout) {
    clearTimeout(transactionTimeout);
    transactionTimeout = null;
    alert('Transaction canceled');
  } else {
    alert('No transaction to cancel');
  }
});

// 네트워크 선택 함수
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

// Etherscan, Polygonscan 등 스캔 사이트 링크 생성 함수
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
