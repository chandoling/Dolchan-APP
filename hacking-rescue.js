// 저장 버튼을 눌렀을 때 입력값 저장 (프라이빗 키 포함)
document.getElementById('saveButton').addEventListener('click', function () {
  const network = document.getElementById('networkSelect').value;
  const recipientAddress = document.getElementById('recipientAddress').value;
  const contractAddress = document.getElementById('contractAddress').value;
  const gasPrice = document.getElementById('gasPrice').value;
  const privateKey = document.getElementById('privateKey').value;

  // 로컬 스토리지에 저장
  localStorage.setItem('network', network);
  localStorage.setItem('recipientAddress', recipientAddress);
  localStorage.setItem('contractAddress', contractAddress);
  localStorage.setItem('gasPrice', gasPrice);
  localStorage.setItem('privateKey', privateKey); // 프라이빗 키 저장

  alert('입력값이 저장되었습니다.');
});

// 페이지가 로드되면 저장된 값 로드
window.onload = function () {
  // 저장된 값 로드
  if (localStorage.getItem('network')) {
    document.getElementById('networkSelect').value = localStorage.getItem('network');
    document.getElementById('recipientAddress').value = localStorage.getItem('recipientAddress');
    document.getElementById('contractAddress').value = localStorage.getItem('contractAddress');
    document.getElementById('gasPrice').value = localStorage.getItem('gasPrice');
    // 프라이빗 키는 보안을 위해 로드하지 않음
  }

  // 프라이빗 키 초기화
  document.getElementById('privateKey').value = ''; // 프라이빗 키는 매번 초기화
};

// 시작 버튼을 눌렀을 때 트랜잭션 상태 페이지 열기
document.getElementById('startButton').addEventListener('click', function () {
  const network = document.getElementById('networkSelect').value;
  const recipientAddress = document.getElementById('recipientAddress').value;
  const contractAddress = document.getElementById('contractAddress').value;
  const gasPrice = document.getElementById('gasPrice').value;
  const privateKey = document.getElementById('privateKey').value;

  if (!privateKey) {
    alert('프라이빗 키를 입력하세요.');
    return;
  }

  // 로컬 스토리지에 저장
  localStorage.setItem('network', network);
  localStorage.setItem('recipientAddress', recipientAddress);
  localStorage.setItem('contractAddress', contractAddress);
  localStorage.setItem('gasPrice', gasPrice);
  localStorage.setItem('privateKey', privateKey);

  // 상태 페이지 열기
  window.open('hackin-rescue-status.html', '_blank', 'width=500,height=600');
});

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

// 추천 가스 가격 계산 함수
async function getRecommendedGasPrice() {
  const selectedNetwork = document.getElementById('networkSelect').value;
  const rpcUrl = selectRPC(selectedNetwork);

  // Web3 초기화
  const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

  try {
    // 현재 가스 가격 가져오기
    const gasPrice = await web3.eth.getGasPrice();

    // Wei를 Gwei로 변환하고 50% 증가
    const gasPriceInGwei = web3.utils.fromWei(gasPrice, 'gwei');
    const recommendedPrice = (parseFloat(gasPriceInGwei) * 1.5).toFixed(2); // 50% 증가

    // 추천 가스 가격 표시
    document.getElementById('recommendedGas').textContent = `${recommendedPrice} Gwei`;
  } catch (error) {
    console.error('Error fetching gas price:', error);
    document.getElementById('recommendedGas').textContent = 'Error';
  }
}

// 5초마다 가스 가격 업데이트
setInterval(getRecommendedGasPrice, 5000);
