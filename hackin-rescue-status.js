let stopRequested = false;
let balanceCheckCount = 0;

// RPC URL 선택 함수
function selectRPC(networkName) {
  const networks = {
    sepolia: 'https://rpc.sepolia.org',
    mainnet: 'https://rpc.ankr.com/eth',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    polygon: 'https://polygon-rpc.com',
    optimism: 'https://mainnet.optimism.io',
    bsc: 'https://bsc-dataseed.binance.org/',
  };
  return networks[networkName] || networks['sepolia'];
}

// 트랜잭션 전송 및 잔액 확인 함수
async function sendTransaction() {
  if (stopRequested) {
    console.log('트랜잭션이 취소되었습니다.');
    return;
  }

  const contractAddress = localStorage.getItem('contractAddress');
  const recipientAddress = localStorage.getItem('recipientAddress');
  const gasPriceInput = localStorage.getItem('gasPrice');
  const network = localStorage.getItem('network');
  const rpcUrl = selectRPC(network);

  const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
  const privateKey = localStorage.getItem('privateKey');
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  const walletAddress = account.address;

  // 수신자 주소 유효성 검사
  if (!web3.utils.isAddress(recipientAddress)) {
    console.error('Invalid recipient address:', recipientAddress);
    document.getElementById('status').innerText = '잘못된 수신자 주소입니다.';
    return;
  }

  const ERC20_ABI = [
    {
      "constant": true,
      "inputs": [],
      "name": "decimals",
      "outputs": [
        { "name": "", "type": "uint8" }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "symbol",
      "outputs": [
        { "name": "", "type": "string" }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        { "name": "_owner", "type": "address" }
      ],
      "name": "balanceOf",
      "outputs": [
        { "name": "balance", "type": "uint256" }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        { "name": "_to", "type": "address" },
        { "name": "_value", "type": "uint256" }
      ],
      "name": "transfer",
      "outputs": [
        { "name": "", "type": "bool" }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  const contract = new web3.eth.Contract(ERC20_ABI, contractAddress);

  try {
    // decimals 가져오기
    let decimals;
    try {
      decimals = await contract.methods.decimals().call();
    } catch (error) {
      console.warn('Cannot get decimals:', error);
      decimals = 18; // 기본값
    }

    // symbol 가져오기
    let symbol;
    try {
      symbol = await contract.methods.symbol().call();
    } catch (error) {
      console.warn('Cannot get symbol:', error);
      symbol = 'TOKEN'; // 기본값
    }

    // 잔액 확인 및 업데이트
    let tokenBalance = await contract.methods.balanceOf(walletAddress).call();
    const adjustedBalance = tokenBalance / Math.pow(10, decimals);
    document.getElementById('tokenAmount').innerText = adjustedBalance;
    document.getElementById('tokenTicker').innerText = symbol;
    document.getElementById('walletAddress').innerText = walletAddress;

    // 잔액 확인 횟수 증가
    balanceCheckCount++;
    document.getElementById('balanceCheckCount').innerText = balanceCheckCount;

    // 상태 메시지 업데이트
    document.getElementById('status').innerText = `잔액 확인 후 시도 횟수: ${balanceCheckCount}회`;

    if (Number(tokenBalance) > 0) {
      // 트랜잭션 시도
      let nonce = await web3.eth.getTransactionCount(walletAddress, 'pending');

      const transferAmount = tokenBalance;

      const data = contract.methods.transfer(recipientAddress, transferAmount).encodeABI();

      let gasPrice;

      if (gasPriceInput) {
        gasPrice = web3.utils.toWei(gasPriceInput, 'gwei');
      } else {
        gasPrice = await web3.eth.getGasPrice();
      }

      // 가스 한도 추정
      const gasLimit = await contract.methods.transfer(recipientAddress, transferAmount).estimateGas({ from: walletAddress });

      const tx = {
        from: walletAddress,
        to: contractAddress,
        value: '0x0',
        data: data,
        gasPrice: web3.utils.toHex(gasPrice),
        gas: web3.utils.toHex(gasLimit),
        nonce: web3.utils.toHex(nonce),
        chainId: await web3.eth.getChainId(),
      };

      const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);

      document.getElementById('status').innerText = `트랜잭션 전송 중... (시도 횟수: ${balanceCheckCount}회)`;

      web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        .on('transactionHash', function(hash){
          const scanUrl = getScanUrl(network, hash);
          document.getElementById('status').innerText = `트랜잭션 전송 완료! 해시: ${hash}`;
          document.getElementById('scanLink').innerHTML = `<a href="${scanUrl}" target="_blank">거래 확인</a>`;
        })
        .on('error', function(error){
          console.error('트랜잭션 오류:', error);
          document.getElementById('status').innerText = `트랜잭션 오류 발생 (시도 횟수: ${balanceCheckCount}회)`;
          // 오류 무시하고 계속 루프
        });
    } else {
      document.getElementById('status').innerText = `잔액이 없습니다.`;
    }
  } catch (error) {
    console.error('트랜잭션 중 오류:', error);
    document.getElementById('status').innerText = '트랜잭션 중 오류 발생';
    // 오류 무시하고 계속 루프
} finally {
    // 루프를 쉼 없이 계속 실행
    if (!stopRequested) {
      setTimeout(sendTransaction, 0);
    }
  }
}

// 취소 버튼 이벤트 리스너
document.getElementById('cancelTransaction').addEventListener('click', function () {
  stopRequested = true;
  document.getElementById('status').innerText = '트랜잭션이 취소되었습니다.';
});


// 페이지 로드 시 실행
window.onload = async function() {
  await sendTransaction();
}
